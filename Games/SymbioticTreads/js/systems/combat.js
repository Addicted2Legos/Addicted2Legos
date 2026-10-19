// --- COMBAT & SWARM ENEMY SYSTEM ---
import { spawnEnergyCell } from './economy.js';

export const PARTICLES = [];

export function handleEnemyDefeated(gameState, enemy) {
  gameState.kills = (gameState.kills || 0) + 1;
  spawnBloodSplat(enemy.x, enemy.y, enemy.type === 'brute' ? 18 : 10, enemy.color);

  // Energy Cells drop to fuel the mobile base
  const dropChance = enemy.type === 'brute' ? 1.0 : 0.45;
  if (Math.random() < dropChance) {
    const fuelVal = enemy.type === 'brute' ? 25 : 12;
    spawnEnergyCell(gameState, enemy.x, enemy.y, fuelVal);
  }
}

export function createEnemy(id, x, y, type = 'scuttler') {
  const isBrute = type === 'brute';
  return {
    id,
    type,
    x,
    y,
    radius: isBrute ? 22 : 12,
    speed: isBrute ? 2.0 : (3.2 + Math.random() * 0.8),
    hp: isBrute ? 80 : 25,
    maxHp: isBrute ? 80 : 25,
    color: isBrute ? '#9333ea' : '#ef4444',
    eyeColor: isBrute ? '#facc15' : '#fee2e2',
    damage: isBrute ? 22 : 8,
    attackCooldown: 0,
    hitFlash: 0,
    angle: 0,
    legAnim: Math.random() * 10
  };
}

export function spawnSwarmWave(enemies, rover, scavenger, worldWidth, worldHeight, maxCount = 35) {
  if (enemies.length >= maxCount) return;

  const countToSpawn = Math.min(3 + Math.floor(Math.random() * 3), maxCount - enemies.length);
  // Spawn around whichever player is currently active
  const anchor = Math.random() < 0.5 ? rover : scavenger;
  const clusterAngle = Math.random() * Math.PI * 2;
  const clusterDist = 800 + Math.random() * 250; // Just outside viewport

  const baseClusterX = anchor.x + Math.cos(clusterAngle) * clusterDist;
  const baseClusterY = anchor.y + Math.sin(clusterAngle) * clusterDist;

  for (let i = 0; i < countToSpawn; i++) {
    const isBrute = Math.random() < 0.22;
    const offsetX = (Math.random() - 0.5) * 160;
    const offsetY = (Math.random() - 0.5) * 160;

    const x = Math.max(50, Math.min(worldWidth - 50, baseClusterX + offsetX));
    const y = Math.max(50, Math.min(worldHeight - 50, baseClusterY + offsetY));
    const id = 'enemy-' + Math.random().toString(36).substring(2, 9);

    enemies.push(createEnemy(id, x, y, isBrute ? 'brute' : 'scuttler'));
  }
}

export function updateSwarmAI(enemies, rover, scavenger, isHost) {
  if (!isHost) return;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    // 1. Pathing target selection
    const distRover = Math.hypot(rover.x - enemy.x, rover.y - enemy.y);
    const distScav = Math.hypot(scavenger.x - enemy.x, scavenger.y - enemy.y);

    let target = rover;
    if (enemy.type === 'scuttler') {
      // Scuttlers pursue the Scavenger if nearby, otherwise Rover
      target = distScav < distRover * 1.3 ? scavenger : rover;
    } else {
      // Brutes gravitate towards smashing the Rover
      target = distRover < distScav * 1.5 ? rover : scavenger;
    }

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    let dirX = dx / dist;
    let dirY = dy / dist;

    // 2. Swarm Flocking Separation (Boids avoidance so they form organic swarms)
    let repelX = 0, repelY = 0;
    for (let j = 0; j < enemies.length; j++) {
      if (i === j) continue;
      const other = enemies[j];
      const ox = enemy.x - other.x;
      const oy = enemy.y - other.y;
      const dSq = ox * ox + oy * oy;
      const minD = enemy.radius + other.radius + 6;
      if (dSq < minD * minD && dSq > 0) {
        const d = Math.sqrt(dSq);
        const force = (minD - d) / minD;
        repelX += (ox / d) * force;
        repelY += (oy / d) * force;
      }
    }

    // Blend direct pursuit and swarm dispersion
    let moveX = dirX * 0.78 + repelX * 0.65;
    let moveY = dirY * 0.78 + repelY * 0.65;
    const moveLen = Math.hypot(moveX, moveY) || 1;
    moveX /= moveLen;
    moveY /= moveLen;

    enemy.x += moveX * enemy.speed;
    enemy.y += moveY * enemy.speed;
    enemy.angle = Math.atan2(moveY, moveX);
    enemy.legAnim += enemy.speed * 0.2;

    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    if (enemy.hitFlash > 0) enemy.hitFlash--;
  }
}

export function spawnBloodSplat(x, y, count = 6, color = '#22c55e') {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    PARTICLES.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3.5,
      alpha: 1.0,
      decay: 0.03 + Math.random() * 0.03,
      color
    });
  }
}

export function spawnExplosion(x, y, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5.5;
    const colors = ['#f59e0b', '#ef4444', '#fbbf24', '#71717a'];
    PARTICLES.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 5,
      alpha: 1.0,
      decay: 0.04 + Math.random() * 0.04,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

export function updateParticles() {
  for (let i = PARTICLES.length - 1; i >= 0; i--) {
    const p = PARTICLES[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      PARTICLES.splice(i, 1);
    }
  }
}

export function drawParticles(ctx) {
  for (let p of PARTICLES) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

export function drawEnemy(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);

  // 1. Chittering legs
  const legCount = enemy.type === 'brute' ? 4 : 3;
  ctx.strokeStyle = enemy.hitFlash > 0 ? '#ffffff' : (enemy.type === 'brute' ? '#6b21a8' : '#991b1b');
  ctx.lineWidth = enemy.type === 'brute' ? 3.5 : 2;
  ctx.lineCap = 'round';

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < legCount; i++) {
      const legPhase = enemy.legAnim + i * 1.2 + (side === 1 ? Math.PI : 0);
      const legAngle = (side * Math.PI / 2.2) + Math.sin(legPhase) * 0.45;
      const legLength = enemy.radius * 1.35;

      const lx1 = (i - 1) * (enemy.radius * 0.5);
      const ly1 = side * (enemy.radius * 0.5);
      const lx2 = lx1 + Math.cos(legAngle) * legLength;
      const ly2 = ly1 + Math.sin(legAngle) * legLength;

      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();
    }
  }

  // 2. Chitinous Carapace Body
  ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Shell Segments
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-enemy.radius * 0.25, 0, enemy.radius * 0.45, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // 4. Glowing Alien Eyes
  ctx.fillStyle = enemy.eyeColor;
  ctx.beginPath();
  ctx.arc(enemy.radius * 0.65, -enemy.radius * 0.32, enemy.radius * 0.18, 0, Math.PI * 2);
  ctx.arc(enemy.radius * 0.65, enemy.radius * 0.32, enemy.radius * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 5. Overhead Health Bar (if damaged)
  if (enemy.hp < enemy.maxHp) {
    const barW = enemy.radius * 2.2;
    const barH = 4;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - enemy.radius - 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : (hpRatio > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }
}

