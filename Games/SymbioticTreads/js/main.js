import { keys, initInputHandlers, clearJustPressed } from './systems/input.js';
import { PeerManager } from './network/peerManager.js';
import {
  createEnemy,
  spawnSwarmWave,
  updateSwarmAI,
  spawnBloodSplat,
  spawnExplosion,
  updateParticles,
  drawParticles,
  drawEnemy,
  handleEnemyDefeated
} from './systems/combat.js';
import {
  initScrapNodes,
  initRuins,
  spawnEnergyCell,
  updateEconomy,
  drawScrapNode,
  drawHarvestBeam,
  drawDepositConduit,
  drawScrapShards,
  drawFloatingTextsList,
  addFloatingText,
  drawEnergyCells,
  drawRuins
} from './systems/economy.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Global world bounds
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

// Game State
const gameState = {
  rover: {
    x: 1500,
    y: 1500,
    vx: 0,
    vy: 0,
    width: 140,
    height: 80,
    speed: 3.4,
    hp: 100,
    maxHp: 100,
    fuel: 100,
    maxFuel: 100,
    powerMode: 'engines', // 'engines' | 'shields' | 'turrets'
    shieldPulse: 0,
    color: '#4A5D23',
    angle: 0,
    treadAnim: 0,
    turretAngle: 0,
    turretRecoil: 0,
    cannonCooldown: 0,
    muzzleFlash: 0,
    turretCooldown: 0
  },
  scavenger: {
    x: 1600,
    y: 1500,
    vx: 0,
    vy: 0,
    radius: 15,
    speed: 5.6,
    hp: 60,
    maxHp: 60,
    cargo: 0,
    maxCargo: 50,
    isBoarded: false,
    color: '#FF8C00',
    angle: 0,
    aimAngle: 0,
    fireCooldown: 0,
    muzzleFlash: 0
  },
  enemies: [],
  projectiles: [],
  scrapNodes: initScrapNodes(WORLD_WIDTH, WORLD_HEIGHT, 22),
  energyCells: [],
  ruins: initRuins(WORLD_WIDTH, WORLD_HEIGHT),
  techCores: 0,
  baseScrap: 0,
  upgrades: {
    speedTier: 0,
    cargoTier: 0,
    blasterTier: 0,
    hasTurret: false,
    radarTier: 0,
    quantumTier: 0
  },
  kills: 0,
  wave: 1
};

// Camera Target & Network State
let localTarget = gameState.rover;
let network = null;
let isHost = false;
let isSolo = false;
let gameStarted = false;
let spawnTimer = 0;
let radarSweepAngle = 0;

// Client inputs received by the Host
let remoteKeys = {};

// --- POWER ROUTING LOGIC ---
function setPowerMode(mode) {
  if (!['engines', 'shields', 'turrets'].includes(mode)) return;

  gameState.rover.powerMode = mode;

  if (!isHost && !isSolo && network) {
    network.send({ type: 'POWER_MODE', mode });
  }

  // Update UI buttons
  const btnE = document.getElementById('btn-pwr-engines');
  const btnS = document.getElementById('btn-pwr-shields');
  const btnT = document.getElementById('btn-pwr-turrets');
  if (btnE) btnE.className = `power-btn ${mode === 'engines' ? 'active' : ''}`;
  if (btnS) btnS.className = `power-btn ${mode === 'shields' ? 'active' : ''}`;
  if (btnT) btnT.className = `power-btn ${mode === 'turrets' ? 'active' : ''}`;

  const colors = { engines: '#f59e0b', shields: '#38bdf8', turrets: '#ec4899' };
  addFloatingText(gameState.rover.x, gameState.rover.y - 45, `POWER: ${mode.toUpperCase()}`, colors[mode] || '#ffffff');
}

// --- BOARDING / EXTRACTION LOGIC ---
function toggleBoarding() {
  if (!isHost && !isSolo) {
    if (network) network.send({ type: 'TOGGLE_BOARD' });
    return;
  }

  const { rover, scavenger } = gameState;
  if (!scavenger.isBoarded) {
    const dist = Math.hypot(scavenger.x - rover.x, scavenger.y - rover.y);
    if (dist <= 115) {
      scavenger.isBoarded = true;
      if (scavenger.cargo > 0) {
        gameState.baseScrap += scavenger.cargo;
        addFloatingText(rover.x, rover.y - 55, `+${scavenger.cargo} SCRAP STORED!`, '#22c55e');
        scavenger.cargo = 0;
      }
      addFloatingText(rover.x, rover.y - 40, 'SCAVENGER BOARDED!', '#38bdf8');
    } else {
      addFloatingText(scavenger.x, scavenger.y - 25, 'GET CLOSER TO ROVER!', '#ef4444');
    }
  } else {
    // Disembark beside the Rover hatch
    scavenger.isBoarded = false;
    scavenger.x = rover.x - Math.cos(rover.angle) * 70;
    scavenger.y = rover.y - Math.sin(rover.angle) * 70;
    addFloatingText(scavenger.x, scavenger.y - 30, 'DISEMBARKED!', '#f97316');
  }
}

// Handle incoming WebRTC packets
function handleNetworkData(data) {
  if (isHost) {
    if (data.type === 'INPUT') {
      remoteKeys = data.keys || {};
      if (remoteKeys.toggleBoard) {
        toggleBoarding();
      }
    } else if (data.type === 'TOGGLE_BOARD') {
      toggleBoarding();
    } else if (data.type === 'POWER_MODE') {
      setPowerMode(data.mode);
    } else if (data.type === 'PURCHASE_UPGRADE') {
      purchaseUpgrade(data.upgrade);
    }
  } else {
    if (data.type === 'STATE' && data.state) {
      // Synchronize full authoritative world state from Host
      const s = data.state;
      if (s.rover) Object.assign(gameState.rover, s.rover);
      if (s.scavenger) Object.assign(gameState.scavenger, s.scavenger);
      if (s.enemies) gameState.enemies = s.enemies;
      if (s.projectiles) gameState.projectiles = s.projectiles;
      if (s.scrapNodes) gameState.scrapNodes = s.scrapNodes;
      if (s.energyCells) gameState.energyCells = s.energyCells;
      if (s.ruins) gameState.ruins = s.ruins;
      if (typeof s.techCores === 'number') gameState.techCores = s.techCores;
      if (typeof s.baseScrap === 'number') gameState.baseScrap = s.baseScrap;
      if (s.upgrades) gameState.upgrades = s.upgrades;
      if (typeof s.kills === 'number') gameState.kills = s.kills;
      if (typeof s.wave === 'number') gameState.wave = s.wave;
    }
  }
}

// --- UPGRADE WORKSHOP LOGIC ---
function purchaseUpgrade(type) {
  if (!isHost) {
    if (network) network.send({ type: 'PURCHASE_UPGRADE', upgrade: type });
    return;
  }

  const { rover, scavenger, upgrades } = gameState;

  if (type === 'repair' && gameState.baseScrap >= 15) {
    gameState.baseScrap -= 15;
    rover.hp = Math.min(rover.maxHp, rover.hp + 45);
    scavenger.hp = Math.min(scavenger.maxHp, scavenger.hp + 35);
    addFloatingText(rover.x, rover.y - 40, 'HULL & SUIT REPAIRED!', '#22c55e');
  } else if (type === 'cargo' && gameState.baseScrap >= 35 && upgrades.cargoTier === 0) {
    gameState.baseScrap -= 35;
    upgrades.cargoTier = 1;
    scavenger.maxCargo = 100;
    addFloatingText(scavenger.x, scavenger.y - 25, 'CARGO EXPANDED (100)!', '#38bdf8');
  } else if (type === 'speed' && gameState.baseScrap >= 45 && upgrades.speedTier === 0) {
    gameState.baseScrap -= 45;
    upgrades.speedTier = 1;
    rover.speed = 4.5;
    addFloatingText(rover.x, rover.y - 40, 'TREADS OVERCLOCKED!', '#f59e0b');
  } else if (type === 'blaster' && gameState.baseScrap >= 50 && upgrades.blasterTier === 0) {
    gameState.baseScrap -= 50;
    upgrades.blasterTier = 1;
    addFloatingText(scavenger.x, scavenger.y - 25, 'PLASMA AMPLIFIED!', '#ec4899');
  } else if (type === 'turret' && gameState.baseScrap >= 75 && !upgrades.hasTurret) {
    gameState.baseScrap -= 75;
    upgrades.hasTurret = true;
    addFloatingText(rover.x, rover.y - 45, 'AUTOTURRET ONLINE!', '#a855f7');
  } else if (type === 'radar' && gameState.techCores >= 1 && upgrades.radarTier === 0) {
    gameState.techCores -= 1;
    upgrades.radarTier = 1;
    addFloatingText(rover.x, rover.y - 45, 'LONG-RANGE RADAR ONLINE!', '#38bdf8');
  } else if (type === 'quantum' && gameState.techCores >= 2 && upgrades.quantumTier === 0) {
    gameState.techCores -= 2;
    upgrades.quantumTier = 1;
    rover.maxHp += 50;
    rover.hp = Math.min(rover.maxHp, rover.hp + 50);
    addFloatingText(rover.x, rover.y - 45, 'QUANTUM CORE GENERATOR!', '#ec4899');
  }
}

document.getElementById('btn-up-repair').addEventListener('click', () => purchaseUpgrade('repair'));
document.getElementById('btn-up-cargo').addEventListener('click', () => purchaseUpgrade('cargo'));
document.getElementById('btn-up-speed').addEventListener('click', () => purchaseUpgrade('speed'));
document.getElementById('btn-up-blaster').addEventListener('click', () => purchaseUpgrade('blaster'));
document.getElementById('btn-up-turret').addEventListener('click', () => purchaseUpgrade('turret'));
document.getElementById('btn-up-radar').addEventListener('click', () => purchaseUpgrade('radar'));
document.getElementById('btn-up-quantum').addEventListener('click', () => purchaseUpgrade('quantum'));

document.getElementById('btn-pwr-engines').addEventListener('click', () => setPowerMode('engines'));
document.getElementById('btn-pwr-shields').addEventListener('click', () => setPowerMode('shields'));
document.getElementById('btn-pwr-turrets').addEventListener('click', () => setPowerMode('turrets'));
document.getElementById('btn-board-toggle').addEventListener('click', () => toggleBoarding());

// --- LOBBY BUTTON LISTENERS ---
const lobbyEl = document.getElementById('lobby');
const hudEl = document.getElementById('hud');
const hudRoleEl = document.getElementById('hud-role');
const hudRoomEl = document.getElementById('hud-room-display');

document.getElementById('btn-host').addEventListener('click', () => {
  isHost = true;
  isSolo = false;
  gameStarted = true;
  localTarget = gameState.rover;
  lobbyEl.style.display = 'none';
  hudEl.style.display = 'flex';
  hudRoleEl.textContent = 'PILOT';
  hudRoleEl.className = 'badge badge-pilot';
  hudRoomEl.textContent = 'Generating Room...';

  network = new PeerManager(true, null, handleNetworkData, (id) => {
    hudRoomEl.textContent = `Room: ${id}`;
  });
});

document.getElementById('btn-join').addEventListener('click', () => {
  const code = document.getElementById('input-join').value.trim();
  if (!code) {
    alert('Please enter a Room Code first!');
    return;
  }

  isHost = false;
  isSolo = false;
  gameStarted = true;
  localTarget = gameState.scavenger;
  lobbyEl.style.display = 'none';
  hudEl.style.display = 'flex';
  hudRoleEl.textContent = 'SCAVENGER';
  hudRoleEl.className = 'badge badge-scavenger';
  hudRoomEl.textContent = `Connecting: ${code}...`;

  network = new PeerManager(false, code, handleNetworkData, () => {
    hudRoomEl.textContent = `Connected: ${code}`;
  });
});

document.getElementById('btn-solo').addEventListener('click', () => {
  isHost = true;
  isSolo = true;
  gameStarted = true;
  localTarget = gameState.rover;
  lobbyEl.style.display = 'none';
  hudEl.style.display = 'flex';
  hudRoleEl.textContent = 'SOLO (PILOT + SCAVENGER)';
  hudRoleEl.className = 'badge badge-pilot';
  hudRoomEl.textContent = 'Local Co-op';
});

// Toggle camera focus with Tab key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    localTarget = localTarget === gameState.rover ? gameState.scavenger : gameState.rover;
  }
});

// --- COMBAT & MOVEMENT SIMULATION ---
function update() {
  if (!gameStarted) return;

  const camX = canvas.width / 2 - localTarget.x;
  const camY = canvas.height / 2 - localTarget.y;
  const mouseWorldX = keys.mouse.x - camX;
  const mouseWorldY = keys.mouse.y - camY;

  // Power mode key toggles (1: Engines, 2: Shields, 3: Turrets)
  if (keys.justPressed['1']) setPowerMode('engines');
  if (keys.justPressed['2']) setPowerMode('shields');
  if (keys.justPressed['3']) setPowerMode('turrets');
  if (keys.justPressed.e) toggleBoarding();

  // Passive Quantum Core Generator bonuses
  if (gameState.upgrades.quantumTier > 0) {
    gameState.rover.fuel = Math.min(gameState.rover.maxFuel, gameState.rover.fuel + 0.04);
    if (gameState.rover.hp < gameState.rover.maxHp) {
      gameState.rover.hp = Math.min(gameState.rover.maxHp, gameState.rover.hp + 0.015);
    }
  }

  // Weapon cooldowns and animation decays
  if (gameState.rover.cannonCooldown > 0) gameState.rover.cannonCooldown--;
  if (gameState.rover.turretRecoil > 0) gameState.rover.turretRecoil *= 0.8;
  if (gameState.rover.muzzleFlash > 0) gameState.rover.muzzleFlash--;
  if (gameState.rover.shieldPulse > 0) gameState.rover.shieldPulse--;

  if (gameState.scavenger.fireCooldown > 0) gameState.scavenger.fireCooldown--;
  if (gameState.scavenger.muzzleFlash > 0) gameState.scavenger.muzzleFlash--;

  if (isHost) {
    const rover = gameState.rover;
    const scavenger = gameState.scavenger;

    // 1. Rover Movement (Pilot controlled via WASD)
    let roverMoveX = 0;
    let roverMoveY = 0;
    if (keys.w) roverMoveY -= 1;
    if (keys.s) roverMoveY += 1;
    if (keys.a) roverMoveX -= 1;
    if (keys.d) roverMoveX += 1;

    // Power mode speed modifiers
    let currentSpeed = rover.speed;
    if (rover.powerMode === 'engines' && rover.fuel > 0) {
      currentSpeed = rover.speed * 1.55;
    } else if (rover.fuel <= 0) {
      currentSpeed = rover.speed * 0.65; // Low-power sluggish mode
    }

    const rLen = Math.hypot(roverMoveX, roverMoveY);
    if (rLen > 0) {
      rover.vx = (roverMoveX / rLen) * currentSpeed;
      rover.vy = (roverMoveY / rLen) * currentSpeed;
      rover.angle = Math.atan2(rover.vy, rover.vx);
      rover.treadAnim += currentSpeed * 0.35;

      // Fuel consumption while driving
      if (rover.powerMode === 'engines') {
        rover.fuel = Math.max(0, rover.fuel - 0.04);
      } else {
        rover.fuel = Math.max(0, rover.fuel - 0.015);
      }
    } else {
      rover.vx = 0;
      rover.vy = 0;
    }
    rover.x += rover.vx;
    rover.y += rover.vy;

    // Pilot Rotating Turret Aiming: Follows cursor relative to Rover
    rover.turretAngle = Math.atan2(mouseWorldY - rover.y, mouseWorldX - rover.x);

    // 2. Shield Barrier Defense (Shields Mode)
    if (rover.powerMode === 'shields' && rover.fuel > 0) {
      rover.fuel = Math.max(0, rover.fuel - 0.02); // Maintenance power drain

      // Deflect & shock nearby swarm enemies
      const shieldRadius = 92;
      for (let eIdx = gameState.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = gameState.enemies[eIdx];
        const distToRover = Math.hypot(enemy.x - rover.x, enemy.y - rover.y);

        if (distToRover < shieldRadius) {
          enemy.hp -= 18;
          enemy.hitFlash = 6;
          rover.shieldPulse = 10;
          rover.fuel = Math.max(0, rover.fuel - 0.35);

          // Kinetic shockwave knockback
          const repelAngle = Math.atan2(enemy.y - rover.y, enemy.x - rover.x);
          enemy.x += Math.cos(repelAngle) * 32;
          enemy.y += Math.sin(repelAngle) * 32;
          spawnBloodSplat(enemy.x, enemy.y, 4, '#38bdf8');

          if (enemy.hp <= 0) {
            handleEnemyDefeated(gameState, enemy);
            gameState.enemies.splice(eIdx, 1);
          }
        }
      }
    }

    // 3. Scavenger Movement (On Foot vs Boarded)
    const scavInputs = isSolo ? keys : remoteKeys;

    if (scavenger.isBoarded) {
      // Locked to Rover interior
      scavenger.x = rover.x;
      scavenger.y = rover.y;
      scavenger.vx = rover.vx;
      scavenger.vy = rover.vy;
      scavenger.angle = rover.angle;

      if (isSolo) {
        scavenger.aimAngle = Math.atan2(mouseWorldY - scavenger.y, mouseWorldX - scavenger.x);
      } else if (typeof remoteKeys.aimAngle === 'number') {
        scavenger.aimAngle = remoteKeys.aimAngle;
      }
    } else {
      // On-foot exterior movement
      let scavMoveX = 0;
      let scavMoveY = 0;
      if (scavInputs.ArrowUp || scavInputs.w) scavMoveY -= 1;
      if (scavInputs.ArrowDown || scavInputs.s) scavMoveY += 1;
      if (scavInputs.ArrowLeft || scavInputs.a) scavMoveX -= 1;
      if (scavInputs.ArrowRight || scavInputs.d) scavMoveX += 1;

      const sLen = Math.hypot(scavMoveX, scavMoveY);
      if (sLen > 0) {
        scavenger.vx = (scavMoveX / sLen) * scavenger.speed;
        scavenger.vy = (scavMoveY / sLen) * scavenger.speed;
        scavenger.angle = Math.atan2(scavenger.vy, scavenger.vx);
      } else {
        scavenger.vx = 0;
        scavenger.vy = 0;
      }
      scavenger.x += scavenger.vx;
      scavenger.y += scavenger.vy;

      // Scavenger Aiming Angle
      if (isSolo) {
        if (localTarget === scavenger) {
          scavenger.aimAngle = Math.atan2(mouseWorldY - scavenger.y, mouseWorldX - scavenger.x);
        } else {
          let closestDist = 300;
          let aimTarget = null;
          for (let e of gameState.enemies) {
            const d = Math.hypot(e.x - scavenger.x, e.y - scavenger.y);
            if (d < closestDist) {
              closestDist = d;
              aimTarget = e;
            }
          }
          if (aimTarget) {
            scavenger.aimAngle = Math.atan2(aimTarget.y - scavenger.y, aimTarget.x - scavenger.x);
          } else if (sLen > 0) {
            scavenger.aimAngle = scavenger.angle;
          }
        }
      } else if (typeof remoteKeys.aimAngle === 'number') {
        scavenger.aimAngle = remoteKeys.aimAngle;
      }
    }

    // 4. World Boundary Clamping
    rover.x = Math.max(70, Math.min(rover.x, WORLD_WIDTH - 70));
    rover.y = Math.max(50, Math.min(rover.y, WORLD_HEIGHT - 50));
    scavenger.x = Math.max(20, Math.min(scavenger.x, WORLD_WIDTH - 20));
    scavenger.y = Math.max(20, Math.min(scavenger.y, WORLD_HEIGHT - 20));

    // 5. Pilot Heavy Cannon Firing
    const pilotWantsToShoot = isSolo
      ? (localTarget === rover ? keys.mouse.isDown : keys.mouse.rightDown)
      : (keys.mouse.isDown || keys.Space);

    const isTurretOverdrive = rover.powerMode === 'turrets' && rover.fuel > 0;
    const cannonCooldownLimit = isTurretOverdrive ? 11 : 22;

    if (pilotWantsToShoot && rover.cannonCooldown <= 0) {
      rover.cannonCooldown = cannonCooldownLimit;
      rover.turretRecoil = 10;
      rover.muzzleFlash = 4;

      if (isTurretOverdrive) {
        rover.fuel = Math.max(0, rover.fuel - 0.7);
      }

      const barrelLen = 46;
      const bX = rover.x + Math.cos(rover.turretAngle) * barrelLen;
      const bY = rover.y + Math.sin(rover.turretAngle) * barrelLen;
      const cSpeed = isTurretOverdrive ? 20 : 16.5;

      gameState.projectiles.push({
        type: 'cannon',
        x: bX,
        y: bY,
        vx: Math.cos(rover.turretAngle) * cSpeed,
        vy: Math.sin(rover.turretAngle) * cSpeed,
        dist: 0,
        radius: isTurretOverdrive ? 7 : 6,
        damage: isTurretOverdrive ? 80 : 65,
        splashRadius: isTurretOverdrive ? 65 : 45,
        color: isTurretOverdrive ? '#ec4899' : '#f59e0b'
      });
    }

    // 6. Scavenger Plasma Blaster Firing
    const scavWantsToShoot = isSolo
      ? (localTarget === scavenger ? (keys.mouse.isDown || keys.Space) : keys.Space)
      : (scavInputs.isMouseDown || scavInputs.Space);

    const blasterCooldownLimit = gameState.upgrades.blasterTier > 0 ? 7 : 11;
    if (scavWantsToShoot && scavenger.fireCooldown <= 0) {
      scavenger.fireCooldown = blasterCooldownLimit;
      scavenger.muzzleFlash = 3;

      const barrelLen = 24;
      const bX = scavenger.x + Math.cos(scavenger.aimAngle) * barrelLen;
      const bY = scavenger.y + Math.sin(scavenger.aimAngle) * barrelLen;
      const pSpeed = 15;
      const bDmg = gameState.upgrades.blasterTier > 0 ? 40 : 25;

      gameState.projectiles.push({
        type: 'plasma',
        x: bX,
        y: bY,
        vx: Math.cos(scavenger.aimAngle) * pSpeed,
        vy: Math.sin(scavenger.aimAngle) * pSpeed,
        dist: 0,
        radius: 4,
        damage: bDmg,
        color: '#38bdf8'
      });
    }

    // 7. Update Projectiles & Hits
    for (let pIdx = gameState.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const p = gameState.projectiles[pIdx];
      p.x += p.vx;
      p.y += p.vy;
      p.dist += Math.hypot(p.vx, p.vy);

      if (p.dist > (p.type === 'cannon' ? 900 : 750) || p.x < 0 || p.x > WORLD_WIDTH || p.y < 0 || p.y > WORLD_HEIGHT) {
        if (p.type === 'cannon') {
          spawnExplosion(p.x, p.y, 8);
        }
        gameState.projectiles.splice(pIdx, 1);
        continue;
      }

      let hit = false;
      for (let eIdx = gameState.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = gameState.enemies[eIdx];
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist < enemy.radius + p.radius) {
          hit = true;

          if (p.type === 'cannon') {
            enemy.hp -= p.damage;
            enemy.hitFlash = 8;
            spawnBloodSplat(enemy.x, enemy.y, 6, enemy.color);
            spawnExplosion(p.x, p.y, 16);

            for (let other of gameState.enemies) {
              if (other === enemy) continue;
              const splashDist = Math.hypot(other.x - p.x, other.y - p.y);
              if (splashDist <= p.splashRadius) {
                const splashDmg = Math.round(p.damage * 0.55 * (1 - splashDist / p.splashRadius));
                other.hp -= splashDmg;
                other.hitFlash = 6;
                spawnBloodSplat(other.x, other.y, 3, other.color);
                if (other.hp <= 0 && !other.counted) {
                  other.counted = true;
                  handleEnemyDefeated(gameState, other);
                }
              }
            }
          } else {
            enemy.hp -= p.damage;
            enemy.hitFlash = 6;
            spawnBloodSplat(enemy.x, enemy.y, 4, enemy.color);
          }

          if (enemy.hp <= 0 && !enemy.counted) {
            enemy.counted = true;
            handleEnemyDefeated(gameState, enemy);
            gameState.enemies.splice(eIdx, 1);
          }
          break;
        }
      }

      // Splash cleanup
      for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        if (gameState.enemies[i].hp <= 0) {
          gameState.enemies.splice(i, 1);
        }
      }

      if (hit) {
        gameState.projectiles.splice(pIdx, 1);
      }
    }

    // 8. Swarm Wave Spawning & AI
    spawnTimer++;
    if (spawnTimer % 180 === 0) {
      spawnSwarmWave(
        gameState.enemies,
        rover,
        scavenger,
        WORLD_WIDTH,
        WORLD_HEIGHT,
        35
      );
    }
    gameState.wave = 1 + Math.floor(gameState.kills / 10);

    updateSwarmAI(gameState.enemies, rover, scavenger, true);

    // 9. Rover Ramming / Tread Crushing
    const roverLeft = rover.x - rover.width / 2;
    const roverRight = rover.x + rover.width / 2;
    const roverTop = rover.y - rover.height / 2;
    const roverBottom = rover.y + rover.height / 2;
    const isRoverRolling = (rover.vx * rover.vx + rover.vy * rover.vy) > 0.8;

    let crushDamage = 60;
    if (gameState.upgrades.speedTier > 0) crushDamage += 35;
    if (rover.powerMode === 'engines' && rover.fuel > 0) crushDamage += 40;

    for (let eIdx = gameState.enemies.length - 1; eIdx >= 0; eIdx--) {
      const enemy = gameState.enemies[eIdx];
      const closestX = Math.max(roverLeft, Math.min(enemy.x, roverRight));
      const closestY = Math.max(roverTop, Math.min(enemy.y, roverBottom));
      const distSq = (enemy.x - closestX) * (enemy.x - closestX) + (enemy.y - closestY) * (enemy.y - closestY);

      if (distSq < enemy.radius * enemy.radius) {
        if (isRoverRolling) {
          enemy.hp -= crushDamage;
          enemy.hitFlash = 8;
          spawnBloodSplat(enemy.x, enemy.y, 10, '#22c55e');

          if (enemy.hp <= 0) {
            handleEnemyDefeated(gameState, enemy);
            gameState.enemies.splice(eIdx, 1);
            continue;
          }
        } else {
          // If shields are active, shield absorbs the hit
          if (rover.powerMode === 'shields' && rover.fuel > 0) {
            rover.shieldPulse = 8;
            rover.fuel = Math.max(0, rover.fuel - 0.25);
          } else if (enemy.attackCooldown <= 0) {
            rover.hp = Math.max(0, rover.hp - enemy.damage * 0.45);
            enemy.attackCooldown = 32;
            spawnBloodSplat(closestX, closestY, 3, '#94a3b8');
          }
        }
      }

      // Swarm attack on Scavenger (ONLY if on foot!)
      if (!scavenger.isBoarded) {
        const distScav = Math.hypot(scavenger.x - enemy.x, scavenger.y - enemy.y);
        if (distScav < scavenger.radius + enemy.radius) {
          if (enemy.attackCooldown <= 0) {
            scavenger.hp = Math.max(0, scavenger.hp - enemy.damage);
            enemy.attackCooldown = 28;
            spawnBloodSplat(scavenger.x, scavenger.y, 5, '#f97316');

            const kbAngle = Math.atan2(scavenger.y - enemy.y, scavenger.x - enemy.x);
            scavenger.x += Math.cos(kbAngle) * 16;
            scavenger.y += Math.sin(kbAngle) * 16;
          }
        }
      }
    }

    // 10. Update Resource Economy (Scrap, Fuel Cells & Ruins)
    updateEconomy(gameState, true);

    // 11. Broadcast Authoritative State to Peer Client
    if (network && !isSolo) {
      network.send({
        type: 'STATE',
        state: {
          rover: {
            x: rover.x,
            y: rover.y,
            vx: rover.vx,
            vy: rover.vy,
            hp: rover.hp,
            maxHp: rover.maxHp,
            fuel: rover.fuel,
            maxFuel: rover.maxFuel,
            powerMode: rover.powerMode,
            shieldPulse: rover.shieldPulse,
            angle: rover.angle,
            turretAngle: rover.turretAngle,
            turretRecoil: rover.turretRecoil,
            muzzleFlash: rover.muzzleFlash
          },
          scavenger: {
            x: scavenger.x,
            y: scavenger.y,
            vx: scavenger.vx,
            vy: scavenger.vy,
            hp: scavenger.hp,
            maxHp: scavenger.maxHp,
            cargo: scavenger.cargo,
            maxCargo: scavenger.maxCargo,
            isBoarded: scavenger.isBoarded,
            angle: scavenger.angle,
            aimAngle: scavenger.aimAngle,
            muzzleFlash: scavenger.muzzleFlash
          },
          enemies: gameState.enemies.map(e => ({
            id: e.id,
            x: Math.round(e.x),
            y: Math.round(e.y),
            radius: e.radius,
            hp: e.hp,
            maxHp: e.maxHp,
            color: e.color,
            eyeColor: e.eyeColor,
            angle: e.angle,
            hitFlash: e.hitFlash,
            type: e.type,
            legAnim: e.legAnim
          })),
          projectiles: gameState.projectiles,
          scrapNodes: gameState.scrapNodes.map(n => ({
            id: n.id,
            x: Math.round(n.x),
            y: Math.round(n.y),
            tier: n.tier,
            amount: n.amount,
            maxAmount: n.maxAmount,
            radius: n.radius,
            color: n.color,
            glowColor: n.glowColor,
            beingHarvested: n.beingHarvested
          })),
          energyCells: gameState.energyCells,
          ruins: gameState.ruins,
          techCores: gameState.techCores,
          baseScrap: gameState.baseScrap,
          upgrades: gameState.upgrades,
          kills: gameState.kills,
          wave: gameState.wave
        }
      });
    }
  } else {
    // Client (Scavenger): Stream keystrokes, board toggle, and exact 360 aim
    if (network) {
      const scavScreenX = canvas.width / 2;
      const scavScreenY = canvas.height / 2;
      const clientAimAngle = Math.atan2(keys.mouse.y - scavScreenY, keys.mouse.x - scavScreenX);

      network.send({
        type: 'INPUT',
        keys: {
          w: keys.w || keys.ArrowUp,
          a: keys.a || keys.ArrowLeft,
          s: keys.s || keys.ArrowDown,
          d: keys.d || keys.ArrowRight,
          aimAngle: clientAimAngle,
          isMouseDown: keys.mouse.isDown,
          Space: keys.Space,
          toggleBoard: keys.justPressed.e
        }
      });
    }
    updateEconomy(gameState, false);
  }

  // Update particles
  updateParticles();

  // Update HTML HUD Elements
  document.getElementById('rover-hp-txt').textContent = `${Math.ceil(gameState.rover.hp)}/${gameState.rover.maxHp}`;
  document.getElementById('rover-hp-bar').style.width = `${Math.max(0, (gameState.rover.hp / gameState.rover.maxHp) * 100)}%`;

  document.getElementById('rover-fuel-txt').textContent = `${Math.ceil(gameState.rover.fuel)}/${gameState.rover.maxFuel}`;
  document.getElementById('rover-fuel-bar').style.width = `${Math.max(0, (gameState.rover.fuel / gameState.rover.maxFuel) * 100)}%`;

  document.getElementById('scavenger-hp-txt').textContent = `${Math.ceil(gameState.scavenger.hp)}/${gameState.scavenger.maxHp}`;
  document.getElementById('scavenger-hp-bar').style.width = `${Math.max(0, (gameState.scavenger.hp / gameState.scavenger.maxHp) * 100)}%`;

  document.getElementById('base-scrap-txt').textContent = `${Math.floor(gameState.baseScrap)}`;
  document.getElementById('tech-cores-txt').textContent = `${gameState.techCores || 0}`;

  document.getElementById('scav-cargo-txt').textContent = `${Math.floor(gameState.scavenger.cargo)}/${gameState.scavenger.maxCargo}`;
  const cargoRatio = Math.min(1.0, gameState.scavenger.cargo / gameState.scavenger.maxCargo);
  document.getElementById('scav-cargo-bar').style.width = `${cargoRatio * 100}%`;

  document.getElementById('hud-wave').textContent = `Wave: ${gameState.wave}`;
  document.getElementById('hud-swarm').textContent = `Swarm: ${gameState.enemies.length}`;
  document.getElementById('hud-kills').textContent = `${gameState.kills}`;

  // Boarding Prompt Button State
  const boardBtn = document.getElementById('btn-board-toggle');
  if (boardBtn) {
    if (gameState.scavenger.isBoarded) {
      boardBtn.textContent = '🚪 [E] Disembark Mobile Base';
      boardBtn.className = 'board-btn boarded';
    } else {
      const d = Math.hypot(gameState.scavenger.x - gameState.rover.x, gameState.scavenger.y - gameState.rover.y);
      if (d <= 115) {
        boardBtn.textContent = '🚪 [E] Board Rover Base';
        boardBtn.className = 'board-btn';
      } else {
        boardBtn.textContent = `🚪 [E] Board Base (${Math.round(d)}m away)`;
        boardBtn.className = 'board-btn';
      }
    }
  }

  // Update Upgrade Buttons Disabled State
  const s = gameState.baseScrap;
  const tc = gameState.techCores || 0;
  const u = gameState.upgrades;

  document.getElementById('btn-up-repair').disabled = s < 15;
  document.getElementById('btn-up-cargo').disabled = s < 35 || u.cargoTier > 0;
  if (u.cargoTier > 0) document.getElementById('btn-up-cargo').textContent = '🎒 Cargo (MAX)';

  document.getElementById('btn-up-speed').disabled = s < 45 || u.speedTier > 0;
  if (u.speedTier > 0) document.getElementById('btn-up-speed').textContent = '⚡ Treads (MAX)';

  document.getElementById('btn-up-blaster').disabled = s < 50 || u.blasterTier > 0;
  if (u.blasterTier > 0) document.getElementById('btn-up-blaster').textContent = '🔫 Plasma (MAX)';

  document.getElementById('btn-up-turret').disabled = s < 75 || u.hasTurret;
  if (u.hasTurret) document.getElementById('btn-up-turret').textContent = '🛡️ Turret (ACTIVE)';

  const btnRadar = document.getElementById('btn-up-radar');
  if (btnRadar) {
    btnRadar.disabled = tc < 1 || u.radarTier > 0;
    if (u.radarTier > 0) btnRadar.textContent = '📡 Radar (ACTIVE)';
  }

  const btnQuantum = document.getElementById('btn-up-quantum');
  if (btnQuantum) {
    btnQuantum.disabled = tc < 2 || u.quantumTier > 0;
    if (u.quantumTier > 0) btnQuantum.textContent = '⚛️ Quantum Core (ACTIVE)';
  }
}

// --- RENDERING PIPELINE ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();

  // Center camera on local target
  const camX = canvas.width / 2 - localTarget.x;
  const camY = canvas.height / 2 - localTarget.y;
  ctx.translate(camX, camY);

  // 1. Terrain Grid & Lunar Ground
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  const gridSize = 120;
  for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  // 2. World Hazard Perimeter Borders
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // 3. Render High-Risk Ruin Complexes & Tech Cores
  drawRuins(ctx, gameState.ruins);

  // 4. Render Energy Cells dropped by swarm
  drawEnergyCells(ctx, gameState.energyCells);

  // 5. Render Scrap Nodes
  for (let node of gameState.scrapNodes) {
    drawScrapNode(ctx, node);
  }

  // 6. Extraction & Deposit Energy Conduits
  drawHarvestBeam(ctx, gameState.scavenger, gameState.scrapNodes);
  drawDepositConduit(ctx, gameState.scavenger, gameState.rover);
  drawScrapShards(ctx);

  // 7. Particle Splatters (Alien blood, explosions & sparks)
  drawParticles(ctx);

  // 8. Render Projectiles (Cannon vs Plasma vs Autoturret)
  for (let p of gameState.projectiles) {
    ctx.save();
    if (p.type === 'cannon') {
      // Heavy Golden/Magenta Kinetic Shell with fiery tracer
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || 6, 0, Math.PI * 2);
      ctx.fillStyle = p.color || '#fbbf24';
      ctx.shadowColor = p.color || '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fill();

      // Fiery exhaust trail
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      ctx.strokeStyle = p.color || 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 4.5;
      ctx.stroke();
    } else if (p.type === 'autoturret') {
      // Violet Autoturret Tracer
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      // Electric Cyan Plasma Bolt
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 9. Render Alien Swarm
  for (let enemy of gameState.enemies) {
    drawEnemy(ctx, enemy);
  }

  // 10. Render Rover Base with Rotating Turret
  drawRover(ctx, gameState.rover, gameState.upgrades);

  // 11. Render Scavenger with Mouse-Aimed Blaster
  drawScavenger(ctx, gameState.scavenger);

  // 12. Floating Damage & Resource Texts
  drawFloatingTextsList(ctx);

  ctx.restore();

  // 13. Screen-space Crosshair Reticle & Radar
  if (gameStarted) {
    drawCrosshair(ctx, keys.mouse.x, keys.mouse.y, localTarget, gameState);
    drawRadar(ctx);
  }
}

// Draw the Rover Chassis and independent Rotating Pilot Turret
function drawRover(ctx, rover, upgrades) {
  // 1. Draw Rover Chassis & Treads (Rotates with rover.angle)
  ctx.save();
  ctx.translate(rover.x, rover.y);
  ctx.rotate(rover.angle);

  // Jet Booster Thruster Flames in Engines Power Mode
  if (rover.powerMode === 'engines' && (rover.vx * rover.vx + rover.vy * rover.vy) > 0.4) {
    for (let side = -1; side <= 1; side += 2) {
      const flameLen = 25 + Math.random() * 20;
      const ty = side * (rover.height / 2 - 8);
      const grad = ctx.createLinearGradient(-rover.width / 2, ty, -rover.width / 2 - flameLen, ty);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, '#facc15');
      grad.addColorStop(0.65, '#f97316');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-rover.width / 2, ty - 7);
      ctx.lineTo(-rover.width / 2 - flameLen, ty);
      ctx.lineTo(-rover.width / 2, ty + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Headlights beam cone
  const lightGrad = ctx.createRadialGradient(rover.width * 0.45, 0, 10, rover.width * 1.8, 0, 240);
  lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
  lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
  lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = lightGrad;
  ctx.beginPath();
  ctx.moveTo(rover.width * 0.45, -25);
  ctx.lineTo(rover.width * 1.8, -130);
  ctx.lineTo(rover.width * 1.8, 130);
  ctx.lineTo(rover.width * 0.45, 25);
  ctx.closePath();
  ctx.fill();

  // Base Cargo Bay Indicator (Rear glowing docking bay)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-rover.width / 2 - 8, -rover.height * 0.35, 12, rover.height * 0.7);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.strokeRect(-rover.width / 2 - 8, -rover.height * 0.35, 12, rover.height * 0.7);

  // Heavy Treads (Left & Right)
  const treadW = rover.width + 12;
  const treadH = 22;
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-treadW / 2, -rover.height / 2 - 4, treadW, treadH);
  ctx.fillRect(-treadW / 2, rover.height / 2 - treadH + 4, treadW, treadH);

  // Tread Track links animation
  ctx.strokeStyle = upgrades.speedTier > 0 ? '#f59e0b' : '#44403c';
  ctx.lineWidth = 2.5;
  for (let x = -treadW / 2 + (rover.treadAnim % 14); x < treadW / 2; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, -rover.height / 2 - 4);
    ctx.lineTo(x, -rover.height / 2 + treadH - 4);
    ctx.moveTo(x, rover.height / 2 - treadH + 4);
    ctx.lineTo(x, rover.height / 2 + 4);
    ctx.stroke();
  }

  // Main Armored Chassis
  ctx.fillStyle = rover.color;
  ctx.fillRect(-rover.width / 2, -rover.height / 2 + 10, rover.width, rover.height - 20);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 3;
  ctx.strokeRect(-rover.width / 2, -rover.height / 2 + 10, rover.width, rover.height - 20);

  // Reinforced front ramming bumper plate
  ctx.fillStyle = upgrades.speedTier > 0 ? '#b45309' : '#71717a';
  ctx.fillRect(rover.width / 2 - 10, -rover.height / 2 + 8, 14, rover.height - 16);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(rover.width / 2 - 10, -rover.height / 2 + 8, 14, rover.height - 16);

  // Cockpit Cab & Windshield
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(rover.width * 0.05, -rover.height * 0.22, rover.width * 0.32, rover.height * 0.44);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(rover.width * 0.05, -rover.height * 0.22, rover.width * 0.32, rover.height * 0.44);

  // Dual headlights bulbs
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(rover.width / 2 + 2, -18, 5, 0, Math.PI * 2);
  ctx.arc(rover.width / 2 + 2, 18, 5, 0, Math.PI * 2);
  ctx.fill();

  // Secondary Autoturret Mount (if upgrade purchased)
  if (upgrades.hasTurret) {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(-rover.width * 0.32, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-rover.width * 0.32 + 2, -4, 12, 3);
    ctx.fillRect(-rover.width * 0.32 + 2, 1, 12, 3);
  }

  ctx.restore();

  // 2. Draw Rotating Pilot Cannon Turret (Rotates independently with rover.turretAngle!)
  ctx.save();
  ctx.translate(rover.x, rover.y);
  ctx.rotate(rover.turretAngle);

  const recoil = Math.max(0, rover.turretRecoil || 0);

  // Heavy Cannon Barrel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10 - recoil, -5, 38, 10);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10 - recoil, -5, 38, 10);

  // Heavy Muzzle Brake Collar
  ctx.fillStyle = '#334155';
  ctx.fillRect(44 - recoil, -7, 6, 14);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(44 - recoil, -7, 6, 14);

  // Turret Gunhouse / Armored Cupola
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Gun Mantlet Block
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(8, -8, 10, 16);
  ctx.strokeRect(8, -8, 10, 16);

  // Commander's Hatch
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-4, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // Red Sighting Optical Lens
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(8, -8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Cannon Muzzle Flash Burst
  if (rover.muzzleFlash > 0) {
    ctx.save();
    ctx.translate(52 - recoil, 0);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // 3. Render Scavenger in Roof Hatch if Boarded
  if (gameState.scavenger.isBoarded) {
    ctx.save();
    ctx.translate(rover.x - 12, rover.y);
    ctx.rotate(gameState.scavenger.aimAngle);

    // Scavenger orange helmet
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Visor
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(3.5, 0, 4, -Math.PI / 2.2, Math.PI / 2.2);
    ctx.fill();

    // Roof mounted pintle plasma rifle
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, -2.5, 14, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(9, -1.5, 5, 3);

    // Muzzle flash when firing while boarded
    if (gameState.scavenger.muzzleFlash > 0) {
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(22, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 4. Hexagonal Shield Forcefield Bubble (Shields Power Mode)
  if (rover.powerMode === 'shields' && rover.fuel > 0) {
    ctx.save();
    ctx.translate(rover.x, rover.y);

    const pulse = Math.sin(Date.now() * 0.007) * 0.06;
    const sR = 92 * (1 + pulse);
    const flash = rover.shieldPulse > 0 ? 0.9 : 0.35;

    ctx.strokeStyle = rover.shieldPulse > 0 ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = rover.shieldPulse > 0 ? 3.5 : 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = rover.shieldPulse > 0 ? 20 : 10;

    // Outer Hexagon
    ctx.beginPath();
    for (let h = 0; h < 6; h++) {
      const ha = (h / 6) * Math.PI * 2;
      const hx = Math.cos(ha) * sR;
      const hy = Math.sin(ha) * sR;
      if (h === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(6, 182, 212, ${flash * 0.3})`;
    ctx.fill();
    ctx.stroke();

    // Secondary inner hexagon
    ctx.strokeStyle = `rgba(56, 189, 248, ${flash * 0.55})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let h = 0; h < 6; h++) {
      const ha = (h / 6) * Math.PI * 2 + Math.PI / 6;
      const hx = Math.cos(ha) * (sR * 0.72);
      const hy = Math.sin(ha) * (sR * 0.72);
      if (h === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  // Hull health bar above Rover
  const barW = 100;
  const barH = 7;
  const barX = rover.x - barW / 2;
  const barY = rover.y - rover.height / 2 - 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = Math.max(0, rover.hp / rover.maxHp);
  ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : (hpRatio > 0.25 ? '#eab308' : '#ef4444');
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
}

// Draw Scavenger with Mouse-Aimed Weapon (Only when on foot)
function drawScavenger(ctx, scavenger) {
  if (scavenger.isBoarded) return; // Rendered atop the Rover hatch

  ctx.save();
  ctx.translate(scavenger.x, scavenger.y);
  ctx.rotate(scavenger.aimAngle || scavenger.angle);

  // Cargo Backpack on rear
  const cargoRatio = Math.min(1.0, (scavenger.cargo || 0) / (scavenger.maxCargo || 50));
  const packColor = cargoRatio >= 1.0 ? '#ef4444' : (cargoRatio > 0.5 ? '#f59e0b' : '#334155');
  ctx.fillStyle = packColor;
  ctx.fillRect(-scavenger.radius - 8, -6, 8, 12);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1;
  ctx.strokeRect(-scavenger.radius - 8, -6, 8, 12);

  // Plasma Blaster Rifle
  ctx.fillStyle = '#334155';
  ctx.fillRect(8, -3.5, 16, 7);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, -3.5, 16, 7);

  // Glowing Plasma Capacitor
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(11, -2, 6, 4);

  // Extended Barrel
  ctx.fillStyle = '#475569';
  ctx.fillRect(24, -2, 6, 4);

  // Blaster Muzzle Flash
  if (scavenger.muzzleFlash > 0) {
    ctx.save();
    ctx.translate(32, 0);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Thruster Spark when moving
  if (Math.hypot(scavenger.vx, scavenger.vy) > 0.2) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-scavenger.radius - 8, -4);
    ctx.lineTo(-scavenger.radius - 16, 0);
    ctx.lineTo(-scavenger.radius - 8, 4);
    ctx.closePath();
    ctx.fill();
  }

  // Scavenger Suit Body
  ctx.beginPath();
  ctx.arc(0, 0, scavenger.radius, 0, Math.PI * 2);
  ctx.fillStyle = scavenger.color;
  ctx.fill();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Visor
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(scavenger.radius * 0.45, 0, scavenger.radius * 0.45, -Math.PI / 2.2, Math.PI / 2.2);
  ctx.fill();

  ctx.restore();

  // Suit Shield Bar above Scavenger
  const barW = 45;
  const barH = 5;
  const barX = scavenger.x - barW / 2;
  const barY = scavenger.y - scavenger.radius - 14;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpRatio = Math.max(0, scavenger.hp / scavenger.maxHp);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
}

// Tactical Aiming Crosshair following mouse
function drawCrosshair(ctx, mx, my, target, state) {
  if (mx < 0 || mx > canvas.width || my < 0 || my > canvas.height) return;

  ctx.save();
  ctx.translate(mx, my);

  const isRoverSelected = target === state.rover;
  const reticleColor = isRoverSelected ? '#f59e0b' : '#38bdf8';

  // Center Reticle Point
  ctx.fillStyle = reticleColor;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Reticle Ring
  ctx.strokeStyle = reticleColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();

  // 4 Directional Tick Marks
  const tickDist = 18;
  const tickLen = 6;
  ctx.beginPath();
  ctx.moveTo(0, -tickDist);
  ctx.lineTo(0, -tickDist - tickLen);
  ctx.moveTo(0, tickDist);
  ctx.lineTo(0, tickDist + tickLen);
  ctx.moveTo(-tickDist, 0);
  ctx.lineTo(-tickDist - tickLen, 0);
  ctx.moveTo(tickDist, 0);
  ctx.lineTo(tickDist + tickLen, 0);
  ctx.stroke();

  // Weapon Cooldown Progress Ring
  let cdRatio = 0;
  if (isRoverSelected && state.rover.cannonCooldown > 0) {
    const maxCd = state.rover.powerMode === 'turrets' ? 11 : 22;
    cdRatio = state.rover.cannonCooldown / maxCd;
  } else if (!isRoverSelected && state.scavenger.fireCooldown > 0) {
    cdRatio = state.scavenger.fireCooldown / (state.upgrades.blasterTier > 0 ? 7 : 11);
  }

  if (cdRatio > 0) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio);
    ctx.stroke();
  }

  ctx.restore();
}

// Tactical HUD Radar Minimap
function drawRadar(ctx) {
  const radarSize = 135;
  const margin = 20;
  const rx = canvas.width - radarSize - margin;
  const ry = margin;

  ctx.save();
  // Radar Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(rx, ry, radarSize, radarSize);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx, ry, radarSize, radarSize);

  // Radar Grid Lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rx + radarSize / 2, ry);
  ctx.lineTo(rx + radarSize / 2, ry + radarSize);
  ctx.moveTo(rx, ry + radarSize / 2);
  ctx.lineTo(rx + radarSize, ry + radarSize / 2);
  ctx.stroke();

  const toRadarX = (wx) => rx + (wx / WORLD_WIDTH) * radarSize;
  const toRadarY = (wy) => ry + (wy / WORLD_HEIGHT) * radarSize;

  // Long-Range Radar Sweep beam (if unlocked)
  if (gameState.upgrades.radarTier > 0) {
    radarSweepAngle += 0.04;
    const sweepX = rx + radarSize / 2 + Math.cos(radarSweepAngle) * (radarSize / 2);
    const sweepY = ry + radarSize / 2 + Math.sin(radarSweepAngle) * (radarSize / 2);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + radarSize / 2, ry + radarSize / 2);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();
  }

  // Ruins (Magenta Diamonds)
  if (gameState.ruins) {
    for (let r of gameState.ruins) {
      ctx.fillStyle = r.hasCore ? '#ec4899' : '#64748b';
      const rxPos = toRadarX(r.x);
      const ryPos = toRadarY(r.y);
      ctx.fillRect(rxPos - 3, ryPos - 3, 6, 6);
    }
  }

  // Scrap Nodes (Yellow/Cyan Diamonds)
  for (let n of gameState.scrapNodes) {
    ctx.fillStyle = n.color;
    const nx = toRadarX(n.x);
    const ny = toRadarY(n.y);
    ctx.beginPath();
    ctx.moveTo(nx, ny - 2);
    ctx.lineTo(nx + 2, ny);
    ctx.lineTo(nx, ny + 2);
    ctx.lineTo(nx - 2, ny);
    ctx.closePath();
    ctx.fill();
  }

  // Swarm dots (Red)
  ctx.fillStyle = '#ef4444';
  for (let e of gameState.enemies) {
    ctx.fillRect(toRadarX(e.x) - 1.5, toRadarY(e.y) - 1.5, 3, 3);
  }

  // Rover Blip (Green)
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(toRadarX(gameState.rover.x) - 3.5, toRadarY(gameState.rover.y) - 2.5, 7, 5);

  // Scavenger Blip (Orange, if on foot)
  if (!gameState.scavenger.isBoarded) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(toRadarX(gameState.scavenger.x), toRadarY(gameState.scavenger.y), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- GAME LOOP ---
function gameLoop() {
  update();
  draw();
  clearJustPressed();
  requestAnimationFrame(gameLoop);
}

// Boot up input listeners with canvas mouse tracking
initInputHandlers(canvas);
gameLoop();
