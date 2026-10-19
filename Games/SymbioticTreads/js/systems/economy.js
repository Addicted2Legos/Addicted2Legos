// --- RESOURCE ECONOMY & SCRAP SYSTEM ---

export const FLOATING_TEXTS = [];
export const SCRAP_SHARDS = [];

export function createScrapNode(id, x, y, tier = 'common') {
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
    id,
    x,
    y,
    tier,
    typeName,
    radius,
    amount,
    maxAmount: amount,
    color,
    glowColor,
    pulse: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    beingHarvested: false
  };
}

export function initScrapNodes(worldWidth, worldHeight, count = 22) {
  const nodes = [];
  const tiers = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare'];

  // Seed initial scrap deposits across the world
  for (let i = 0; i < count; i++) {
    const tier = tiers[i % tiers.length];
    // Distribute from near base to outer perimeter
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 350 + Math.random() * (worldWidth * 0.42);

    const x = Math.max(120, Math.min(worldWidth - 120, 1500 + Math.cos(angle) * dist));
    const y = Math.max(120, Math.min(worldHeight - 120, 1500 + Math.sin(angle) * dist));
    const id = 'scrap-' + Math.random().toString(36).substring(2, 9);

    nodes.push(createScrapNode(id, x, y, tier));
  }
  return nodes;
}

export function initRuins(worldWidth, worldHeight) {
  return [
    {
      id: 'ruin-alpha',
      name: 'Cryo-Vault Alpha',
      x: 680,
      y: 680,
      radius: 65,
      hasCore: true,
      harvestProgress: 0,
      maxHarvest: 100,
      pulse: 0,
      dangerLevel: 'HIGH'
    },
    {
      id: 'ruin-beta',
      name: 'Anomalous Lab Beta',
      x: worldWidth - 680,
      y: 680,
      radius: 65,
      hasCore: true,
      harvestProgress: 0,
      maxHarvest: 100,
      pulse: 1.2,
      dangerLevel: 'EXTREME'
    },
    {
      id: 'ruin-gamma',
      name: 'Derelict Reactor Gamma',
      x: 680,
      y: worldHeight - 680,
      radius: 65,
      hasCore: true,
      harvestProgress: 0,
      maxHarvest: 100,
      pulse: 2.4,
      dangerLevel: 'EXTREME'
    },
    {
      id: 'ruin-delta',
      name: 'Signal Array Delta',
      x: worldWidth - 680,
      y: worldHeight - 680,
      radius: 65,
      hasCore: true,
      harvestProgress: 0,
      maxHarvest: 100,
      pulse: 3.6,
      dangerLevel: 'HIGH'
    }
  ];
}

export function spawnEnergyCell(gameState, x, y, value = 15) {
  if (!gameState) return;
  if (!gameState.energyCells) gameState.energyCells = [];
  gameState.energyCells.push({
    id: 'cell-' + Math.random().toString(36).substring(2, 9),
    x,
    y,
    value,
    radius: 12,
    pulse: Math.random() * Math.PI * 2,
    life: 2400 // ~40 seconds persistence
  });
}

export function addFloatingText(x, y, text, color = '#facc15') {
  FLOATING_TEXTS.push({
    x,
    y,
    text,
    color,
    alpha: 1.0,
    vy: -1.2
  });
}

export function updateFloatingTexts() {
  for (let i = FLOATING_TEXTS.length - 1; i >= 0; i--) {
    const ft = FLOATING_TEXTS[i];
    ft.y += ft.vy;
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) {
      FLOATING_TEXTS.splice(i, 1);
    }
  }
}

export function spawnScrapShard(fromX, fromY, toX, toY, color = '#facc15') {
  const angle = Math.atan2(toY - fromY, toX - fromX) + (Math.random() - 0.5) * 0.6;
  const speed = 4 + Math.random() * 4;
  SCRAP_SHARDS.push({
    x: fromX,
    y: fromY,
    targetX: toX,
    targetY: toY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color,
    life: 25
  });
}

export function updateScrapShards(scavenger) {
  for (let i = SCRAP_SHARDS.length - 1; i >= 0; i--) {
    const s = SCRAP_SHARDS[i];
    // Magnetically pull towards scavenger
    const dx = scavenger.x - s.x;
    const dy = scavenger.y - s.y;
    const d = Math.hypot(dx, dy) || 1;

    s.vx = s.vx * 0.85 + (dx / d) * 7.5;
    s.vy = s.vy * 0.85 + (dy / d) * 7.5;
    s.x += s.vx;
    s.y += s.vy;
    s.life--;

    if (s.life <= 0 || d < 18) {
      SCRAP_SHARDS.splice(i, 1);
    }
  }
}

export function updateEconomy(gameState, isHost) {
  const { rover, scavenger, scrapNodes } = gameState;

  // Initialize cargo properties if not set
  if (typeof scavenger.cargo !== 'number') scavenger.cargo = 0;
  if (typeof scavenger.maxCargo !== 'number') scavenger.maxCargo = 50;
  if (typeof gameState.baseScrap !== 'number') gameState.baseScrap = 0;
  if (typeof gameState.upgrades !== 'object' || !gameState.upgrades) {
    gameState.upgrades = {
      speedTier: 0,
      cargoTier: 0,
      blasterTier: 0,
      hasTurret: false
    };
  }

  // 1. Scavenger Harvesting from Scrap Nodes
  for (let i = scrapNodes.length - 1; i >= 0; i--) {
    const node = scrapNodes[i];
    node.pulse = (node.pulse || 0) + 0.05;
    node.rotation = (node.rotation || 0) + 0.008;

    const dist = Math.hypot(scavenger.x - node.x, scavenger.y - node.y);
    const harvestRange = node.radius + scavenger.radius + 32;

    if (dist <= harvestRange) {
      node.beingHarvested = true;

      // Extract scrap if backpack has room
      if (scavenger.cargo < scavenger.maxCargo) {
        if (Math.random() < 0.45) {
          const harvestRate = 1;
          const transfer = Math.min(harvestRate, node.amount, scavenger.maxCargo - scavenger.cargo);
          node.amount -= transfer;
          scavenger.cargo += transfer;

          spawnScrapShard(node.x, node.y, scavenger.x, scavenger.y, node.color);
        }
      } else {
        if (Math.random() < 0.03) {
          addFloatingText(scavenger.x, scavenger.y - 24, 'BACKPACK FULL!', '#f97316');
        }
      }
    } else {
      node.beingHarvested = false;
    }

    // Depleted node removal
    if (node.amount <= 0) {
      addFloatingText(node.x, node.y, 'DEPLETED!', '#94a3b8');
      scrapNodes.splice(i, 1);
    }
  }

  // 2. Depositing Scrap into the Base (Rover)
  const distToRover = Math.hypot(scavenger.x - rover.x, scavenger.y - rover.y);
  const depositRange = 95; // Proximity to Rover's loading bay

  if ((distToRover <= depositRange || scavenger.isBoarded) && scavenger.cargo > 0) {
    // Unload scrap rapidly into Base Vault
    const unloadRate = scavenger.isBoarded ? scavenger.cargo : Math.min(2, scavenger.cargo);
    scavenger.cargo -= unloadRate;
    gameState.baseScrap += unloadRate;

    // Visual transfer shard from scavenger to rover
    if (Math.random() < 0.6) {
      spawnScrapShard(scavenger.x, scavenger.y, rover.x, rover.y, '#22c55e');
    }

    // Subtle hull repair bonus when scrap is deposited
    if (rover.hp < rover.maxHp) {
      rover.hp = Math.min(rover.maxHp, rover.hp + unloadRate * 0.2);
    }

    if (scavenger.cargo === 0) {
      addFloatingText(rover.x, rover.y - 45, '+ CARGO DEPOSITED!', '#22c55e');
    }
  }

  // 3. Energy Cells Pickup (Dropped by swarm, refuels mobile base generator)
  if (gameState.energyCells) {
    for (let cIdx = gameState.energyCells.length - 1; cIdx >= 0; cIdx--) {
      const cell = gameState.energyCells[cIdx];
      cell.pulse = (cell.pulse || 0) + 0.08;
      cell.life = (cell.life || 2400) - 1;

      if (cell.life <= 0) {
        gameState.energyCells.splice(cIdx, 1);
        continue;
      }

      const distScav = Math.hypot(scavenger.x - cell.x, scavenger.y - cell.y);
      const distRover = Math.hypot(rover.x - cell.x, rover.y - cell.y);

      // Scavenger on foot or Rover rolling over the cell
      if ((!scavenger.isBoarded && distScav <= scavenger.radius + 22) || distRover <= 70) {
        if (typeof rover.fuel !== 'number') rover.fuel = 100;
        if (typeof rover.maxFuel !== 'number') rover.maxFuel = 100;
        const addFuel = cell.value || 15;
        rover.fuel = Math.min(rover.maxFuel, rover.fuel + addFuel);

        addFloatingText(cell.x, cell.y - 12, `+${addFuel} FUEL`, '#38bdf8');
        spawnScrapShard(cell.x, cell.y, rover.x, rover.y, '#38bdf8');
        gameState.energyCells.splice(cIdx, 1);
      }
    }
  }

  // 4. Ruins & Tech Core Extraction
  if (gameState.ruins) {
    for (let ruin of gameState.ruins) {
      ruin.pulse = (ruin.pulse || 0) + 0.05;
      const distScav = Math.hypot(scavenger.x - ruin.x, scavenger.y - ruin.y);

      if (!scavenger.isBoarded && distScav <= ruin.radius + 30 && ruin.hasCore) {
        ruin.beingHarvested = true;
        ruin.harvestProgress = (ruin.harvestProgress || 0) + 0.75;

        if (Math.random() < 0.35) {
          spawnScrapShard(ruin.x, ruin.y, scavenger.x, scavenger.y, '#ec4899');
        }

        if (ruin.harvestProgress >= (ruin.maxHarvest || 100)) {
          ruin.hasCore = false;
          ruin.beingHarvested = false;
          gameState.techCores = (gameState.techCores || 0) + 1;
          addFloatingText(ruin.x, ruin.y - 35, 'TECH CORE ACQUIRED!', '#ec4899');
          addFloatingText(ruin.x, ruin.y - 55, 'DEFENSE PROTOCOL TRIPPED!', '#ef4444');
        }
      } else {
        ruin.beingHarvested = false;
        if (ruin.hasCore && ruin.harvestProgress > 0) {
          ruin.harvestProgress = Math.max(0, ruin.harvestProgress - 0.25);
        }
      }
    }
  }

  // 5. Periodic Scrap Meteor Drop (Host only)
  if (isHost && Math.random() < 0.003 && scrapNodes.length < 24) {
    const tiers = ['common', 'common', 'uncommon', 'rare'];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 1000;
    const x = Math.max(100, Math.min(2900, 1500 + Math.cos(angle) * dist));
    const y = Math.max(100, Math.min(2900, 1500 + Math.sin(angle) * dist));
    const id = 'scrap-drop-' + Math.random().toString(36).substring(2, 9);
    scrapNodes.push(createScrapNode(id, x, y, tier));
    addFloatingText(x, y - 20, 'NEW SALVAGE DROP!', '#38bdf8');
  }

  // 6. Autoturret Defense Module (if purchased)
  if (gameState.upgrades.hasTurret && isHost) {
    if (!rover.turretCooldown) rover.turretCooldown = 0;
    if (rover.turretCooldown > 0) rover.turretCooldown--;

    if (rover.turretCooldown <= 0 && gameState.enemies.length > 0) {
      // In Turrets power mode, fire twice as fast
      const fireInterval = rover.powerMode === 'turrets' ? 9 : 18;

      let closestEnemy = null;
      let closestDist = 360;
      for (let e of gameState.enemies) {
        const d = Math.hypot(e.x - rover.x, e.y - rover.y);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }

      if (closestEnemy) {
        rover.turretCooldown = fireInterval;
        const tAngle = Math.atan2(closestEnemy.y - rover.y, closestEnemy.x - rover.x);
        gameState.projectiles.push({
          type: 'autoturret',
          x: rover.x + Math.cos(tAngle) * 35,
          y: rover.y + Math.sin(tAngle) * 35,
          vx: Math.cos(tAngle) * 16,
          vy: Math.sin(tAngle) * 16,
          radius: 3.5,
          damage: 28,
          color: '#a855f7',
          dist: 0
        });
      }
    }
  }

  updateFloatingTexts();
  updateScrapShards(scavenger);
}

// --- DRAWING ROUTINES ---

export function drawScrapNode(ctx, node) {
  ctx.save();
  ctx.translate(node.x, node.y);

  // 1. Ambient Glow
  const glowR = node.radius * (1.3 + Math.sin(node.pulse) * 0.15);
  const grad = ctx.createRadialGradient(0, 0, node.radius * 0.3, 0, 0, glowR);
  grad.addColorStop(0, node.glowColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating salvage debris ring
  ctx.save();
  ctx.rotate(node.rotation);
  ctx.strokeStyle = node.color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-node.radius * 0.75, -node.radius * 0.75, node.radius * 1.5, node.radius * 1.5);
  ctx.restore();

  // 3. Metallic core node
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, node.radius * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = node.color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4. Energy Core beacon
  ctx.fillStyle = node.color;
  ctx.beginPath();
  ctx.arc(0, 0, node.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 5. Floating Scrap Count & Type Label
  ctx.restore();

  // Amount Gauge Arc
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (node.amount / node.maxAmount)));
  ctx.strokeStyle = node.color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Scrap amount text
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(node.amount)}`, node.x, node.y + node.radius + 18);
}

export function drawHarvestBeam(ctx, scavenger, scrapNodes) {
  for (let node of scrapNodes) {
    if (node.beingHarvested) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(scavenger.x, scavenger.y);
      ctx.lineTo(node.x, node.y);

      // Electric extraction beam
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Core white laser thread
      ctx.beginPath();
      ctx.moveTo(scavenger.x, scavenger.y);
      ctx.lineTo(node.x, node.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }
}

export function drawDepositConduit(ctx, scavenger, rover) {
  const d = Math.hypot(scavenger.x - rover.x, scavenger.y - rover.y);
  if (d <= 95 && scavenger.cargo > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scavenger.x, scavenger.y);
    ctx.lineTo(rover.x, rover.y);

    // Glowing suction conduit
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3 + Math.random() * 2;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 14;
    ctx.stroke();

    ctx.restore();
  }
}

export function drawScrapShards(ctx) {
  for (let s of SCRAP_SHARDS) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export function drawFloatingTextsList(ctx) {
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  for (let ft of FLOATING_TEXTS) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

export function drawEnergyCells(ctx, energyCells) {
  if (!energyCells) return;
  for (let cell of energyCells) {
    ctx.save();
    ctx.translate(cell.x, cell.y);

    // Cyan glowing aura
    const pulseScale = 1 + Math.sin(cell.pulse) * 0.18;
    const glowR = (cell.radius || 12) * 2.2 * pulseScale;
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Outer battery capsule body
    ctx.fillStyle = '#0f172a';
    const w = 18;
    const h = 12;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Cathode terminal tip
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(w / 2, -3, 3, 6);

    // Glowing energy core bar inside
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    ctx.shadowBlur = 0;

    // Lightning bolt glyph
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 0);

    ctx.restore();

    // Floating text label
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`+${cell.value || 15} FUEL`, cell.x, cell.y + 16);
  }
}

export function drawRuins(ctx, ruins) {
  if (!ruins) return;
  for (let ruin of ruins) {
    ctx.save();
    ctx.translate(ruin.x, ruin.y);

    // 1. Hazard perimeter boundary
    ctx.strokeStyle = ruin.hasCore ? 'rgba(236, 72, 153, 0.45)' : 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, ruin.radius + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Heavy Outpost Foundation Base (Octagon)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = ruin.hasCore ? '#db2777' : '#475569';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const rx = Math.cos(angle) * ruin.radius;
      const ry = Math.sin(angle) * ruin.radius;
      if (a === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Fortified Corner Pylons
    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(angle) * (ruin.radius * 0.85);
      const py = Math.sin(angle) * (ruin.radius * 0.85);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Central Tech Core Pedestal & Core
    if (ruin.hasCore) {
      // Magenta energy aura
      const pulse = Math.sin(ruin.pulse) * 0.2;
      const glowR = 28 * (1 + pulse);
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Spinning Tech Core Diamond
      ctx.save();
      ctx.rotate(ruin.pulse);
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Core glyph
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔮', 0, 0);
    } else {
      // Depleted socket
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DEPLETED', 0, 0);
    }

    // 5. Extraction progress ring
    if (ruin.beingHarvested && ruin.hasCore) {
      const prog = (ruin.harvestProgress || 0) / (ruin.maxHarvest || 100);
      ctx.beginPath();
      ctx.arc(0, 0, ruin.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Overhead Ruin Name & Core Status
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(ruin.name, ruin.x, ruin.y - ruin.radius - 16);

    ctx.font = 'bold 9.5px monospace';
    if (ruin.hasCore) {
      ctx.fillStyle = '#ec4899';
      ctx.fillText('🔮 TECH CORE ANOMALY', ruin.x, ruin.y - ruin.radius - 4);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('[CORE SECURED]', ruin.x, ruin.y - ruin.radius - 4);
    }
  }
}

