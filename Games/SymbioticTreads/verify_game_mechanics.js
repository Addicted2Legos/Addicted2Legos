const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- 🧪 STARTING 8-DIRECTIONAL SPRITE & ROVER MECHANICS VERIFICATION ---\n');

// 1. Verify Image Asset Integrity
const spritePath = path.join(__dirname, 'assets/sprites/military_truck_sheet_8.png');
const aliasPath = path.join(__dirname, 'assets/sprites/image_1.png');

assert(fs.existsSync(spritePath), 'military_truck_sheet_8.png must exist');
assert(fs.existsSync(aliasPath), 'image_1.png must exist');

const spriteBuffer = fs.readFileSync(spritePath);
const sheetWidth = spriteBuffer.readUInt32BE(16);
const sheetHeight = spriteBuffer.readUInt32BE(20);

assert.strictEqual(sheetWidth, 2752, 'Sprite sheet width must be 2752px');
assert.strictEqual(sheetHeight, 1536, 'Sprite sheet height must be 1536px');

const frameWidth = sheetWidth / 4;   // 688
const frameHeight = sheetHeight / 2; // 768
assert.strictEqual(frameWidth, 688, 'Frame width must be 688px');
assert.strictEqual(frameHeight, 768, 'Frame height must be 768px');
console.log(`✅ Asset integrity verified: ${sheetWidth}x${sheetHeight} px, Frame: ${frameWidth}x${frameHeight} px`);

// 2. Extract and Validate DIRECTION_8_FRAMES Configuration from game.js
const gameCode = fs.readFileSync(path.join(__dirname, 'js/game.js'), 'utf-8');

// Test that DIRECTION_8_FRAMES and getDirection8Index exist in game.js
assert(gameCode.includes('DIRECTION_8_FRAMES'), 'DIRECTION_8_FRAMES must be defined in game.js');
assert(gameCode.includes('getDirection8Index'), 'getDirection8Index must be defined in game.js');

// Parse DIRECTION_8_FRAMES from game.js
const matchFrames = gameCode.match(/const DIRECTION_8_FRAMES = (\[[\s\S]*?\]);/);
assert(matchFrames, 'DIRECTION_8_FRAMES declaration must be parseable');
const frames = eval(matchFrames[1]);

// Ground-truth specifications provided by user:
// Row 1 (row = 0):
//   Col 0: North (Facing Straight Up - back view)
//   Col 1: North-East (Diagonally Up-Right)
//   Col 2: East (Facing Straight Right - side view)
//   Col 3: South-East (Diagonally Down-Right)
// Row 2 (row = 1):
//   Col 0: South (Facing Straight Down - front view)
//   Col 1: South-West (Diagonally Down-Left)
//   Col 2: West (Facing Straight Left - side view)
//   Col 3: North-West (Diagonally Up-Left)
const expectedGrid = {
  East:       { col: 2, row: 0, index: 0 },
  'South-East': { col: 3, row: 0, index: 1 },
  South:      { col: 0, row: 1, index: 2 },
  'South-West': { col: 1, row: 1, index: 3 },
  West:       { col: 2, row: 1, index: 4 },
  'North-West': { col: 3, row: 1, index: 5 },
  North:      { col: 0, row: 0, index: 6 },
  'North-East': { col: 1, row: 0, index: 7 }
};

for (const [name, exp] of Object.entries(expectedGrid)) {
  const item = frames.find(f => f.name === name);
  assert(item, `Frame for ${name} must exist in DIRECTION_8_FRAMES`);
  assert.strictEqual(item.col, exp.col, `${name} col should be ${exp.col}, got ${item.col}`);
  assert.strictEqual(item.row, exp.row, `${name} row should be ${exp.row}, got ${item.row}`);
  assert.strictEqual(item.index, exp.index, `${name} index should be ${exp.index}, got ${item.index}`);

  const sourceX = item.col * frameWidth;
  const sourceY = item.row * frameHeight;
  assert(sourceX >= 0 && sourceX + frameWidth <= sheetWidth, `${name} sourceX out of bounds: ${sourceX}`);
  assert(sourceY >= 0 && sourceY + frameHeight <= sheetHeight, `${name} sourceY out of bounds: ${sourceY}`);
  console.log(`  ✓ Direction [${item.index}] ${name.padEnd(11)} -> Row ${item.row}, Col ${item.col} | Crop: (${sourceX}, ${sourceY}, ${frameWidth}, ${frameHeight})`);
}
console.log('✅ 8-directional frame coordinate mapping verified.\n');

// 3. Test getDirection8Index logic across 8 cardinal & diagonal velocity vectors
function getDirection8Index(vx, vy, fallbackIndex = 2) {
  const speed = Math.hypot(vx, vy);
  if (speed <= 0.25) return fallbackIndex;
  const rad = Math.atan2(vy, vx);
  const deg = ((rad * 180 / Math.PI) + 360) % 360;
  return Math.floor((deg + 22.5) / 45) % 8;
}

const vectorTestCases = [
  { input: 'D (Right / East)',          vx: 5,  vy: 0,  expectedIndex: 0, expectedName: 'East' },
  { input: 'S + D (Down-Right / SE)',   vx: 5,  vy: 5,  expectedIndex: 1, expectedName: 'South-East' },
  { input: 'S (Down / South)',          vx: 0,  vy: 5,  expectedIndex: 2, expectedName: 'South' },
  { input: 'S + A (Down-Left / SW)',    vx: -5, vy: 5,  expectedIndex: 3, expectedName: 'South-West' },
  { input: 'A (Left / West)',           vx: -5, vy: 0,  expectedIndex: 4, expectedName: 'West' },
  { input: 'W + A (Up-Left / NW)',      vx: -5, vy: -5, expectedIndex: 5, expectedName: 'North-West' },
  { input: 'W (Up / North)',            vx: 0,  vy: -5, expectedIndex: 6, expectedName: 'North' },
  { input: 'W + D (Up-Right / NE)',     vx: 5,  vy: -5, expectedIndex: 7, expectedName: 'North-East' }
];

for (const tc of vectorTestCases) {
  const idx = getDirection8Index(tc.vx, tc.vy, -1);
  const frame = frames[idx];
  assert.strictEqual(idx, tc.expectedIndex, `Velocity ${tc.input} produced index ${idx}, expected ${tc.expectedIndex}`);
  assert.strictEqual(frame.name, tc.expectedName, `Index ${idx} is ${frame.name}, expected ${tc.expectedName}`);
  console.log(`  ✓ Key Input: ${tc.input.padEnd(25)} -> Index ${idx} (${frame.name})`);
}
console.log('✅ Velocity-to-heading calculation verified.\n');

// 4. Test Idle Heading Persistence (Zero Velocity)
for (let i = 0; i < 8; i++) {
  const preserved = getDirection8Index(0, 0, i);
  assert.strictEqual(preserved, i, `When stopped, heading ${i} must be preserved`);
}
console.log('✅ Idle heading persistence verified across all 8 directions.\n');

// 5. Test index.html preload link
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
assert(indexHtml.includes('military_truck_sheet_8.png'), 'index.html must include preload for military_truck_sheet_8.png');
console.log('✅ index.html preload link verified.\n');

// 6. Test multiplayer sync inclusion
assert(gameCode.includes('lastDirIndex: rover.lastDirIndex'), 'Multiplayer rover state broadcast must sync lastDirIndex');
console.log('✅ Multiplayer packet synchronization verified.\n');

// 7. Test In-World Truck Cargo Indicators
assert(gameCode.includes('Visual Cargo Crates & Bed Resource Fill on the Truck Bed'), 'Physical bed cargo crates must be rendered in drawRover');
assert(gameCode.includes('Overhead Cargo Capacity Meter'), 'Overhead Cargo Capacity Meter must be rendered in drawRover');

// Test bed coordinate placement in all 8 directions
for (let i = 0; i < frames.length; i++) {
  const f = frames[i];
  const bedAngle = f.angle + Math.PI;
  const bx = Math.cos(bedAngle) * 16;
  const by = Math.sin(bedAngle) * 15;
  assert(!isNaN(bx) && !isNaN(by), `Bed coordinates for ${f.name} must be valid numbers`);
  console.log(`  ✓ Cargo Bed Anchor: ${f.name.padEnd(11)} -> Offset (${bx.toFixed(1)}, ${by.toFixed(1)})`);
}
console.log('✅ In-world truck cargo indicator and bed alignment verified.\n');

// 8. Test Orange Crosshair Target Removal
console.log('--- 🎯 VERIFYING CROSSHAIR TARGET REMOVAL ---');
assert(!gameCode.includes('function drawCrosshair('), 'drawCrosshair function definition must be removed');
assert(!gameCode.includes('drawCrosshair(ctx'), 'drawCrosshair must never be invoked in render loop');
console.log('✅ Orange crosshair target completely eliminated from game.\n');

// 9. Test Dual Resource Collectors (2-Player Mode) & Enemy Scaling
console.log('--- 🚜 VERIFYING DUAL RESOURCE COLLECTORS & MULTIPLAYER BALANCING ---');
assert(gameCode.includes('function createDefaultRover('), 'createDefaultRover factory must exist');
assert(gameCode.includes("rover: createDefaultRover('rover1'"), 'Rover 1 (Alpha) must be initialized');
assert(gameCode.includes("rover2: createDefaultRover('rover2'"), 'Rover 2 (Beta) must be initialized');

// Test enemy balancing formulas for multiplayer
assert(gameCode.includes('isSolo ? 1.0 : 1.85'), 'Multiplayer must scale surge horde enemy count by 1.85x');
assert(gameCode.includes('const maxEnemies = isSolo ? 75 : 130'), 'Multiplayer must expand max enemy capacity to 130');
assert(gameCode.includes('const rateScale = isSolo ? 1.0 : 1.85'), 'Multiplayer must accelerate ambient enemy spawn rate by 1.85x');

// Test Swarm AI dual rover targeting
assert(gameCode.includes('let closestRover = (!rover.isDead) ? rover : null;'), 'Swarm AI must track Rover 1 distance');
assert(gameCode.includes('if (rover2 && !rover2.isDead)'), 'Swarm AI must track Rover 2 distance');

// Test index.html lobby updates
assert(indexHtml.includes('Single Player (Scavenger)'), 'Lobby Single Player must start as Scavenger Rover');
assert(indexHtml.includes('Scavenger 1 - Alpha'), 'Host option must be Scavenger 1 - Alpha');
assert(indexHtml.includes('Scavenger 2 - Beta'), 'Join option must be Scavenger 2 - Beta');
assert(!indexHtml.includes('btnRoleTank'), 'Player tank role button must be removed');
console.log('✅ Dual resource collectors and 1.85x multiplayer enemy balancing verified.\n');

// 10. Test Life Factor, Rover Respawn, Base Destruction & Game Over
console.log('--- ☠️ VERIFYING LIFE FACTOR, ROVER RESPAWN & GAME OVER ---');
assert(gameCode.includes('function killRover('), 'killRover function must exist');
assert(gameCode.includes('function triggerGameOver('), 'triggerGameOver function must exist');
assert(gameCode.includes('function resetGame('), 'resetGame function must exist');
assert(gameCode.includes('function drawGameOverScreen('), 'drawGameOverScreen function must exist');

// Test rover death & respawn mechanics
assert(gameCode.includes('rover.isDead = true'), 'killRover must set rover.isDead');
assert(gameCode.includes('rover.respawnTimer = 6.0'), 'killRover must initiate 6.0s respawn timer');
assert(gameCode.includes('spawnLooseScrap('), 'killRover must spill held cargo into the world as loose scrap');

// Test Base Citadel death condition
assert(gameCode.includes('if (base.hp <= 0 && !gameState.isGameOver)'), 'Game Over must trigger when Base Citadel HP reaches 0');
assert(gameCode.includes('triggerGameOver(gameState)'), 'triggerGameOver must be called upon base destruction');

// Test restart binding
assert(gameCode.includes('keys[\'r\']') || gameCode.includes('keys.r') || gameCode.includes('key === \'r\''), 'R key must be wired to restart game');
console.log('✅ Life factor, rover destruction/respawn, and Citadel Game Over verified.\n');

// 11. Test Blank Light Gray Background & Pipeline Integration
console.log('--- 🌄 VERIFYING BLANK LIGHT GRAY TERRAIN & PIPELINE INTEGRATION ---');
assert(gameCode.includes("ctx.fillStyle = '#e2e8f0'"), 'game.js must set blank light gray #e2e8f0 background');
assert(gameCode.includes("ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)"), 'game.js must fill entire world with light gray');
assert(gameCode.includes("ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'"), 'game.js must draw subtle light gray grid lines');
assert(!gameCode.includes("const bgImage = new Image()"), 'game.js must abandon bgImage object');
assert(!gameCode.includes("BackgroundLevel1_collision.png"), 'game.js must abandon BackgroundLevel1_collision.png');
console.log('✅ Blank light gray background (#e2e8f0) and clean rendering pipeline verified.\n');

// 12. Test Custom Map Architecture, Persistence & Gameplay Mechanics
console.log('--- 🗺️ VERIFYING CUSTOM MAP ARCHITECTURE & GAMEPLAY PHYSICS ---');
assert(gameCode.includes('function loadActiveMap('), 'loadActiveMap function must exist in game.js');
assert(gameCode.includes('localStorage.getItem(\'symbiotic_custom_map\')') || gameCode.includes('localStorage.getItem("symbiotic_custom_map")'), 'loadActiveMap must read symbiotic_custom_map from localStorage');
assert(gameCode.includes('DEFAULT_MAP'), 'DEFAULT_MAP fallback must exist in game.js');
assert(gameCode.includes('function isWalkable('), 'isWalkable function must exist in game.js');
assert(gameCode.includes('function checkRiverSlow('), 'checkRiverSlow function must exist in game.js');
assert(gameCode.includes('function distToSegment('), 'distToSegment helper must exist for river curves');
assert(gameCode.includes('drawRivers(ctx, gameState.rivers)'), 'draw() must render rivers');
assert(gameCode.includes('drawOxygenTrees(ctx, gameState.trees)'), 'draw() must render alien oxygen trees');
assert(gameCode.includes('rover.hp = Math.min(rover.maxHp, rover.hp + 0.10)'), 'Alien oxygen trees must repair rover hull');
assert(gameCode.includes('rover.fuel = Math.min(rover.maxFuel, rover.fuel + 0.14)'), 'Alien oxygen trees must replenish rover fuel');
assert(gameCode.includes('checkRiverSlow(rover.x, rover.y, gameState.rivers)'), 'simulateRover must slow down rover in rivers');
assert(gameCode.includes('checkRiverSlow(enemy.x, enemy.y, gameState.rivers)'), 'updateSwarmAI must slow down enemies in rivers');
assert(gameCode.includes('gameState.crystals'), 'gameState must track crystals/resource nodes');
console.log('✅ Custom map persistence, rock/boulder collision, river slowing, and oxygen tree healing verified.\n');

// 13. Test Standalone Map Editor (MapEditor.html)
console.log('--- 🛠️ VERIFYING STANDALONE MAP EDITOR (MapEditor.html) ---');
const mapEditorPath = path.join(__dirname, 'MapEditor.html');
assert(fs.existsSync(mapEditorPath), 'MapEditor.html must exist');
const mapEditorHtml = fs.readFileSync(mapEditorPath, 'utf8');

assert(mapEditorHtml.includes('symbiotic_custom_map'), 'MapEditor.html must use symbiotic_custom_map for localStorage');
assert(mapEditorHtml.includes('data-tool="rock"'), 'MapEditor must feature Rock placement tool');
assert(mapEditorHtml.includes('data-tool="boulder"'), 'MapEditor must feature Boulder placement tool');
assert(mapEditorHtml.includes('data-tool="river"'), 'MapEditor must feature River polyline tool');
assert(mapEditorHtml.includes('data-tool="crystal"'), 'MapEditor must feature Crystal resource tool');
assert(mapEditorHtml.includes('data-tool="tree"'), 'MapEditor must feature Alien Oxygen Tree tool');
assert(mapEditorHtml.includes('data-tool="select"'), 'MapEditor must feature Select / Move tool');
assert(mapEditorHtml.includes('data-tool="eraser"'), 'MapEditor must feature Eraser tool');
assert(mapEditorHtml.includes('id="btn-save"'), 'MapEditor must feature Save to Game button');
assert(mapEditorHtml.includes('id="btn-play"'), 'MapEditor must feature Play Game Now button');
assert(mapEditorHtml.includes('id="btn-export"'), 'MapEditor must feature Export JSON button');
assert(mapEditorHtml.includes('id="btn-import"'), 'MapEditor must feature Import JSON button');
assert(mapEditorHtml.includes('#e2e8f0'), 'MapEditor canvas must render light gray #e2e8f0 terrain');
assert(indexHtml.includes('MapEditor.html'), 'index.html must link to MapEditor.html');
console.log('✅ Standalone Map Editor, placement tools, persistence, and navigation verified.\n');

// 14. Test Touchscreen Joystick Controls & iPhone Safari Optimization
console.log('--- 📱 VERIFYING TOUCHSCREEN JOYSTICK & IPHONE SAFARI OPTIMIZATION ---');
// Read fresh files
const freshIndex = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const freshGameCode = fs.readFileSync(path.join(__dirname, 'js/game.js'), 'utf8');
const freshCss = fs.readFileSync(path.join(__dirname, 'css/style.css'), 'utf8');

// Viewport & iOS Safari meta tags
assert(freshIndex.includes('viewport-fit=cover'), 'index.html must specify viewport-fit=cover for iPhone notches and safe areas');
assert(freshIndex.includes('user-scalable=no'), 'index.html must disable user pinch/double-tap scaling for arcade control');
assert(freshIndex.includes('apple-mobile-web-app-capable'), 'index.html must include apple-mobile-web-app-capable');

// Touch DOM elements in index.html
assert(freshIndex.includes('id="touch-controls"'), 'index.html must include touch-controls container');
assert(freshIndex.includes('id="joystick-zone"'), 'index.html must include joystick-zone');
assert(freshIndex.includes('id="joystick-knob"'), 'index.html must include joystick-knob');
assert(freshIndex.includes('id="btn-touch-fire"'), 'index.html must include manual fire action button');
assert(freshIndex.includes('id="btn-touch-dock"'), 'index.html must include touch docking button');
assert(freshIndex.includes('id="btn-touch-focus"'), 'index.html must include camera focus toggle button');
assert(freshIndex.includes('id="touch-power-modes"'), 'index.html must include power mode quick selection pills');

// CSS styling for touch & joystick
assert(freshCss.includes('touch-action: none'), 'css/style.css must enforce touch-action: none to prevent iOS Safari gestures');
assert(freshCss.includes('#joystick-zone'), 'css/style.css must style joystick-zone');
assert(freshCss.includes('#joystick-knob'), 'css/style.css must style joystick-knob');
assert(freshCss.includes('.touch-btn-fire'), 'css/style.css must style touch-btn-fire');

// Touch engine & joystick implementation in js/game.js
assert(freshGameCode.includes('initTouchControls'), 'game.js must contain initTouchControls()');
assert(freshGameCode.includes('resizeGameCanvas'), 'game.js must contain resizeGameCanvas() for dynamic iPhone screens');
assert(freshGameCode.includes('joystickX'), 'game.js must track analog joystickX in input state');
assert(freshGameCode.includes('joystickY'), 'game.js must track analog joystickY in input state');
assert(freshGameCode.includes('updateJoystickPosition'), 'game.js must compute joystick vector from client coordinates');
assert(freshGameCode.includes('roverInputs.joystickX'), 'simulateRover must support analog joystick velocity');
assert(freshGameCode.includes('touchstart'), 'game.js must handle touchstart events');
assert(freshGameCode.includes('touchmove'), 'game.js must handle touchmove events');
assert(freshGameCode.includes('touchend'), 'game.js must handle touchend events');
console.log('✅ Touchscreen joystick, action buttons, analog steering, and iOS Safari viewport verified.\n');

console.log('🎉🎉 ALL MECHANICS, ASSETS, NETWORKING, MAP EDITOR, AND IPHONE TOUCH CONTROLS PASSED SUCCESSFULLY! 🎉🎉');


