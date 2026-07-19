import { Game } from './Game.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set a crisp target resolution
canvas.width = 1024;
canvas.height = 576;

const game = new Game(canvas, ctx);

// Start the engine
game.start();