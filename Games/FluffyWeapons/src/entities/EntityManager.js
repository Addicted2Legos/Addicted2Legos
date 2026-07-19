import { Bullet } from './Bullet.js';
import { Enemy } from './Enemy.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.entities = [];
        
        // --- ALLOCATED POOLS ---
        this.bulletPool = [];
        this.enemyPool = [];
        
        this.maxBullets = 150;
        this.maxEnemies = 50; // Maximum allowed active enemies at once

        // Instantiate bullet references
        for (let i = 0; i < this.maxBullets; i++) {
            this.bulletPool.push(new Bullet());
        }

        // Instantiate enemy references up front
        for (let i = 0; i < this.maxEnemies; i++) {
            this.enemyPool.push(new Enemy());
        }

        // Wave Spawning Controller Variables
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // Spawn a new enemy every 1.5 seconds
    }

    spawnEnemy(x, y, hp) {
        for (let i = 0; i < this.enemyPool.length; i++) {
            if (!this.enemyPool[i].isActive) {
                this.enemyPool[i].spawn(x, y, hp);
                return;
            }
        }
        // Fail-safe protection boundary check
        console.warn("Enemy pool limit hit! Clear old objects.");
    }

    fireBullet(startX, startY, targetX, targetY) {
        for (let i = 0; i < this.bulletPool.length; i++) {
            if (!this.bulletPool[i].isActive) {
                this.bulletPool[i].spawn(startX, startY, targetX, targetY);
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

        // 1. Automatic procedural continuous spawning sequence
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            // Generate coordinates off-screen so enemies walk inward
            const spawnX = Math.random() > 0.5 ? -40 : 1060;
            const spawnY = Math.random() * 576;
            this.spawnEnemy(spawnX, spawnY, 1);
        }

        // 2. Process pooled projectiles
        for (let i = 0; i < this.bulletPool.length; i++) {
            this.bulletPool[i].update(dt);
        }

        // 3. Process pooled AI objects, passing current target anchor points
        for (let i = 0; i < this.enemyPool.length; i++) {
            this.enemyPool[i].update(dt, player.x, player.y);
        }

        // 4. Update non-pooled utility entities (loot drops, dynamic particles)
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
        // Run grid matrix matching only across active bullet and active enemy loops
        for (let b = 0; b < this.bulletPool.length; b++) {
            const bullet = this.bulletPool[b];
            if (!bullet.isActive) continue;

            for (let e = 0; e < this.enemyPool.length; e++) {
                const enemy = this.enemyPool[e];
                if (!enemy.isActive) continue;

                if (this.testCircleBox(bullet, enemy)) {
                    bullet.despawn();
                    enemy.hp -= 1; // Reduces hit-points; will self-despawn next frame if 0
                    break; 
                }
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