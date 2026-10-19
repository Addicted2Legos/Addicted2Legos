import { keys, initInputHandlers } from './systems/input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Global world bounds
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

const gameState = {
  rover: { x: 1500, y: 1500, width: 140, height: 80, speed: 3, color: '#4A5D23' },
  scavenger: { x: 1600, y: 1500, radius: 15, speed: 6, color: '#FF8C00' }
};

// Track which entity the camera should follow (Default to rover for now)
let localTarget = gameState.rover;

function update() {
  // Move entities
  if (keys.w) gameState.rover.y -= gameState.rover.speed;
  if (keys.s) gameState.rover.y += gameState.rover.speed;
  if (keys.a) gameState.rover.x -= gameState.rover.speed;
  if (keys.d) gameState.rover.x += gameState.rover.speed;

  if (keys.ArrowUp) gameState.scavenger.y -= gameState.scavenger.speed;
  if (keys.ArrowDown) gameState.scavenger.y += gameState.scavenger.speed;
  if (keys.ArrowLeft) gameState.scavenger.x -= gameState.scavenger.speed;
  if (keys.ArrowRight) gameState.scavenger.x += gameState.scavenger.speed;

  // Clamp to world bounds
  gameState.rover.x = Math.max(0, Math.min(gameState.rover.x, WORLD_WIDTH));
  gameState.rover.y = Math.max(0, Math.min(gameState.rover.y, WORLD_HEIGHT));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Shift canvas origin to center the local target
  const camX = canvas.width / 2 - localTarget.x;
  const camY = canvas.height / 2 - localTarget.y;
  ctx.translate(camX, camY);

  // Draw World Boundaries
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Draw Rover
  ctx.fillStyle = gameState.rover.color;
  ctx.fillRect(
    gameState.rover.x - gameState.rover.width / 2, 
    gameState.rover.y - gameState.rover.height / 2, 
    gameState.rover.width, 
    gameState.rover.height
  );

  // Draw Scavenger
  ctx.beginPath();
  ctx.arc(gameState.scavenger.x, gameState.scavenger.y, gameState.scavenger.radius, 0, Math.PI * 2);
  ctx.fillStyle = gameState.scavenger.color;
  ctx.fill();
  ctx.closePath();

  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

initInputHandlers();
gameLoop();