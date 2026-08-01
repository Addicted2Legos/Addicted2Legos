/**
 * STATE
 * A single mutable object holding the whole game world. Kept plain (no
 * classes) so it is trivial to inspect/serialize/debug.
 */
let nextEntityId = 1;
function makeId(prefix) {
  return `${prefix}_${nextEntityId++}`;
}

function createInitialState(mapData) {
  const state = {};
  resetState(state, mapData);
  return state;
}

/**
 * Resets a state object in place (used on restart). Kept separate from
 * createInitialState so callers who already hold a reference to `state`
 * (like the input handlers) keep working after a restart.
 */
function resetState(state, mapData) {
  const resources = {};
  Object.values(RESOURCES).forEach((r) => { resources[r.id] = r.start; });

  state.map = mapData;
  state.tileSize = state.tileSize || 64; // recalculated on resize
  state.resources = resources;
  state.buildings = [];
  state.units = [];
  state.enemies = [];
  state.projectiles = [];
  state.selectedUnitIds = [];
  state.placementMode = null;
  state.hoverTile = null;
  state.waveNumber = 0;
  state.nextWaveAt = WAVE_CONFIG.firstWaveDelay;
  state.gameOver = false;
  state.messages = [];
  state.elapsed = 0;

  // Starting supply depot on the home tile — workers drop resources off here.
  const home = mapData.homeTile;
  const storage = createBuilding('storage', home.col, home.row);
  storage.complete = true;
  storage.progress = 1;
  storage.hp = storage.maxHp;
  state.buildings.push(storage);

  // Starting worker + soldier, placed just below the depot.
  const spawnCol = home.col + storage.def.size.w / 2;
  const spawnRow = home.row + storage.def.size.h + 0.4;
  state.units.push(createUnit('worker', spawnCol - 0.6, spawnRow, state));

  // Starting soldier so the base isn't defenseless before the first wave.
  state.units.push(createUnit('soldier', spawnCol + 0.6, spawnRow, state));

  return state;
}

function tileWorldPos(col, row) {
  return { x: col + 0.5, y: row + 0.5 };
}

function createUnit(typeId, x, y, state) {
  const def = UNITS[typeId];
  return {
    id: makeId('u'),
    type: typeId,
    def,
    x, y,
    targetX: x, targetY: y,
    hp: def.hp,
    maxHp: def.hp,
    carrying: 0,
    carryType: null,
    job: null, // { kind: 'gather'|'deliver'|'move'|'attack', nodeId?, targetId?, buildingId?, resourceType? }
    idleAlerted: false,
    lastAttack: 0,
    facing: 1,
  };
}

function createEnemy(typeId, x, y) {
  const def = ENEMIES[typeId];
  return {
    id: makeId('e'),
    type: typeId,
    def,
    x, y,
    hp: def.hp,
    maxHp: def.hp,
    lastAttack: 0,
    targetId: null,
  };
}

function createBuilding(typeId, col, row) {
  const def = BUILDINGS[typeId];
  return {
    id: makeId('b'),
    type: typeId,
    def,
    col, row,
    hp: 1, // grows to full hp as construction completes
    maxHp: def.hp,
    complete: false,
    progress: 0, // 0..1
    buildStarted: performance.now(),
    productionQueue: 0, // number of units queued
    productionProgress: 0, // ms into current unit
  };
}

function pushMessage(state, text) {
  state.messages.push({ text, expires: state.elapsed + 2600 });
}

function canAfford(state, cost) {
  return Object.entries(cost).every(([res, amt]) => (state.resources[res] || 0) >= amt);
}

function pay(state, cost) {
  Object.entries(cost).forEach(([res, amt]) => { state.resources[res] -= amt; });
}
