/**
 * Pop & Protect - Game Entities & Factory Builders
 */

class EntityFactory {
    // 1. PROTAGONIST: The Vulnerable Cute Circle
    static createCircle(x, y, radius = 22, options = {}) {
        return new Body({
            type: 'circle',
            pos: new Vec2(x, y),
            radius: radius,
            mass: options.mass || 1.0,
            restitution: options.restitution !== undefined ? options.restitution : 0.5,
            friction: 0.25,
            isVulnerable: true,
            isSharpHazard: false,
            label: 'Protagonist Circle',
            texture: 'candy',
            ...options
        });
    }

    // 2. HAZARD: Pointy Triangle (Level 2+)
    static createTriangle(x, y, size = 35, options = {}) {
        // Equilateral / Isosceles sharp triangle
        const h = size * (Math.sqrt(3) / 2);
        const vertices = [
            new Vec2(0, -h * 0.65),       // Top sharp peak
            new Vec2(size * 0.55, h * 0.35), // Bottom right corner
            new Vec2(-size * 0.55, h * 0.35) // Bottom left corner
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            mass: options.mass || 1.5,
            restitution: options.restitution !== undefined ? options.restitution : 0.3,
            friction: 0.35,
            isSharpHazard: true,
            label: 'Pointy Triangle',
            texture: 'metal',
            ...options
        });
    }

    // 3. HAZARD: Heavy Square / Crate (Level 3+)
    static createSquare(x, y, width = 45, height = 45, options = {}) {
        const hw = width / 2;
        const hh = height / 2;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            mass: options.mass || 3.0,
            restitution: options.restitution !== undefined ? options.restitution : 0.2,
            friction: 0.45,
            isSharpHazard: true,
            label: 'Heavy Crate',
            texture: 'metal',
            ...options
        });
    }

    // 4. HAZARD: Spiky Star (Level 4+)
    static createSpikyStar(x, y, outerR = 30, innerR = 12, points = 5, options = {}) {
        const vertices = [];
        let rot = -Math.PI / 2;
        const step = Math.PI / points;
        for (let i = 0; i < points; i++) {
            vertices.push(new Vec2(Math.cos(rot) * outerR, Math.sin(rot) * outerR));
            rot += step;
            vertices.push(new Vec2(Math.cos(rot) * innerR, Math.sin(rot) * innerR));
            rot += step;
        }

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            mass: options.mass || 2.0,
            restitution: 0.3,
            friction: 0.4,
            isSharpHazard: true,
            label: 'Spiky Saw Star',
            texture: 'metal',
            ...options
        });
    }

    // 5. PROTECTIVE TOOL: Rubber / Felt Cushion (Safe Pillows)
    static createCushion(x, y, width = 70, height = 24, angle = 0, options = {}) {
        const hw = width / 2;
        const hh = height / 2;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            angle: angle,
            isStatic: options.isStatic !== undefined ? options.isStatic : true,
            restitution: 0.75, // Soft bouncy absorption
            friction: 0.6,
            isCushion: true,
            isSharpHazard: false,
            label: 'Safety Cushion',
            texture: 'felt',
            ...options
        });
    }

    // 6. PROTECTIVE TOOL: Wooden Plank / Deflector Ramp
    static createPlank(x, y, width = 110, height = 16, angle = 0, options = {}) {
        const hw = width / 2;
        const hh = height / 2;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            angle: angle,
            isStatic: options.isStatic !== undefined ? options.isStatic : true,
            restitution: 0.3,
            friction: 0.3,
            isCushion: false,
            isSharpHazard: false,
            label: 'Wood Plank',
            texture: 'wood',
            ...options
        });
    }

    // 7. GIZMO: Spring Bouncer Pad
    static createSpringPad(x, y, width = 60, angle = 0, options = {}) {
        const hw = width / 2;
        const hh = 12;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            angle: angle,
            isStatic: true,
            restitution: 1.4, // High impulse bounce!
            friction: 0.2,
            isCushion: true,
            label: 'Spring Pad',
            color: '#FF9800',
            texture: 'felt',
            ...options
        });
    }

    // 8. GIZMO: Air Fan Stream
    static createFan(x, y, width = 45, height = 30, angle = 0, forceMag = 750, range = 220) {
        const hw = width / 2;
        const hh = height / 2;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        const fanBody = new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            angle: angle,
            isStatic: true,
            label: 'Air Fan',
            color: '#00BCD4',
            texture: 'metal'
        });

        fanBody.isFan = true;
        fanBody.fanForce = forceMag;
        fanBody.fanRange = range;
        fanBody.fanDir = Vec2.rotate(new Vec2(0, -1), angle); // blows outward along -Y local
        return fanBody;
    }

    // 9. GOAL PORTAL
    static createGoal(x, y, radius = 28) {
        return new Body({
            type: 'circle',
            pos: new Vec2(x, y),
            radius: radius,
            isStatic: true,
            isSensor: true,
            isGoal: true,
            label: 'Goal Portal'
        });
    }

    // 10. BONUS COLLECTIBLE STAR
    static createBonusStar(x, y) {
        const star = new Body({
            type: 'circle',
            pos: new Vec2(x, y),
            radius: 16,
            isStatic: true,
            isSensor: true,
            isStar: true,
            label: 'Bonus Star'
        });
        star.isCollected = false;
        return star;
    }

    // 11. STATIC ENVIRONMENT WALL / PLATFORM
    static createWall(x, y, width, height, angle = 0, color = '#2C3E50') {
        const hw = width / 2;
        const hh = height / 2;
        const vertices = [
            new Vec2(-hw, -hh),
            new Vec2(hw, -hh),
            new Vec2(hw, hh),
            new Vec2(-hw, hh)
        ];

        return new Body({
            type: 'polygon',
            pos: new Vec2(x, y),
            vertices: vertices,
            angle: angle,
            isStatic: true,
            restitution: 0.25,
            friction: 0.4,
            isSharpHazard: false,
            label: 'Platform Wall',
            color: color,
            texture: 'metal'
        });
    }
}

window.EntityFactory = EntityFactory;
