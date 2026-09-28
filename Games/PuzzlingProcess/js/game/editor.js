/**
 * Pop & Protect - Custom Level Sandbox & Editor System
 */

class LevelEditor {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.selectedTool = 'cushion'; // 'circle', 'triangle', 'square', 'star', 'cushion', 'plank', 'spring', 'fan', 'goal', 'star_coin', 'wall', 'delete'
        this.customEntities = [];
    }

    start() {
        this.isActive = true;
        this.game.isSandboxMode = true;
        this.game.resetLevel();
    }

    stop() {
        this.isActive = false;
        this.game.isSandboxMode = false;
    }

    setTool(toolName) {
        this.selectedTool = toolName;
    }

    handleCanvasClick(x, y) {
        if (!this.isActive) return;

        // Snapping to 20px grid
        const snapX = Math.round(x / 20) * 20;
        const snapY = Math.round(y / 20) * 20;

        if (this.selectedTool === 'delete') {
            // Remove clicked body
            for (let i = this.game.world.bodies.length - 1; i >= 0; i--) {
                const b = this.game.world.bodies[i];
                if (b.pos.dist(new Vec2(x, y)) < (b.radius || 30)) {
                    this.game.world.removeBody(b);
                    window.soundEngine.playSlice();
                    return;
                }
            }
            return;
        }

        let newBody = null;
        switch (this.selectedTool) {
            case 'circle':
                newBody = EntityFactory.createCircle(snapX, snapY, 20);
                this.game.protagonist = newBody;
                break;
            case 'triangle':
                newBody = EntityFactory.createTriangle(snapX, snapY, 38);
                break;
            case 'square':
                newBody = EntityFactory.createSquare(snapX, snapY, 44, 44);
                break;
            case 'star':
                newBody = EntityFactory.createSpikyStar(snapX, snapY, 28, 12, 5);
                break;
            case 'cushion':
                newBody = EntityFactory.createCushion(snapX, snapY, 70, 24, 0, { isPlayerPlaced: true });
                break;
            case 'plank':
                newBody = EntityFactory.createPlank(snapX, snapY, 110, 16, 0, { isPlayerPlaced: true });
                break;
            case 'spring':
                newBody = EntityFactory.createSpringPad(snapX, snapY, 60, 0, { isPlayerPlaced: true });
                break;
            case 'fan':
                newBody = EntityFactory.createFan(snapX, snapY, 50, 30, 0);
                break;
            case 'goal':
                newBody = EntityFactory.createGoal(snapX, snapY, 30);
                break;
            case 'star_coin':
                newBody = EntityFactory.createBonusStar(snapX, snapY);
                break;
            case 'wall':
                newBody = EntityFactory.createWall(snapX, snapY, 140, 20, 0);
                break;
        }

        if (newBody) {
            this.game.world.addBody(newBody);
            window.soundEngine.playClick();
        }
    }

    exportLevelJSON() {
        const serializable = this.game.world.bodies.map(b => ({
            type: b.type,
            pos: { x: b.pos.x, y: b.pos.y },
            angle: b.angle,
            isStatic: b.isStatic,
            isVulnerable: b.isVulnerable,
            isSharpHazard: b.isSharpHazard,
            isCushion: b.isCushion,
            isGoal: b.isGoal,
            isStar: b.isStar,
            isFan: b.isFan,
            texture: b.texture,
            radius: b.radius,
            localVertices: b.localVertices.map(v => ({ x: v.x, y: v.y }))
        }));
        return JSON.stringify(serializable, null, 2);
    }

    importLevelJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            this.game.world.clear();
            for (let item of data) {
                const vertices = item.localVertices ? item.localVertices.map(v => new Vec2(v.x, v.y)) : [];
                const b = new Body({
                    type: item.type,
                    pos: new Vec2(item.pos.x, item.pos.y),
                    angle: item.angle,
                    isStatic: item.isStatic,
                    isVulnerable: item.isVulnerable,
                    isSharpHazard: item.isSharpHazard,
                    isCushion: item.isCushion,
                    isGoal: item.isGoal,
                    isStar: item.isStar,
                    texture: item.texture,
                    radius: item.radius,
                    vertices: vertices
                });
                if (item.isFan) {
                    b.isFan = true;
                    b.fanForce = 800;
                    b.fanRange = 250;
                    b.fanDir = Vec2.rotate(new Vec2(0, -1), item.angle);
                }
                if (b.isVulnerable) {
                    this.game.protagonist = b;
                }
                this.game.world.addBody(b);
            }
            window.soundEngine.playWin();
            return true;
        } catch (e) {
            console.error('Failed to import level JSON', e);
            return false;
        }
    }
}

window.LevelEditor = LevelEditor;
