// =====================================================================
// SYMBIOTIC TREADS: CO-OP ROVER SURVIVAL
// Authoritative Single-File Game Engine (Runs without module CORS errors)
// =====================================================================

(function () {
  'use strict';

  // --- 1. WEBRTC PEER MANAGER ---
  class PeerManager {
    constructor(isHost, roomCode, onDataReceived, onOpenCallback) {
      this.isHost = isHost;
      this.onDataReceived = onDataReceived;
      this.onOpenCallback = onOpenCallback;
      this.connections = [];
      this.myId = null;

      if (typeof Peer === 'undefined') {
        console.warn('PeerJS library not loaded. Multiplayer P2P is unavailable.');
        if (this.onOpenCallback) this.onOpenCallback('OFFLINE');
        return;
      }

      try {
        this.peerId = isHost ? this.generateId() : null;
        this.peer = new Peer(this.peerId);

        this.peer.on('open', (id) => {
          this.myId = id;
          console.log(`[P2P] Peer ID: ${id}`);
          if (this.onOpenCallback) this.onOpenCallback(id);
          if (!isHost && roomCode) {
            this.connectToHost(roomCode);
          }
        });

        this.peer.on('error', (err) => {
          console.error('[P2P Error]', err);
          alert('P2P Connection Error: ' + (err.type || err.message));
        });

        if (this.isHost) {
          this.peer.on('connection', (conn) => this.setupConnection(conn));
        }
      } catch (err) {
        console.error('Failed to initialize PeerJS:', err);
      }
    }

    generateId() {
      return 'base-' + Math.random().toString(36).substring(2, 7);
    }

    connectToHost(roomCode) {
      if (!this.peer) return;
      const conn = this.peer.connect(roomCode);
      this.setupConnection(conn);
    }

    setupConnection(conn) {
      conn.on('open', () => {
        console.log('[P2P] Connected to remote player!');
        this.connections.push(conn);
        const hostStatus = document.getElementById('host-status');
        if (hostStatus) hostStatus.textContent = 'Rover Connected! Game in session.';
      });

      conn.on('data', (data) => {
        if (this.onDataReceived) this.onDataReceived(data);
      });

      conn.on('close', () => {
        console.log('[P2P] Remote connection closed.');
        this.connections = this.connections.filter(c => c !== conn);
      });
    }

    send(data) {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(data);
      });
    }
  }

  // --- 2. INPUT SYSTEM ---
  const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    Space: false, e: false,
    '1': false, '2': false, '3': false, '4': false, '5': false, '6': false,
    Escape: false,
    justPressed: {
      e: false, Tab: false, Escape: false,
      '1': false, '2': false, '3': false, '4': false, '5': false, '6': false
    },
    mouse: { x: 0, y: 0, isDown: false, rightDown: false, clicked: false }
  };

  function initInputHandlers(canvas) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') keys.w = true;
      if (k === 'a') keys.a = true;
      if (k === 's') keys.s = true;
      if (k === 'd') keys.d = true;
      if (e.key === 'ArrowUp') keys.ArrowUp = true;
      if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.key === 'ArrowDown') keys.ArrowDown = true;
      if (e.key === 'ArrowRight') keys.ArrowRight = true;
      if (e.key === ' ' || e.code === 'Space') {
        if (!keys.Space) keys.justPressed.Space = true;
        keys.Space = true;
      }

      if (k === 'e') {
        if (!keys.e) keys.justPressed.e = true;
        keys.e = true;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        keys.justPressed.Tab = true;
      }
      if (e.key === 'Escape') {
        keys.justPressed.Escape = true;
      }

      for (let i = 1; i <= 6; i++) {
        if (e.key === String(i)) {
          if (!keys[String(i)]) keys.justPressed[String(i)] = true;
          keys[String(i)] = true;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') keys.w = false;
      if (k === 'a') keys.a = false;
      if (k === 's') keys.s = false;
      if (k === 'd') keys.d = false;
      if (e.key === 'ArrowUp') keys.ArrowUp = false;
      if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.key === 'ArrowDown') keys.ArrowDown = false;
      if (e.key === 'ArrowRight') keys.ArrowRight = false;
      if (e.key === ' ' || e.code === 'Space') keys.Space = false;
      if (k === 'e') keys.e = false;

      for (let i = 1; i <= 6; i++) {
        if (e.key === String(i)) keys[String(i)] = false;
      }
    });

    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        keys.mouse.x = e.clientX - rect.left;
        keys.mouse.y = e.clientY - rect.top;
      });

      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          keys.mouse.isDown = true;
          keys.mouse.clicked = true;
        }
        if (e.button === 2) {
          keys.mouse.rightDown = true;
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) keys.mouse.isDown = false;
        if (e.button === 2) keys.mouse.rightDown = false;
      });

      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
  }

  function clearJustPressed() {
    keys.justPressed.e = false;
    keys.justPressed.Tab = false;
    keys.justPressed.Escape = false;
    keys.justPressed.Space = false;
    keys.mouse.clicked = false;
    for (let i = 1; i <= 6; i++) {
      keys.justPressed[String(i)] = false;
    }
  }

  // --- 2.5 SPRITE ASSETS ---
  const truckSprite = new Image();
  truckSprite.src = 'assets/sprites/military_truck_sheet_8.png?v=8way2';
  let truckSpriteLoaded = false;
  truckSprite.onload = () => {
    truckSpriteLoaded = true;
    console.log('[Assets] 8-Directional military truck sprite sheet loaded:', truckSprite.width, 'x', truckSprite.height);
  };
  truckSprite.onerror = (err) => {
    console.warn('[Assets] Could not load military_truck_sheet_8.png, trying fallback:', err);
    if (!truckSprite.src.includes('image_1.png') && !truckSprite.src.includes('military_truck_sheet.png')) {
      truckSprite.src = 'assets/sprites/image_1.png?v=8way2';
    } else if (!truckSprite.src.includes('military_truck_sheet.png')) {
      truckSprite.src = 'assets/sprites/military_truck_sheet.png';
    }
  };
  if (truckSprite.complete && truckSprite.naturalWidth > 0) {
    truckSpriteLoaded = true;
  }

  // 8-Directional Military Truck Sprite Sheet Configuration (4 cols x 2 rows, 2752x1536 px; 688x768 frame)
  // Grid Layout:
  // Row 1 (row = 0): Col 0: North, Col 1: North-East, Col 2: East, Col 3: South-East
  // Row 2 (row = 1): Col 0: South, Col 1: South-West, Col 2: West, Col 3: North-West
  const DIRECTION_8_FRAMES = [
    { index: 0, name: 'East',       col: 2, row: 0, angle: 0,               facingDir:  1 }, // 0°
    { index: 1, name: 'South-East', col: 3, row: 0, angle: Math.PI / 4,     facingDir:  1 }, // 45°
    { index: 2, name: 'South',      col: 0, row: 1, angle: Math.PI / 2,     facingDir:  0 }, // 90° (front view)
    { index: 3, name: 'South-West', col: 1, row: 1, angle: 3 * Math.PI / 4, facingDir: -1 }, // 135°
    { index: 4, name: 'West',       col: 2, row: 1, angle: Math.PI,         facingDir: -1 }, // 180°
    { index: 5, name: 'North-West', col: 3, row: 1, angle: 5 * Math.PI / 4, facingDir: -1 }, // 225°
    { index: 6, name: 'North',      col: 0, row: 0, angle: 3 * Math.PI / 2, facingDir:  0 }, // 270° (back view)
    { index: 7, name: 'North-East', col: 1, row: 0, angle: 7 * Math.PI / 4, facingDir:  1 }  // 315°
  ];

  function getDirection8Index(vx, vy, fallbackIndex = 2) {
    const speed = Math.hypot(vx, vy);
    if (speed <= 0.25) return fallbackIndex;
    const rad = Math.atan2(vy, vx);
    const deg = ((rad * 180 / Math.PI) + 360) % 360;
    return Math.floor((deg + 22.5) / 45) % 8;
  }

  // --- 3. COMBAT, PARTICLES & STRUCTURE SYSTEM ---
  const PARTICLES = [];
  const FLOATING_TEXTS = [];
  const SCRAP_SHARDS = [];

  function spawnBloodSplat(x, y, count = 6, color = '#22c55e') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      PARTICLES.push({
        type: 'blood',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.02
      });
    }
  }

  function spawnExplosion(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      const colors = ['#f59e0b', '#fbbf24', '#ef4444', '#f97316', '#ffffff'];
      PARTICLES.push({
        type: 'fire',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }

  function spawnSparkArc(x1, y1, x2, y2, color = '#38bdf8') {
    PARTICLES.push({
      type: 'lightning',
      x1, y1, x2, y2,
      color,
      alpha: 1.0,
      decay: 0.12
    });
  }

  function spawnRepairPulseWave(x, y, maxRadius = 220) {
    PARTICLES.push({
      type: 'repair_wave',
      x, y,
      radius: 10,
      maxRadius,
      color: '#22c55e',
      alpha: 0.85,
      decay: 0.02
    });
  }

  function updateParticles() {
    for (let i = PARTICLES.length - 1; i >= 0; i--) {
      const p = PARTICLES[i];
      if (p.type === 'blood' || p.type === 'fire') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha -= p.decay;
      } else if (p.type === 'lightning') {
        p.alpha -= p.decay;
      } else if (p.type === 'repair_wave') {
        p.radius += 5.5;
        p.alpha -= p.decay;
        if (p.radius >= p.maxRadius) p.alpha = 0;
      }
      if (p.alpha <= 0) {
        PARTICLES.splice(i, 1);
      }
    }
  }

  function drawParticles(ctx) {
    for (let p of PARTICLES) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      if (p.type === 'blood' || p.type === 'fire') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'lightning') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        const midX = (p.x1 + p.x2) / 2 + (Math.random() - 0.5) * 22;
        const midY = (p.y1 + p.y2) / 2 + (Math.random() - 0.5) * 22;
        ctx.lineTo(midX, midY);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      } else if (p.type === 'repair_wave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- STRUCTURES CONFIGURATION ---
  const STRUCTURE_CONFIG = {
    wall: {
      cost: 15, hp: 140, radius: 18, width: 32, height: 32,
      name: 'Wall', desc: 'Blocks swarms. High HP barrier.', color: '#64748b'
    },
    gate: {
      cost: 25, hp: 160, radius: 22, width: 42, height: 26,
      name: 'Blast Gate', desc: 'Auto-opens for Rover, shuts against bugs.', color: '#0ea5e9'
    },
    gatling: {
      cost: 40, hp: 90, radius: 16, range: 320, cooldownMax: 8, damage: 14,
      name: 'Gatling Sentry', desc: 'Rapid-fire twin guns. Shreds fast sprinters.', color: '#f59e0b'
    },
    plasma_mortar: {
      cost: 65, hp: 110, radius: 20, range: 480, cooldownMax: 65, damage: 65, splashRadius: 75,
      name: 'Plasma Mortar', desc: 'Heavy explosive mortar for hordes & brutes.', color: '#ec4899'
    },
    tesla: {
      cost: 85, hp: 95, radius: 18, range: 250, cooldownMax: 45, damage: 26, maxTargets: 4,
      name: 'Tesla Coil', desc: 'Chain-lightning coil zaps multiple enemies.', color: '#38bdf8'
    },
    repair_pylon: {
      cost: 50, hp: 120, radius: 18, range: 220, cooldownMax: 90, healAmount: 18,
      name: 'Repair Pylon', desc: 'Emits wave restoring nearby walls & turrets.', color: '#22c55e'
    }
  };

  function createStructure(type, x, y) {
    const cfg = STRUCTURE_CONFIG[type];
    return {
      id: 'struct-' + Math.random().toString(36).substring(2, 9),
      type,
      x, y,
      hp: cfg.hp,
      maxHp: cfg.hp,
      radius: cfg.radius,
      width: cfg.width || 32,
      height: cfg.height || 32,
      cooldown: 0,
      angle: 0,
      isOpen: false,
      hitFlash: 0,
      pulse: 0
    };
  }

  // --- 3.5 IN-WORLD INCREMENTAL BUILD SITES ("KINGDOM" SYSTEM) & WEAPON TIERS ---
  const WEAPON_TIER_CONFIG = {
    1: {
      tier: 1,
      name: 'Kinetic Scout Rifle',
      desc: 'Standard kinetic rifle. Moderate fire rate, standard kinetic bullets.',
      damage: 26,
      fireRate: 11,
      projectileCount: 1,
      spreadAngle: 0,
      pierceCount: 0,
      homingSpeed: 0,
      speed: 16,
      radius: 4,
      color: '#38bdf8'
    },
    2: {
      tier: 2,
      name: 'Scatter-Shot Cannon',
      desc: '3-pellet cone shot with concussive knockback.',
      damage: 22,
      fireRate: 13,
      projectileCount: 3,
      spreadAngle: 0.24,
      pierceCount: 0,
      homingSpeed: 0,
      knockback: 10,
      speed: 15,
      radius: 4,
      color: '#f59e0b'
    },
    3: {
      tier: 3,
      name: 'Piercing Plasma Railgun',
      desc: 'High-velocity plasma slugs that penetrate through 2–3 enemies in a straight line.',
      damage: 48,
      fireRate: 10,
      projectileCount: 1,
      spreadAngle: 0,
      pierceCount: 3,
      homingSpeed: 0,
      speed: 19,
      radius: 5,
      color: '#06b6d4'
    },
    4: {
      tier: 4,
      name: 'Apex Nanite Missile Array',
      desc: 'Piercing plasma rounds + seeking micro-missiles that target swarmers.',
      damage: 55,
      fireRate: 9,
      projectileCount: 1,
      spreadAngle: 0,
      pierceCount: 3,
      homingSpeed: 11,
      hasMissiles: true,
      speed: 19,
      radius: 6,
      color: '#ec4899'
    }
  };

  function createBuildSite(data) {
    return {
      id: data.id,
      x: data.x,
      y: data.y,
      type: data.type, // 'wall' | 'tower' | 'weapon_forge'
      towerType: data.towerType || null,
      tier: data.tier || 0,
      name: data.name,
      desc: data.desc,
      costScrap: data.costScrap || 25,
      costCores: data.costCores || 0,
      currentScrap: 0,
      currentCores: 0,
      active: !!data.active,
      built: false,
      batchIndex: data.batchIndex || 0,
      radius: data.radius || (data.type === 'wall' ? 36 : 28),
      hp: 0,
      maxHp: data.maxHp || 200,
      cooldown: 0,
      angle: 0,
      pulse: 0,
      hitFlash: 0,
      isOpen: false
    };
  }

  function initBuildSites() {
    return [
      // BATCH 0 (Batch 1): 4 Cardinal Perimeter Blast Walls (North, South, East, West)
      createBuildSite({
        id: 'site-wall-n', x: 1500, y: 1360, type: 'wall', costScrap: 25, costCores: 0,
        batchIndex: 0, active: true, name: 'North Blast Wall & Gate',
        desc: 'Reinforced blast barrier with automatic Rover pass.', maxHp: 240
      }),
      createBuildSite({
        id: 'site-wall-s', x: 1500, y: 1640, type: 'wall', costScrap: 25, costCores: 0,
        batchIndex: 0, active: true, name: 'South Blast Wall & Gate',
        desc: 'Reinforced blast barrier with automatic Rover pass.', maxHp: 240
      }),
      createBuildSite({
        id: 'site-wall-e', x: 1660, y: 1500, type: 'wall', costScrap: 25, costCores: 0,
        batchIndex: 0, active: true, name: 'East Blast Wall & Gate',
        desc: 'Eastern valley gateway locking swarms out.', maxHp: 240
      }),
      createBuildSite({
        id: 'site-wall-w', x: 1340, y: 1500, type: 'wall', costScrap: 25, costCores: 0,
        batchIndex: 0, active: true, name: 'West Blast Wall & Gate',
        desc: 'Rear mountain pass gateway guarding base core.', maxHp: 240
      }),

      // BATCH 1 (Batch 2): 4 Corner Automated Turrets
      createBuildSite({
        id: 'site-turret-ne', x: 1650, y: 1360, type: 'tower', towerType: 'gatling', costScrap: 35, costCores: 0,
        batchIndex: 1, active: false, name: 'NE Gatling Sentry',
        desc: 'Autonomous high-speed anti-swarm tower.', maxHp: 180
      }),
      createBuildSite({
        id: 'site-turret-se', x: 1650, y: 1640, type: 'tower', towerType: 'gatling', costScrap: 35, costCores: 0,
        batchIndex: 1, active: false, name: 'SE Gatling Sentry',
        desc: 'Autonomous high-speed anti-swarm tower.', maxHp: 180
      }),
      createBuildSite({
        id: 'site-turret-nw', x: 1350, y: 1360, type: 'tower', towerType: 'gatling', costScrap: 35, costCores: 0,
        batchIndex: 1, active: false, name: 'NW Gatling Sentry',
        desc: 'Autonomous high-speed anti-swarm tower.', maxHp: 180
      }),
      createBuildSite({
        id: 'site-turret-sw', x: 1350, y: 1640, type: 'tower', towerType: 'gatling', costScrap: 35, costCores: 0,
        batchIndex: 1, active: false, name: 'SW Gatling Sentry',
        desc: 'Autonomous high-speed anti-swarm tower.', maxHp: 180
      }),

      // BATCH 2 (Batch 3): Scavenger Weapon Forge & Choke Fortifications
      createBuildSite({
        id: 'site-weapon-forge', x: 1500, y: 1440, type: 'weapon_forge', costScrap: 35, costCores: 1,
        batchIndex: 2, active: false, name: 'Scavenger Weapon Forge',
        desc: 'Upgrades Rover weaponry (Scatter, Railgun, Nanite Missiles).', maxHp: 250
      }),
      createBuildSite({
        id: 'site-choke-east', x: 1840, y: 1500, type: 'wall', costScrap: 35, costCores: 0,
        batchIndex: 2, active: false, name: 'Canyon Choke Barricade',
        desc: 'Advance blast wall & gate sealing the Tar Pit funnel.', maxHp: 280
      }),
      createBuildSite({
        id: 'site-choke-north', x: 1500, y: 1140, type: 'wall', costScrap: 30, costCores: 0,
        batchIndex: 2, active: false, name: 'North Gorge Bastion',
        desc: 'Frontier wall sealing North Crevasse pass.', maxHp: 250
      }),
      createBuildSite({
        id: 'site-choke-south', x: 1500, y: 1860, type: 'wall', costScrap: 30, costCores: 0,
        batchIndex: 2, active: false, name: 'South Gorge Bastion',
        desc: 'Frontier wall sealing South Crevasse pass.', maxHp: 250
      }),

      // BATCH 3 (Batch 4): Heavy Apex Batteries & Citadel Spire
      createBuildSite({
        id: 'site-apex-mortar', x: 1750, y: 1440, type: 'tower', towerType: 'plasma_mortar', costScrap: 50, costCores: 1,
        batchIndex: 3, active: false, name: 'Heavy Plasma Mortar',
        desc: 'Long-range explosive mortar artillery for swarms.', maxHp: 220
      }),
      createBuildSite({
        id: 'site-apex-tesla-n', x: 1580, y: 1300, type: 'tower', towerType: 'tesla', costScrap: 45, costCores: 0,
        batchIndex: 3, active: false, name: 'North Tesla Shock Coil',
        desc: 'Chain-lightning area shock tower.', maxHp: 200
      }),
      createBuildSite({
        id: 'site-apex-tesla-s', x: 1580, y: 1700, type: 'tower', towerType: 'tesla', costScrap: 45, costCores: 0,
        batchIndex: 3, active: false, name: 'South Tesla Shock Coil',
        desc: 'Chain-lightning area shock tower.', maxHp: 200
      }),
      createBuildSite({
        id: 'site-apex-pylon', x: 1500, y: 1550, type: 'tower', towerType: 'repair_pylon', costScrap: 40, costCores: 0,
        batchIndex: 3, active: false, name: 'Citadel Repair Spire',
        desc: 'Nanite aura constantly restoring base and fortifications.', maxHp: 250
      })
    ];
  }

  function checkBatchProgression(state) {
    const batchIdx = state.activeBatchIndex || 0;
    const currentBatch = state.buildSites.filter(s => s.batchIndex === batchIdx);
    const allBuilt = currentBatch.length > 0 && currentBatch.every(s => s.built);

    if (allBuilt) {
      state.activeBatchIndex = batchIdx + 1;
      const nextBatch = state.buildSites.filter(s => s.batchIndex === state.activeBatchIndex);

      if (nextBatch.length > 0) {
        for (let s of nextBatch) {
          s.active = true;
          spawnSparkArc(s.x, s.y - 45, s.x, s.y, '#38bdf8');
          spawnExplosion(s.x, s.y, 6);
        }
        addFloatingText(1500, 1420, `⭐ BATCH ${state.activeBatchIndex + 1} UNLOCKED (4 NEW SITES)!`, '#38bdf8');
        spawnRepairPulseWave(1500, 1500, 160);
      } else {
        addFloatingText(1500, 1420, '⭐ ALL CITADEL BATCHES SECURED! TIER UPGRADES UNLOCKED!', '#ec4899');
        // Recycle sites for higher tiers: exactly 4 active
        for (let s of state.buildSites) {
          if (s.tier < 3) {
            s.costScrap = Math.round(s.costScrap * 1.4);
            s.currentScrap = 0;
            s.maxHp += 120;
            s.hp = s.maxHp;
            s.built = false;
          }
        }
      }
    }
  }

  // --- 4. ENEMY SPAWNING & ESCALATION (HYBRID CONTINUOUS AMBIENT + SURGE WAVES) ---
  function createScaledEnemy(id, x, y, type = 'scuttler', t = 0, isSurgeLeader = false) {
    let baseRadius = 12;
    let baseSpeed = 2.2;
    let maxSpeed = 4.2;
    let baseHp = 28;
    let color = '#ef4444';
    let eyeColor = '#fee2e2';
    let baseDamage = 8;

    if (type === 'sprinter') {
      baseRadius = 11;
      baseSpeed = 4.6;
      maxSpeed = 6.0;
      baseHp = 20;
      color = '#f97316';
      eyeColor = '#fef08a';
      baseDamage = 10;
    } else if (type === 'crusher') {
      baseRadius = 24;
      baseSpeed = 1.4;
      maxSpeed = 2.5;
      baseHp = 140;
      color = '#9333ea';
      eyeColor = '#facc15';
      baseDamage = 25;
    } else if (type === 'spitter') {
      baseRadius = 14;
      baseSpeed = 2.0;
      maxSpeed = 3.3;
      baseHp = 35;
      color = '#10b981';
      eyeColor = '#a7f3d0';
      baseDamage = 14;
    }

    // Mathematical stat scaling formula based on elapsed game minutes t
    let hp = Math.round(baseHp * (1 + 0.12 * Math.pow(Math.max(0, t), 1.1)));
    let speed = Math.min(maxSpeed, baseSpeed * (1 + 0.03 * Math.max(0, t)));
    let damage = Math.round(baseDamage * (1 + 0.08 * Math.max(0, t)));

    if (isSurgeLeader) {
      hp = Math.round(hp * 1.8);
      damage = Math.round(damage * 1.35);
      baseRadius += 6;
      color = '#c026d3';
      eyeColor = '#fde047';
    }

    return {
      id,
      type,
      x, y,
      radius: baseRadius,
      speed,
      hp,
      maxHp: hp,
      color,
      eyeColor,
      damage,
      isSurgeLeader: !!isSurgeLeader,
      attackCooldown: 0,
      hitFlash: 0,
      angle: 0,
      legAnim: Math.random() * 10,
      shootCooldown: Math.floor(Math.random() * 60)
    };
  }

  function spawnAmbientEnemy(gameState, worldWidth, worldHeight) {
    if (gameState.enemies.length >= 65) return;
    const t = (gameState.gameTime || 0) / 60.0;

    // Pick off-screen spawn anchor along perimeter
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * worldWidth; y = 40; }
    else if (side === 1) { x = Math.random() * worldWidth; y = worldHeight - 40; }
    else if (side === 2) { x = 40; y = Math.random() * worldHeight; }
    else { x = worldWidth - 40; y = Math.random() * worldHeight; }

    let type = 'scuttler';
    const r = Math.random();
    if (t < 1.5) {
      type = r < 0.25 ? 'sprinter' : 'scuttler';
    } else if (t < 4.0) {
      if (r < 0.35) type = 'sprinter';
      else if (r < 0.5) type = 'spitter';
      else type = 'scuttler';
    } else if (t < 8.0) {
      if (r < 0.3) type = 'sprinter';
      else if (r < 0.5) type = 'spitter';
      else if (r < 0.68) type = 'crusher';
      else type = 'scuttler';
    } else {
      if (r < 0.25) type = 'crusher';
      else if (r < 0.55) type = 'sprinter';
      else if (r < 0.8) type = 'spitter';
      else type = 'scuttler';
    }

    const id = 'amb-' + Math.random().toString(36).substring(2, 9);
    gameState.enemies.push(createScaledEnemy(id, x, y, type, t, false));
  }

  function spawnSurgeHorde(gameState, worldWidth, worldHeight) {
    const W = gameState.surgeWave || 1;
    const t = (gameState.gameTime || 0) / 60.0;
    const count = Math.floor(8 + 4 * W + 1.2 * Math.pow(W, 1.3));

    const clusterSpawns = [
      { name: 'Eastern Valley', x: 2350, y: 1500 },
      { name: 'North Gorge',    x: 1500, y: 850 },
      { name: 'South Gorge',    x: 1500, y: 2150 },
      { name: 'Western Crags',  x: 750,  y: 1500 }
    ];
    const spawnAnchor = clusterSpawns[Math.floor(Math.random() * clusterSpawns.length)];

    addFloatingText(spawnAnchor.x, spawnAnchor.y - 60, `🚨 SURGE PACK BREAKTHROUGH: ${spawnAnchor.name.toUpperCase()}!`, '#ef4444');
    spawnExplosion(spawnAnchor.x, spawnAnchor.y, 20);

    for (let i = 0; i < count; i++) {
      if (gameState.enemies.length >= 75) break;
      const offsetX = (Math.random() - 0.5) * 200;
      const offsetY = (Math.random() - 0.5) * 200;
      const x = Math.max(50, Math.min(worldWidth - 50, spawnAnchor.x + offsetX));
      const y = Math.max(50, Math.min(worldHeight - 50, spawnAnchor.y + offsetY));

      let type = 'scuttler';
      const isLeader = (i === 0);
      if (isLeader) {
        type = 'crusher';
      } else {
        const r = Math.random();
        if (r < 0.4) type = 'sprinter';
        else if (r < 0.65) type = 'spitter';
        else if (r < 0.8) type = 'crusher';
        else type = 'scuttler';
      }

      const id = 'surge-' + Math.random().toString(36).substring(2, 9);
      gameState.enemies.push(createScaledEnemy(id, x, y, type, t, isLeader));
    }
  }

  function updateSwarmAI(enemies, base, rover, structures, projectiles, isHost, landscape = null, hazards = null, buildSites = null) {
    if (!isHost) return;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];

      // Targeting: Sprinters love chasing the fast rover or diving at base; Crushers target the fortress; Scuttlers attack nearest
      const distBase = Math.hypot(base.x - enemy.x, base.y - enemy.y);
      const distRover = Math.hypot(rover.x - enemy.x, rover.y - enemy.y);

      let target = distBase < distRover * 1.2 ? base : rover;
      if (enemy.type === 'crusher') target = base;
      if (enemy.type === 'sprinter') target = distRover < 380 ? rover : base;

      let dx = target.x - enemy.x;
      let dy = target.y - enemy.y;
      let dist = Math.hypot(dx, dy) || 1;

      // Spitter ranged behavior: stops at 270px and spits acid!
      if (enemy.type === 'spitter' && dist < 290) {
        dx = 0;
        dy = 0;
        dist = 1;
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;
        if (enemy.shootCooldown <= 0) {
          enemy.shootCooldown = 65;
          const sAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
          projectiles.push({
            type: 'acid_glob',
            x: enemy.x + Math.cos(sAngle) * 16,
            y: enemy.y + Math.sin(sAngle) * 16,
            vx: Math.cos(sAngle) * 7.5,
            vy: Math.sin(sAngle) * 7.5,
            radius: 5,
            damage: 18,
            dist: 0,
            maxDist: 340,
            color: '#22c55e'
          });
        }
      }

      let dirX = dx / dist;
      let dirY = dy / dist;

      // Sprinters add zig-zag offset
      if (enemy.type === 'sprinter') {
        const perpX = -dirY;
        const perpY = dirX;
        const zigZag = Math.sin(Date.now() * 0.008 + i) * 0.45;
        dirX += perpX * zigZag;
        dirY += perpY * zigZag;
      }

      // Swarm separation
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

      let moveX = dirX * 0.78 + repelX * 0.65;
      let moveY = dirY * 0.78 + repelY * 0.65;
      const moveLen = Math.hypot(moveX, moveY) || 1;
      moveX /= moveLen;
      moveY /= moveLen;

      // 1. Check Hazards (Tar Pits): massive slow effect on swarms
      let enemySpeed = enemy.speed;
      let inTar = false;
      if (hazards) {
        for (let h of hazards) {
          const dH = Math.hypot(enemy.x - h.x, enemy.y - h.y);
          if (dH < h.radius + enemy.radius) {
            enemySpeed *= (h.slowFactor || 0.4);
            inTar = true;
            break;
          }
        }
      }
      enemy.inTar = inTar;
      if (inTar && Math.random() < 0.1) {
        spawnBloodSplat(enemy.x, enemy.y, 1, '#1e293b');
      }

      // 2. Check collision & sliding with Landscape Rocks (tangent sliding around canyon cliffs)
      if (landscape) {
        for (let rock of landscape) {
          const testX = enemy.x + moveX * enemySpeed;
          const testY = enemy.y + moveY * enemySpeed;
          const toRockX = testX - rock.x;
          const toRockY = testY - rock.y;
          const dRock = Math.hypot(toRockX, toRockY);
          const minD = enemy.radius + rock.radius;
          if (dRock < minD && dRock > 0) {
            const normX = toRockX / dRock;
            const normY = toRockY / dRock;

            const tan1X = -normY, tan1Y = normX;
            const tan2X = normY, tan2Y = -normX;

            const dot1 = dirX * tan1X + dirY * tan1Y;
            const dot2 = dirX * tan2X + dirY * tan2Y;
            const bestTanX = dot1 >= dot2 ? tan1X : tan2X;
            const bestTanY = dot1 >= dot2 ? tan1Y : tan2Y;

            moveX = normX * 0.25 + bestTanX * 0.95;
            moveY = normY * 0.25 + bestTanY * 0.95;
            const mLen = Math.hypot(moveX, moveY) || 1;
            moveX /= mLen;
            moveY /= mLen;

            const curDist = Math.hypot(enemy.x - rock.x, enemy.y - rock.y);
            if (curDist < minD) {
              const push = minD - curDist;
              enemy.x += normX * push;
              enemy.y += normY * push;
            }
            break;
          }
        }
      }

      // 3. Check collision with structures and built defense walls
      let blockedByStructure = null;
      if (structures) {
        for (let struct of structures) {
          if (struct.type === 'gate' && struct.isOpen) continue;
          const dStruct = Math.hypot((enemy.x + moveX * enemySpeed) - struct.x, (enemy.y + moveY * enemySpeed) - struct.y);
          if (dStruct < enemy.radius + struct.radius) {
            blockedByStructure = struct;
            break;
          }
        }
      }

      if (!blockedByStructure && buildSites) {
        for (let site of buildSites) {
          if (!site.built || site.type !== 'wall') continue;
          if (site.isOpen) continue;
          const dSite = Math.hypot((enemy.x + moveX * enemySpeed) - site.x, (enemy.y + moveY * enemySpeed) - site.y);
          if (dSite < enemy.radius + site.radius) {
            blockedByStructure = site;
            break;
          }
        }
      }

      if (blockedByStructure) {
        // Attack the structure blocking path!
        if (enemy.attackCooldown <= 0) {
          blockedByStructure.hp -= enemy.damage * 0.45;
          blockedByStructure.hitFlash = 6;
          enemy.attackCooldown = 32;
          spawnBloodSplat(blockedByStructure.x, blockedByStructure.y, 3, '#94a3b8');
          if (blockedByStructure.hp <= 0) {
            spawnExplosion(blockedByStructure.x, blockedByStructure.y, 14);
            const bName = blockedByStructure.name || blockedByStructure.type || 'STRUCTURE';
            addFloatingText(blockedByStructure.x, blockedByStructure.y - 20, `${bName.toUpperCase()} BREACHED!`, '#ef4444');
            if (blockedByStructure.built !== undefined) {
              blockedByStructure.built = false;
              blockedByStructure.currentScrap = 0;
            }
          }
        }
      } else {
        enemy.x += moveX * enemySpeed;
        enemy.y += moveY * enemySpeed;
        enemy.angle = Math.atan2(moveY, moveX);
      }

      enemy.legAnim += enemy.speed * 0.2;
      if (enemy.attackCooldown > 0) enemy.attackCooldown--;
      if (enemy.hitFlash > 0) enemy.hitFlash--;
    }
  }

  function handleEnemyDefeated(gameState, enemy) {
    gameState.kills = (gameState.kills || 0) + 1;
    spawnBloodSplat(enemy.x, enemy.y, enemy.type === 'crusher' ? 18 : 10, enemy.color);

    // Drop physical Loose Scrap collectibles into world with physics drift
    const isElite = (enemy.type === 'crusher' || enemy.isSurgeLeader);
    const scrapCount = isElite ? Math.floor(4 + Math.random() * 3) : Math.floor(1 + Math.random() * 2);
    spawnLooseScrap(gameState, enemy.x, enemy.y, scrapCount, isElite);

    // Elites and Surge leaders have guaranteed drops of rare Tech Cores!
    if (isElite || enemy.type === 'crusher') {
      spawnTechCorePickup(gameState, enemy.x, enemy.y);
    }

    // Drop Energy Cells to refuel base
    const dropChance = isElite ? 1.0 : (enemy.type === 'sprinter' ? 0.35 : 0.5);
    if (Math.random() < dropChance) {
      const fuelVal = isElite ? 30 : 15;
      spawnEnergyCell(gameState, enemy.x, enemy.y, fuelVal);
    }
  }

  // --- 5. RESOURCE ECONOMY ---
  function spawnLooseScrap(gameState, x, y, count = 2, isElite = false) {
    if (!gameState.looseScraps) gameState.looseScraps = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 3.8;
      gameState.looseScraps.push({
        id: 'loose-' + Math.random().toString(36).substring(2, 9),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        value: isElite ? Math.floor(5 + Math.random() * 4) : Math.floor(2 + Math.random() * 2),
        radius: isElite ? 10 : 7,
        life: 2400,
        pulse: Math.random() * Math.PI * 2,
        color: isElite ? '#ec4899' : '#facc15'
      });
    }
  }

  function spawnTechCorePickup(gameState, x, y) {
    if (!gameState.energyCells) gameState.energyCells = [];
    gameState.energyCells.push({
      id: 'tech-core-' + Math.random().toString(36).substring(2, 9),
      isTechCore: true,
      x, y,
      value: 1,
      radius: 14,
      pulse: 0,
      life: 3600
    });
    addFloatingText(x, y - 24, '🔮 RARE TECH CORE DROPPED!', '#ec4899');
    spawnExplosion(x, y, 8);
  }

  function updateLooseScraps(gameState, rover, base) {
    if (!gameState.looseScraps) return;
    for (let i = gameState.looseScraps.length - 1; i >= 0; i--) {
      const s = gameState.looseScraps[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.91;
      s.vy *= 0.91;
      s.pulse = (s.pulse || 0) + 0.08;
      s.life = (s.life || 2400) - 1;

      if (s.life <= 0) {
        gameState.looseScraps.splice(i, 1);
        continue;
      }

      // Vacuum magnet attraction when Rover is near
      const dRover = Math.hypot(rover.x - s.x, rover.y - s.y);
      if (!rover.isBoarded && dRover <= 90) {
        const pull = ((90 - dRover) / 90) * 4.0;
        s.vx += ((rover.x - s.x) / dRover) * pull;
        s.vy += ((rover.y - s.y) / dRover) * pull;
      }

      // Proximity collection
      if (!rover.isBoarded && dRover <= rover.radius + s.radius + 6) {
        if (rover.cargo < rover.maxCargo) {
          const gain = Math.min(s.value, rover.maxCargo - rover.cargo);
          rover.cargo += gain;
          addFloatingText(s.x, s.y - 10, `+${gain} SCRAP`, '#facc15');
          spawnSparkArc(s.x, s.y, rover.x, rover.y, '#facc15');
          gameState.looseScraps.splice(i, 1);
        } else if (Math.random() < 0.02) {
          addFloatingText(rover.x, rover.y - 25, 'CARGO FULL!', '#f97316');
        }
      }
    }
  }
  function createScrapNode(id, x, y, tier = 'common') {
    let radius = 18;
    let amount = 40;
    let color = '#f59e0b';
    let glowColor = 'rgba(245, 158, 11, 0.4)';
    let typeName = 'Derelict Salvage';

    if (tier === 'uncommon') {
      radius = 24;
      amount = 80;
      color = '#06b6d4';
      glowColor = 'rgba(6, 182, 212, 0.5)';
      typeName = 'Titanium Cache';
    } else if (tier === 'rare') {
      radius = 30;
      amount = 140;
      color = '#ec4899';
      glowColor = 'rgba(236, 72, 153, 0.6)';
      typeName = 'Plasma Core Geode';
    }

    return {
      id, x, y, tier, typeName, radius,
      amount, maxAmount: amount, color, glowColor,
      pulse: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      beingHarvested: false
    };
  }

  // --- 4.5 LANDSCAPE & HAZARD GENERATION ---
  function initLandscape(worldWidth, worldHeight) {
    return [
      // 1. WEST REAR SHIELD RIDGE (Impasse Mountain Wall - protects Base rear from the West)
      { id: 'rock-w-mid', x: 1140, y: 1500, radius: 95, name: 'West Basalt Ridge' },
      { id: 'rock-w-n1',  x: 1150, y: 1330, radius: 90, name: 'West Mesa North' },
      { id: 'rock-w-s1',  x: 1150, y: 1670, radius: 90, name: 'West Mesa South' },
      { id: 'rock-w-n2',  x: 1130, y: 1180, radius: 85, name: 'Northwest Buttress' },
      { id: 'rock-w-s2',  x: 1130, y: 1820, radius: 85, name: 'Southwest Buttress' },

      // 2. NORTH CANYON MESA & GORGE (Funnels Northern swarms into 160px North Pass)
      { id: 'rock-nw-rim', x: 1290, y: 1130, radius: 85, name: 'Northwest Escarpment' },
      { id: 'rock-n-west', x: 1400, y: 1090, radius: 75, name: 'North Gorge West Pillar' },
      // North Gorge Gap between x=1400 and x=1600 (Passage at x=1500)
      { id: 'rock-n-east', x: 1600, y: 1090, radius: 75, name: 'North Gorge East Pillar' },
      { id: 'rock-ne-1',   x: 1720, y: 1140, radius: 80, name: 'Northeast Ridge A' },
      { id: 'rock-ne-2',   x: 1840, y: 1220, radius: 85, name: 'Northeast Ridge B' },
      { id: 'rock-ne-horn',x: 1950, y: 1320, radius: 80, name: 'East Funnel North Horn' },

      // 3. SOUTH CANYON MESA & GORGE (Funnels Southern swarms into 160px South Pass)
      { id: 'rock-sw-rim', x: 1290, y: 1870, radius: 85, name: 'Southwest Escarpment' },
      { id: 'rock-s-west', x: 1400, y: 1910, radius: 75, name: 'South Gorge West Pillar' },
      // South Gorge Gap between x=1400 and x=1600 (Passage at x=1500)
      { id: 'rock-s-east', x: 1600, y: 1910, radius: 75, name: 'South Gorge East Pillar' },
      { id: 'rock-se-1',   x: 1720, y: 1860, radius: 80, name: 'Southeast Ridge A' },
      { id: 'rock-se-2',   x: 1840, y: 1780, radius: 85, name: 'Southeast Ridge B' },
      { id: 'rock-se-horn',x: 1950, y: 1680, radius: 80, name: 'East Funnel South Horn' },

      // 4. WASTELAND CRAGS (Tactical boulders out in the desert)
      { id: 'rock-crag-1', x: 620,  y: 1450, radius: 90, name: 'Western Badlands Crag' },
      { id: 'rock-crag-2', x: 2380, y: 1200, radius: 85, name: 'Eastern Steppes' },
      { id: 'rock-crag-3', x: 2380, y: 1800, radius: 85, name: 'Eastern Badlands Ridge' }
    ];
  }

  function initHazards(worldWidth, worldHeight) {
    return [
      {
        id: 'hazard-east-tar',
        name: 'Great Slag Tar Pit',
        type: 'tar_pit',
        x: 1950,
        y: 1500,
        radius: 85,
        slowFactor: 0.4, // Reduces enemy speed by 60%!
        bubbleTimer: 0
      },
      {
        id: 'hazard-north-tar',
        name: 'North Crevasse Slime',
        type: 'tar_pit',
        x: 1500,
        y: 1100,
        radius: 55,
        slowFactor: 0.45,
        bubbleTimer: 0.5
      },
      {
        id: 'hazard-south-tar',
        name: 'South Crevasse Slime',
        type: 'tar_pit',
        x: 1500,
        y: 1900,
        radius: 55,
        slowFactor: 0.45,
        bubbleTimer: 1.0
      }
    ];
  }

  function initScrapNodes(worldWidth, worldHeight, count = 22, landscape = []) {
    const nodes = [];
    const tiers = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare'];

    for (let i = 0; i < count; i++) {
      const tier = tiers[i % tiers.length];
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 380 + Math.random() * (worldWidth * 0.42);

      let x = Math.max(120, Math.min(worldWidth - 120, 1500 + Math.cos(angle) * dist));
      let y = Math.max(120, Math.min(worldHeight - 120, 1500 + Math.sin(angle) * dist));

      // Avoid spawning inside landscape rock mesas
      if (landscape) {
        for (let rock of landscape) {
          const d = Math.hypot(x - rock.x, y - rock.y);
          if (d < rock.radius + 35) {
            const pushAngle = Math.atan2(y - rock.y, x - rock.x);
            x = rock.x + Math.cos(pushAngle) * (rock.radius + 45);
            y = rock.y + Math.sin(pushAngle) * (rock.radius + 45);
          }
        }
      }

      const id = 'scrap-' + Math.random().toString(36).substring(2, 9);
      nodes.push(createScrapNode(id, x, y, tier));
    }
    return nodes;
  }

  function initRuins(worldWidth, worldHeight) {
    return [
      { id: 'ruin-alpha', name: 'Cryo-Vault Alpha', x: 680, y: 680, radius: 65, hasCore: true, harvestProgress: 0, maxHarvest: 100, pulse: 0 },
      { id: 'ruin-beta', name: 'Anomalous Lab Beta', x: worldWidth - 680, y: 680, radius: 65, hasCore: true, harvestProgress: 0, maxHarvest: 100, pulse: 1.2 },
      { id: 'ruin-gamma', name: 'Derelict Reactor Gamma', x: 680, y: worldHeight - 680, radius: 65, hasCore: true, harvestProgress: 0, maxHarvest: 100, pulse: 2.4 },
      { id: 'ruin-delta', name: 'Signal Array Delta', x: worldWidth - 680, y: worldHeight - 680, radius: 65, hasCore: true, harvestProgress: 0, maxHarvest: 100, pulse: 3.6 }
    ];
  }

  function initWeaponCaches(worldWidth, worldHeight) {
    return [
      {
        id: 'cache-vulcan',
        name: 'Vulcan Point-Defense Sentry',
        type: 'vulcan_sentry',
        title: 'VULCAN DEFENDER POD',
        desc: 'Autonomous Point-Defense Autocannon + Triple Scatter Cannon',
        x: 950,
        y: 950,
        radius: 32,
        isCollected: false,
        pulse: 0,
        color: '#f59e0b',
        beaconColor: '#fbbf24'
      },
      {
        id: 'cache-missile',
        name: 'Micro-Missile Swarm Launcher',
        type: 'swarm_missiles',
        title: 'HOMING MISSILE SWARM POD',
        desc: 'Autonomous Homing Micro-Missiles + Heavy Concussive Cannon',
        x: 2050,
        y: 2050,
        radius: 32,
        isCollected: false,
        pulse: 1.5,
        color: '#ec4899',
        beaconColor: '#f472b6'
      }
    ];
  }


  function spawnEnergyCell(gameState, x, y, value = 15) {
    if (!gameState.energyCells) gameState.energyCells = [];
    gameState.energyCells.push({
      id: 'cell-' + Math.random().toString(36).substring(2, 9),
      x, y, value, radius: 12,
      pulse: Math.random() * Math.PI * 2,
      life: 2400
    });
  }

  function addFloatingText(x, y, text, color = '#facc15') {
    FLOATING_TEXTS.push({ x, y, text, color, alpha: 1.0, vy: -1.2 });
  }

  function updateFloatingTexts() {
    for (let i = FLOATING_TEXTS.length - 1; i >= 0; i--) {
      const ft = FLOATING_TEXTS[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) {
        FLOATING_TEXTS.splice(i, 1);
      }
    }
  }

  function spawnScrapShard(fromX, fromY, toX, toY, color = '#facc15') {
    const angle = Math.atan2(toY - fromY, toX - fromX) + (Math.random() - 0.5) * 0.6;
    const speed = 4 + Math.random() * 4;
    SCRAP_SHARDS.push({
      x: fromX, y: fromY,
      targetX: toX, targetY: toY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color, life: 25
    });
  }

  function updateScrapShards(target) {
    for (let i = SCRAP_SHARDS.length - 1; i >= 0; i--) {
      const s = SCRAP_SHARDS[i];
      const dx = target.x - s.x;
      const dy = target.y - s.y;
      const d = Math.hypot(dx, dy) || 1;

      s.vx = s.vx * 0.85 + (dx / d) * 7.5;
      s.vy = s.vy * 0.85 + (dy / d) * 7.5;
      s.x += s.vx;
      s.y += s.vy;
      s.life--;

      if (s.life <= 0 || d < 22) {
        SCRAP_SHARDS.splice(i, 1);
      }
    }
  }

  function updateEconomy(gameState, isHost) {
    const { base, rover, scrapNodes } = gameState;

    if (typeof rover.cargo !== 'number') rover.cargo = 0;
    if (typeof rover.maxCargo !== 'number') rover.maxCargo = 50;
    if (typeof gameState.baseScrap !== 'number') gameState.baseScrap = 0;

    // 1. Scrap node harvesting by Rover
    for (let i = scrapNodes.length - 1; i >= 0; i--) {
      const node = scrapNodes[i];
      node.pulse = (node.pulse || 0) + 0.05;
      node.rotation = (node.rotation || 0) + 0.008;

      const dist = Math.hypot(rover.x - node.x, rover.y - node.y);
      const harvestRange = node.radius + rover.radius + 40;

      if (!rover.isBoarded && dist <= harvestRange) {
        node.beingHarvested = true;
        if (rover.cargo < rover.maxCargo) {
          if (Math.random() < 0.45) {
            const transfer = Math.min(1, node.amount, rover.maxCargo - rover.cargo);
            node.amount -= transfer;
            rover.cargo += transfer;
            spawnScrapShard(node.x, node.y, rover.x, rover.y, node.color);
          }
        } else if (Math.random() < 0.03) {
          addFloatingText(rover.x, rover.y - 24, 'ROVER CARGO FULL!', '#f97316');
        }
      } else {
        node.beingHarvested = false;
      }

      if (node.amount <= 0) {
        addFloatingText(node.x, node.y, 'DEPLETED!', '#94a3b8');
        scrapNodes.splice(i, 1);
      }
    }

    // 2. Depositing scrap into Base Fortress
    const distToBase = Math.hypot(rover.x - base.x, rover.y - base.y);
    if ((distToBase <= 130 || rover.isBoarded) && rover.cargo > 0) {
      const unloadRate = rover.isBoarded ? rover.cargo : Math.min(2, rover.cargo);
      rover.cargo -= unloadRate;
      gameState.baseScrap += unloadRate;

      if (Math.random() < 0.6) {
        spawnScrapShard(rover.x, rover.y, base.x, base.y, '#22c55e');
      }

      // Base slowly repairs Rover and refuels while close
      if (rover.hp < rover.maxHp) {
        rover.hp = Math.min(rover.maxHp, rover.hp + 0.15);
      }
      if (rover.fuel < rover.maxFuel) {
        rover.fuel = Math.min(rover.maxFuel, rover.fuel + 0.2);
      }

      if (rover.cargo === 0) {
        addFloatingText(base.x, base.y - 55, '+ SCRAP STORED IN BASE VAULT!', '#22c55e');
      }
    }

    // 3. Energy cells pickup
    if (gameState.energyCells) {
      for (let cIdx = gameState.energyCells.length - 1; cIdx >= 0; cIdx--) {
        const cell = gameState.energyCells[cIdx];
        cell.pulse = (cell.pulse || 0) + 0.08;
        cell.life = (cell.life || 2400) - 1;

        if (cell.life <= 0) {
          gameState.energyCells.splice(cIdx, 1);
          continue;
        }

        const distR = Math.hypot(rover.x - cell.x, rover.y - cell.y);
        const distB = Math.hypot(base.x - cell.x, base.y - cell.y);

        if (distR <= rover.radius + 24 || distB <= 90) {
          const addFuel = cell.value || 15;
          base.fuel = Math.min(base.maxFuel, base.fuel + addFuel);
          rover.fuel = Math.min(rover.maxFuel, rover.fuel + addFuel);

          addFloatingText(cell.x, cell.y - 12, `+${addFuel} FUEL`, '#38bdf8');
          spawnScrapShard(cell.x, cell.y, base.x, base.y, '#38bdf8');
          gameState.energyCells.splice(cIdx, 1);
        }
      }
    }

    // 4. Ruins & Tech Core Extraction
    if (gameState.ruins) {
      for (let ruin of gameState.ruins) {
        ruin.pulse = (ruin.pulse || 0) + 0.05;
        const distR = Math.hypot(rover.x - ruin.x, rover.y - ruin.y);

        if (!rover.isBoarded && distR <= ruin.radius + 35 && ruin.hasCore) {
          ruin.beingHarvested = true;
          ruin.harvestProgress = (ruin.harvestProgress || 0) + 0.75;

          if (Math.random() < 0.35) {
            spawnScrapShard(ruin.x, ruin.y, rover.x, rover.y, '#ec4899');
          }

          if (ruin.harvestProgress >= 100) {
            ruin.hasCore = false;
            ruin.beingHarvested = false;
            gameState.techCores = (gameState.techCores || 0) + 1;
            addFloatingText(ruin.x, ruin.y - 35, 'TECH CORE EXTRACTED!', '#ec4899');
            addFloatingText(ruin.x, ruin.y - 55, 'DEFENSE SWARM DETECTED!', '#ef4444');
            spawnSurgeHorde(gameState, 3000, 3000);
          }
        } else {
          ruin.beingHarvested = false;
          if (ruin.hasCore && ruin.harvestProgress > 0) {
            ruin.harvestProgress = Math.max(0, ruin.harvestProgress - 0.25);
          }
        }
      }
    }

    // 5. Periodic salvage meteor drop
    if (isHost && Math.random() < 0.003 && scrapNodes.length < 24) {
      const tiers = ['common', 'common', 'uncommon', 'rare'];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 400 + Math.random() * 1100;
      const x = Math.max(100, Math.min(2900, 1500 + Math.cos(angle) * dist));
      const y = Math.max(100, Math.min(2900, 1500 + Math.sin(angle) * dist));
      const id = 'scrap-drop-' + Math.random().toString(36).substring(2, 9);
      scrapNodes.push(createScrapNode(id, x, y, tier));
      addFloatingText(x, y - 20, 'NEW SALVAGE DROP!', '#38bdf8');
    }

    // 6. Weapon Caches discovery and pickup
    if (gameState.weaponCaches) {
      for (let cache of gameState.weaponCaches) {
        if (!cache.isCollected) {
          const distToRover = Math.hypot(rover.x - cache.x, rover.y - cache.y);
          if (distToRover <= 55 || (distToRover <= 80 && keys.justPressed.e && localTarget === rover)) {
            cache.isCollected = true;
            rover.weapon = cache.type;
            spawnExplosion(cache.x, cache.y, 22);
            addFloatingText(rover.x, rover.y - 35, `⚔️ ${cache.title} ACQUIRED!`, '#fbbf24');
            addFloatingText(rover.x, rover.y - 55, 'AUTO-DEFENSE ACTIVE WHILE GATHERING!', '#22c55e');
          }
        }
      }
    }

    updateFloatingTexts();
    updateScrapShards(rover);
  }

  // --- 6. INITIALIZE GAME STATE & SETUP ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const WORLD_WIDTH = 3000;
  const WORLD_HEIGHT = 3000;

  const gameState = {
    // 1. Central Base Fortress Tank
    base: {
      x: 1500,
      y: 1500,
      width: 150,
      height: 95,
      hp: 250,
      maxHp: 250,
      fuel: 100,
      maxFuel: 100,
      powerMode: 'engines', // engines, shields, turrets
      shieldPulse: 0,
      cannonAngle: 0,
      cannonCooldown: 0,
      turretRecoil: 0,
      muzzleFlash: 0
    },
    // 2. Rover Scout Vehicle
    rover: {
      x: 1640,
      y: 1500,
      vx: 0,
      vy: 0,
      width: 72,
      height: 80,
      radius: 24,
      facingDir: 1,
      lastDirIndex: 1,
      speed: 5.2,
      hp: 80,
      maxHp: 80,
      fuel: 100,
      maxFuel: 100,
      cargo: 0,
      maxCargo: 50,
      angle: 0,
      aimAngle: 0,
      fireCooldown: 0,
      muzzleFlash: 0,
      treadAnim: 0,
      isBoarded: false,
      weapon: null,
      weaponTier: 1,
      autoWeaponCooldown: 0,
      autoWeaponAngle: 0,
      autoWeaponFlash: 0
    },
    weaponStats: Object.assign({}, WEAPON_TIER_CONFIG[1]),
    buildSites: initBuildSites(),
    activeBatchIndex: 0,
    looseScraps: [],
    gameTime: 0, // elapsed seconds
    ambientSpawnTimer: 0,
    surgeCycleTimer: 0, // 0..90s cycle
    surgeAlertTimer: 0, // 0..25s alert countdown
    surgeWave: 1,
    weaponCaches: initWeaponCaches(WORLD_WIDTH, WORLD_HEIGHT),
    structures: [],
    landscape: initLandscape(WORLD_WIDTH, WORLD_HEIGHT),
    hazards: initHazards(WORLD_WIDTH, WORLD_HEIGHT),
    enemies: [],
    projectiles: [],
    scrapNodes: initScrapNodes(WORLD_WIDTH, WORLD_HEIGHT, 22, initLandscape(WORLD_WIDTH, WORLD_HEIGHT)),
    energyCells: [],
    ruins: initRuins(WORLD_WIDTH, WORLD_HEIGHT),
    techCores: 0,
    baseScrap: 35, // Starting scrap to immediately start building
    upgrades: { quantumTier: 0 },
    kills: 0,
    wave: 1
  };


  let localTarget = gameState.base;
  let playerRole = 'base'; // 'base' or 'rover'
  let network = null;
  let isHost = true;
  let isSolo = true;
  let gameStarted = false;
  let spawnTimer = 0;
  let radarSweepAngle = 0;
  let remoteKeys = {};

  // --- POWER ROUTING ---
  function setPowerMode(mode) {
    if (!['engines', 'shields', 'turrets'].includes(mode)) return;
    gameState.base.powerMode = mode;

    if (!isHost && !isSolo && network) {
      network.send({ type: 'POWER_MODE', mode });
    }

    const btnE = document.getElementById('btn-pwr-engines');
    const btnS = document.getElementById('btn-pwr-shields');
    const btnT = document.getElementById('btn-pwr-turrets');
    if (btnE) btnE.className = `power-btn ${mode === 'engines' ? 'active' : ''}`;
    if (btnS) btnS.className = `power-btn ${mode === 'shields' ? 'active' : ''}`;
    if (btnT) btnT.className = `power-btn ${mode === 'turrets' ? 'active' : ''}`;

    const colors = { engines: '#f59e0b', shields: '#38bdf8', turrets: '#ec4899' };
    addFloatingText(gameState.base.x, gameState.base.y - 60, `BASE POWER: ${mode.toUpperCase()}`, colors[mode] || '#ffffff');
  }

  function toggleBoarding() {
    const rover = gameState.rover;
    const base = gameState.base;
    const d = Math.hypot(rover.x - base.x, rover.y - base.y);

    if (rover.isBoarded) {
      rover.isBoarded = false;
      rover.x = base.x + 95;
      rover.y = base.y;
      addFloatingText(rover.x, rover.y - 25, 'ROVER DEPLOYED', '#38bdf8');
    } else if (d <= 140) {
      rover.isBoarded = true;
      if (rover.cargo > 0) {
        gameState.baseScrap += rover.cargo;
        rover.cargo = 0;
      }
      addFloatingText(base.x, base.y - 60, 'ROVER DOCKED IN BASE', '#22c55e');
    } else {
      addFloatingText(rover.x, rover.y - 25, 'TOO FAR FROM BASE TO DOCK', '#ef4444');
    }
  }

  // --- IN-WORLD PROXIMITY INTERACTION & BUILD SITES UPDATE ("KINGDOM" SYSTEM) ---
  function updateBuildSites(gameState, rover, base, keys) {
    if (!gameState.buildSites) return;
    const activeSites = gameState.buildSites.filter(s => s.active);

    for (let site of activeSites) {
      site.pulse = (site.pulse || 0) + 0.05;
      if (site.cooldown > 0) site.cooldown--;
      if (site.hitFlash > 0) site.hitFlash--;

      // 1. Proximity interaction for UNBUILT active sites
      if (!site.built) {
        const distRover = Math.hypot(rover.x - site.x, rover.y - site.y);
        const distBase = Math.hypot(base.x - site.x, base.y - site.y);
        site.playerNear = distRover <= 45;

        if (site.playerNear) {
          if (site.depositCooldown === undefined) site.depositCooldown = 0;
          site.depositCooldown++;
          const interval = keys.e ? 2 : 5; // Faster deposit if holding E

          if (site.depositCooldown >= interval) {
            site.depositCooldown = 0;

            // Deposit Scrap: from Rover cargo or Base vault
            if (site.currentScrap < site.costScrap) {
              if (rover.cargo > 0) {
                rover.cargo -= 1;
                site.currentScrap += 1;
                spawnScrapShard(rover.x, rover.y, site.x, site.y, '#facc15');
              } else if (distBase <= 160 && gameState.baseScrap > 0) {
                gameState.baseScrap -= 1;
                site.currentScrap += 1;
                spawnScrapShard(base.x, base.y, site.x, site.y, '#38bdf8');
              }
            }

            // Deposit Tech Cores if required
            if (site.costCores > 0 && site.currentCores < site.costCores && gameState.techCores > 0) {
              gameState.techCores -= 1;
              site.currentCores += 1;
              spawnScrapShard(rover.x, rover.y, site.x, site.y, '#ec4899');
              addFloatingText(site.x, site.y - 20, '+1 TECH CORE DEPOSITED', '#ec4899');
            }

            // Construction completion check
            if (site.currentScrap >= site.costScrap && site.currentCores >= site.costCores) {
              site.built = true;
              site.tier = Math.max(1, (site.tier || 0) + 1);
              site.hp = site.maxHp;

              spawnExplosion(site.x, site.y, 18);
              spawnRepairPulseWave(site.x, site.y, 110);
              addFloatingText(site.x, site.y - 35, `+${site.name.toUpperCase()} COMPLETE!`, '#22c55e');

              // If weapon forge, upgrade Rover weapon tier!
              if (site.type === 'weapon_forge') {
                rover.weaponTier = Math.min(4, (rover.weaponTier || 1) + 1);
                gameState.weaponStats = Object.assign({}, WEAPON_TIER_CONFIG[rover.weaponTier]);
                spawnExplosion(rover.x, rover.y, 14);
                addFloatingText(rover.x, rover.y - 45, `⚔️ WEAPON UPGRADED: ${gameState.weaponStats.name.toUpperCase()}!`, '#ec4899');
              }

              checkBatchProgression(gameState);
            }
          }
        }
      }

      // 2. Active Defense behavior for BUILT sites
      if (site.built) {
        // WALLS with Gate: open when rover is close
        if (site.type === 'wall') {
          const dR = Math.hypot(rover.x - site.x, rover.y - site.y);
          site.isOpen = dR < 70;
        }

        // TOWERS: autonomous targeting and firing
        if (site.type === 'tower') {
          const tType = site.towerType || 'gatling';

          if (tType === 'gatling' && site.cooldown <= 0) {
            let nearE = null, nearD = 340;
            for (let e of gameState.enemies) {
              const d = Math.hypot(e.x - site.x, e.y - site.y);
              if (d < nearD) { nearD = d; nearE = e; }
            }
            if (nearE) {
              site.cooldown = 9;
              site.angle = Math.atan2(nearE.y - site.y, nearE.x - site.x);
              const bX = site.x + Math.cos(site.angle) * 18;
              const bY = site.y + Math.sin(site.angle) * 18;
              gameState.projectiles.push({
                type: 'gatling_bullet',
                x: bX, y: bY,
                vx: Math.cos(site.angle) * 19,
                vy: Math.sin(site.angle) * 19,
                radius: 3,
                damage: 16,
                dist: 0,
                maxDist: nearD + 40,
                color: '#f59e0b'
              });
            }
          } else if (tType === 'plasma_mortar' && site.cooldown <= 0) {
            let nearE = null, nearD = 500;
            for (let e of gameState.enemies) {
              const d = Math.hypot(e.x - site.x, e.y - site.y);
              if (d >= 100 && d < nearD) { nearD = d; nearE = e; }
            }
            if (nearE) {
              site.cooldown = 65;
              site.angle = Math.atan2(nearE.y - site.y, nearE.x - site.x);
              gameState.projectiles.push({
                type: 'plasma_shell',
                x: site.x, y: site.y,
                targetX: nearE.x, targetY: nearE.y,
                vx: Math.cos(site.angle) * 9.5,
                vy: Math.sin(site.angle) * 9.5,
                radius: 7,
                damage: 70,
                splashRadius: 75,
                dist: 0,
                maxDist: nearD,
                color: '#ec4899'
              });
            }
          } else if (tType === 'tesla' && site.cooldown <= 0) {
            const targets = [];
            for (let e of gameState.enemies) {
              const d = Math.hypot(e.x - site.x, e.y - site.y);
              if (d < 260) targets.push({ enemy: e, dist: d });
              if (targets.length >= 4) break;
            }
            if (targets.length > 0) {
              site.cooldown = 45;
              for (let t of targets) {
                const e = t.enemy;
                e.hp -= 28;
                e.hitFlash = 8;
                spawnSparkArc(site.x, site.y, e.x, e.y, '#38bdf8');
                spawnBloodSplat(e.x, e.y, 3, '#38bdf8');
                if (e.hp <= 0 && !e.counted) {
                  e.counted = true;
                  handleEnemyDefeated(gameState, e);
                }
              }
            }
          } else if (tType === 'repair_pylon' && site.cooldown <= 0) {
            site.cooldown = 90;
            spawnRepairPulseWave(site.x, site.y, 240);
            for (let other of gameState.buildSites) {
              if (other.built && other.hp < other.maxHp && Math.hypot(other.x - site.x, other.y - site.y) <= 240) {
                other.hp = Math.min(other.maxHp, other.hp + 20);
              }
            }
            if (Math.hypot(base.x - site.x, base.y - site.y) <= 240) {
              base.hp = Math.min(base.maxHp, base.hp + 10);
            }
            if (Math.hypot(rover.x - site.x, rover.y - site.y) <= 240) {
              rover.hp = Math.min(rover.maxHp, rover.hp + 10);
            }
          }
        }
      }
    }
  }

  // --- NETWORK DATA HANDLER ---
  function handleNetworkData(data) {
    if (data.type === 'INPUT') {
      remoteKeys = data.keys || {};
      if (remoteKeys.toggleBoard) toggleBoarding();
    } else if (data.type === 'POWER_MODE') {
      setPowerMode(data.mode);
    } else if (data.type === 'BUILD_DEPOSIT') {
      if (isHost && gameState.buildSites) {
        const site = gameState.buildSites.find(s => s.id === data.siteId);
        if (site && !site.built) {
          site.currentScrap += data.scrap || 0;
          site.currentCores += data.cores || 0;
          if (site.currentScrap >= site.costScrap && site.currentCores >= site.costCores) {
            site.built = true;
            site.hp = site.maxHp;
            checkBatchProgression(gameState);
          }
        }
      }
    } else if (data.type === 'STATE' && !isHost) {
      const s = data.state;
      if (s.base) Object.assign(gameState.base, s.base);
      if (s.rover) Object.assign(gameState.rover, s.rover);
      if (s.structures) gameState.structures = s.structures;
      if (s.enemies) gameState.enemies = s.enemies;
      if (s.projectiles) gameState.projectiles = s.projectiles;
      if (s.scrapNodes) gameState.scrapNodes = s.scrapNodes;
      if (s.energyCells) gameState.energyCells = s.energyCells;
      if (s.ruins) gameState.ruins = s.ruins;
      if (typeof s.techCores === 'number') gameState.techCores = s.techCores;
      if (typeof s.baseScrap === 'number') gameState.baseScrap = s.baseScrap;
      if (Array.isArray(s.sectorsBuilt)) gameState.sectorsBuilt = s.sectorsBuilt;
      if (typeof s.reinforceLevel === 'number') gameState.reinforceLevel = s.reinforceLevel;
      if (s.upgrades) gameState.upgrades = s.upgrades;
      if (s.weaponCaches) gameState.weaponCaches = s.weaponCaches;
      if (s.rover && s.rover.weapon) gameState.rover.weapon = s.rover.weapon;
      if (typeof s.kills === 'number') gameState.kills = s.kills;
      if (typeof s.wave === 'number') gameState.wave = s.wave;
    }
  }


  // --- 7. LOBBY & NAVIGATION HANDLERS ---
  const lobbyMain = document.getElementById('lobby-main');
  const lobbySingle = document.getElementById('lobby-single');
  const lobbyMulti = document.getElementById('lobby-multi');
  const hudEl = document.getElementById('hud');
  const hudRoleEl = document.getElementById('hud-role');
  const hudRoomEl = document.getElementById('hud-room-display');

  // Single Player flow
  const btnMenuSingle = document.getElementById('btn-menu-single');
  if (btnMenuSingle) {
    btnMenuSingle.addEventListener('click', () => {
      lobbyMain.style.display = 'none';
      lobbySingle.style.display = 'flex';
    });
  }

  const btnBackSingle = document.getElementById('btn-back-single');
  if (btnBackSingle) {
    btnBackSingle.addEventListener('click', () => {
      lobbySingle.style.display = 'none';
      lobbyMain.style.display = 'flex';
    });
  }

  function startSinglePlayer(role) {
    isSolo = true;
    isHost = true;
    gameStarted = true;
    playerRole = role;
    localTarget = role === 'rover' ? gameState.rover : gameState.base;

    lobbySingle.style.display = 'none';
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.display = 'none';
    if (hudEl) hudEl.style.display = 'none';

    if (hudRoleEl) {
      if (role === 'rover') {
        hudRoleEl.textContent = 'ROVER SCOUT';
        hudRoleEl.className = 'badge badge-scavenger';
      } else {
        hudRoleEl.textContent = 'BASE COMMANDER';
        hudRoleEl.className = 'badge badge-commander';
      }
    }
    if (hudRoomEl) hudRoomEl.textContent = 'Solo (Tab to switch)';
  }

  const btnSelectRover = document.getElementById('btn-select-rover');
  if (btnSelectRover) {
    btnSelectRover.addEventListener('click', () => startSinglePlayer('rover'));
  }

  const btnSelectBase = document.getElementById('btn-select-base');
  if (btnSelectBase) {
    btnSelectBase.addEventListener('click', () => startSinglePlayer('base'));
  }

  // Multiplayer flow
  const btnMenuMulti = document.getElementById('btn-menu-multi');
  if (btnMenuMulti) {
    btnMenuMulti.addEventListener('click', () => {
      lobbyMain.style.display = 'none';
      lobbyMulti.style.display = 'flex';
    });
  }

  const btnBackMulti = document.getElementById('btn-back-multi');
  if (btnBackMulti) {
    btnBackMulti.addEventListener('click', () => {
      lobbyMulti.style.display = 'none';
      lobbyMain.style.display = 'flex';
    });
  }

  const btnHostAction = document.getElementById('btn-host-action');
  const hostCodeDisplay = document.getElementById('host-code-display');
  const roomCodeBadge = document.getElementById('room-code-badge');
  const btnCopyCode = document.getElementById('btn-copy-code');

  if (btnHostAction) {
    btnHostAction.addEventListener('click', () => {
      isHost = true;
      isSolo = false;
      playerRole = 'base';
      localTarget = gameState.base;
      hostCodeDisplay.style.display = 'block';

      network = new PeerManager(true, null, handleNetworkData, (id) => {
        roomCodeBadge.textContent = id;
        hudRoomEl.textContent = `Room: ${id}`;
      });

      // Start game immediately so Commander can fortify while waiting for partner
      gameStarted = true;
      lobbyMulti.style.display = 'none';
      const uiLayer = document.getElementById('ui-layer');
      if (uiLayer) uiLayer.style.display = 'none';
      if (hudEl) hudEl.style.display = 'none';
      if (hudRoleEl) {
        hudRoleEl.textContent = 'BASE COMMANDER (HOST)';
        hudRoleEl.className = 'badge badge-commander';
      }
    });
  }

  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const code = roomCodeBadge.textContent;
      if (code && code !== 'Generating...') {
        navigator.clipboard.writeText(code).then(() => {
          btnCopyCode.textContent = '✅ Copied!';
          setTimeout(() => { btnCopyCode.textContent = '📋 Copy Code'; }, 2000);
        });
      }
    });
  }

  const btnJoinAction = document.getElementById('btn-join-action');
  const inputJoinCode = document.getElementById('input-join-code');
  if (btnJoinAction) {
    btnJoinAction.addEventListener('click', () => {
      const code = inputJoinCode.value.trim();
      if (!code) {
        alert('Please enter a Room Code first!');
        return;
      }

      isHost = false;
      isSolo = false;
      playerRole = 'rover';
      localTarget = gameState.rover;
      gameStarted = true;

      lobbyMulti.style.display = 'none';
      const uiLayer = document.getElementById('ui-layer');
      if (uiLayer) uiLayer.style.display = 'none';
      if (hudEl) hudEl.style.display = 'none';
      if (hudRoleEl) {
        hudRoleEl.textContent = 'ROVER SCOUT (CLIENT)';
        hudRoleEl.className = 'badge badge-scavenger';
      }
      if (hudRoomEl) hudRoomEl.textContent = `Connecting: ${code}...`;

      network = new PeerManager(false, code, handleNetworkData, () => {
        if (hudRoomEl) hudRoomEl.textContent = `Connected: ${code}`;
      });
    });
  }

  // Power routing and boarding controls
  const btnPwrE = document.getElementById('btn-pwr-engines');
  if (btnPwrE) btnPwrE.addEventListener('click', () => setPowerMode('engines'));
  const btnPwrS = document.getElementById('btn-pwr-shields');
  if (btnPwrS) btnPwrS.addEventListener('click', () => setPowerMode('shields'));
  const btnPwrT = document.getElementById('btn-pwr-turrets');
  if (btnPwrT) btnPwrT.addEventListener('click', () => setPowerMode('turrets'));

  const btnBoard = document.getElementById('btn-board-toggle');
  if (btnBoard) btnBoard.addEventListener('click', () => toggleBoarding());

  // --- 8. SIMULATION UPDATE ---
  function update() {
    if (!gameStarted) return;

    const base = gameState.base;
    const rover = gameState.rover;

    const camX = canvas.width / 2 - localTarget.x;
    const camY = canvas.height / 2 - localTarget.y;
    const mouseWorldX = keys.mouse.x - camX;
    const mouseWorldY = keys.mouse.y - camY;

    // Hotkeys
    if (keys.justPressed.Tab) {
      localTarget = localTarget === base ? rover : base;
      playerRole = localTarget === rover ? 'rover' : 'base';
      const targetRoleName = localTarget === rover ? 'ROVER SCOUT' : 'BASE COMMANDER';
      if (hudRoleEl) {
        hudRoleEl.textContent = targetRoleName;
        hudRoleEl.className = localTarget === rover ? 'badge badge-scavenger' : 'badge badge-commander';
      }
      addFloatingText(localTarget.x, localTarget.y - 45, `FOCUS: ${targetRoleName}`, '#38bdf8');
    }

    // Power Routing Hotkeys 1-3
    if (keys.justPressed['1']) setPowerMode('engines');
    if (keys.justPressed['2']) setPowerMode('shields');
    if (keys.justPressed['3']) setPowerMode('turrets');

    // Docking / Boarding Toggle
    if (keys.justPressed.e) {
      const d = Math.hypot(rover.x - base.x, rover.y - base.y);
      if (rover.isBoarded || d <= 140) {
        toggleBoarding();
      }
    }

    // Quantum upgrade passive regen
    if (gameState.upgrades && gameState.upgrades.quantumTier > 0) {
      base.fuel = Math.min(base.maxFuel, base.fuel + 0.04);
      if (base.hp < base.maxHp) base.hp = Math.min(base.maxHp, base.hp + 0.02);
      rover.fuel = Math.min(rover.maxFuel, rover.fuel + 0.04);
      if (rover.hp < rover.maxHp) rover.hp = Math.min(rover.maxHp, rover.hp + 0.02);
    }

    if (base.cannonCooldown > 0) base.cannonCooldown--;
    if (base.turretRecoil > 0) base.turretRecoil *= 0.82;
    if (base.muzzleFlash > 0) base.muzzleFlash--;
    if (base.shieldPulse > 0) base.shieldPulse--;

    if (rover.fireCooldown > 0) rover.fireCooldown--;
    if (rover.muzzleFlash > 0) rover.muzzleFlash--;

    // ==========================================
    // HOST / AUTHORITATIVE SIMULATION
    // ==========================================
    if (isHost) {
      // 1. BASE TANK AUTO-FIRING CANNON
      let closestEnemy = null;
      let closestDist = 440;
      for (let e of gameState.enemies) {
        const d = Math.hypot(e.x - base.x, e.y - base.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }

      if (closestEnemy) {
        const targetAngle = Math.atan2(closestEnemy.y - base.y, closestEnemy.x - base.x);
        let diff = targetAngle - base.cannonAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        base.cannonAngle += Math.sign(diff) * Math.min(0.08, Math.abs(diff));

        const isTurretOverdrive = base.powerMode === 'turrets' && base.fuel > 0;
        const cannonCooldownMax = isTurretOverdrive ? 18 : 38;

        if (Math.abs(diff) < 0.45 && base.cannonCooldown <= 0) {
          base.cannonCooldown = cannonCooldownMax;
          base.turretRecoil = 8;
          base.muzzleFlash = 4;
          if (isTurretOverdrive) base.fuel = Math.max(0, base.fuel - 0.5);

          const barrelLen = 52;
          const bX = base.x + Math.cos(base.cannonAngle) * barrelLen;
          const bY = base.y + Math.sin(base.cannonAngle) * barrelLen;
          const cSpeed = isTurretOverdrive ? 19 : 16;

          gameState.projectiles.push({
            type: 'base_cannon',
            x: bX, y: bY,
            vx: Math.cos(base.cannonAngle) * cSpeed,
            vy: Math.sin(base.cannonAngle) * cSpeed,
            radius: 6,
            damage: 42,
            splashRadius: 55,
            dist: 0,
            maxDist: 850,
            color: isTurretOverdrive ? '#ec4899' : '#f59e0b'
          });
        }
      }

      // 2. BASE SHIELD FORCEFIELD (Consumes Fuel)
      if (base.powerMode === 'shields' && base.fuel > 0) {
        base.fuel = Math.max(0, base.fuel - 0.025);
        const shieldRadius = 110;

        for (let eIdx = gameState.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = gameState.enemies[eIdx];
          const distToBase = Math.hypot(enemy.x - base.x, enemy.y - base.y);

          if (distToBase < shieldRadius) {
            enemy.hp -= 20;
            enemy.hitFlash = 6;
            base.shieldPulse = 10;
            base.fuel = Math.max(0, base.fuel - 0.35);

            const repelAngle = Math.atan2(enemy.y - base.y, enemy.x - base.x);
            enemy.x += Math.cos(repelAngle) * 28;
            enemy.y += Math.sin(repelAngle) * 28;
            spawnBloodSplat(enemy.x, enemy.y, 4, '#38bdf8');

            if (enemy.hp <= 0) {
              handleEnemyDefeated(gameState, enemy);
              gameState.enemies.splice(eIdx, 1);
            }
          }
        }
      }

      // 3. ROVER MOVEMENT & SHOOTING
      const roverInputs = (isSolo && localTarget === rover) ? keys : (isSolo ? {} : remoteKeys);

      if (rover.isBoarded) {
        rover.x = base.x;
        rover.y = base.y;
        rover.vx = 0;
        rover.vy = 0;
        rover.angle = 0;
        if (isSolo && localTarget === rover) {
          rover.aimAngle = Math.atan2(mouseWorldY - rover.y, mouseWorldX - rover.x);
        } else if (typeof remoteKeys.aimAngle === 'number') {
          rover.aimAngle = remoteKeys.aimAngle;
        }
      } else {
        let moveX = 0, moveY = 0;
        if (roverInputs.w || roverInputs.ArrowUp) moveY -= 1;
        if (roverInputs.s || roverInputs.ArrowDown) moveY += 1;
        if (roverInputs.a || roverInputs.ArrowLeft) moveX -= 1;
        if (roverInputs.d || roverInputs.ArrowRight) moveX += 1;

        const mLen = Math.hypot(moveX, moveY);
        if (mLen > 0) {
          rover.vx = (moveX / mLen) * rover.speed;
          rover.vy = (moveY / mLen) * rover.speed;
          rover.angle = Math.atan2(rover.vy, rover.vx);
          rover.lastDirIndex = getDirection8Index(rover.vx, rover.vy, rover.lastDirIndex);
          rover.treadAnim += rover.speed * 0.4;
        } else {
          rover.vx *= 0.8;
          rover.vy *= 0.8;
        }

        rover.x += rover.vx;
        rover.y += rover.vy;

        // Rover collision & sliding with Landscape Rocks
        if (gameState.landscape) {
          for (let rock of gameState.landscape) {
            const dx = rover.x - rock.x;
            const dy = rover.y - rock.y;
            const dist = Math.hypot(dx, dy);
            const minDist = rover.radius + rock.radius;
            if (dist < minDist && dist > 0) {
              const overlap = minDist - dist;
              rover.x += (dx / dist) * overlap;
              rover.y += (dy / dist) * overlap;
              const dot = rover.vx * (dx / dist) + rover.vy * (dy / dist);
              if (dot < 0) {
                rover.vx -= (dx / dist) * dot;
                rover.vy -= (dy / dist) * dot;
              }
            }
          }
        }

        // Rover driving in Hazard Tar Pits: slight drag & churned mud particles
        if (gameState.hazards) {
          for (let h of gameState.hazards) {
            if (Math.hypot(rover.x - h.x, rover.y - h.y) < h.radius + rover.radius) {
              rover.vx *= 0.88;
              rover.vy *= 0.88;
              if (Math.random() < 0.22) {
                spawnBloodSplat(rover.x, rover.y, 2, '#1e293b');
              }
              break;
            }
          }
        }

        // Rover auto-aim: tracks nearest approaching enemy within 330px
        let closestEnemyToRover = null;
        let closestDistToRover = 330;
        for (let e of gameState.enemies) {
          const d = Math.hypot(e.x - rover.x, e.y - rover.y);
          if (d < closestDistToRover) {
            closestDistToRover = d;
            closestEnemyToRover = e;
          }
        }

        if (closestEnemyToRover) {
          rover.aimAngle = Math.atan2(closestEnemyToRover.y - rover.y, closestEnemyToRover.x - rover.x);
        } else if (isSolo) {
          if (localTarget === rover) {
            rover.aimAngle = Math.atan2(mouseWorldY - rover.y, mouseWorldX - rover.x);
          }
        } else if (typeof remoteKeys.aimAngle === 'number') {
          rover.aimAngle = remoteKeys.aimAngle;
        }

        // Autonomous Weapon Point-Defense (Fires automatically to protect Rover while gathering or driving)
        if (rover.weapon && !rover.isBoarded) {
          if (!rover.autoWeaponCooldown) rover.autoWeaponCooldown = 0;
          if (rover.autoWeaponCooldown > 0) rover.autoWeaponCooldown--;
          if (rover.autoWeaponFlash > 0) rover.autoWeaponFlash--;

          if (rover.weapon === 'vulcan_sentry') {
            if (rover.autoWeaponCooldown <= 0 && gameState.enemies.length > 0) {
              let closestEnemy = null;
              let closestDist = 340;
              for (let e of gameState.enemies) {
                const d = Math.hypot(e.x - rover.x, e.y - rover.y);
                if (d < closestDist) {
                  closestDist = d;
                  closestEnemy = e;
                }
              }

              if (closestEnemy) {
                rover.autoWeaponCooldown = 8; // Rapid auto-fire
                rover.autoWeaponAngle = Math.atan2(closestEnemy.y - rover.y, closestEnemy.x - rover.x);
                rover.autoWeaponFlash = 3;

                const bX = rover.x + Math.cos(rover.autoWeaponAngle) * 20;
                const bY = rover.y + Math.sin(rover.autoWeaponAngle) * 20;
                gameState.projectiles.push({
                  type: 'vulcan_bullet',
                  x: bX, y: bY,
                  vx: Math.cos(rover.autoWeaponAngle) * 19,
                  vy: Math.sin(rover.autoWeaponAngle) * 19,
                  radius: 3,
                  damage: 16,
                  dist: 0,
                  maxDist: 380,
                  color: '#fbbf24'
                });
              }
            }
          } else if (rover.weapon === 'swarm_missiles') {
            if (rover.autoWeaponCooldown <= 0 && gameState.enemies.length > 0) {
              let targetEnemy = null;
              let closestDist = 420;
              for (let e of gameState.enemies) {
                const d = Math.hypot(e.x - rover.x, e.y - rover.y);
                if (d < closestDist) {
                  closestDist = d;
                  targetEnemy = e;
                }
              }

              if (targetEnemy) {
                rover.autoWeaponCooldown = 32;
                rover.autoWeaponFlash = 4;
                const launchAngle = Math.atan2(targetEnemy.y - rover.y, targetEnemy.x - rover.x);

                for (let side = -1; side <= 1; side += 2) {
                  gameState.projectiles.push({
                    type: 'homing_missile',
                    x: rover.x + Math.cos(launchAngle + (Math.PI / 2) * side) * 16,
                    y: rover.y + Math.sin(launchAngle + (Math.PI / 2) * side) * 16,
                    vx: Math.cos(launchAngle + (Math.random() - 0.5) * 0.4) * 6,
                    vy: Math.sin(launchAngle + (Math.random() - 0.5) * 0.4) * 6,
                    speed: 10.5,
                    target: targetEnemy,
                    targetId: targetEnemy.id,
                    radius: 4.5,
                    damage: 38,
                    splashRadius: 50,
                    dist: 0,
                    maxDist: 500,
                    color: '#ec4899'
                  });
                }
              }
            }
          }
        }

        // Rover main armament: AUTO-FIRES when enemies get closer, or when player holds shoot
        const roverManualShoot = isSolo
          ? (localTarget === rover ? keys.mouse.isDown : false)
          : (roverInputs.isMouseDown);
        const roverShouldShoot = (closestEnemyToRover !== null || roverManualShoot) && !rover.isBoarded;

        if (roverShouldShoot && rover.fireCooldown <= 0) {
          if (rover.weapon === 'vulcan_sentry') {
            rover.fireCooldown = 8;
            rover.muzzleFlash = 4;
            const barrelLen = 22;
            const pSpeed = 16;
            for (let aOffset of [-0.14, 0, 0.14]) {
              const a = rover.aimAngle + aOffset;
              gameState.projectiles.push({
                type: 'rover_blaster',
                x: rover.x + Math.cos(a) * barrelLen,
                y: rover.y + Math.sin(a) * barrelLen,
                vx: Math.cos(a) * pSpeed,
                vy: Math.sin(a) * pSpeed,
                radius: 4,
                damage: 28,
                pierceCount: 0,
                knockback: 6,
                dist: 0,
                maxDist: 650,
                color: '#f59e0b'
              });
            }
          } else if (rover.weapon === 'swarm_missiles') {
            rover.fireCooldown = 16;
            rover.muzzleFlash = 5;
            const barrelLen = 24;
            const pSpeed = 14;
            gameState.projectiles.push({
              type: 'rover_blaster',
              x: rover.x + Math.cos(rover.aimAngle) * barrelLen,
              y: rover.y + Math.sin(rover.aimAngle) * barrelLen,
              vx: Math.cos(rover.aimAngle) * pSpeed,
              vy: Math.sin(rover.aimAngle) * pSpeed,
              radius: 6,
              damage: 70,
              pierceCount: 1,
              knockback: 14,
              dist: 0,
              maxDist: 720,
              color: '#ec4899',
              splashRadius: 40
            });
          } else {
            // In-World Scavenger Weapon Progression (Tiers 1-4)
            const wCfg = gameState.weaponStats || WEAPON_TIER_CONFIG[1];
            rover.fireCooldown = wCfg.fireRate;
            rover.muzzleFlash = 4;
            const barrelLen = 22;
            const pSpeed = wCfg.speed || 16;
            const count = wCfg.projectileCount || 1;

            if (count === 1) {
              const bX = rover.x + Math.cos(rover.aimAngle) * barrelLen;
              const bY = rover.y + Math.sin(rover.aimAngle) * barrelLen;
              gameState.projectiles.push({
                type: 'rover_blaster',
                x: bX, y: bY,
                vx: Math.cos(rover.aimAngle) * pSpeed,
                vy: Math.sin(rover.aimAngle) * pSpeed,
                radius: wCfg.radius || 4,
                damage: wCfg.damage,
                pierceCount: wCfg.pierceCount || 0,
                knockback: wCfg.knockback || 0,
                dist: 0,
                maxDist: 680,
                color: wCfg.color || '#38bdf8'
              });
            } else {
              // Tier 2: 3-pellet scatter shot with knockback
              const spread = wCfg.spreadAngle || 0.24;
              const offsets = [-spread, 0, spread];
              for (let off of offsets) {
                const a = rover.aimAngle + off;
                gameState.projectiles.push({
                  type: 'rover_blaster',
                  x: rover.x + Math.cos(a) * barrelLen,
                  y: rover.y + Math.sin(a) * barrelLen,
                  vx: Math.cos(a) * pSpeed,
                  vy: Math.sin(a) * pSpeed,
                  radius: wCfg.radius || 4,
                  damage: wCfg.damage,
                  pierceCount: wCfg.pierceCount || 0,
                  knockback: wCfg.knockback || 10,
                  dist: 0,
                  maxDist: 620,
                  color: wCfg.color || '#f59e0b'
                });
              }
            }

            // Tier 4: Primary rounds + seeking micro-missile!
            if (wCfg.hasMissiles && closestEnemyToRover) {
              gameState.projectiles.push({
                type: 'homing_missile',
                x: rover.x + Math.cos(rover.aimAngle + Math.PI / 2) * 14,
                y: rover.y + Math.sin(rover.aimAngle + Math.PI / 2) * 14,
                vx: Math.cos(rover.aimAngle) * 5,
                vy: Math.sin(rover.aimAngle) * 5,
                speed: wCfg.homingSpeed || 11,
                target: closestEnemyToRover,
                targetId: closestEnemyToRover.id,
                radius: 4.5,
                damage: 38,
                splashRadius: 45,
                dist: 0,
                maxDist: 520,
                color: '#ec4899'
              });
            }
          }
        }
      }

      // World boundary clamping
      rover.x = Math.max(30, Math.min(rover.x, WORLD_WIDTH - 30));
      rover.y = Math.max(30, Math.min(rover.y, WORLD_HEIGHT - 30));

      // 5. SIMULATE STRUCTURES (Towers, Gates, Pylons)
      for (let sIdx = gameState.structures.length - 1; sIdx >= 0; sIdx--) {
        const struct = gameState.structures[sIdx];
        if (struct.cooldown > 0) struct.cooldown--;
        if (struct.hitFlash > 0) struct.hitFlash--;
        struct.pulse = (struct.pulse || 0) + 0.05;

        // BLAST GATE: Auto-opens for Rover, closed against bugs
        if (struct.type === 'gate') {
          const distToRover = Math.hypot(rover.x - struct.x, rover.y - struct.y);
          struct.isOpen = distToRover < 75;
        }

        // GATLING SENTRY: Rapid anti-swarm fire
        if (struct.type === 'gatling' && struct.cooldown <= 0) {
          let nearE = null, nearD = STRUCTURE_CONFIG.gatling.range;
          for (let e of gameState.enemies) {
            const d = Math.hypot(e.x - struct.x, e.y - struct.y);
            if (d < nearD) { nearD = d; nearE = e; }
          }
          if (nearE) {
            struct.cooldown = STRUCTURE_CONFIG.gatling.cooldownMax;
            struct.angle = Math.atan2(nearE.y - struct.y, nearE.x - struct.x);
            const bX = struct.x + Math.cos(struct.angle) * 18;
            const bY = struct.y + Math.sin(struct.angle) * 18;
            gameState.projectiles.push({
              type: 'gatling_bullet',
              x: bX, y: bY,
              vx: Math.cos(struct.angle) * 18,
              vy: Math.sin(struct.angle) * 18,
              radius: 3,
              damage: STRUCTURE_CONFIG.gatling.damage,
              dist: 0,
              maxDist: nearD + 50,
              color: '#f59e0b'
            });
          }
        }

        // PLASMA MORTAR: Heavy explosive artillery
        if (struct.type === 'plasma_mortar' && struct.cooldown <= 0) {
          let nearE = null, nearD = STRUCTURE_CONFIG.plasma_mortar.range;
          for (let e of gameState.enemies) {
            const d = Math.hypot(e.x - struct.x, e.y - struct.y);
            if (d >= 90 && d < nearD) { nearD = d; nearE = e; }
          }
          if (nearE) {
            struct.cooldown = STRUCTURE_CONFIG.plasma_mortar.cooldownMax;
            struct.angle = Math.atan2(nearE.y - struct.y, nearE.x - struct.x);
            gameState.projectiles.push({
              type: 'plasma_shell',
              x: struct.x, y: struct.y,
              targetX: nearE.x, targetY: nearE.y,
              vx: Math.cos(struct.angle) * 9.5,
              vy: Math.sin(struct.angle) * 9.5,
              radius: 7,
              damage: STRUCTURE_CONFIG.plasma_mortar.damage,
              splashRadius: STRUCTURE_CONFIG.plasma_mortar.splashRadius,
              dist: 0,
              maxDist: nearD,
              color: '#ec4899'
            });
          }
        }

        // TESLA COIL: Chain lightning stun
        if (struct.type === 'tesla' && struct.cooldown <= 0) {
          const targets = [];
          for (let e of gameState.enemies) {
            const d = Math.hypot(e.x - struct.x, e.y - struct.y);
            if (d < STRUCTURE_CONFIG.tesla.range) targets.push({ enemy: e, dist: d });
            if (targets.length >= STRUCTURE_CONFIG.tesla.maxTargets) break;
          }

          if (targets.length > 0) {
            struct.cooldown = STRUCTURE_CONFIG.tesla.cooldownMax;
            for (let t of targets) {
              const e = t.enemy;
              e.hp -= STRUCTURE_CONFIG.tesla.damage;
              e.hitFlash = 8;
              spawnSparkArc(struct.x, struct.y, e.x, e.y, '#38bdf8');
              spawnBloodSplat(e.x, e.y, 3, '#38bdf8');
              if (e.hp <= 0 && !e.counted) {
                e.counted = true;
                handleEnemyDefeated(gameState, e);
              }
            }
          }
        }

        // REPAIR PYLON: Emits healing wave for walls and structures
        if (struct.type === 'repair_pylon' && struct.cooldown <= 0) {
          struct.cooldown = STRUCTURE_CONFIG.repair_pylon.cooldownMax;
          spawnRepairPulseWave(struct.x, struct.y, STRUCTURE_CONFIG.repair_pylon.range);

          for (let other of gameState.structures) {
            const d = Math.hypot(other.x - struct.x, other.y - struct.y);
            if (d <= STRUCTURE_CONFIG.repair_pylon.range && other.hp < other.maxHp) {
              other.hp = Math.min(other.maxHp, other.hp + STRUCTURE_CONFIG.repair_pylon.healAmount);
            }
          }
          if (Math.hypot(base.x - struct.x, base.y - struct.y) <= STRUCTURE_CONFIG.repair_pylon.range) {
            base.hp = Math.min(base.maxHp, base.hp + 8);
          }
          if (Math.hypot(rover.x - struct.x, rover.y - struct.y) <= STRUCTURE_CONFIG.repair_pylon.range) {
            rover.hp = Math.min(rover.maxHp, rover.hp + 8);
          }
        }

        // Remove destroyed structures
        if (struct.hp <= 0) {
          gameState.structures.splice(sIdx, 1);
        }
      }

      // 6. UPDATE PROJECTILES & EXPLOSIONS
      for (let pIdx = gameState.projectiles.length - 1; pIdx >= 0; pIdx--) {
        const p = gameState.projectiles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.dist += Math.hypot(p.vx, p.vy);

        if (p.type === 'homing_missile') {
          // Steer towards target enemy if alive
          if (p.target && p.target.hp > 0) {
            const desiredAngle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            let curAngle = Math.atan2(p.vy, p.vx);
            let diff = desiredAngle - curAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            curAngle += Math.sign(diff) * Math.min(0.12, Math.abs(diff));
            const spd = p.speed || 10.5;
            p.vx = Math.cos(curAngle) * spd;
            p.vy = Math.sin(curAngle) * spd;
          }
          if (Math.random() < 0.6) {
            PARTICLES.push({
              type: 'fire',
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              radius: 2.5,
              color: '#ec4899',
              alpha: 0.7,
              decay: 0.05
            });
          }
        }

        const maxDist = p.maxDist || 750;
        let reachedEnd = p.dist >= maxDist;

        // Projectiles collision with Landscape Rocks (Mortar shells and homing missiles arc over)
        if (p.type !== 'plasma_shell' && p.type !== 'homing_missile' && gameState.landscape) {
          let hitRock = false;
          for (let rock of gameState.landscape) {
            if (Math.hypot(p.x - rock.x, p.y - rock.y) < rock.radius) {
              hitRock = true;
              spawnExplosion(p.x, p.y, 4);
              break;
            }
          }
          if (hitRock) {
            gameState.projectiles.splice(pIdx, 1);
            continue;
          }
        }

        if (p.type === 'acid_glob') {

          // Acid hits base, walls, or rover
          let hitPlayer = false;
          const dBase = Math.hypot(base.x - p.x, base.y - p.y);
          if (dBase < 65) {
            base.hp = Math.max(0, base.hp - p.damage);
            hitPlayer = true;
            spawnBloodSplat(p.x, p.y, 4, '#22c55e');
          }
          const dRover = Math.hypot(rover.x - p.x, rover.y - p.y);
          if (!hitPlayer && !rover.isBoarded && dRover < rover.radius + 6) {
            rover.hp = Math.max(0, rover.hp - p.damage);
            hitPlayer = true;
            spawnBloodSplat(p.x, p.y, 4, '#22c55e');
          }
          if (hitPlayer || reachedEnd) {
            gameState.projectiles.splice(pIdx, 1);
            continue;
          }
        }

        let hit = false;
        p.hitEnemyIds = p.hitEnemyIds || [];

        for (let eIdx = gameState.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = gameState.enemies[eIdx];
          if (p.hitEnemyIds.includes(enemy.id)) continue;

          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist < enemy.radius + p.radius) {
            p.hitEnemyIds.push(enemy.id);

            if (p.splashRadius) {
              // AoE damage
              spawnExplosion(p.x, p.y, 14);
              for (let other of gameState.enemies) {
                const sDist = Math.hypot(other.x - p.x, other.y - p.y);
                if (sDist <= p.splashRadius) {
                  const sDmg = Math.round(p.damage * (1 - sDist / p.splashRadius * 0.5));
                  other.hp -= sDmg;
                  other.hitFlash = 7;
                  spawnBloodSplat(other.x, other.y, 3, other.color);
                  if (p.knockback) {
                    const kbAngle = Math.atan2(other.y - p.y, other.x - p.x);
                    other.x += Math.cos(kbAngle) * p.knockback;
                    other.y += Math.sin(kbAngle) * p.knockback;
                  }
                  if (other.hp <= 0 && !other.counted) {
                    other.counted = true;
                    handleEnemyDefeated(gameState, other);
                  }
                }
              }
              hit = true;
              break;
            } else {
              // Direct hit
              enemy.hp -= p.damage;
              enemy.hitFlash = 6;
              spawnBloodSplat(enemy.x, enemy.y, 4, enemy.color);
              if (p.knockback) {
                const kbAngle = Math.atan2(p.vy, p.vx);
                enemy.x += Math.cos(kbAngle) * p.knockback;
                enemy.y += Math.sin(kbAngle) * p.knockback;
              }
              if (enemy.hp <= 0 && !enemy.counted) {
                enemy.counted = true;
                handleEnemyDefeated(gameState, enemy);
              }

              if (typeof p.pierceCount === 'number' && p.pierceCount > 0) {
                p.pierceCount--;
                // Bullet pierces through and continues
              } else {
                hit = true;
                break;
              }
            }
          }
        }

        // Clean dead enemies
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
          if (gameState.enemies[i].hp <= 0) gameState.enemies.splice(i, 1);
        }

        if (hit || reachedEnd) {
          if (p.splashRadius && !hit) {
            spawnExplosion(p.x, p.y, 10);
          }
          gameState.projectiles.splice(pIdx, 1);
        }
      }

      // 7. HYBRID SPAWNING ENGINE (Ambient Flow + Periodic Surge Waves)
      const dt = 1 / 60;
      gameState.gameTime = (gameState.gameTime || 0) + dt;
      const tMinutes = gameState.gameTime / 60.0;

      // Ambient constant flow: Interval = max(0.8, 4.0 * e^(-0.045 * t))
      gameState.ambientSpawnTimer = (gameState.ambientSpawnTimer || 0) + dt;
      const ambientInterval = Math.max(0.8, 4.0 * Math.exp(-0.045 * tMinutes));
      if (gameState.ambientSpawnTimer >= ambientInterval) {
        gameState.ambientSpawnTimer = 0;
        spawnAmbientEnemy(gameState, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // Periodic Surge Waves: 90s cycle, 25s alert countdown
      gameState.surgeCycleTimer = (gameState.surgeCycleTimer || 0) + dt;
      if (gameState.surgeCycleTimer >= 65) {
        gameState.surgeAlertTimer = Math.max(0, 90 - gameState.surgeCycleTimer);
      } else {
        gameState.surgeAlertTimer = 0;
      }

      if (gameState.surgeCycleTimer >= 90) {
        gameState.surgeCycleTimer = 0;
        gameState.surgeAlertTimer = 0;
        gameState.surgeWave = (gameState.surgeWave || 1) + 1;
        spawnSurgeHorde(gameState, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // AI update with terrain, hazards, and build sites
      updateSwarmAI(
        gameState.enemies,
        base,
        rover,
        gameState.structures,
        gameState.projectiles,
        true,
        gameState.landscape,
        gameState.hazards,
        gameState.buildSites
      );

      // In-World Build Sites & Physical Loose Scrap simulation
      updateBuildSites(gameState, rover, base, keys);
      updateLooseScraps(gameState, rover, base);

      // 8. DAMAGE TO BASE & ROVER FROM BUGS
      for (let enemy of gameState.enemies) {
        // Attack Base
        const dBase = Math.hypot(base.x - enemy.x, base.y - enemy.y);
        if (dBase < 65) {
          if (base.powerMode === 'shields' && base.fuel > 0) {
            base.shieldPulse = 8;
            base.fuel = Math.max(0, base.fuel - 0.2);
          } else if (enemy.attackCooldown <= 0) {
            base.hp = Math.max(0, base.hp - enemy.damage * 0.5);
            enemy.attackCooldown = 32;
            spawnBloodSplat(base.x, base.y, 4, '#94a3b8');
          }
        }

        // Attack Rover (if outside base)
        if (!rover.isBoarded) {
          const dRover = Math.hypot(rover.x - enemy.x, rover.y - enemy.y);
          if (dRover < rover.radius + enemy.radius) {
            if (enemy.attackCooldown <= 0) {
              rover.hp = Math.max(0, rover.hp - enemy.damage);
              enemy.attackCooldown = 28;
              spawnBloodSplat(rover.x, rover.y, 5, '#f97316');
              const kbAngle = Math.atan2(rover.y - enemy.y, rover.x - enemy.x);
              rover.x += Math.cos(kbAngle) * 12;
              rover.y += Math.sin(kbAngle) * 12;
            }
          }
        }
      }

      // 9. UPDATE RESOURCE ECONOMY
      updateEconomy(gameState, true);

      // 10. BROADCAST OVER P2P
      if (network && !isSolo) {
        network.send({
          type: 'STATE',
          state: {
            base: {
              x: base.x, y: base.y,
              hp: base.hp, maxHp: base.maxHp,
              fuel: base.fuel, maxFuel: base.maxFuel,
              powerMode: base.powerMode, shieldPulse: base.shieldPulse,
              cannonAngle: base.cannonAngle, turretRecoil: base.turretRecoil,
              muzzleFlash: base.muzzleFlash
            },
            rover: {
              x: rover.x, y: rover.y, vx: rover.vx, vy: rover.vy,
              lastDirIndex: rover.lastDirIndex,
              hp: rover.hp, maxHp: rover.maxHp, fuel: rover.fuel, maxFuel: rover.maxFuel,
              cargo: rover.cargo, maxCargo: rover.maxCargo,
              isBoarded: rover.isBoarded, angle: rover.angle, aimAngle: rover.aimAngle,
              muzzleFlash: rover.muzzleFlash,
              weapon: rover.weapon,
              autoWeaponAngle: rover.autoWeaponAngle,
              autoWeaponFlash: rover.autoWeaponFlash
            },
            weaponCaches: gameState.weaponCaches,
            structures: gameState.structures.map(s => ({
              id: s.id, type: s.type, x: Math.round(s.x), y: Math.round(s.y),
              hp: s.hp, maxHp: s.maxHp, radius: s.radius, angle: s.angle,
              isOpen: s.isOpen, hitFlash: s.hitFlash
            })),
            enemies: gameState.enemies.map(e => ({
              id: e.id, x: Math.round(e.x), y: Math.round(e.y),
              radius: e.radius, hp: e.hp, maxHp: e.maxHp, color: e.color,
              eyeColor: e.eyeColor, angle: e.angle, hitFlash: e.hitFlash,
              type: e.type, legAnim: e.legAnim
            })),
            projectiles: gameState.projectiles,
            scrapNodes: gameState.scrapNodes.map(n => ({
              id: n.id, x: Math.round(n.x), y: Math.round(n.y),
              tier: n.tier, amount: n.amount, maxAmount: n.maxAmount,
              radius: n.radius, color: n.color, glowColor: n.glowColor,
              beingHarvested: n.beingHarvested
            })),
            energyCells: gameState.energyCells,
            ruins: gameState.ruins,
            techCores: gameState.techCores,
            baseScrap: gameState.baseScrap,
            sectorsBuilt: gameState.sectorsBuilt || [],
            reinforceLevel: gameState.reinforceLevel || 0,
            upgrades: gameState.upgrades,
            kills: gameState.kills,
            wave: gameState.wave
          }
        });
      }
    } else {

      // CLIENT: Send inputs
      if (network) {
        const roverScreenX = canvas.width / 2;
        const roverScreenY = canvas.height / 2;
        const clientAimAngle = Math.atan2(keys.mouse.y - roverScreenY, keys.mouse.x - roverScreenX);

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

    updateParticles();

    // ==========================================
    // UPDATE HUD GAUGES
    // ==========================================
    const baseHpBar = document.getElementById('base-hp-bar');
    const baseHpTxt = document.getElementById('base-hp-txt');
    if (baseHpBar && baseHpTxt) {
      baseHpTxt.textContent = `${Math.ceil(base.hp)}/${base.maxHp}`;
      baseHpBar.style.width = `${Math.max(0, (base.hp / base.maxHp) * 100)}%`;
    }

    const roverHpBar = document.getElementById('rover-hp-bar');
    const roverHpTxt = document.getElementById('rover-hp-txt');
    if (roverHpBar && roverHpTxt) {
      roverHpTxt.textContent = `${Math.ceil(rover.hp)}/${rover.maxHp}`;
      roverHpBar.style.width = `${Math.max(0, (rover.hp / rover.maxHp) * 100)}%`;
    }

    const baseFuelBar = document.getElementById('base-fuel-bar');
    const baseFuelTxt = document.getElementById('base-fuel-txt');
    if (baseFuelBar && baseFuelTxt) {
      baseFuelTxt.textContent = `${Math.ceil(base.fuel)}/${base.maxFuel}`;
      baseFuelBar.style.width = `${Math.max(0, (base.fuel / base.maxFuel) * 100)}%`;
    }

    const baseScrapTxt = document.getElementById('base-scrap-txt');
    if (baseScrapTxt) baseScrapTxt.textContent = `${Math.floor(gameState.baseScrap)}`;

    const techCoresTxt = document.getElementById('tech-cores-txt');
    if (techCoresTxt) techCoresTxt.textContent = `${gameState.techCores || 0}`;

    const scavCargoTxt = document.getElementById('scav-cargo-txt');
    const scavCargoBar = document.getElementById('scav-cargo-bar');
    if (scavCargoTxt && scavCargoBar) {
      scavCargoTxt.textContent = `${Math.floor(rover.cargo)}/${rover.maxCargo}`;
      scavCargoBar.style.width = `${Math.min(100, (rover.cargo / rover.maxCargo) * 100)}%`;
    }

    const hudWave = document.getElementById('hud-wave');
    const hudSwarm = document.getElementById('hud-swarm');
    const hudKills = document.getElementById('hud-kills');
    const hudThreat = document.getElementById('hud-threat-alert');
    const tMin = ((gameState.gameTime || 0) / 60.0).toFixed(1);
    if (hudWave) hudWave.textContent = `Surge Wave: ${gameState.surgeWave || 1} (${tMin}m)`;
    if (hudSwarm) hudSwarm.textContent = `Swarm: ${gameState.enemies.length}`;
    if (hudKills) hudKills.textContent = `${gameState.kills}`;

    if (hudThreat) {
      if (gameState.surgeAlertTimer > 0) {
        hudThreat.textContent = `🚨 SURGE PACK BREACH IN ${Math.ceil(gameState.surgeAlertTimer)}s!`;
        hudThreat.style.color = '#ef4444';
      } else if ((gameState.surgeWave || 1) <= 2) {
        hudThreat.textContent = 'Threat: Scout Skirmish (Auto-Cannon holding)';
        hudThreat.style.color = '#22c55e';
      } else if ((gameState.surgeWave || 1) <= 4) {
        hudThreat.textContent = '⚠️ Threat: Fast Sprinters (Swarm flanking base!)';
        hudThreat.style.color = '#f59e0b';
      } else if ((gameState.surgeWave || 1) <= 6) {
        hudThreat.textContent = '🚨 Threat: Armored Crushers & Acid Spitters';
        hudThreat.style.color = '#ec4899';
      } else {
        hudThreat.textContent = '☠️ Threat: Apex Waste Horde (Extreme Lethality)';
        hudThreat.style.color = '#ef4444';
      }
    }

    // Update Rover Armament HUD card
    const roverWepName = document.getElementById('rover-weapon-name');
    const roverWepStatus = document.getElementById('rover-weapon-status');
    const roverWepDesc = document.getElementById('rover-weapon-desc');
    if (roverWepName && roverWepStatus && roverWepDesc) {
      if (rover.weapon === 'vulcan_sentry') {
        roverWepName.textContent = '⚔️ Vulcan Point-Defense Pod';
        roverWepName.style.color = '#f59e0b';
        roverWepStatus.textContent = 'Auto-Targeting';
        roverWepStatus.style.color = '#22c55e';
        roverWepDesc.textContent = 'Auto-fires at swarms while gathering! + Triple Scatter Blaster';
      } else if (rover.weapon === 'swarm_missiles') {
        roverWepName.textContent = '⚔️ Micro-Missile Swarm Pod';
        roverWepName.style.color = '#ec4899';
        roverWepStatus.textContent = 'Auto-Seeking';
        roverWepStatus.style.color = '#22c55e';
        roverWepDesc.textContent = 'Auto-launches homing missiles while gathering! + Concussive Cannon';
      } else {
        const wStats = gameState.weaponStats || WEAPON_TIER_CONFIG[rover.weaponTier || 1] || WEAPON_TIER_CONFIG[1];
        roverWepName.textContent = `⚔️ [T${wStats.tier}] ${wStats.name}`;
        roverWepName.style.color = wStats.color || '#38bdf8';
        roverWepStatus.textContent = wStats.tier >= 3 ? 'Piercing Plasma' : 'Auto-Aim & Fire';
        roverWepStatus.style.color = '#22c55e';
        roverWepDesc.textContent = wStats.desc;
      }
    }

    // Update Surge Alert Banner
    const surgeBannerEl = document.getElementById('surge-alert-banner');
    const surgeTimerTxt = document.getElementById('surge-timer-txt');
    if (surgeBannerEl) {
      if (gameState.surgeAlertTimer > 0) {
        surgeBannerEl.style.display = 'flex';
        if (surgeTimerTxt) {
          surgeTimerTxt.textContent = `${Math.ceil(gameState.surgeAlertTimer)}s`;
        }
      } else {
        surgeBannerEl.style.display = 'none';
      }
    }

    const boardBtn = document.getElementById('btn-board-toggle');
    if (boardBtn) {
      if (rover.isBoarded) {
        boardBtn.textContent = '🚪 [E] Disembark Rover';
        boardBtn.className = 'board-btn boarded';
      } else {
        const d = Math.hypot(rover.x - base.x, rover.y - base.y);
        boardBtn.textContent = d <= 140 ? '🚪 [E] Dock Rover into Base' : `🚪 [E] Dock Base (${Math.round(d)}m away)`;
        boardBtn.className = 'board-btn';
      }
    }
  }

  // --- 9. RENDERING PIPELINE ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    const camX = canvas.width / 2 - localTarget.x;
    const camY = canvas.height / 2 - localTarget.y;
    ctx.translate(camX, camY);

    // Terrain grid
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

    // World border
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Wasteland elements
    drawHazards(ctx, gameState.hazards);
    drawLandscape(ctx, gameState.landscape);
    drawRuins(ctx, gameState.ruins);
    drawWeaponCaches(ctx, gameState.weaponCaches);
    drawEnergyCells(ctx, gameState.energyCells);

    for (let node of gameState.scrapNodes) {
      drawScrapNode(ctx, node);
    }

    drawLooseScrap(ctx, gameState.looseScraps);
    drawBuildSites(ctx, gameState.buildSites, gameState.rover);

    drawHarvestBeam(ctx, gameState.rover, gameState.scrapNodes);
    drawDepositConduit(ctx, gameState.rover, gameState.base);
    drawScrapShards(ctx);
    drawParticles(ctx);

    // Placed Fortifications
    for (let struct of gameState.structures) {
      drawStructure(ctx, struct);
    }

    // Projectiles
    for (let p of gameState.projectiles) {
      ctx.save();
      if (p.type === 'base_cannon') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 6, 0, Math.PI * 2);
        ctx.fillStyle = p.color || '#f59e0b';
        ctx.shadowColor = p.color || '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.strokeStyle = p.color || 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (p.type === 'gatling_bullet') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (p.type === 'vulcan_bullet') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (p.type === 'homing_missile') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(2, -3);
        ctx.lineTo(2, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'plasma_shell') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 7, 0, Math.PI * 2);
        ctx.fillStyle = '#f472b6';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 16;
        ctx.fill();
      } else if (p.type === 'acid_glob') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 5, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fill();
      } else {
        // Rover blaster
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color || '#38bdf8';
        ctx.shadowColor = p.color || '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
        ctx.strokeStyle = p.color || 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Enemies
    for (let enemy of gameState.enemies) {
      drawEnemy(ctx, enemy);
    }

    // Central Base Fortress
    drawBase(ctx, gameState.base, gameState.upgrades);

    // Rover Scout (if not docked inside base)
    if (!gameState.rover.isBoarded) {
      drawRover(ctx, gameState.rover, gameState.upgrades);
    }

    drawFloatingTextsList(ctx);
    ctx.restore();

    if (gameStarted) {
      drawOffScreenWeaponBeacon(ctx, gameState.rover, gameState.weaponCaches);
      drawCrosshair(ctx, keys.mouse.x, keys.mouse.y, localTarget);
      drawRadar(ctx);
    }
  }


  // --- DRAWING: BASE FORTRESS TANK ---
  function drawBase(ctx, base, upgrades) {
    ctx.save();
    ctx.translate(base.x, base.y);

    // Heavy Treads
    const treadW = base.width + 16;
    const treadH = 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-treadW / 2, -base.height / 2 - 4, treadW, treadH);
    ctx.fillRect(-treadW / 2, base.height / 2 - treadH + 4, treadW, treadH);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    for (let x = -treadW / 2 + 6; x < treadW / 2; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, -base.height / 2 - 4);
      ctx.lineTo(x, -base.height / 2 + treadH - 4);
      ctx.moveTo(x, base.height / 2 - treadH + 4);
      ctx.lineTo(x, base.height / 2 + 4);
      ctx.stroke();
    }

    // Armored Hull
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-base.width / 2, -base.height / 2 + 10, base.width, base.height - 20);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(-base.width / 2, -base.height / 2 + 10, base.width, base.height - 20);

    // Armor plating decals
    ctx.fillStyle = '#334155';
    ctx.fillRect(-base.width / 2 + 12, -base.height / 2 + 16, 28, base.height - 32);
    ctx.fillRect(base.width / 2 - 40, -base.height / 2 + 16, 28, base.height - 32);

    // Generator core glow
    const corePulse = Math.sin(Date.now() * 0.005) * 0.15;
    ctx.fillStyle = base.powerMode === 'engines' ? '#f59e0b' : (base.powerMode === 'shields' ? '#38bdf8' : '#ec4899');
    ctx.beginPath();
    ctx.arc(0, 0, 16 * (1 + corePulse), 0, Math.PI * 2);
    ctx.fill();

    // Auto-Firing Heavy Cannon Turret
    ctx.save();
    ctx.rotate(base.cannonAngle);
    const recoil = Math.max(0, base.turretRecoil || 0);

    // Barrel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12 - recoil, -6, 42, 12);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(12 - recoil, -6, 42, 12);

    // Muzzle Brake
    ctx.fillStyle = '#334155';
    ctx.fillRect(50 - recoil, -8, 8, 16);

    // Swivel Turret Cap
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Command Viewport
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(6, -6, 10, 12);

    // Muzzle flash
    if (base.muzzleFlash > 0) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(62 - recoil, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(62 - recoil, 0, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Shield Forcefield Bubble
    if (base.powerMode === 'shields' && base.fuel > 0) {
      const sRadius = 110 + Math.sin(Date.now() * 0.006) * 5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, sRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Health bar above base
    const barW = 100;
    const barH = 7;
    const barX = -barW / 2;
    const barY = -base.height / 2 - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    const hpRatio = Math.max(0, base.hp / base.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : (hpRatio > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  // --- DRAWING: ROVER SCOUT (8-DIRECTIONAL MILITARY TRUCK SPRITE) ---
  function drawRover(ctx, rover, upgrades) {
    const speed = Math.hypot(rover.vx, rover.vy);
    const isMoving = speed > 0.25;
    const isLoaded = (rover.cargo || 0) > 0;
    const isIlluminated = (rover.cargo || 0) >= ((rover.maxCargo || 50) * 0.65) || (gameState.techCores > 0);

    // Update 8-directional heading if moving, otherwise preserve parked heading
    if (isMoving) {
      rover.lastDirIndex = getDirection8Index(rover.vx, rover.vy, rover.lastDirIndex);
    }
    const dirIndex = (typeof rover.lastDirIndex === 'number' && rover.lastDirIndex >= 0 && rover.lastDirIndex < 8)
      ? rover.lastDirIndex
      : 1;
    const dirInfo = DIRECTION_8_FRAMES[dirIndex] || DIRECTION_8_FRAMES[1];

    if (dirInfo.facingDir !== 0) {
      rover.facingDir = dirInfo.facingDir;
    }
    if (!rover.facingDir) rover.facingDir = 1;

    ctx.save();
    ctx.translate(rover.x, rover.y);

    if (truckSpriteLoaded && truckSprite.complete && truckSprite.naturalWidth > 0) {
      // ==========================================
      // 8-DIRECTIONAL SPRITE SHEET RENDERING (4x2 GRID)
      // ==========================================
      const is8WaySheet = (truckSprite.width > 2000) || (truckSprite.width / truckSprite.height > 1.4);
      let col = 0, row = 0, frameWidth = 0, frameHeight = 0;

      if (is8WaySheet) {
        frameWidth = truckSprite.width / 4;
        frameHeight = truckSprite.height / 2;
        col = dirInfo.col;
        row = dirInfo.row;
      } else {
        // Fallback for legacy 2x2 sprite
        frameWidth = truckSprite.width / 2;
        frameHeight = truckSprite.height / 2;
        col = isMoving ? 1 : 0;
        row = (isIlluminated || isLoaded) ? 1 : 0;
      }

      const sourceX = col * frameWidth;
      const sourceY = row * frameHeight;

      // Destination rendering dimensions (crisp, proportional scale)
      const destH = 78;
      const destW = Math.round(destH * (frameWidth / frameHeight)); // ~70px

      // Engine vibration while driving
      const treadVibe = isMoving ? Math.sin(rover.treadAnim || 0) * 1.0 : 0;

      // Ground contact drop shadow beneath chassis
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, destH * 0.28, destW * 0.44, destH * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Render the precise 8-directional frame (No flipping needed, all 8 directions are individually rendered!)
      ctx.drawImage(
        truckSprite,
        sourceX, sourceY, frameWidth, frameHeight,
        -destW / 2, -destH / 2 + treadVibe, destW, destH
      );

      // Dynamic Directional Headlight & Tail Lighting
      const headingAngle = dirInfo.angle;
      const headOffsetDist = destH * 0.28;
      const headX = Math.cos(headingAngle) * headOffsetDist;
      const headY = Math.sin(headingAngle) * headOffsetDist;
      const beamLen = isIlluminated ? 185 : 145;

      // Forward Headlight Cone
      ctx.save();
      const lightGrad = ctx.createRadialGradient(
        headX, headY, 6,
        headX + Math.cos(headingAngle) * beamLen, headY + Math.sin(headingAngle) * beamLen,
        130
      );
      lightGrad.addColorStop(0, isIlluminated ? 'rgba(56, 189, 248, 0.48)' : 'rgba(254, 240, 138, 0.40)');
      lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(
        headX + Math.cos(headingAngle - 0.38) * beamLen,
        headY + Math.sin(headingAngle - 0.38) * beamLen
      );
      ctx.lineTo(
        headX + Math.cos(headingAngle + 0.38) * beamLen,
        headY + Math.sin(headingAngle + 0.38) * beamLen
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Rear bumper glow / tail lights when viewed from rear (North / Up-facing)
      if (dirInfo.name === 'North') {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 8;
        ctx.fillRect(-destW * 0.24, destH * 0.22, 7, 3);
        ctx.fillRect(destW * 0.24 - 7, destH * 0.22, 7, 3);
        ctx.restore();
      }

      // Front bumper headlight glow when facing camera (South / Down-facing)
      if (dirInfo.name === 'South') {
        ctx.save();
        ctx.fillStyle = isIlluminated ? '#38bdf8' : '#fef08a';
        ctx.shadowColor = isIlluminated ? '#38bdf8' : '#fef08a';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-destW * 0.20, destH * 0.28, 3, 0, Math.PI * 2);
        ctx.arc(destW * 0.20, destH * 0.28, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Visual Cargo Crates & Bed Resource Fill on the Truck Bed
      if (rover.cargo > 0) {
        const cargoRatio = Math.min(1.0, rover.cargo / rover.maxCargo);
        const bedAngle = headingAngle + Math.PI;
        const bx = Math.cos(bedAngle) * 16;
        const by = Math.sin(bedAngle) * 15;

        ctx.save();
        ctx.translate(bx, by);

        // Bed Glow Underlay (glows brighter as truck fills up)
        const isFull = rover.cargo >= rover.maxCargo;
        const glowColor = isFull ? 'rgba(239, 68, 68, 0.55)' : (cargoRatio > 0.6 ? 'rgba(250, 204, 21, 0.45)' : 'rgba(245, 158, 11, 0.35)');
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10 + cargoRatio * 3, 7 + cargoRatio * 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crate 1 (Basic Scrap Crate - appears when cargo > 0)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(-6, -4, 12, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-4, -2, 8, 4);

        // Crate 2 (Additional stack when cargo >= 35%)
        if (cargoRatio >= 0.35) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-8, -6, 7, 6);
          ctx.strokeStyle = '#fbbf24';
          ctx.strokeRect(-8, -6, 7, 6);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-7, -5, 5, 4);
        }

        // Crate 3 (Full load top crate when cargo >= 70%)
        if (cargoRatio >= 0.70) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(1, -7, 7, 6);
          ctx.strokeStyle = '#eab308';
          ctx.strokeRect(1, -7, 7, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(2, -6, 5, 4);
        }

        // Tech Core Canister (if holding tech cores)
        if (gameState.techCores > 0) {
          ctx.fillStyle = '#ec4899';
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

    } else {
      // ==========================================
      // PROCEDURAL FALLBACK (IF SPRITE STILL LOADING)
      // ==========================================
      ctx.save();
      ctx.rotate(rover.angle);

      // Headlight cone
      const lightGrad = ctx.createRadialGradient(25, 0, 5, 140, 0, 160);
      lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(25, -12);
      ctx.lineTo(140, -65);
      ctx.lineTo(140, 65);
      ctx.lineTo(25, 12);
      ctx.closePath();
      ctx.fill();

      // Treads
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-rover.width / 2, -rover.height / 2, rover.width, 7);
      ctx.fillRect(-rover.width / 2, rover.height / 2 - 7, rover.width, 7);

      // Body chassis
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-rover.width / 2 + 4, -rover.height / 2 + 5, rover.width - 8, rover.height - 10);
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 2;
      ctx.strokeRect(-rover.width / 2 + 4, -rover.height / 2 + 5, rover.width - 8, rover.height - 10);

      // Cargo Container
      const cargoRatio = Math.min(1.0, rover.cargo / rover.maxCargo);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-rover.width / 2 + 6, -8, 14, 16);
      if (cargoRatio > 0) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-rover.width / 2 + 7, -7, 12 * cargoRatio, 14);
      }

      // Cockpit
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(2, -6, 12, 12);

      ctx.restore();
    }

    // Mounted Missile Pods on flanks (if swarm_missiles equipped)
    if (rover.weapon === 'swarm_missiles') {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-22, -18, 14, 5);
      ctx.fillRect(8, -18, 14, 5);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(-20, -17, 3, 3);
      ctx.fillRect(18, -17, 3, 3);
      ctx.restore();
    }

    // Autonomous Point-Defense Gatling Turret (if vulcan_sentry equipped)
    if (rover.weapon === 'vulcan_sentry') {
      ctx.save();
      const vX = 0;
      const vY = -6;
      ctx.translate(vX, vY);
      ctx.rotate(rover.autoWeaponAngle || rover.aimAngle);

      // Swivel mount
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Twin revolving barrels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, -4, 18, 3);
      ctx.fillRect(4, 1, 18, 3);

      // Ammo drum
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8, -4, 5, 8);

      // Muzzle flashes when auto-firing
      if (rover.autoWeaponFlash > 0) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(24, -2.5, 5, 0, Math.PI * 2);
        ctx.arc(24, 2.5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Rotating Player-Aimed Plasma / Railgun Blaster
    ctx.save();
    const bMountX = rover.weapon === 'vulcan_sentry' ? 8 : 0;
    const bMountY = -4;
    ctx.translate(bMountX, bMountY);
    ctx.rotate(rover.aimAngle);

    // Turret base ring
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Weapon barrel
    ctx.fillStyle = '#334155';
    ctx.fillRect(2, -3, 20, 6);

    const bColor = rover.weapon === 'vulcan_sentry' ? '#f59e0b' : (rover.weapon === 'swarm_missiles' ? '#ec4899' : (gameState.weaponStats ? gameState.weaponStats.color : '#38bdf8'));
    ctx.fillStyle = bColor;
    ctx.fillRect(8, -2, 8, 4);

    if (rover.muzzleFlash > 0) {
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(26, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- OVERHEAD GAUGES: HEALTH & CARGO CAPACITY ---
    const showHp = rover.hp < rover.maxHp;
    const showCargo = (rover.cargo || 0) > 0;

    let hpY = -44;
    let cargoY = -44;

    if (showHp && showCargo) {
      hpY = -53;
      cargoY = -43;
    } else if (showHp) {
      hpY = -44;
    } else if (showCargo) {
      cargoY = -44;
    }

    // 1. Overhead Health Bar
    if (showHp) {
      const barW = 40;
      const barH = 4;
      const barX = -barW / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(barX - 1, hpY - 1, barW + 2, barH + 2);
      const rRatio = Math.max(0, rover.hp / rover.maxHp);
      ctx.fillStyle = rRatio > 0.5 ? '#22c55e' : (rRatio > 0.25 ? '#eab308' : '#ef4444');
      ctx.fillRect(barX, hpY, barW * rRatio, barH);
    }

    // 2. Overhead Cargo Capacity Meter (shows current scrap vs max cargo)
    if (showCargo) {
      const cargoRatio = Math.min(1.0, rover.cargo / rover.maxCargo);
      const isFull = rover.cargo >= rover.maxCargo;
      const barW = 42;
      const barH = 5;
      const barX = -barW / 2;

      ctx.save();
      // Background & Border
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(barX - 1, cargoY - 1, barW + 2, barH + 2);
      const strokeCol = isFull ? (Math.sin(Date.now() * 0.01) > 0 ? '#ef4444' : '#f59e0b') : '#92400e';
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, cargoY - 1, barW + 2, barH + 2);

      // Gold / Amber Cargo Fill Gradient
      const fillGrad = ctx.createLinearGradient(barX, cargoY, barX + barW, cargoY);
      if (isFull) {
        fillGrad.addColorStop(0, '#f59e0b');
        fillGrad.addColorStop(1, '#ef4444');
      } else if (cargoRatio >= 0.7) {
        fillGrad.addColorStop(0, '#eab308');
        fillGrad.addColorStop(1, '#facc15');
      } else {
        fillGrad.addColorStop(0, '#d97706');
        fillGrad.addColorStop(1, '#fbbf24');
      }
      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX, cargoY, barW * cargoRatio, barH);

      // 4 Segment Divider Ticks (25%, 50%, 75%)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      for (let s = 1; s <= 3; s++) {
        ctx.fillRect(barX + (barW * s) / 4, cargoY, 1, barH);
      }

      // Scrap Icon Pip on left
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(barX - 4, cargoY + barH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Text Label Above Cargo Bar
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      if (isFull) {
        ctx.fillStyle = Math.sin(Date.now() * 0.012) > 0 ? '#ef4444' : '#fef08a';
        ctx.fillText(`FULL ${Math.floor(rover.cargo)}/${rover.maxCargo}`, 0, cargoY - 3);
      } else {
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`${Math.floor(rover.cargo)}/${rover.maxCargo}`, 0, cargoY - 3);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // --- DRAWING: STRUCTURES ---
  function drawStructure(ctx, struct) {
    ctx.save();
    ctx.translate(struct.x, struct.y);

    if (struct.type === 'wall') {
      ctx.fillStyle = struct.hitFlash > 0 ? '#ffffff' : '#334155';
      ctx.fillRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);

      // Hazard stripes
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-struct.width / 2 + 4, -struct.height / 2 + 4, 6, 6);
      ctx.fillRect(struct.width / 2 - 10, struct.height / 2 - 10, 6, 6);
    } else if (struct.type === 'gate') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);
      ctx.strokeStyle = struct.isOpen ? '#22c55e' : '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);

      if (struct.isOpen) {
        // Doors open
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-struct.width / 2 + 2, -4, 6, 8);
        ctx.fillRect(struct.width / 2 - 8, -4, 6, 8);
      } else {
        // Doors locked
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, -6, 12, 12);
      }
    } else if (struct.type === 'gatling') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, struct.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(struct.angle);
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, -4, 16, 3);
      ctx.fillRect(2, 1, 16, 3);
      ctx.restore();
    } else if (struct.type === 'plasma_mortar') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, struct.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.rotate(struct.angle);
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, -6, 18, 12);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(6, -3, 8, 6);
      ctx.restore();
    } else if (struct.type === 'tesla') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, struct.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      const tPulse = Math.sin(struct.pulse) * 2;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 7 + tPulse, 0, Math.PI * 2);
      ctx.fill();
    } else if (struct.type === 'repair_pylon') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -14, 28, 28);

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overhead health bar if damaged
    if (struct.hp < struct.maxHp) {
      const barW = 26;
      const barH = 3;
      const barX = -barW / 2;
      const barY = -struct.radius - 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      const ratio = Math.max(0, struct.hp / struct.maxHp);
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#eab308' : '#ef4444');
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }

    ctx.restore();
  }

  // --- DRAWING: IN-WORLD INCREMENTAL BUILD SITES ("KINGDOM" SYSTEM) ---
  function drawBuildSites(ctx, buildSites, rover) {
    if (!buildSites) return;

    for (let site of buildSites) {
      if (!site.active) continue;

      ctx.save();
      ctx.translate(site.x, site.y);

      if (!site.built) {
        // ==========================================
        // UNBUILT HOLOGRAPHIC BLUEPRINT SITE
        // ==========================================
        const pulse = site.pulse || 0;
        const depositRatio = Math.min(1.0, site.currentScrap / site.costScrap);
        const isNear = site.playerNear;

        // 1. Blueprint base glow
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, site.radius + 18);
        if (isNear) {
          glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
          glowGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, site.radius + 18, 0, Math.PI * 2);
        ctx.fill();

        // 2. Rotating dotted blueprint ring
        ctx.save();
        ctx.rotate(pulse * 0.3);
        ctx.strokeStyle = isNear ? '#facc15' : 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = isNear ? 2 : 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, site.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 3. Circular progress meter for scrap deposit
        if (depositRatio > 0) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, site.radius - 2, -Math.PI / 2, -Math.PI / 2 + depositRatio * Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 4. In-world type icon & blueprint silhouette
        if (site.type === 'wall') {
          ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
          ctx.strokeStyle = isNear ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-20, -14, 40, 28);
          ctx.strokeRect(-20, -14, 40, 28);

          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡️', 0, 0);
        } else if (site.type === 'tower') {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
          ctx.strokeStyle = isNear ? '#f59e0b' : 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', 0, 0);
        } else if (site.type === 'weapon_forge') {
          ctx.fillStyle = 'rgba(76, 29, 149, 0.4)';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const ang = a * Math.PI / 3 + pulse * 0.2;
            const px = Math.cos(ang) * 18;
            const py = Math.sin(ang) * 18;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚔️', 0, 0);
        }

        // 5. Blueprint Site Title & Cost
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = isNear ? '#ffffff' : '#94a3b8';
        ctx.fillText(site.name, 0, -site.radius - 12);

        // Cost status
        const coreTxt = site.costCores > 0 ? ` + ${site.currentCores}/${site.costCores} 🔮` : '';
        ctx.fillStyle = depositRatio >= 1 ? '#22c55e' : (isNear ? '#facc15' : '#38bdf8');
        ctx.fillText(`${site.currentScrap}/${site.costScrap} 📦${coreTxt}`, 0, site.radius + 16);

        // 6. Proximity contextual prompt (R <= 45px)
        if (isNear) {
          const promptY = site.radius + 32;
          const scrapNeeded = Math.max(0, site.costScrap - site.currentScrap);
          const promptText = `[HOLD E / AUTO-DEPOSIT] ${scrapNeeded} SCRAP NEEDED`;

          ctx.font = 'bold 10px monospace';
          const txtW = ctx.measureText(promptText).width + 16;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-txtW / 2, promptY - 12, txtW, 18, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#facc15';
          ctx.fillText(promptText, 0, promptY + 1);
        }

      } else {
        // ==========================================
        // BUILT FORTIFICATION OR WEAPON FORGE
        // ==========================================
        if (site.type === 'wall') {
          // Blast Wall with Gate
          const w = 46;
          const h = 32;
          ctx.fillStyle = site.hitFlash > 0 ? '#ffffff' : '#334155';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-w / 2, -h / 2, w, h);

          // Gate opening/closing mechanism
          if (site.isOpen) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-12, -h / 2 - 1, 24, h + 2);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(-w / 2 + 3, -5, 6, 10);
            ctx.fillRect(w / 2 - 9, -5, 6, 10);
          } else {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-8, -h / 2 + 4, 16, h - 8);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-w / 2 + 4, -h / 2 + 4, 6, 6);
            ctx.fillRect(w / 2 - 10, h / 2 - 10, 6, 6);
          }

          // Visual wear / cracked fissures if damaged
          if (site.hp < site.maxHp * 0.7) {
            ctx.strokeStyle = site.hp < site.maxHp * 0.35 ? '#ef4444' : '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-10, -8);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-7, 9);
            ctx.moveTo(8, -10);
            ctx.lineTo(12, -2);
            ctx.lineTo(6, 7);
            ctx.stroke();
          }

        } else if (site.type === 'tower') {
          const tType = site.towerType || 'gatling';

          // Base mount
          ctx.fillStyle = site.hitFlash > 0 ? '#ffffff' : '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, site.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = tType === 'gatling' ? '#f59e0b' : (tType === 'plasma_mortar' ? '#ec4899' : (tType === 'tesla' ? '#38bdf8' : '#22c55e'));
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Rotating turret head
          ctx.save();
          ctx.rotate(site.angle || 0);

          if (tType === 'gatling') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(-8, -8, 16, 16);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(4, -5, 18, 3.5);
            ctx.fillRect(4, 1.5, 18, 3.5);
          } else if (tType === 'plasma_mortar') {
            ctx.fillStyle = '#334155';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(2, -7, 22, 14);
            ctx.fillStyle = '#f472b6';
            ctx.fillRect(8, -4, 10, 8);
          } else if (tType === 'tesla') {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();

            const pulseRing = Math.sin(site.pulse || 0) * 3;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, 14 + pulseRing, 0, Math.PI * 2);
            ctx.stroke();
          } else if (tType === 'repair_pylon') {
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(-12, -12, 24, 24);

            const rPulse = Math.sin(site.pulse || 0) * 4;
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.beginPath();
            ctx.arc(0, 0, 15 + rPulse, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();

        } else if (site.type === 'weapon_forge') {
          // Futuristic Hex Forge platform
          const fPulse = site.pulse || 0;
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let a = 0; a < 6; a++) {
            const ang = a * Math.PI / 3;
            const px = Math.cos(ang) * 26;
            const py = Math.sin(ang) * 26;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rotating weapon hologram projection
          ctx.save();
          ctx.rotate(fPulse * 0.4);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-10, -10, 20, 20);
          ctx.restore();

          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ec4899';
          ctx.textAlign = 'center';
          ctx.fillText(`FORGE TIER ${site.tier}`, 0, 3);
        }

        // Overhead health bar if damaged
        if (site.hp < site.maxHp) {
          const barW = 34;
          const barH = 4;
          const barX = -barW / 2;
          const barY = -site.radius - 12;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          const ratio = Math.max(0, site.hp / site.maxHp);
          ctx.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#eab308' : '#ef4444');
          ctx.fillRect(barX, barY, barW * ratio, barH);
        }
      }

      ctx.restore();
    }
  }

  // --- DRAWING: PHYSICAL LOOSE SCRAP WITH PHYSICS DRIFT ---
  function drawLooseScrap(ctx, looseScraps) {
    if (!looseScraps) return;

    for (let s of looseScraps) {
      ctx.save();
      ctx.translate(s.x, s.y);

      const pulse = Math.sin(s.pulse || 0) * 0.2 + 1.0;
      const r = (s.radius || 7) * pulse;

      // Glow
      ctx.shadowColor = s.color || '#facc15';
      ctx.shadowBlur = 10;

      // Scrap shard polygon
      ctx.fillStyle = s.color || '#facc15';
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(r * 0.3, r * 0.85);
      ctx.lineTo(-r * 0.7, r * 0.45);
      ctx.lineTo(-r * 0.5, -r * 0.6);
      ctx.lineTo(r * 0.4, -r * 0.8);
      ctx.closePath();
      ctx.fill();

      // Inner metallic core highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- DRAWING: ENEMIES ---
  function drawEnemy(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);

    const legCount = enemy.type === 'crusher' ? 4 : (enemy.type === 'sprinter' ? 3 : 3);
    ctx.strokeStyle = enemy.hitFlash > 0 ? '#ffffff' : (enemy.type === 'crusher' ? '#6b21a8' : (enemy.type === 'sprinter' ? '#c2410c' : '#991b1b'));
    ctx.lineWidth = enemy.type === 'crusher' ? 4 : (enemy.type === 'sprinter' ? 2 : 2.5);
    ctx.lineCap = 'round';

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < legCount; i++) {
        const legPhase = enemy.legAnim + i * 1.2 + (side === 1 ? Math.PI : 0);
        const legAngle = (side * Math.PI / 2.2) + Math.sin(legPhase) * 0.45;
        const legLength = enemy.radius * (enemy.type === 'sprinter' ? 1.6 : 1.35);

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

    // Body
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = enemy.eyeColor;
    ctx.beginPath();
    ctx.arc(enemy.radius * 0.65, -enemy.radius * 0.32, enemy.radius * 0.18, 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.65, enemy.radius * 0.32, enemy.radius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Overhead HP bar
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

  // --- DRAWING: SCRAP NODES, BEAMS & HUD ---
  function drawScrapNode(ctx, node) {
    ctx.save();
    ctx.translate(node.x, node.y);

    const glowR = node.radius * (1.3 + Math.sin(node.pulse) * 0.15);
    const grad = ctx.createRadialGradient(0, 0, node.radius * 0.3, 0, 0, glowR);
    grad.addColorStop(0, node.glowColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(node.rotation);
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-node.radius * 0.75, -node.radius * 0.75, node.radius * 1.5, node.radius * 1.5);
    ctx.restore();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, node.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(0, 0, node.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Amount text
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(node.amount)}`, node.x, node.y + node.radius + 18);
  }

  function drawHarvestBeam(ctx, rover, scrapNodes) {
    if (rover.isBoarded) return;
    for (let node of scrapNodes) {
      if (node.beingHarvested) {
        ctx.save();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2.5 + Math.sin(Date.now() * 0.02) * 1.5;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(rover.x, rover.y);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawDepositConduit(ctx, rover, base) {
    if (rover.isBoarded) return;
    const d = Math.hypot(rover.x - base.x, rover.y - base.y);
    if (d <= 130 && rover.cargo > 0) {
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5 + Math.sin(Date.now() * 0.03) * 1.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(rover.x, rover.y);
      ctx.lineTo(base.x, base.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawScrapShards(ctx) {
    for (let s of SCRAP_SHARDS) {
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFloatingTextsList(ctx) {
    for (let ft of FLOATING_TEXTS) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function drawEnergyCells(ctx, cells) {
    if (!cells) return;
    for (let c of cells) {
      ctx.save();
      ctx.translate(c.x, c.y);
      const pulse = Math.sin(c.pulse) * 2;
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }
  }

  function drawRuins(ctx, ruins) {
    if (!ruins) return;
    for (let r of ruins) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.strokeStyle = r.hasCore ? '#ec4899' : '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(-r.radius, -r.radius, r.radius * 2, r.radius * 2);
      ctx.fillStyle = r.hasCore ? 'rgba(236, 72, 153, 0.15)' : 'rgba(100, 116, 139, 0.1)';
      ctx.fillRect(-r.radius, -r.radius, r.radius * 2, r.radius * 2);

      if (r.hasCore) {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawHazards(ctx, hazards) {
    if (!hazards) return;
    for (let h of hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      h.bubbleTimer = (h.bubbleTimer || 0) + 0.04;

      // 1. Hazard Crater Base / Outer Scorched Ring
      const craterGrad = ctx.createRadialGradient(0, 0, h.radius * 0.4, 0, 0, h.radius + 12);
      craterGrad.addColorStop(0, '#090d16');
      craterGrad.addColorStop(0.65, '#0f172a');
      craterGrad.addColorStop(0.9, '#1e293b');
      craterGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = craterGrad;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      // 2. Tar Sludge Pool Body (Dark Viscous Pit with glowing cyan/petroleum edges)
      const tarGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, h.radius);
      tarGrad.addColorStop(0, '#020617');
      tarGrad.addColorStop(0.6, '#090d16');
      tarGrad.addColorStop(0.85, '#0c4a6e');
      tarGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = tarGrad;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Sludge Ripples / Concentric viscous rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1.5;
      const ripple1 = (Math.sin(h.bubbleTimer * 0.8) * 0.5 + 0.5) * (h.radius * 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, ripple1 + 10, 0, Math.PI * 2);
      ctx.stroke();

      const ripple2 = (Math.sin(h.bubbleTimer * 0.8 + 1.5) * 0.5 + 0.5) * (h.radius * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, ripple2 + 8, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Bubbling Tar Droplets
      const numBubbles = 5;
      for (let b = 0; b < numBubbles; b++) {
        const bAngle = b * (Math.PI * 2 / numBubbles) + h.bubbleTimer * 0.3;
        const bDist = (h.radius * 0.45) * (0.4 + 0.6 * Math.sin(h.bubbleTimer * 1.2 + b * 1.7));
        const bx = Math.cos(bAngle) * bDist;
        const by = Math.sin(bAngle) * bDist;
        const bRadius = 3 + Math.sin(h.bubbleTimer * 2 + b * 2) * 2;

        if (bRadius > 1.5) {
          ctx.beginPath();
          ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fill();
        }
      }

      // 5. Caution Hazard Perimeter Ring & Dashes
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, h.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. Tactical Label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(234, 179, 8, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ${h.name.toUpperCase()} (-60% SPD)`, 0, -h.radius - 8);

      ctx.restore();
    }
  }

  function drawLandscape(ctx, landscape) {
    if (!landscape) return;
    for (let rock of landscape) {
      ctx.save();
      ctx.translate(rock.x, rock.y);

      // 1. Drop shadow cast onto desert floor (offset south-east)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(rock.radius * 0.18, rock.radius * 0.22, rock.radius * 1.05, rock.radius * 0.95, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Basalt / Sandstone Foundation Base
      const baseGrad = ctx.createRadialGradient(
        -rock.radius * 0.3, -rock.radius * 0.3, rock.radius * 0.2,
        0, 0, rock.radius
      );
      baseGrad.addColorStop(0, '#57534e'); // Warm stone gray
      baseGrad.addColorStop(0.55, '#44403c'); // Dark basalt
      baseGrad.addColorStop(0.88, '#292524'); // Deep fissure edge
      baseGrad.addColorStop(1, '#1c1917'); // Black rock rim

      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Mesa Strata Lines (Layered canyon contours)
      ctx.strokeStyle = 'rgba(28, 25, 23, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius - 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(87, 83, 78, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-2, -3, rock.radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Elevated Plateau (Upper Rock Tableland)
      const plateauGrad = ctx.createRadialGradient(
        -rock.radius * 0.25, -rock.radius * 0.25, rock.radius * 0.1,
        0, 0, rock.radius * 0.68
      );
      plateauGrad.addColorStop(0, '#78716c'); // Light sandstone top
      plateauGrad.addColorStop(0.7, '#57534e'); // Mesa rock
      plateauGrad.addColorStop(1, '#44403c'); // Ridge drop-off

      ctx.fillStyle = plateauGrad;
      ctx.beginPath();
      ctx.arc(-2, -3, rock.radius * 0.68, 0, Math.PI * 2);
      ctx.fill();

      // 5. Rock Fissures & Crags
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-rock.radius * 0.35, -rock.radius * 0.2);
      ctx.lineTo(-rock.radius * 0.1, -rock.radius * 0.05);
      ctx.lineTo(rock.radius * 0.15, -rock.radius * 0.25);
      ctx.moveTo(-rock.radius * 0.05, rock.radius * 0.1);
      ctx.lineTo(rock.radius * 0.25, rock.radius * 0.18);
      ctx.stroke();

      // 6. Sunlit Rim Highlight (North-west crest catches desert sunlight)
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.38)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-2, -3, rock.radius * 0.68, Math.PI * 0.95, Math.PI * 1.85);
      ctx.stroke();

      // Outer rim sunlit crest
      ctx.strokeStyle = 'rgba(214, 211, 209, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius - 1, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();

      // 7. Tactical Mesa Label for major landmarks
      if (rock.radius >= 85) {
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(rock.name.toUpperCase(), 0, 3);
      }

      ctx.restore();
    }
  }

  function drawWeaponCaches(ctx, caches) {
    if (!caches) return;
    for (let c of caches) {
      ctx.save();
      ctx.translate(c.x, c.y);
      c.pulse = (c.pulse || 0) + 0.04;

      // 1. Reinforced Bunker Foundation
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-c.radius - 8, -c.radius - 8, (c.radius + 8) * 2, (c.radius + 8) * 2);
      ctx.strokeStyle = c.isCollected ? '#475569' : c.beaconColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-c.radius - 8, -c.radius - 8, (c.radius + 8) * 2, (c.radius + 8) * 2);

      // Hazard chevrons on corners
      ctx.fillStyle = c.isCollected ? '#64748b' : '#f59e0b';
      ctx.fillRect(-c.radius - 6, -c.radius - 6, 8, 8);
      ctx.fillRect(c.radius - 2, -c.radius - 6, 8, 8);
      ctx.fillRect(-c.radius - 6, c.radius - 2, 8, 8);
      ctx.fillRect(c.radius - 2, c.radius - 2, 8, 8);

      if (!c.isCollected) {
        // 2. Skyward Light Shaft / Beacon
        const beamGrad = ctx.createLinearGradient(0, 0, 0, -220);
        beamGrad.addColorStop(0, c.beaconColor);
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-4, -220);
        ctx.lineTo(4, -220);
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();

        // 3. Rotating Energy Rings
        const rRing = c.radius * (1 + Math.sin(c.pulse) * 0.12);
        ctx.strokeStyle = c.beaconColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, rRing, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Weapon Supply Capsule
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-18, -14, 36, 28);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-18, -14, 36, 28);

        // Glowing power core in capsule
        ctx.fillStyle = c.beaconColor;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // 5. Floating Hologram & Prompt Text
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = c.beaconColor;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillText(`⚔️ ${c.title}`, 0, -c.radius - 18);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('[DRIVE NEAR TO EQUIP]', 0, c.radius + 22);
      } else {
        // Depleted open pod
        ctx.fillStyle = '#334155';
        ctx.fillRect(-16, -12, 32, 24);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('CACHE DEPLETED', 0, c.radius + 18);
      }

      ctx.restore();
    }
  }

  function drawOffScreenWeaponBeacon(ctx, rover, caches) {
    if (localTarget !== rover || !caches) return;
    let nearest = null;
    let nearestDist = 999999;
    for (let c of caches) {
      if (!c.isCollected) {
        const d = Math.hypot(c.x - rover.x, c.y - rover.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = c;
        }
      }
    }

    if (!nearest) return;

    const camX = canvas.width / 2 - rover.x;
    const camY = canvas.height / 2 - rover.y;
    const screenX = nearest.x + camX;
    const screenY = nearest.y + camY;

    // If already comfortably on screen, don't draw border pointer
    const margin = 60;
    if (screenX >= margin && screenX <= canvas.width - margin &&
        screenY >= margin && screenY <= canvas.height - margin) {
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = Math.atan2(screenY - centerY, screenX - centerX);

    const edgeMargin = 55;
    const clampedX = Math.max(edgeMargin, Math.min(canvas.width - edgeMargin, centerX + Math.cos(angle) * (canvas.width / 2 - edgeMargin)));
    const clampedY = Math.max(edgeMargin, Math.min(canvas.height - edgeMargin, centerY + Math.sin(angle) * (canvas.height / 2 - edgeMargin)));

    ctx.save();
    ctx.translate(clampedX, clampedY);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = nearest.beaconColor || '#fbbf24';
    ctx.lineWidth = 2;
    ctx.shadowColor = nearest.beaconColor || '#fbbf24';
    ctx.shadowBlur = 10;

    const w = 155;
    const h = 26;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    // Direction arrow
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = nearest.beaconColor || '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 10, 0);
    ctx.lineTo(w / 2 - 2, -7);
    ctx.lineTo(w / 2 - 2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`⚔️ WEAPON: ${Math.round(nearestDist)}m`, 0, 4);

    ctx.restore();
  }

  function drawCrosshair(ctx, mx, my, target) {
    if (mx < 0 || mx > canvas.width || my < 0 || my > canvas.height) return;

    ctx.save();
    ctx.translate(mx, my);
    const color = target === gameState.rover ? '#f97316' : '#38bdf8';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

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
    ctx.restore();
  }

  function drawRadar(ctx) {
    const radarSize = 135;
    const margin = 20;
    const rx = canvas.width - radarSize - margin;
    const ry = margin;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(rx, ry, radarSize, radarSize);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, radarSize, radarSize);

    const toRadarX = (wx) => rx + (wx / WORLD_WIDTH) * radarSize;
    const toRadarY = (wy) => ry + (wy / WORLD_HEIGHT) * radarSize;

    // 1. Landscape rock mesas on radar (Brown-stone tactical choke points)
    if (gameState.landscape) {
      ctx.fillStyle = 'rgba(120, 113, 108, 0.75)';
      ctx.strokeStyle = 'rgba(68, 64, 60, 0.9)';
      ctx.lineWidth = 0.8;
      for (let rock of gameState.landscape) {
        const rockX = toRadarX(rock.x);
        const rockY = toRadarY(rock.y);
        const rockR = Math.max(2, (rock.radius / WORLD_WIDTH) * radarSize);
        ctx.beginPath();
        ctx.arc(rockX, rockY, rockR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 2. Hazards (Tar Pits - Slow zones)
    if (gameState.hazards) {
      for (let h of gameState.hazards) {
        const hx = toRadarX(h.x);
        const hy = toRadarY(h.y);
        const hr = Math.max(2, (h.radius / WORLD_WIDTH) * radarSize);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.8)';
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. In-world Build Sites (Unbuilt blueprint rings & built fortifications)
    if (gameState.buildSites) {
      for (let s of gameState.buildSites) {
        if (!s.active) continue;
        const sx = toRadarX(s.x);
        const sy = toRadarY(s.y);

        if (!s.built) {
          // Unbuilt site: pulsing blueprint ring
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Built site: solid colored dot
          ctx.fillStyle = s.type === 'weapon_forge' ? '#ec4899' : (s.type === 'wall' ? '#0ea5e9' : '#f59e0b');
          ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        }
      }
    }

    // 3.5 Loose Scrap pieces on radar
    if (gameState.looseScraps) {
      for (let sc of gameState.looseScraps) {
        ctx.fillStyle = sc.color || '#facc15';
        ctx.fillRect(toRadarX(sc.x) - 1, toRadarY(sc.y) - 1, 2, 2);
      }
    }

    // 4. Base fortress icon on radar
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(toRadarX(gameState.base.x) - 4, toRadarY(gameState.base.y) - 3, 8, 6);

    // 5. Rover icon
    if (!gameState.rover.isBoarded) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(toRadarX(gameState.rover.x), toRadarY(gameState.rover.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Weapon caches on radar
    if (gameState.weaponCaches) {
      for (let c of gameState.weaponCaches) {
        const cx = toRadarX(c.x);
        const cy = toRadarY(c.y);
        ctx.fillStyle = c.isCollected ? '#64748b' : (c.beaconColor || '#fbbf24');
        ctx.beginPath();
        ctx.arc(cx, cy, c.isCollected ? 2.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        if (!c.isCollected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 7. Enemies
    ctx.fillStyle = '#ef4444';
    for (let e of gameState.enemies) {
      ctx.fillRect(toRadarX(e.x) - 1.5, toRadarY(e.y) - 1.5, 3, 3);
    }

    // 8. Radar Sweep scan line
    radarSweepAngle = (radarSweepAngle + 0.04) % (Math.PI * 2);
    const centerRadarX = rx + radarSize / 2;
    const centerRadarY = ry + radarSize / 2;
    const sweepRadius = (radarSize / 2) * 1.35;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerRadarX, centerRadarY);
    ctx.lineTo(centerRadarX + Math.cos(radarSweepAngle) * sweepRadius, centerRadarY + Math.sin(radarSweepAngle) * sweepRadius);
    ctx.stroke();

    ctx.restore();
  }


  // --- BOOT UP ---
  initInputHandlers(canvas);

  function gameLoop() {
    update();
    draw();
    clearJustPressed();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
})();
