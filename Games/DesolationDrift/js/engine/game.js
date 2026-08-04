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
  resolveSeparation(state.units);
  resolveSeparation(state.enemies);
  updateBuildings(dt, state, callbacks);
  updateTowerAttacks(state);
  updateProjectiles(dt, state);
  updateWaves(dt, state, callbacks);
  state.messages = state.messages.filter((m) => m.expires > state.elapsed);

  checkGameOver(state, callbacks);
}

// `neighbors` (optional) is the full same-group entity list (state.units or
// state.enemies) to steer around on the way to (tx, ty) — see
// avoidanceVector. Without it this is a plain straight-line seek.
function moveToward(entity, tx, ty, speed, dt, neighbors) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < ARRIVE_EPS) { entity.moving = false; return true; }

  let dirX = dx / dist;
  let dirY = dy / dist;
  if (neighbors) {
    const avoid = avoidanceVector(entity, neighbors);
    if (avoid) {
      dirX += avoid.x * 1.1;
      dirY += avoid.y * 1.1;
      const len = Math.hypot(dirX, dirY);
      if (len > 0.0001) { dirX /= len; dirY /= len; }
    }
  }

  const step = Math.min(dist, speed * dt);
  entity.x += dirX * step;
  entity.y += dirY * step;
  entity.facing = dirX >= 0 ? 1 : -1;
  entity.moving = true;
  return dist <= step;
}

// Steers an entity gently around nearby same-group neighbors it's about to
// walk into, instead of walking straight through them and relying on
// resolveSeparation to shove overlapping bodies apart after the fact — that
// after-the-move correction is what made units visibly fight each other and
// stall out when several wanted to pass the same way. Returns null when
// nothing nearby needs avoiding.
function avoidanceVector(entity, neighbors) {
  const myR = collisionRadiusOf(entity);
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const other = neighbors[i];
    if (other === entity) continue;
    const ox = entity.x - other.x;
    const oy = entity.y - other.y;
    const oDist = Math.hypot(ox, oy);
    const clearance = myR + collisionRadiusOf(other) + 0.2;
    if (oDist <= 0 || oDist >= clearance) continue;
    const strength = (clearance - oDist) / clearance;
    ax += (ox / oDist) * strength;
    ay += (oy / oDist) * strength;
  }
  const len = Math.hypot(ax, ay);
  if (len < 0.0001) return null;
  return { x: ax / len, y: ay / len };
}

// Roughly matches each unit type's drawn footprint (render.js scales a base
// 0.24-tile radius by the same multipliers when picking sprite size) — used
// only for keeping bodies apart, not for gameplay math like range/damage.
const UNIT_COLLISION_RADIUS = {
  worker: 0.36, soldier: 0.288, laserRover: 0.408, frostTrike: 0.288,
};
function collisionRadiusOf(entity) {
  return (entity.def && UNIT_COLLISION_RADIUS[entity.def.id]) || 0.24;
}

// A spot on a ring of the given radius around `target`, at an angle picked
// from the unit's stable position within `squad` — so everyone in the squad
// gets a distinct spot spread around the target instead of converging on
// one point. Shared by combat formation and delivery queueing below.
function ringSlot(squad, unit, target, radius) {
  const ids = squad.map((u) => u.id).sort();
  const idx = Math.max(0, ids.indexOf(unit.id));
  const count = ids.length || 1;
  const angle = (idx / count) * Math.PI * 2 + 0.4;
  return { x: target.x + Math.cos(angle) * radius, y: target.y + Math.sin(angle) * radius };
}

// Where a unit should stand to attack `target`: on a ring at its own attack
// range (so melee units crowd in close while ranged units hang back — a
// "second row" falls out of that naturally).
function formationSlot(squad, unit, target) {
  const radius = Math.max(collisionRadiusOf(unit) + 0.15, unit.def.range * 0.88);
  return ringSlot(squad, unit, target, radius);
}

// Stable creation-order key (older units first) — used to decide who's
// "next in line" at a busy drop-off point without the pick flickering
// between units frame to frame the way sorting by live distance would.
function unitOrderKey(u) {
  const n = parseInt(String(u.id).split('_')[1], 10);
  return Number.isNaN(n) ? 0 : n;
}

const DELIVERY_HOLD_RADIUS = 0.65; // tiles — how far back waiting workers queue from the door

// Any of the building's four sides works as a drop-off — pick whichever
// side's midpoint is nearest to the worker when the trip starts, so
// deliveries arrive from all around the vault instead of funneling to one
// fixed spot behind it.
function pickDropoffPoint(building, fromX, fromY) {
  const { col, row, def } = building;
  const w = def.size.w;
  const h = def.size.h;
  const cx = col + w / 2;
  const cy = row + h / 2;
  const margin = 0.25;
  const sides = [
    { x: cx, y: row - margin },
    { x: cx, y: row + h + margin },
    { x: col - margin, y: cy },
    { x: col + w + margin, y: cy },
  ];
  let best = sides[0];
  let bestDist = Infinity;
  sides.forEach((s) => {
    const d = Math.hypot(s.x - fromX, s.y - fromY);
    if (d < bestDist) { bestDist = d; best = s; }
  });
  return best;
}

// Nudges apart any two same-group entities (units-vs-units, enemies-vs-
// enemies) standing closer than their combined body size allows, so bodies
// stop visibly overlapping. O(n^2) but n is small (tens, not hundreds).
function resolveSeparation(entities) {
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      const minDist = (collisionRadiusOf(a) + collisionRadiusOf(b)) * 1.05;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= minDist) continue;
      if (dist < 0.0001) {
        a.x -= 0.01; b.x += 0.01;
        continue;
      }
      const push = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
    }
  }
}

function updateUnits(dt, state, callbacks) {
  state.units.forEach((u) => {
    if (!u.job && u.def.damage) {
      const nearestEnemy = findNearestEnemyInRange(u, state, AGGRO_RANGE);
      if (nearestEnemy) u.job = { kind: 'attack', targetId: nearestEnemy.id };
    }
  });

  // Squads of units currently attacking the same enemy, precomputed once so
  // formationSlot doesn't have to re-scan every unit for every attacker.
  const squadsByTarget = new Map();
  // Same idea for workers converging on the same drop-off point — grouped
  // by each job's already-resolved (tx, ty), which is only ever assigned
  // once per trip (see the 'deliver' branch below), so this reflects last
  // frame's stable groups even though a unit starting a delivery THIS frame
  // hasn't picked its point yet (it'll show up here starting next frame).
  const deliverGroupsByPoint = new Map();
  state.units.forEach((u) => {
    if (u.job && u.job.kind === 'attack') {
      if (!squadsByTarget.has(u.job.targetId)) squadsByTarget.set(u.job.targetId, []);
      squadsByTarget.get(u.job.targetId).push(u);
    } else if (u.job && u.job.kind === 'deliver' && u.job.tx !== undefined) {
      const key = `${u.job.tx.toFixed(1)}_${u.job.ty.toFixed(1)}`;
      if (!deliverGroupsByPoint.has(key)) deliverGroupsByPoint.set(key, []);
      deliverGroupsByPoint.get(key).push(u);
    }
  });

  state.units.forEach((u) => {
    if (!u.job) return;

    if (u.job.kind === 'move') {
      const arrived = moveToward(u, u.targetX, u.targetY, u.def.speed, dt, state.units);
      if (arrived) u.job = null;
      return;
    }

    if (u.job.kind === 'gather') {
      const node = state.map.nodes.find((n) => n.id === u.job.nodeId);
      const resourceType = u.job.resourceType || (node && node.type);
      if (!node || node.amount <= 0) { retryGatherOrIdle(u, state, resourceType); return; }
      const tx = node.col + 0.5;
      const ty = node.row + 0.5;
      const arrived = moveToward(u, tx, ty, u.def.speed, dt, state.units);
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

      // Pick (once per trip) whichever side of the building is nearest —
      // resets if a mid-trip building swap sends the worker somewhere else.
      if (u.job.buildingId !== building.id || u.job.tx === undefined) {
        const spot = pickDropoffPoint(building, u.x, u.y);
        u.job.buildingId = building.id;
        u.job.tx = spot.x;
        u.job.ty = spot.y;
      }

      // If someone else is already headed for this exact spot, only the
      // longest-waiting one goes all the way in — everyone else backs off
      // to a holding ring and takes their turn once the door clears.
      const key = `${u.job.tx.toFixed(1)}_${u.job.ty.toFixed(1)}`;
      const queue = deliverGroupsByPoint.get(key) || [u];
      const inLine = [...queue].sort((a, b) => unitOrderKey(a) - unitOrderKey(b));
      const isActive = inLine[0] === u || inLine.length <= 1;

      let tx = u.job.tx;
      let ty = u.job.ty;
      if (!isActive) {
        const waiters = inLine.slice(1);
        const slot = ringSlot(waiters, u, { x: u.job.tx, y: u.job.ty }, DELIVERY_HOLD_RADIUS);
        tx = slot.x; ty = slot.y;
      }

      const arrived = moveToward(u, tx, ty, u.def.speed, dt, state.units);
      if (arrived && isActive) {
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
        const squad = squadsByTarget.get(u.job.targetId) || [u];
        const slot = formationSlot(squad, u, target);
        moveToward(u, slot.x, slot.y, u.def.speed, dt, state.units);
      } else if (state.elapsed - u.lastAttack >= u.def.attackInterval) {
        u.lastAttack = state.elapsed;
        target.hp -= u.def.damage;
        state.projectiles.push(makeTracer(u, target, u.def.projectileColor || '#8fe8ff', u.def.projectileKind));
        if (u.def.freezeMs) target.frozenUntil = state.elapsed + u.def.freezeMs;
        if (target.hp <= 0) {
          state.enemies = state.enemies.filter((e) => e.id !== target.id);
          u.job = null;
        }
      }
    }
  });
}

function updateEnemies(dt, state, callbacks) {
  // Precompute every live enemy's current target once, then group them by
  // target so formationSlot can spread enemies attacking the same thing
  // around it instead of letting them all pile onto the same point.
  const targets = new Map();
  const squadsByRef = new Map();
  state.enemies.forEach((e) => {
    if (e.frozenUntil > state.elapsed) return;
    const target = pickEnemyTarget(e, state);
    if (!target) return;
    targets.set(e.id, target);
    if (!squadsByRef.has(target.ref)) squadsByRef.set(target.ref, []);
    squadsByRef.get(target.ref).push(e);
  });

  state.enemies.forEach((e) => {
    if (e.frozenUntil > state.elapsed) return; // frozen: can't move or attack
    const target = targets.get(e.id);
    if (!target) return; // nothing left to attack, just idle
    const { x: tx, y: ty, ref } = target;
    const dist = Math.hypot(tx - e.x, ty - e.y);
    if (dist > e.def.range) {
      const squad = squadsByRef.get(ref) || [e];
      const slot = formationSlot(squad, e, target);
      moveToward(e, slot.x, slot.y, e.def.speed, dt, state.enemies);
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

function makeTracer(from, to, color, kind) {
  return {
    x1: from.x, y1: from.y, x2: to.x, y2: to.y, color, born: performance.now(), kind: kind || 'bolt',
  };
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

// Static defenses (buildings with an `attack` def, e.g. the arrow tower):
// each complete one independently picks the nearest enemy in range and
// fires on its own interval, same shape as a unit's 'attack' job but with
// no movement — a tower never chases.
function updateTowerAttacks(state) {
  state.buildings.forEach((b) => {
    const atk = b.def.attack;
    if (!atk || !b.complete) return;
    const origin = { x: b.col + b.def.size.w / 2, y: b.row + b.def.size.h / 2 };
    const target = findNearestEnemyInRange(origin, state, atk.range);
    if (!target) return;
    if (state.elapsed - b.lastAttack < atk.attackInterval) return;
    b.lastAttack = state.elapsed;
    target.hp -= atk.damage;
    state.projectiles.push(makeTracer(origin, target, '#d9a55c', 'arrow'));
    if (target.hp <= 0) {
      state.enemies = state.enemies.filter((e) => e.id !== target.id);
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
