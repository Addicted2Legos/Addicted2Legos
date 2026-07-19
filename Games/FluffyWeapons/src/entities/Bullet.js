export class Bullet {
    constructor() {
        this.type = 'bullet';
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 4;
        this.speed = 500;
        
        // This acts as our allocation gate toggle
        this.isActive = false; 
    }

    // Call this to wake up an idle pool object instead of running 'new Bullet()'
    spawn(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.isActive = true;

        const angle = Math.atan2(targetY - startY, targetX - startX);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    // Call this instead of deleting the instance
    despawn() {
        this.isActive = false;
    }

    update(dt) {
        if (!this.isActive) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Clean up boundary check: Flag as dead if it leaves the massive world coordinates
        if (this.x < 0 || this.x > 3000 || this.y < 0 || this.y > 2000) {
            this.despawn();
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

