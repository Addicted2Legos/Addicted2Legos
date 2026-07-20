export class Player {
    constructor(x, y, speed) {
        this.type = 'player';
        this.x = x;
        this.y = y;
        this.speed = speed;
        
        this.width = 48;
        this.height = 48;
        this.hp = 3; // Start with 3 life points
        
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update(dt) {
        if (this.keys['w'] || this.keys['arrowup']) this.y -= this.speed * dt;
        if (this.keys['s'] || this.keys['arrowdown']) this.y += this.speed * dt;
        if (this.keys['a'] || this.keys['arrowleft']) this.x -= this.speed * dt;
        if (this.keys['d'] || this.keys['arrowright']) this.x += this.speed * dt;

        // Keep the player clamped cleanly inside the visible 1024x576 canvas boundaries
        this.x = Math.max(0, Math.min(this.x, 1024 - this.width));
        this.y = Math.max(0, Math.min(this.y, 576 - this.height));
    }

    draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // --- LAYER 1: MECHANICAL LEGS & TREADS (Dark Charcoal Gray) ---
        ctx.fillStyle = '#2d3238';
        // Left Leg & Foot pad
        ctx.fillRect(cx - 20, cy - 8, 8, 20);
        ctx.fillRect(cx - 24, cy + 10, 12, 6);
        // Right Leg & Foot pad
        ctx.fillRect(cx + 12, cy - 8, 8, 20);
        ctx.fillRect(cx + 12, cy + 10, 12, 6);

        // --- LAYER 2: ARMORED MAIN CHASSIS BODY (Military Steel Blue/Gray) ---
        ctx.fillStyle = '#5a6b7c';
        ctx.strokeStyle = '#3a4652';
        ctx.lineWidth = 2;
        
        // Main core fuselage box
        ctx.fillRect(cx - 14, cy - 16, 28, 26);
        ctx.strokeRect(cx - 14, cy - 16, 28, 26);

        // --- LAYER 3: DUAL SHOULDER WEAPON PODS (Heavy Tech Accent) ---
        ctx.fillStyle = '#414e5c';
        // Left Missile Launcher Box
        ctx.fillRect(cx - 24, cy - 18, 10, 14);
        ctx.strokeRect(cx - 24, cy - 18, 10, 14);
        // Right Missile Launcher Box
        ctx.fillRect(cx + 14, cy - 18, 10, 14);
        ctx.strokeRect(cx + 14, cy - 18, 10, 14);

        // --- LAYER 4: LASER CANNON WEAPON BARRELS (Extending Forward) ---
        ctx.fillStyle = '#8b9bb4';
        // Left Autocannon extension
        ctx.fillRect(cx - 20, cy - 28, 4, 12);
        // Right Autocannon extension
        ctx.fillRect(cx + 16, cy - 28, 4, 12);

        // --- LAYER 5: COCKPIT VISOR GLASS (Glow Cyan tint) ---
        ctx.fillStyle = '#00f3ff';
        // Angled high tech center optics glass window viewport
        ctx.fillRect(cx - 8, cy - 10, 16, 6);
        
        // Micro warning light emitter dots on weapon housings
        ctx.fillStyle = '#ff2a2a';
        ctx.fillRect(cx - 21, cy - 14, 3, 3);
        ctx.fillRect(cx + 18, cy - 14, 3, 3);
    }
}