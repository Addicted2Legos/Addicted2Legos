import { AssetLoader } from './AssetLoader.js';
import { Player } from './entities/Player.js';
import { EntityManager } from './entities/EntityManager.js';
import { GAME_CONFIG } from './data/gameConfig.js';

export class Game {
constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.assets = new AssetLoader();
    
    // 1. Initialize the player FIRST so they exist in memory
    this.player = new Player(512, 288, GAME_CONFIG.player.speed); 
    
    // 2. Initialize the entity manager SECOND
    this.entities = new EntityManager(this);
    
    this.lastTime = 0;

    // Spacebar input handler to launch bullets forward
    window.addEventListener('keydown', (e) => {
    // Check for Spacebar
    if (e.code === 'Space') {
        e.preventDefault(); // Prevents the browser window from scrolling down

        // Call the auto-targeting fire method
        this.entities.fireBullet(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
        );
    }

    // Check for Restart Key if dead
    if (e.key.toLowerCase() === 'r' && this.player.hp <= 0) {
        this.player.hp = 3;
        this.player.x = 512;
        this.player.y = 288;
        document.getElementById('playerHp').textContent = 3;
        
        for (let i = 0; i < this.entities.enemyPool.length; i++) {
            this.entities.enemyPool[i].despawn();
        }
    }
    });
    }

    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        if (!this.assets.isReady()) return;

        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        // If player runs out of life points, stop updating game logic
        if (this.player.hp <= 0) {
            return; 
        }

        this.player.update(dt);
        this.entities.update(dt);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.entities.render(this.ctx);
        this.player.draw(this.ctx);

        // --- NEW: GAME OVER GRAPHIC OVERLAY ---
        if (this.player.hp <= 0) {
            // Darken the screen slightly
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw "YOU LOSE" text
            this.ctx.fillStyle = '#ff3333';
            this.ctx.font = 'bold 40px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LEVEL LOST', this.canvas.width / 2, this.canvas.height / 2 - 10);

            // Draw Subtitle instructions
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px sans-serif';
            this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }
    }
}