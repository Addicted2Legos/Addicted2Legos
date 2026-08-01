/**
 * GAME
 * The update loop. render.js just draws whatever this produces; input.js
 * just sets `job`/`placementMode` fields — all the actual simulation
 * happens here so it's one place to read to understand game rules.
 */
const AGGRO_RANGE = 3.2; // tiles - how far an enemy will detour to hit a soldier
const ARRIVE_EPS = 0.06;

function update(dt, state, callbacks) {
  if (state.gameOver) return;
  state.elapsed += dt * 1000;

  updateUnits(dt, state, callbacks);
  updateEnemies(dt, state, callbacks);
  updateBuildings(dt, state, callbacks);
  updateProjectiles(dt, state);
  updateWaves(dt, state, callbacks);
  state.messages = state.messages.filter((m) => m.expires > state.elapsed);

  checkGameOver(state, callbacks);
}

function moveToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < ARRIVE_EPS) return true;
  const step = Math.min(dist, speed * dt);
  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
  entity.facing = dx >= 0 ? 1 : -1;
  return dist <= step;
}

function updateUnits(dt, state, callbacks) {
  state.units.forEach((u) => {
    if (!u.job && u.def.damage) {
      const nearestEnemy = findNearestEnemyInRange(u, state, AGGRO_RANGE);
      if (nearestEnemy) u.job = { kind: 'attack', targetId: nearestEnemy.id };
    }
    if (!u.job) return;

    if (u.job.kind === 'move') {
      const arrived = moveToward(u, u.targetX, u.targetY, u.def.speed, dt);
      if (arrived) u.job = null;
      return;
    }

    if (u.job.kind === 'gather') {
      const node = state.map.nodes.find((n) => n.id === u.job.nodeId);
      const resourceType = u.job.resourceType || (node && node.type);
      if (!node || node.amount <= 0) { retryGatherOrIdle(u, state, resourceType); return; }
      const tx = node.col + 0.5;
      const ty = node.row + 0.5;
      const arrived = moveToward(u, tx, ty, u.def.speed, dt);
      if (arrived) {
        const capacityLeft = u.def.carryCapacity - u.carrying;
        const amt = Math.min(u.def.gatherRate * dt, node.amount, capacityLeft);
        node.amount -= amt;
        u.carrying += amt;
        u.carryType = node.type;
        if (node.amount <= 0) pushMessage(state, `${RESOURCES[node.type].name} node depleted`);
        if (u.carrying >= u.def.carryCapacity - 0.0001 || node.amount <= 0) {
          const depot = findNearestStorage(state, u);
          if (depot) {
            u.job = { kind: 'deliver', buildingId: depot.id, resourceType: node.type };
          } else {
            u.job = null;
            alertIdle(u, state, 'no supply depot to deliver to');
          }
        }
      }
      return;
    }

    if (u.job.kind === 'deliver') {
      let building = state.buildings.find((b) => b.id === u.job.buildingId && b.complete);
      if (!building) building = findNearestStorage(state, u);
      if (!building) { u.job = null; alertIdle(u, state, 'no supply depot to deliver to'); return; }
      const tx = building.col + building.def.size.w / 2;
      const ty = building.row + building.def.size.h + 0.2;
      const arrived = moveToward(u, tx, ty, u.def.speed, dt);
      if (arrived) {
        const resourceType = u.carryType || u.job.resourceType;
        if (u.carrying > 0) {
          state.resources[u.carryType] += u.carrying;
          u.carrying = 0;
        }
        u.carryType = null;
        retryGatherOrIdle(u, state, resourceType);
      }
      return;
    }

    if (u.job.kind === 'attack') {
      const target = state.enemies.find((e) => e.id === u.job.targetId);
      if (!target) { u.job = null; return; }
      const dist = Math.hypot(target.x - u.x, target.y - u.y);
      if (dist > u.def.range) {
        moveToward(u, target.x, target.y, u.def.speed, dt);
      } else if (state.elapsed - u.lastAttack >= u.def.attackInterval) {
        u.lastAttack = state.elapsed;
        target.hp -= u.def.damage;
        state.projectiles.push(makeTracer(u, target, '#8fe8ff'));
        if (target.hp <= 0) {
          state.enemies = state.enemies.filter((e) => e.id !== target.id);
          u.job = null;
        }
      }
    }
  });
}

function updateEnemies(dt, state, callbacks) {
  state.enemies.forEach((e) => {
    const target = pickEnemyTarget(e, state);
    if (!target) return; // nothing left to attack, just idle
    const { x: tx, y: ty, ref } = target;
    const dist = Math.hypot(tx - e.x, ty - e.y);
    if (dist > e.def.range) {
      moveToward(e, tx, ty, e.def.speed, dt);
    } else if (state.elapsed - e.lastAttack >= e.def.attackInterval) {
      e.lastAttack = state.elapsed;
      ref.hp -= e.def.damage;
      state.projectiles.push(makeTracer(e, { x: tx, y: ty }, '#ff6b6b'));
      if (ref.hp <= 0) removeDeadTarget(state, ref, callbacks);
    }
  });
  state.enemies = state.enemies.filter((e) => e.hp > 0);
}

function findNearestEnemyInRange(u, state, range) {
  let nearest = null;
  let nearestDist = Infinity;
  state.enemies.forEach((e) => {
    const d = Math.hypot(e.x - u.x, e.y - u.y);
    if (d <= range && d < nearestDist) { nearestDist = d; nearest = e; }
  });
  return nearest;
}

function findNearestStorage(state, u) {
  let nearest = null;
  let nearestDist = Infinity;
  state.buildings.forEach((b) => {
    if (b.type !== 'storage' || !b.complete) return;
    const cx = b.col + b.def.size.w / 2;
    const cy = b.row + b.def.size.h / 2;
    const d = Math.hypot(cx - u.x, cy - u.y);
    if (d < nearestDist) { nearestDist = d; nearest = b; }
  });
  return nearest;
}

function findNearestNodeOfType(state, u, resourceType) {
  let nearest = null;
  let nearestDist = Infinity;
  state.map.nodes.forEach((n) => {
    if (n.type !== resourceType || n.amount <= 0) return;
    const d = Math.hypot(n.col + 0.5 - u.x, n.row + 0.5 - u.y);
    if (d < nearestDist) { nearestDist = d; nearest = n; }
  });
  return nearest;
}

// After a delivery (or losing the current node), send the worker back out
// to gather more of the same resource type, or park it idle with a subtle
// alert if nothing of that type is left to gather.
function retryGatherOrIdle(u, state, resourceType) {
  const node = resourceType ? findNearestNodeOfType(state, u, resourceType) : null;
  if (node) {
    u.job = { kind: 'gather', nodeId: node.id, resourceType };
    u.idleAlerted = false;
  } else {
    u.job = null;
    alertIdle(u, state, `no ${resourceType ? RESOURCES[resourceType].name.toLowerCase() : 'resources'} left nearby`);
  }
}

function alertIdle(u, state, reason) {
  if (u.idleAlerted) return;
  u.idleAlerted = true;
  pushMessage(state, `${u.def.name} is idle — ${reason}`);
}

function pickEnemyTarget(e, state) {
  let nearestSoldier = null;
  let nearestSoldierDist = Infinity;
  state.units.forEach((u) => {
    if (!u.def.damage) return;
    const d = Math.hypot(u.x - e.x, u.y - e.y);
    if (d < nearestSoldierDist) { nearestSoldierDist = d; nearestSoldier = u; }
  });
  if (nearestSoldier && nearestSoldierDist <= AGGRO_RANGE) {
    return { x: nearestSoldier.x, y: nearestSoldier.y, ref: nearestSoldier, kind: 'unit' };
  }

  let nearestBuilding = null;
  let nearestBuildingDist = Infinity;
  state.buildings.forEach((b) => {
    if (!b.complete) return;
    const cx = b.col + b.def.size.w / 2;
    const cy = b.row + b.def.size.h / 2;
    const d = Math.hypot(cx - e.x, cy - e.y);
    if (d < nearestBuildingDist) { nearestBuildingDist = d; nearestBuilding = b; }
  });
  if (nearestBuilding) {
    return {
      x: nearestBuilding.col + nearestBuilding.def.size.w / 2,
      y: nearestBuilding.row + nearestBuilding.def.size.h / 2,
      ref: nearestBuilding,
      kind: 'building',
    };
  }

  let nearestUnit = null;
  let nearestUnitDist = Infinity;
  state.units.forEach((u) => {
    const d = Math.hypot(u.x - e.x, u.y - e.y);
    if (d < nearestUnitDist) { nearestUnitDist = d; nearestUnit = u; }
  });
  if (nearestUnit) return { x: nearestUnit.x, y: nearestUnit.y, ref: nearestUnit, kind: 'unit' };
  return null;
}

function removeDeadTarget(state, ref, callbacks) {
  if (state.units.includes(ref)) {
    state.units = state.units.filter((u) => u !== ref);
    state.selectedUnitIds = state.selectedUnitIds.filter((id) => id !== ref.id);
    pushMessage(state, `A ${ref.def.name} was lost`);
  } else if (state.buildings.includes(ref)) {
    state.buildings = state.buildings.filter((b) => b !== ref);
    pushMessage(state, `${ref.def.name} was destroyed!`);
  }
  if (callbacks && callbacks.onStateChanged) callbacks.onStateChanged();
}

function makeTracer(from, to, color) {
  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y, color, born: performance.now() };
}

function updateProjectiles(dt, state) {
  const now = performance.now();
  state.projectiles = state.projectiles.filter((p) => now - p.born < 120);
}

function updateBuildings(dt, state, callbacks) {
  state.buildings.forEach((b) => {
    if (!b.complete) {
      const elapsedMs = performance.now() - b.buildStarted;
      b.progress = Math.min(1, elapsedMs / b.def.buildTime);
      b.hp = Math.max(1, Math.round(b.maxHp * b.progress));
      if (b.progress >= 1) {
        b.complete = true;
        b.hp = b.maxHp;
        pushMessage(state, `${b.def.name} online`);
        if (callbacks && callbacks.onStateChanged) callbacks.onStateChanged();
      }
      return;
    }
    if (b.productionQueue > 0) {
      b.productionProgress += dt * 1000;
      const unitDef = UNITS[b.def.produces];
      if (b.productionProgress >= unitDef.buildTime) {
        b.productionProgress = 0;
        b.productionQueue -= 1;
        spawnUnitNear(state, b, b.def.produces);
        if (callbacks && callbacks.onStateChanged) callbacks.onStateChanged();
      }
    }
  });
}

function spawnUnitNear(state, building, unitType) {
  const spawnCol = building.col + building.def.size.w / 2;
  const spawnRow = building.row + building.def.size.h + 0.3;
  const jitter = (Math.random() - 0.5) * 0.6;
  const unit = createUnit(unitType, spawnCol + jitter, spawnRow, state);
  state.units.push(unit);
  pushMessage(state, `${unit.def.name} ready`);
}

function updateWaves(dt, state, callbacks) {
  if (state.elapsed < state.nextWaveAt) return;
  state.waveNumber += 1;
  const count = WAVE_CONFIG.baseEnemyCount + (state.waveNumber - 1) * WAVE_CONFIG.enemyCountGrowth;
  for (let i = 0; i < count; i++) {
    const sp = state.map.spawnPoints[Math.floor(Math.random() * state.map.spawnPoints.length)];
    const typeId = WAVE_CONFIG.enemyPool[Math.floor(Math.random() * WAVE_CONFIG.enemyPool.length)];
    const jx = (Math.random() - 0.5) * 0.8;
    const jy = (Math.random() - 0.5) * 0.8;
    state.enemies.push(createEnemy(typeId, sp.col + 0.5 + jx, sp.row + 0.5 + jy));
  }
  pushMessage(state, `Wave ${state.waveNumber} incoming!`);
  state.nextWaveAt = state.elapsed + WAVE_CONFIG.waveInterval;
  if (callbacks && callbacks.onWave) callbacks.onWave(state.waveNumber);
}

function checkGameOver(state, callbacks) {
  if (state.units.length === 0 && state.buildings.length === 0) {
    state.gameOver = true;
    if (callbacks && callbacks.onGameOver) callbacks.onGameOver(false);
  }
}

/** Building / training actions, called from UI handlers in main.js */
function startPlacement(state, buildingId) {
  const def = BUILDINGS[buildingId];
  if (!canAfford(state, def.cost)) return { ok: false, reason: 'Not enough resources' };
  if (def.requires && !state.buildings.some((b) => b.type === def.requires && b.complete)) {
    return { ok: false, reason: `Requires ${BUILDINGS[def.requires].name}` };
  }
  state.placementMode = buildingId;
  return { ok: true };
}

function confirmPlacement(state, col, row) {
  const def = BUILDINGS[state.placementMode];
  if (!isPlacementValid(state, def, col, row)) return { ok: false, reason: 'Cannot build there' };
  if (!canAfford(state, def.cost)) return { ok: false, reason: 'Not enough resources' };
  pay(state, def.cost);
  state.buildings.push(createBuilding(state.placementMode, col, row));
  pushMessage(state, `Construction started: ${def.name}`);
  state.placementMode = null;
  state.hoverTile = null;
  return { ok: true };
}

function cancelPlacement(state) {
  state.placementMode = null;
  state.hoverTile = null;
}

function queueTraining(state, building) {
  if (!building.complete) return { ok: false, reason: 'Still under construction' };
  const unitDef = UNITS[building.def.produces];
  if (!canAfford(state, unitDef.cost)) return { ok: false, reason: 'Not enough resources' };
  pay(state, unitDef.cost);
  building.productionQueue += 1;
  return { ok: true };
}
