export class Bullet {
    constructor() {
        this.type = 'bullet';
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        
        // Radius remains at 10 for visibility
        this.radius = 10; 
        this.speed = 500;
        this.isActive = false; 
    }

    spawn(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.isActive = true;

        const angle = Math.atan2(targetY - startY, targetX - startX);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    despawn() {
        this.isActive = false;
    }

    update(dt) {
        if (!this.isActive) return;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Auto-despawn if they fly off the 1024x576 canvas screen boundaries
        if (this.x < -20 || this.x > 1044 || this.y < -20 || this.y > 596) {
            this.despawn();
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // --- LAYER 1: EARS (Fluffy White Triangles) ---
        ctx.fillStyle = '#ffffff'; // Pure White Fur
        
        // Left Ear
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-12, -14);
        ctx.lineTo(-2, -8);
        ctx.fill();

        // Right Ear
        ctx.beginPath();
        ctx.moveTo(10, -4);
        ctx.lineTo(12, -14);
        ctx.lineTo(2, -8);
        ctx.fill();
        
        // Inner Ear Pink Highlights
        ctx.fillStyle = '#ffb6c1'; // Soft Pink
        ctx.beginPath();
        ctx.moveTo(-9, -5);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-4, -7);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(9, -5);
        ctx.lineTo(10, -11);
        ctx.lineTo(4, -7);
        ctx.fill();

        // --- LAYER 2: THE FACE / HEAD MOUND ---
        ctx.fillStyle = '#f5f6fa'; // Soft Off-White/Silver for depth contour
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast clean white top layer
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -1, this.radius - 1, 0, Math.PI * 2);
        ctx.fill();

        // --- LAYER 3: EYES (Bright Blue Kitten Eyes) ---
        ctx.fillStyle = '#00a8ff'; 
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2); // Left Eye
        ctx.arc(4, -2, 2, 0, Math.PI * 2);  // Right Eye
        ctx.fill();

        // Tiny dark pupils for detail
        ctx.fillStyle = '#2f3640';
        ctx.beginPath();
        ctx.arc(-4, -2, 0.8, 0, Math.PI * 2);
        ctx.arc(4, -2, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // --- LAYER 4: LITTLE PINK SNOUT ---
        ctx.fillStyle = '#ffb6c1';
        ctx.beginPath();
        ctx.moveTo(-2, 2);
        ctx.lineTo(2, 2);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
