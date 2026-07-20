import { Bullet } from './Bullet.js';
import { Enemy } from './Enemy.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.entities = []; // For non-pooled items if needed later
        
        this.bulletPool = [];
        this.enemyPool = [];
        
        this.maxBullets = 150;
        this.maxEnemies = 50;
        this.spawnTimer = 0;
        this.spawnInterval = 1.5;

        // Correctly populate the arrays on startup
        for (let i = 0; i < this.maxBullets; i++) {
            this.bulletPool.push(new Bullet());
        }
        for (let i = 0; i < this.maxEnemies; i++) {
            this.enemyPool.push(new Enemy());
        }
    }

    fireBullet(startX, startY) {
        let targetX = startX;
        let targetY = startY - 100; // Shoots straight up if no enemies are alive
        let closestDistance = Infinity;

        // Find the closest active enemy in the pool
        for (let i = 0; i < this.enemyPool.length; i++) {
            const enemy = this.enemyPool[i];
            
            if (enemy.isActive) {
                const enemyCenterX = enemy.x + enemy.width / 2;
                const enemyCenterY = enemy.y + enemy.height / 2;

                const dx = enemyCenterX - startX;
                const dy = enemyCenterY - startY;
                const distanceSquared = (dx * dx) + (dy * dy);

                if (distanceSquared < closestDistance) {
                    closestDistance = distanceSquared;
                    targetX = enemyCenterX;
                    targetY = enemyCenterY;
                }
            }
        }

        // Activate the first available white kitten bullet from the pool
        for (let i = 0; i < this.bulletPool.length; i++) {
            if (!this.bulletPool[i].isActive) {
                this.bulletPool[i].spawn(startX, startY, targetX, targetY);
                return; // Exit once a bullet is successfully fired
            }
        }
    }

    spawnEnemy(x, y, hp) {
        for (let i = 0; i < this.enemyPool.length; i++) {
            if (!this.enemyPool[i].isActive) {
                this.enemyPool[i].spawn(x, y, hp);
                return;
            }
        }
    }

    add(entity) {
        this.entities.push(entity);
        return entity;
    }

    update(dt) {
        const player = this.game.player;

        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            const spawnX = Math.random() > 0.5 ? -30 : 1050;
            const spawnY = Math.random() * 576;
            this.spawnEnemy(spawnX, spawnY, 1);
        }

        for (let i = 0; i < this.bulletPool.length; i++) {
            this.bulletPool[i].update(dt);
        }

        for (let i = 0; i < this.enemyPool.length; i++) {
            this.enemyPool[i].update(dt, player.x, player.y);
        }

        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity.isDead) {
                this.entities.splice(i, 1);
                continue;
            }
            entity.update(dt);
        }

        this.checkCollisions();
    }

    checkCollisions() {
    const player = this.game.player;

    for (let b = 0; b < this.bulletPool.length; b++) {
        const bullet = this.bulletPool[b];
        if (!bullet.isActive) continue;

        for (let e = 0; e < this.enemyPool.length; e++) {
            const enemy = this.enemyPool[e];
            if (!enemy.isActive) continue;

            if (this.testCircleBox(bullet, enemy)) {
                bullet.despawn();
                enemy.hp -= 1;
                break; 
            }
        }
    }

    // --- NEW: PLAYER AND ENEMY COLLISION CHECK ---
    for (let e = 0; e < this.enemyPool.length; e++) {
        const enemy = this.enemyPool[e];
        if (!enemy.isActive) continue;

        // Using standard Box-to-Box collision between the player and the enemy
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            enemy.despawn(); // Remove the enemy that hit us
            player.hp -= 1;  // Take away one life point
            
            // Instantly update the HTML display overlay
            const hpDisplay = document.getElementById('playerHp');
            if (hpDisplay) hpDisplay.textContent = player.hp;
        }
    }
}
    testCircleBox(circle, box) {
        const closestX = Math.max(box.x, Math.min(circle.x, box.x + box.width));
        const closestY = Math.max(box.y, Math.min(circle.y, box.y + box.height));
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        return (distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius);
    }

    render(ctx) {
        for (let i = 0; i < this.bulletPool.length; i++) {
            this.bulletPool[i].draw(ctx);
        }
        for (let i = 0; i < this.enemyPool.length; i++) {
            this.enemyPool[i].draw(ctx);
        }
        for (let i = 0; i < this.entities.length; i++) {
            this.entities[i].draw(ctx);
        }
    }
}