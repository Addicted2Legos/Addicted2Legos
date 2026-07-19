export class Enemy {
    constructor() {
        this.type = 'enemy';
        this.x = 0;
        this.y = 0;
        this.width = 32;
        this.height = 32;
        this.speed = 100;
        this.hp = 0;
        
        this.isActive = false;
    }

    // Initialize position and stats when recycled out of the pool
    spawn(startX, startY, hp = 1) {
        this.x = startX;
        this.y = startY;
        this.hp = hp;
        this.isActive = true;
    }

    despawn() {
        this.isActive = false;
    }

    // Simple AI behavior: Move toward the player coordinates
    update(dt, playerX, playerY) {
        if (!this.isActive) return;

        // Calculate direct path angle to the player avatar
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * this.speed * dt;
        this.y += Math.sin(angle) * this.speed * dt;

        // Custom condition: Check if enemy health dropped below zero
        if (this.hp <= 0) {
            this.despawn();
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.fillStyle = '#ff3333';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}