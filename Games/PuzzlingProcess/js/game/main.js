/**
 * Pop & Protect - Main Game Controller & State Machine
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.world = new PhysicsWorld();
        this.textures = new TextureRenderer();
        this.particles = new ParticleSystem();
        this.editor = new LevelEditor(this);

        this.currentLevelIndex = 0;
        this.state = 'BUILD'; // 'BUILD', 'RUNNING', 'VICTORY', 'DEFEAT'
        this.timeScale = 1.0;
        this.gameTime = 0;

        this.protagonist = null;
        this.placedItems = [];
        this.inventoryCounts = {};

        // Interaction state
        this.selectedBody = null;
        this.isDraggingBody = false;
        this.dragOffset = new Vec2();
        this.isRotatingBody = false;
        this.activeToolToPlace = null; // 'cushion', 'plank', 'spring'

        this.mousePos = new Vec2();
        this.isMouseDown = false;

        // Level ratings
        this.levelStars = JSON.parse(localStorage.getItem('pop_protect_stars') || '{}');
        this.collectedStarsThisRun = 0;

        this.initCanvasSize();
        this.initPhysicsCallbacks();
        this.initEventListeners();
        this.initUI();

        this.loadLevel(this.currentLevelIndex);
        this.lastTimestamp = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initCanvasSize() {
        this.canvas.width = 900;
        this.canvas.height = 600;
    }

    initPhysicsCallbacks() {
        // 1. Puncture / Pop Event!
        this.world.onPuncture = (vulnerableCircle, hazard, puncturePoint) => {
            if (this.state === 'RUNNING') {
                this.state = 'DEFEAT';
                this.particles.emitPop(vulnerableCircle.pos, '#FF4081');
                this.world.removeBody(vulnerableCircle);
                this.protagonist = null;
                window.soundEngine.playPop();
                window.soundEngine.playLose();

                setTimeout(() => {
                    this.showDefeatModal();
                }, 750);
            }
        };

        // 2. Sensor Trigger (Portal Goal or Bonus Star)
        this.world.onSensorTrigger = (sensor, visitor) => {
            if (sensor.isGoal && visitor.isVulnerable && this.state === 'RUNNING') {
                // Sucked into portal!
                this.state = 'VICTORY';
                window.soundEngine.playWin();
                this.particles.emitVictoryConfetti(this.canvas.width, this.canvas.height);

                // Save star progress
                const earned = Math.max(1, this.collectedStarsThisRun);
                const prev = this.levelStars[this.currentLevelIndex] || 0;
                this.levelStars[this.currentLevelIndex] = Math.max(earned, prev);
                localStorage.setItem('pop_protect_stars', JSON.stringify(this.levelStars));

                setTimeout(() => {
                    this.showVictoryModal();
                }, 850);
            }

            if (sensor.isStar && !sensor.isCollected && visitor.isVulnerable) {
                sensor.isCollected = true;
                this.collectedStarsThisRun++;
                window.soundEngine.playStar(this.collectedStarsThisRun);
                this.particles.emitSparks(sensor.pos, null, 15);
                this.updateHUD();
            }
        };

        // 3. Collision sound & sparks
        this.world.onCollision = (bA, bB, contactPoint, normal, impulse) => {
            if (bA.isCushion || bB.isCushion) {
                window.soundEngine.playBoing();
            } else if (bA.isSharpHazard || bB.isSharpHazard) {
                window.soundEngine.playClank(impulse / 100);
                if (impulse > 120) {
                    this.particles.emitSparks(contactPoint, normal, 5);
                }
            } else if (impulse > 180) {
                window.soundEngine.playClank(impulse / 150);
            }
        };
    }

    loadLevel(levelIndex) {
        this.currentLevelIndex = levelIndex;
        this.state = 'BUILD';
        this.collectedStarsThisRun = 0;
        this.selectedBody = null;
        this.activeToolToPlace = null;
        this.placedItems = [];

        this.world.clear();
        this.particles.clear();

        const levelData = GameLevels[this.currentLevelIndex];
        if (!levelData) return;

        // Initialize inventory
        this.inventoryCounts = {};
        for (let item of levelData.inventory) {
            this.inventoryCounts[item.type] = item.count;
        }

        // Build static level setup
        const result = levelData.build(this.world);
        this.protagonist = result.protagonist;

        this.updateHUD();
        this.renderInventoryDrawer();
        this.hideModals();
    }

    resetLevel() {
        this.loadLevel(this.currentLevelIndex);
    }

    startPhysics() {
        if (this.state === 'BUILD') {
            this.state = 'RUNNING';
            this.selectedBody = null;
            window.soundEngine.playClick();
            this.updateHUD();
        }
    }

    togglePlayState() {
        if (this.state === 'BUILD') {
            this.startPhysics();
        } else {
            this.resetLevel();
        }
    }

    stepSimulation(dt) {
        // Wind Fans force application
        for (let b of this.world.bodies) {
            if (b.isFan) {
                const fanTip = b.pos;
                const dir = b.fanDir;
                // Emit subtle wind motes
                if (Math.random() > 0.4) {
                    const spread = (Math.random() - 0.5) * 30;
                    this.particles.emitSparks(Vec2.add(fanTip, new Vec2(spread, 0)), dir, 1);
                }

                for (let other of this.world.bodies) {
                    if (other.isStatic || other === b) continue;
                    const toOther = Vec2.sub(other.pos, fanTip);
                    const distAlongDir = Vec2.dot(toOther, dir);
                    if (distAlongDir > 0 && distAlongDir < b.fanRange) {
                        const perpDist = Math.abs(Vec2.cross(toOther, dir));
                        if (perpDist < 50) {
                            const strength = (1 - distAlongDir / b.fanRange) * b.fanForce;
                            other.applyForce(Vec2.scale(dir, strength));
                        }
                    }
                }
            }

            // Portal suction effect when protagonist is near
            if (b.isGoal && this.protagonist && this.state === 'RUNNING') {
                const d = b.pos.dist(this.protagonist.pos);
                this.particles.emitPortalSuction(b.pos, 28);
                if (d < 80) {
                    const pull = Vec2.sub(b.pos, this.protagonist.pos).normalize().scale(350);
                    this.protagonist.applyForce(pull);
                }
            }
        }

        // Abyss boundary check for protagonist
        if (this.protagonist && this.protagonist.pos.y > this.canvas.height + 40 && this.state === 'RUNNING') {
            this.state = 'DEFEAT';
            window.soundEngine.playLose();
            this.showDefeatModal();
        }

        this.world.step(dt * this.timeScale);
    }

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
        this.lastTimestamp = timestamp;
        this.gameTime += dt;

        if (this.state === 'RUNNING') {
            this.stepSimulation(dt);
        }

        this.particles.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Tactile textured background
        this.textures.renderBackground(ctx, width, height);

        // 2. Joints & Ropes
        for (let j of this.world.joints) {
            this.textures.renderJoint(ctx, j);
        }

        // 3. Find nearest hazard distance for Circle facial expression
        let nearestHazardDist = 999;
        if (this.protagonist) {
            for (let b of this.world.bodies) {
                if (b.isSharpHazard) {
                    const d = b.pos.dist(this.protagonist.pos);
                    if (d < nearestHazardDist) nearestHazardDist = d;
                }
            }
        }

        // 4. Render All Physics Bodies
        for (let b of this.world.bodies) {
            if (b.isGoal) {
                this.textures.renderGoalPortal(ctx, b, this.gameTime);
            } else if (b.isStar) {
                this.textures.renderStarCollectible(ctx, b, this.gameTime);
            } else if (b.type === 'circle') {
                this.textures.renderCircle(ctx, b, this.gameTime, nearestHazardDist);
            } else if (b.type === 'polygon') {
                this.textures.renderPolygon(ctx, b, this.gameTime);
            }
        }

        // 5. Particles
        this.particles.render(ctx);

        // 6. Selection & Rotation Ring in BUILD Mode
        if (this.state === 'BUILD' && this.selectedBody) {
            this.renderSelectionRing(ctx, this.selectedBody);
        }

        // 7. Placement Preview
        if (this.state === 'BUILD' && this.activeToolToPlace) {
            this.renderPlacementPreview(ctx, this.activeToolToPlace, this.mousePos);
        }
    }

    renderSelectionRing(ctx, body) {
        ctx.save();
        ctx.translate(body.pos.x, body.pos.y);

        const r = (body.radius || 35) + 16;

        // Dashed bounding halo
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Rotation handle at top
        ctx.setLineDash([]);
        const handlePos = Vec2.rotate(new Vec2(0, -r), body.angle);
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.arc(handlePos.x, handlePos.y, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    renderPlacementPreview(ctx, toolType, pos) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = 0.55;

        if (toolType === 'cushion') {
            ctx.fillStyle = '#2ECC71';
            ctx.fillRect(-35, -12, 70, 24);
        } else if (toolType === 'plank') {
            ctx.fillStyle = '#C47B36';
            ctx.fillRect(-55, -8, 110, 16);
        } else if (toolType === 'spring') {
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(-30, -6, 60, 12);
        }

        ctx.restore();
    }

    // ==========================================
    // INTERACTION & MOUSE/TOUCH LISTENERS
    // ==========================================
    initEventListeners() {
        const getCanvasCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return new Vec2(
                (e.clientX - rect.left) * scaleX,
                (e.clientY - rect.top) * scaleY
            );
        };

        this.canvas.addEventListener('mousedown', (e) => {
            window.soundEngine.resume();
            const pos = getCanvasCoords(e);
            this.mousePos = pos;
            this.isMouseDown = true;

            if (this.editor.isActive) {
                this.editor.handleCanvasClick(pos.x, pos.y);
                return;
            }

            // In RUNNING mode, check if clicking a rope joint to cut it!
            if (this.state === 'RUNNING') {
                for (let j of this.world.joints) {
                    if (j.isCuttable && !j.isCut) {
                        const pa = j.getWorldPointA();
                        const pb = j.getWorldPointB();
                        if (Geom.distanceToSegmentSq(pos, pa, pb) < 200) {
                            j.isCut = true;
                            window.soundEngine.playSlice();
                            this.particles.emitSparks(pos, null, 10);
                            return;
                        }
                    }
                }
            }

            // In BUILD mode: Place item or select/move placed item
            if (this.state === 'BUILD') {
                if (this.activeToolToPlace && this.inventoryCounts[this.activeToolToPlace] > 0) {
                    this.placeItemAt(this.activeToolToPlace, pos.x, pos.y);
                    return;
                }

                // Check if clicking rotation handle on selected item
                if (this.selectedBody) {
                    const r = (this.selectedBody.radius || 35) + 16;
                    const handlePos = Vec2.add(this.selectedBody.pos, Vec2.rotate(new Vec2(0, -r), this.selectedBody.angle));
                    if (pos.dist(handlePos) < 16) {
                        this.isRotatingBody = true;
                        return;
                    }
                }

                // Check if clicking a player-placed item to select/drag
                let clickedBody = null;
                for (let b of this.placedItems) {
                    if (b.pos.dist(pos) < (b.radius || 40)) {
                        clickedBody = b;
                        break;
                    }
                }

                if (clickedBody) {
                    this.selectedBody = clickedBody;
                    this.isDraggingBody = true;
                    this.dragOffset = Vec2.sub(clickedBody.pos, pos);
                    window.soundEngine.playClick();
                } else {
                    this.selectedBody = null;
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getCanvasCoords(e);
            this.mousePos = pos;

            if (this.isMouseDown && this.state === 'BUILD' && this.selectedBody) {
                if (this.isRotatingBody) {
                    const angle = Math.atan2(pos.y - this.selectedBody.pos.y, pos.x - this.selectedBody.pos.x) + Math.PI / 2;
                    this.selectedBody.angle = angle;
                    this.selectedBody.updateWorldVertices();
                } else if (this.isDraggingBody) {
                    this.selectedBody.pos = Vec2.add(pos, this.dragOffset);
                    this.selectedBody.updateWorldVertices();
                }
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.isDraggingBody = false;
            this.isRotatingBody = false;
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            window.dispatchEvent(new Event('mouseup'));
        });
    }

    placeItemAt(toolType, x, y) {
        let body = null;
        if (toolType === 'cushion') {
            body = EntityFactory.createCushion(x, y, 70, 24, 0, { isPlayerPlaced: true });
        } else if (toolType === 'plank') {
            body = EntityFactory.createPlank(x, y, 110, 16, 0, { isPlayerPlaced: true });
        } else if (toolType === 'spring') {
            body = EntityFactory.createSpringPad(x, y, 60, 0, { isPlayerPlaced: true });
        }

        if (body) {
            this.world.addBody(body);
            this.placedItems.push(body);
            this.inventoryCounts[toolType]--;
            this.selectedBody = body;
            this.activeToolToPlace = null;
            window.soundEngine.playBoing();
            this.renderInventoryDrawer();
        }
    }

    deleteSelectedItem() {
        if (this.selectedBody && this.selectedBody.isPlayerPlaced) {
            const idx = this.placedItems.indexOf(this.selectedBody);
            if (idx !== -1) {
                this.placedItems.splice(idx, 1);
                // Return item to inventory
                if (this.selectedBody.isCushion && this.selectedBody.label === 'Safety Cushion') {
                    this.inventoryCounts['cushion'] = (this.inventoryCounts['cushion'] || 0) + 1;
                } else if (this.selectedBody.label === 'Wood Plank') {
                    this.inventoryCounts['plank'] = (this.inventoryCounts['plank'] || 0) + 1;
                } else if (this.selectedBody.label === 'Spring Pad') {
                    this.inventoryCounts['spring'] = (this.inventoryCounts['spring'] || 0) + 1;
                }
                this.world.removeBody(this.selectedBody);
                this.selectedBody = null;
                window.soundEngine.playSlice();
                this.renderInventoryDrawer();
            }
        }
    }

    // ==========================================
    // UI INITIALIZATION & SYNC
    // ==========================================
    initUI() {
        // Run/Reset Button
        const runBtn = document.getElementById('runBtn');
        runBtn.addEventListener('click', () => this.togglePlayState());

        // Reset Button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.resetLevel();
        });

        // Fast forward
        const speedBtn = document.getElementById('speedBtn');
        speedBtn.addEventListener('click', () => {
            this.timeScale = this.timeScale === 1.0 ? 1.75 : 1.0;
            speedBtn.textContent = this.timeScale === 1.0 ? '1x' : '2x';
            window.soundEngine.playClick();
        });

        // Delete Selected Item Key (Backspace / Delete)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedItem();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                this.togglePlayState();
            }
        });

        // Sound / BGM Toggles
        document.getElementById('sfxBtn').addEventListener('click', () => {
            const active = window.soundEngine.toggleSFX();
            document.getElementById('sfxBtn').textContent = active ? '🔊 SFX' : '🔇 SFX';
        });

        document.getElementById('bgmBtn').addEventListener('click', () => {
            const active = window.soundEngine.toggleBGM();
            document.getElementById('bgmBtn').textContent = active ? '🎵 Music' : '🔇 Music';
        });

        // Level Select Dialog
        document.getElementById('levelsBtn').addEventListener('click', () => {
            window.soundEngine.playClick();
            this.showLevelsModal();
        });

        // Sandbox Mode Toggle
        document.getElementById('sandboxBtn').addEventListener('click', () => {
            window.soundEngine.playClick();
            const sandboxDrawer = document.getElementById('sandboxToolbar');
            if (this.editor.isActive) {
                this.editor.stop();
                sandboxDrawer.classList.add('hidden');
                document.getElementById('sandboxBtn').textContent = '🛠 Sandbox';
                this.loadLevel(this.currentLevelIndex);
            } else {
                this.editor.start();
                sandboxDrawer.classList.remove('hidden');
                document.getElementById('sandboxBtn').textContent = '🎮 Campaign';
                this.updateHUD();
            }
        });

        // Sandbox tool picker
        document.querySelectorAll('.sandbox-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.getAttribute('data-tool');
                this.editor.setTool(tool);
                document.querySelectorAll('.sandbox-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.soundEngine.playClick();
            });
        });
    }

    renderInventoryDrawer() {
        const container = document.getElementById('inventoryItems');
        container.innerHTML = '';

        const levelData = GameLevels[this.currentLevelIndex];
        if (!levelData || this.editor.isActive) return;

        for (let item of levelData.inventory) {
            const count = this.inventoryCounts[item.type] || 0;
            const btn = document.createElement('button');
            btn.className = `inventory-card ${this.activeToolToPlace === item.type ? 'active' : ''} ${count === 0 ? 'disabled' : ''}`;
            btn.innerHTML = `
                <div class="card-icon">${item.type === 'cushion' ? '🛋️' : item.type === 'plank' ? '🪵' : '⚡'}</div>
                <div class="card-info">
                    <div class="card-title">${item.label}</div>
                    <div class="card-count">x${count}</div>
                </div>
            `;

            btn.addEventListener('click', () => {
                if (count > 0 && this.state === 'BUILD') {
                    this.activeToolToPlace = this.activeToolToPlace === item.type ? null : item.type;
                    this.selectedBody = null;
                    window.soundEngine.playClick();
                    this.renderInventoryDrawer();
                }
            });

            container.appendChild(btn);
        }
    }

    updateHUD() {
        const levelData = GameLevels[this.currentLevelIndex];
        if (!levelData) return;

        document.getElementById('levelTitle').textContent = levelData.title;
        document.getElementById('levelSubtitle').textContent = levelData.subtitle;
        document.getElementById('shapeBadge').textContent = `${levelData.shapeIcon} ${levelData.shapeBadge}`;

        // Stars display
        const starsContainer = document.getElementById('hudStars');
        starsContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = i < this.collectedStarsThisRun ? 'star-gold' : 'star-dim';
            span.textContent = '★';
            starsContainer.appendChild(span);
        }

        // Run/Reset Button styling
        const runBtn = document.getElementById('runBtn');
        if (this.state === 'BUILD') {
            runBtn.textContent = '▶ RUN PHYSICS';
            runBtn.className = 'btn btn-primary btn-run';
        } else {
            runBtn.textContent = '↺ RESET';
            runBtn.className = 'btn btn-secondary';
        }
    }

    showVictoryModal() {
        const modal = document.getElementById('victoryModal');
        const starsDisplay = document.getElementById('victoryStars');
        starsDisplay.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = i < this.collectedStarsThisRun ? 'star-gold pop-in' : 'star-dim';
            span.textContent = '★';
            starsDisplay.appendChild(span);
        }

        modal.classList.remove('hidden');

        document.getElementById('nextLevelBtn').onclick = () => {
            window.soundEngine.playClick();
            if (this.currentLevelIndex < GameLevels.length - 1) {
                this.loadLevel(this.currentLevelIndex + 1);
            } else {
                this.showLevelsModal();
            }
        };

        document.getElementById('replayVictoryBtn').onclick = () => {
            window.soundEngine.playClick();
            this.resetLevel();
        };
    }

    showDefeatModal() {
        const modal = document.getElementById('defeatModal');
        modal.classList.remove('hidden');

        document.getElementById('retryBtn').onclick = () => {
            window.soundEngine.playClick();
            this.resetLevel();
        };
    }

    showLevelsModal() {
        const modal = document.getElementById('levelsModal');
        const list = document.getElementById('levelsGrid');
        list.innerHTML = '';

        GameLevels.forEach((lvl, idx) => {
            const card = document.createElement('button');
            const stars = this.levelStars[idx] || 0;
            const isUnlocked = idx === 0 || (this.levelStars[idx - 1] !== undefined);

            card.className = `level-select-card ${idx === this.currentLevelIndex ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
            card.innerHTML = `
                <div class="level-num">${lvl.shapeIcon} Lvl ${lvl.id}</div>
                <div class="level-name">${lvl.title.replace(/Level \d+: /, '')}</div>
                <div class="level-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
            `;

            if (isUnlocked) {
                card.onclick = () => {
                    window.soundEngine.playClick();
                    this.loadLevel(idx);
                };
            }

            list.appendChild(card);
        });

        modal.classList.remove('hidden');
        document.getElementById('closeLevelsBtn').onclick = () => {
            window.soundEngine.playClick();
            modal.classList.add('hidden');
        };
    }

    hideModals() {
        document.getElementById('victoryModal').classList.add('hidden');
        document.getElementById('defeatModal').classList.add('hidden');
        document.getElementById('levelsModal').classList.add('hidden');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
