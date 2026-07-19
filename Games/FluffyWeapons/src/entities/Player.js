export class Player {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.width = 40;
        this.height = 40;
        
        // Simple input tracking layout
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update(dt) {
        // Move smoothly independent of frame rates using delta time (dt)
        if (this.keys['w'] || this.keys['arrowup']) this.y -= this.speed * dt;
        if (this.keys['s'] || this.keys['arrowdown']) this.y += this.speed * dt;
        if (this.keys['a'] || this.keys['arrowleft']) this.x -= this.speed * dt;
        if (this.keys['d'] || this.keys['arrowright']) this.x += this.speed * dt;
    }

    draw(ctx) {
        // Fallback placeholder rectangle until you link a real sprite image
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}