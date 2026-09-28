/**
 * Pop & Protect - Particle System
 * Juicy visual feedback for pops, bounces, sparks, dust, and victory confetti
 */

class Particle {
    constructor(options = {}) {
        this.pos = options.pos ? options.pos.clone() : new Vec2();
        this.vel = options.vel ? options.vel.clone() : new Vec2((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        this.gravity = options.gravity !== undefined ? options.gravity : 500;
        this.drag = options.drag || 0.98;
        this.color = options.color || '#FF4081';
        this.size = options.size || 5;
        this.alpha = 1.0;
        this.life = 0;
        this.maxLife = options.maxLife || 1.0;
        this.shape = options.shape || 'circle'; // 'circle', 'rect', 'star', 'ring', 'droplet'
        this.angle = options.angle || Math.random() * Math.PI * 2;
        this.angularVel = options.angularVel || (Math.random() - 0.5) * 10;
        this.scale = 1.0;
    }

    update(dt) {
        this.life += dt;
        if (this.life >= this.maxLife) return false;

        this.vel.y += this.gravity * dt;
        this.vel.scale(this.drag);
        this.pos.add(Vec2.scale(this.vel, dt));

        this.angle += this.angularVel * dt;
        this.alpha = 1.0 - (this.life / this.maxLife);

        if (this.shape === 'ring') {
            this.scale += dt * 3.5;
        }

        return true;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        const currentSize = this.size * this.scale;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'rect') {
            ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize * 1.5);
        } else if (this.shape === 'droplet') {
            ctx.beginPath();
            ctx.moveTo(0, -currentSize);
            ctx.bezierCurveTo(currentSize * 0.8, -currentSize * 0.2, currentSize * 0.8, currentSize, 0, currentSize);
            ctx.bezierCurveTo(-currentSize * 0.8, currentSize, -currentSize * 0.8, -currentSize * 0.2, 0, -currentSize);
            ctx.fill();
        } else if (this.shape === 'ring') {
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.shape === 'star') {
            ctx.beginPath();
            const spikes = 4;
            let rot = Math.PI / 2 * 3;
            let step = Math.PI / spikes;
            ctx.moveTo(0, -currentSize);
            for (let i = 0; i < spikes; i++) {
                ctx.lineTo(Math.cos(rot) * currentSize, Math.sin(rot) * currentSize);
                rot += step;
                ctx.lineTo(Math.cos(rot) * (currentSize * 0.3), Math.sin(rot) * (currentSize * 0.3));
                rot += step;
            }
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (!this.particles[i].update(dt)) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (let p of this.particles) {
            p.render(ctx);
        }
    }

    clear() {
        this.particles = [];
    }

    // Balloon / Circle Pop Explosion
    emitPop(pos, color = '#FF4081') {
        const colors = [color, '#FF80AB', '#FF4081', '#F50057', '#FFFFFF', '#FFD700', '#00E5FF'];
        
        // 1. Shockwave ring
        this.particles.push(new Particle({
            pos: pos.clone(),
            vel: new Vec2(),
            gravity: 0,
            color: '#FFFFFF',
            size: 15,
            maxLife: 0.35,
            shape: 'ring'
        }));

        // 2. High-speed liquid droplets & rubber shards
        for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 450;
            const chosenColor = colors[Math.floor(Math.random() * colors.length)];
            const isDroplet = Math.random() > 0.5;

            this.particles.push(new Particle({
                pos: pos.clone(),
                vel: new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed),
                gravity: 600,
                drag: 0.96,
                color: chosenColor,
                size: 3 + Math.random() * 6,
                maxLife: 0.6 + Math.random() * 0.8,
                shape: isDroplet ? 'droplet' : 'rect',
                angularVel: (Math.random() - 0.5) * 20
            }));
        }

        // 3. Central bright flash spark
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.particles.push(new Particle({
                pos: pos.clone(),
                vel: new Vec2(Math.cos(angle) * 300, Math.sin(angle) * 300),
                gravity: 0,
                color: '#FFF59D',
                size: 6,
                maxLife: 0.25,
                shape: 'star'
            }));
        }
    }

    // Metal / Stone Sharp Collision Sparks
    emitSparks(pos, normal = null, count = 8) {
        for (let i = 0; i < count; i++) {
            let baseAngle = normal ? normal.angle() : Math.random() * Math.PI * 2;
            let spreadAngle = baseAngle + (Math.random() - 0.5) * 1.5;
            let speed = 100 + Math.random() * 250;

            this.particles.push(new Particle({
                pos: pos.clone(),
                vel: new Vec2(Math.cos(spreadAngle) * speed, Math.sin(spreadAngle) * speed),
                gravity: 400,
                drag: 0.94,
                color: Math.random() > 0.3 ? '#FFE082' : '#FFFFFF',
                size: 2 + Math.random() * 2.5,
                maxLife: 0.25 + Math.random() * 0.3,
                shape: 'circle'
            }));
        }
    }

    // Heavy Impact Dust Puff
    emitDust(pos, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * 1.5; // upward spray
            const speed = 40 + Math.random() * 120;
            this.particles.push(new Particle({
                pos: pos.clone(),
                vel: new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed),
                gravity: -40, // slow float up
                drag: 0.92,
                color: 'rgba(200, 214, 229, 0.45)',
                size: 5 + Math.random() * 7,
                maxLife: 0.4 + Math.random() * 0.4,
                shape: 'circle'
            }));
        }
    }

    // Portal Suction Trail
    emitPortalSuction(portalPos, r = 40) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = r * (1.2 + Math.random() * 0.8);
        const spawnPos = new Vec2(portalPos.x + Math.cos(angle) * spawnDist, portalPos.y + Math.sin(angle) * spawnDist);
        const toCenter = Vec2.sub(portalPos, spawnPos).normalize();

        this.particles.push(new Particle({
            pos: spawnPos,
            vel: Vec2.scale(toCenter, 80 + Math.random() * 100),
            gravity: 0,
            drag: 0.99,
            color: Math.random() > 0.5 ? '#69F0AE' : '#40C4FF',
            size: 2.5 + Math.random() * 3,
            maxLife: 0.5,
            shape: 'circle'
        }));
    }

    // Victory Confetti Shower
    emitVictoryConfetti(width, height) {
        const colors = ['#FF1744', '#00E676', '#2979FF', '#FFEA00', '#E040FB', '#00E5FF'];
        for (let i = 0; i < 90; i++) {
            const startX = Math.random() * width;
            const startY = -20 - Math.random() * 100;
            this.particles.push(new Particle({
                pos: new Vec2(startX, startY),
                vel: new Vec2((Math.random() - 0.5) * 150, 100 + Math.random() * 250),
                gravity: 120,
                drag: 0.99,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 6 + Math.random() * 6,
                maxLife: 3.5 + Math.random() * 1.5,
                shape: Math.random() > 0.3 ? 'rect' : 'star',
                angularVel: (Math.random() - 0.5) * 12
            }));
        }
    }
}

window.ParticleSystem = ParticleSystem;
