import { keys, initInputHandlers } from './systems/input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Local state for testing before we implement the P2P network
const gameState = {
  rover: { x: 640, y: 360, width: 140, height: 80, speed: 2, color: '#4A5D23' },
  scavenger: { x: 720, y: 420, radius: 12, speed: 5, color: '#FF8C00' }
};

function update() {
  // Pilot Controls: Heavy, slower movement
  if (keys.w) gameState.rover.y -= gameState.rover.speed;
  if (keys.s) gameState.rover.y += gameState.rover.speed;
  if (keys.a) gameState.rover.x -= gameState.rover.speed;
  if (keys.d) gameState.rover.x += gameState.rover.speed;

  // Scavenger Controls: Fast, nimble movement
  if (keys.ArrowUp) gameState.scavenger.y -= gameState.scavenger.speed;
  if (keys.ArrowDown) gameState.scavenger.y += gameState.scavenger.speed;
  if (keys.ArrowLeft) gameState.scavenger.x -= gameState.scavenger.speed;
  if (keys.ArrowRight) gameState.scavenger.x += gameState.scavenger.speed;
}

function draw() {
  // 1. Clear previous frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Rover (Bottom Layer)
  // Drawn from the center using its width and height
  ctx.fillStyle = gameState.rover.color;
  ctx.fillRect(
    gameState.rover.x - gameState.rover.width / 2, 
    gameState.rover.y - gameState.rover.height / 2, 
    gameState.rover.width, 
    gameState.rover.height
  );

  // 3. Draw Scavenger (Top Layer)
  ctx.beginPath();
  ctx.arc(gameState.scavenger.x, gameState.scavenger.y, gameState.scavenger.radius, 0, Math.PI * 2);
  ctx.fillStyle = gameState.scavenger.color;
  ctx.fill();
  ctx.closePath();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Boot up the client
initInputHandlers();
gameLoop();