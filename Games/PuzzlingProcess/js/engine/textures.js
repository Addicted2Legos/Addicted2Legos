/**
 * Pop & Protect - Procedural Canvas Texture & Surface Renderer
 * Generates tactile, colorful, textured materials: felt, wood, gloss, metal, paper, crystal
 */

class TextureRenderer {
    constructor() {
        this.patternCache = {};
        this.initPatterns();
    }

    initPatterns() {
        // 1. Craft Paper / Blueprint Background Pattern
        const paperCanvas = document.createElement('canvas');
        paperCanvas.width = 64;
        paperCanvas.height = 64;
        const pCtx = paperCanvas.getContext('2d');

        // Warm paper base
        pCtx.fillStyle = '#1e2430';
        pCtx.fillRect(0, 0, 64, 64);

        // Soft grid lines
        pCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        pCtx.moveTo(0, 0); pCtx.lineTo(64, 0);
        pCtx.moveTo(0, 0); pCtx.lineTo(0, 64);
        pCtx.stroke();

        // Subtle noise specks
        for (let i = 0; i < 40; i++) {
            const nx = Math.random() * 64;
            const ny = Math.random() * 64;
            const alpha = 0.02 + Math.random() * 0.04;
            pCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            pCtx.fillRect(nx, ny, 1.5, 1.5);
        }
        this.paperPatternCanvas = paperCanvas;

        // 2. Wood Grain Pattern
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 60;
        woodCanvas.height = 60;
        const wCtx = woodCanvas.getContext('2d');
        wCtx.fillStyle = '#C47B36';
        wCtx.fillRect(0, 0, 60, 60);
        wCtx.strokeStyle = 'rgba(120, 60, 15, 0.25)';
        wCtx.lineWidth = 2;
        for (let y = 5; y < 60; y += 8) {
            wCtx.beginPath();
            wCtx.moveTo(0, y + Math.sin(y) * 2);
            wCtx.bezierCurveTo(20, y - 3, 40, y + 4, 60, y + Math.sin(y) * 2);
            wCtx.stroke();
        }
        this.woodPatternCanvas = woodCanvas;

        // 3. Stitched Felt Texture (for cushions)
        const feltCanvas = document.createElement('canvas');
        feltCanvas.width = 32;
        feltCanvas.height = 32;
        const fCtx = feltCanvas.getContext('2d');
        fCtx.fillStyle = '#2ECC71';
        fCtx.fillRect(0, 0, 32, 32);
        // Micro felt fiber flecks
        for (let i = 0; i < 30; i++) {
            fCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
            fCtx.fillRect(Math.random() * 32, Math.random() * 32, 1.5, 1.5);
        }
        this.feltPatternCanvas = feltCanvas;

        // 4. Brushed Steel Hazard Pattern
        const metalCanvas = document.createElement('canvas');
        metalCanvas.width = 32;
        metalCanvas.height = 32;
        const mCtx = metalCanvas.getContext('2d');
        mCtx.fillStyle = '#4A5568';
        mCtx.fillRect(0, 0, 32, 32);
        mCtx.strokeStyle = 'rgba(255,255,255,0.07)';
        mCtx.lineWidth = 1;
        for (let x = 0; x < 32; x += 4) {
            mCtx.beginPath();
            mCtx.moveTo(x, 0);
            mCtx.lineTo(x + 16, 32);
            mCtx.stroke();
        }
        this.metalPatternCanvas = metalCanvas;
    }

    renderBackground(ctx, width, height) {
        if (!this.paperPattern) {
            this.paperPattern = ctx.createPattern(this.paperPatternCanvas, 'repeat');
        }
        ctx.fillStyle = this.paperPattern;
        ctx.fillRect(0, 0, width, height);

        // Vignette gradient
        const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.8);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    renderCircle(ctx, body, time, nearestHazardDist = 999) {
        ctx.save();
        ctx.translate(body.pos.x, body.pos.y);
        ctx.rotate(body.angle + body.squishAngle);
        ctx.scale(body.squishX, body.squishY);

        const r = body.radius;

        // Outer soft drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;

        // Base glossy sphere 3D sphere gradient
        const lightOffset = Vec2.rotate(new Vec2(-r * 0.35, -r * 0.35), -body.angle);
        const grad = ctx.createRadialGradient(
            lightOffset.x, lightOffset.y, r * 0.1,
            0, 0, r
        );

        if (body.isVulnerable) {
            // Cute bubbly pink/coral/cyan candy gradient
            grad.addColorStop(0, '#FFF5F8');
            grad.addColorStop(0.2, '#FF7AA2');
            grad.addColorStop(0.75, '#E91E63');
            grad.addColorStop(1, '#9C1242');
        } else {
            grad.addColorStop(0, '#E1F5FE');
            grad.addColorStop(0.3, '#4FC3F7');
            grad.addColorStop(0.8, '#0288D1');
            grad.addColorStop(1, '#01579B');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Clear shadow for interior details
        ctx.shadowColor = 'transparent';

        // Inner rim glow / translucency
        const innerGlow = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
        innerGlow.addColorStop(0, 'rgba(255,255,255,0)');
        innerGlow.addColorStop(0.9, 'rgba(255,255,255,0.25)');
        innerGlow.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Specular glossy highlight pill
        ctx.save();
        ctx.translate(lightOffset.x * 0.8, lightOffset.y * 0.8);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.35, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Secondary bottom specular bounce reflection
        ctx.save();
        ctx.translate(-lightOffset.x * 0.6, -lightOffset.y * 0.6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.25, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // EXPRESSIVE CUTE FACE FOR CIRCLE
        if (body.isVulnerable) {
            this.renderCircleFace(ctx, body, r, time, nearestHazardDist);
        }

        ctx.restore();
    }

    renderCircleFace(ctx, body, r, time, nearestHazardDist) {
        // Face orientation (keep eyes generally upright even when body rolls)
        ctx.save();
        ctx.rotate(-body.angle - body.squishAngle); // upright face

        const isScared = nearestHazardDist < 85;
        const isBlinking = (Math.sin(time * 2) > 0.96) && !isScared;

        const eyeOffsetX = r * 0.28;
        const eyeOffsetY = -r * 0.12;
        const eyeRadius = isScared ? r * 0.22 : r * 0.18;

        // Sweat drop if scared
        if (isScared) {
            ctx.fillStyle = '#64B5F6';
            ctx.beginPath();
            ctx.ellipse(r * 0.6, -r * 0.4, 3, 5, Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        for (let side of [-1, 1]) {
            const ex = side * eyeOffsetX;
            const ey = eyeOffsetY;

            if (isBlinking) {
                // Closed eye happy curve
                ctx.strokeStyle = '#2A0815';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(ex, ey + 2, eyeRadius * 0.7, Math.PI * 1.1, Math.PI * 1.9);
                ctx.stroke();
            } else {
                // White sclera
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
                ctx.fill();

                // Pupil looking towards movement or danger
                let lookX = 0;
                let lookY = 0;
                if (body.vel.lengthSq() > 10) {
                    const dir = body.vel.normalized();
                    lookX = dir.x * (eyeRadius * 0.4);
                    lookY = dir.y * (eyeRadius * 0.4);
                }

                ctx.fillStyle = '#1A0510';
                ctx.beginPath();
                ctx.arc(ex + lookX, ey + lookY, eyeRadius * 0.6, 0, Math.PI * 2);
                ctx.fill();

                // Eye sparkle highlight
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(ex + lookX - eyeRadius * 0.2, ey + lookY - eyeRadius * 0.2, eyeRadius * 0.25, 0, Math.PI * 2);
                ctx.fill();
            }

            // Rosy cheeks
            ctx.fillStyle = 'rgba(255, 100, 140, 0.45)';
            ctx.beginPath();
            ctx.arc(side * (eyeOffsetX * 1.35), eyeOffsetY + r * 0.28, r * 0.14, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mouth
        ctx.strokeStyle = '#2A0815';
        ctx.fillStyle = '#FF5252';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        if (isScared) {
            // Open 'O' shock mouth
            ctx.beginPath();
            ctx.ellipse(0, eyeOffsetY + r * 0.36, r * 0.16, r * 0.22, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
        } else {
            // Happy cute smile
            ctx.beginPath();
            ctx.arc(0, eyeOffsetY + r * 0.25, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderPolygon(ctx, body, time) {
        if (!body.worldVertices || body.worldVertices.length < 3) return;

        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        const verts = body.worldVertices;
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) {
            ctx.lineTo(verts[i].x, verts[i].y);
        }
        ctx.closePath();

        // Fill based on material texture
        if (body.texture === 'felt' || body.isCushion) {
            if (!this.feltPattern) this.feltPattern = ctx.createPattern(this.feltPatternCanvas, 'repeat');
            ctx.fillStyle = this.feltPattern;
            ctx.fill();

            // Bevel stroke & felt stitches
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#27AE60';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Decorative inner dashed stitch line
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

        } else if (body.texture === 'wood') {
            if (!this.woodPattern) this.woodPattern = ctx.createPattern(this.woodPatternCanvas, 'repeat');
            ctx.fillStyle = this.woodPattern;
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2.5;
            ctx.stroke();

        } else if (body.texture === 'metal' || body.isSharpHazard) {
            // Hazard metallic or warning orange gradient
            const grad = ctx.createLinearGradient(
                verts[0].x, verts[0].y,
                verts[Math.floor(verts.length / 2)].x, verts[Math.floor(verts.length / 2)].y
            );

            if (verts.length === 3) {
                // Triangle (Danger Amber / Crimson)
                grad.addColorStop(0, '#FF5722');
                grad.addColorStop(0.5, '#E64A19');
                grad.addColorStop(1, '#BF360C');
            } else if (verts.length === 4) {
                // Square Box (Heavy Slate / Gold-riveted Industrial Crate)
                grad.addColorStop(0, '#546E7A');
                grad.addColorStop(0.5, '#37474F');
                grad.addColorStop(1, '#263238');
            } else {
                // Multi-pointed Spiky Star (Toxic Purple / Neon Blade)
                grad.addColorStop(0, '#AB47BC');
                grad.addColorStop(0.5, '#7B1FA2');
                grad.addColorStop(1, '#4A148C');
            }

            ctx.fillStyle = grad;
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw crate / polygon internal reinforcement diagonal lines
            if (verts.length === 4) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(verts[0].x, verts[0].y); ctx.lineTo(verts[2].x, verts[2].y);
                ctx.moveTo(verts[1].x, verts[1].y); ctx.lineTo(verts[3].x, verts[3].y);
                ctx.stroke();

                // Corner metallic rivet caps
                ctx.fillStyle = '#CFD8DC';
                for (let v of verts) {
                    const inset = Vec2.lerp(v, body.pos, 0.2);
                    ctx.beginPath();
                    ctx.arc(inset.x, inset.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // GLEAMING SHARP SPIKE CORNER HIGHLIGHTS!
            // Visually communicates to the player: "WATCH OUT, THESE CORNERS ARE LETHAL!"
            if (body.isSharpHazard) {
                ctx.save();
                for (let i = 0; i < verts.length; i++) {
                    const v = verts[i];
                    const angleDeg = body.sharpCornerAngles[i] || 60;
                    if (angleDeg < 110) {
                        // Sharp point glimmer
                        const glintSize = 5 + Math.sin(time * 5 + i) * 2;
                        const tipDir = Vec2.sub(v, body.pos).normalize();
                        const glintGrad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, glintSize);
                        glintGrad.addColorStop(0, '#FFFFFF');
                        glintGrad.addColorStop(0.4, '#FFEB3B');
                        glintGrad.addColorStop(1, 'rgba(255, 235, 59, 0)');

                        ctx.fillStyle = glintGrad;
                        ctx.beginPath();
                        ctx.arc(v.x, v.y, glintSize, 0, Math.PI * 2);
                        ctx.fill();

                        // Tiny spark cross
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(v.x - glintSize * 0.8, v.y);
                        ctx.lineTo(v.x + glintSize * 0.8, v.y);
                        ctx.moveTo(v.x, v.y - glintSize * 0.8);
                        ctx.lineTo(v.x, v.y + glintSize * 0.8);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

        } else {
            // Default flat/colored polygon
            ctx.fillStyle = body.color || '#3498DB';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    renderJoint(ctx, joint) {
        if (joint.isCut) return;

        const pa = joint.getWorldPointA();
        const pb = joint.getWorldPointB();

        ctx.save();
        ctx.strokeStyle = joint.color || '#8D6E63';
        ctx.lineWidth = joint.isRope ? 4 : 5;
        ctx.lineCap = 'round';

        // Hemp rope braided dashes
        if (joint.isRope) {
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();

            ctx.strokeStyle = '#D7CCC8';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
        } else {
            // Steel rod / beam
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
        }

        // Anchor pins
        ctx.fillStyle = '#37474F';
        ctx.beginPath(); ctx.arc(pa.x, pa.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(pb.x, pb.y, 4, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    renderGoalPortal(ctx, body, time) {
        ctx.save();
        ctx.translate(body.pos.x, body.pos.y);

        const r = body.radius || 32;

        // Outer cosmic energy aura
        const auraGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
        auraGrad.addColorStop(0, 'rgba(0, 230, 118, 0.8)');
        auraGrad.addColorStop(0.5, 'rgba(0, 176, 255, 0.4)');
        auraGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Swirling spiral rings
        ctx.save();
        ctx.rotate(time * 2.5);
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.strokeStyle = i % 2 === 0 ? '#00E676' : '#00B0FF';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * (0.5 + i * 0.12), 0, Math.PI * 0.75);
            ctx.stroke();
        }
        ctx.restore();

        // Portal center core
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.5, '#69F0AE');
        coreGrad.addColorStop(1, '#00C853');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing chevron / arrow entering portal
        ctx.save();
        const bounce = Math.sin(time * 6) * 4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, -4 + bounce);
        ctx.lineTo(0, 6 + bounce);
        ctx.lineTo(8, -4 + bounce);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    renderStarCollectible(ctx, body, time) {
        if (body.isCollected) return;

        ctx.save();
        ctx.translate(body.pos.x, body.pos.y);
        ctx.rotate(Math.sin(time * 2) * 0.15);

        const floatY = Math.sin(time * 4) * 3;
        ctx.translate(0, floatY);

        const r = body.radius || 16;
        const spikes = 5;
        const outerR = r;
        const innerR = r * 0.45;

        // Halo
        const glow = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR * 1.6);
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Star 3D shape
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        ctx.moveTo(0, -outerR);
        for (let i = 0; i < spikes; i++) {
            let x = Math.cos(rot) * outerR;
            let y = Math.sin(rot) * outerR;
            ctx.lineTo(x, y);
            rot += step;

            x = Math.cos(rot) * innerR;
            y = Math.sin(rot) * innerR;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(0, -outerR);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(-2, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

window.TextureRenderer = TextureRenderer;
