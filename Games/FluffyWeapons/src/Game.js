import { AssetLoader } from './AssetLoader.js';
import { Player } from './entities/Player.js';
import { EntityManager } from './entities/EntityManager.js';
import { Camera } from './world/Camera.js';
import { GAME_CONFIG } from './data/gameConfig.js';

export class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.assets = new AssetLoader();
        
        // Define massive absolute dimensions for your world environment
        this.worldWidth = 3000;
        this.worldHeight = 2000;

        this.entities = new EntityManager(this);
        this.player = new Player(500, 500, GAME_CONFIG.player.speed); // Spawn deeper inside the map
        
        // Instantiate the camera framework
        this.camera = new Camera(this.canvas.width, this.canvas.height, this.worldWidth, this.worldHeight);
        
        this.lastTime = 0;

        // Capture screen mouse clicks and adjust for world offset positions
        window.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenMouseX = e.clientX - rect.left;
            const screenMouseY = e.clientY - rect.top;

            // CRITICAL: Translate screen clicks into actual map coordinate targets
            const worldMouseX = screenMouseX + this.camera.x;
            const worldMouseY = screenMouseY + this.camera.y;

            this.entities.fireBullet(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                worldMouseX,
                worldMouseY
            );
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
        this.player.update(dt);
        this.entities.update(dt);

        // Tell the camera matrix to follow the player's world position parameters
        this.camera.follow(this.player.x, this.player.y, this.player.width, this.player.height, dt);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // --- CAMERA VIEW MATRIX TRANSLATION ---
        this.ctx.save(); // Save the clean, unmodified canvas layout configuration
        
        // Shift context coordinate system in reverse direction of camera tracking coordinates
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // [OPTIONAL DETAILED WORLD GRID VISUALIZER]
        // This lets you see the map scrolling relative to your movement coordinates
        this.ctx.strokeStyle = '#2b2b36';
        this.ctx.lineWidth = 2;
        for (let x = 0; x < this.worldWidth; x += 100) {
            for (let y = 0; y < this.worldHeight; y += 100) {
                this.ctx.strokeRect(x, y, 100, 100);
            }
        }

        // Everything rendered between save() and restore() scales to world coordinates automatically
        this.entities.render(this.ctx);
        this.player.draw(this.ctx);

        this.ctx.restore(); // Restore context back to native 0,0 screen layout config
    }
}