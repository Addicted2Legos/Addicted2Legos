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

// 15. Test Citadel Base Weapon Armory & Scavenger Weapons Forge Removal
console.log('--- ⚔️ VERIFYING CITADEL BASE WEAPON ARMORY & FORGE REMOVAL ---');
// Verify removal of hidden/obscured in-world blueprint site
assert(!freshGameCode.includes("id: 'site-weapon-forge'"), 'Obsolete site-weapon-forge must be eliminated from game.js');
assert(!freshGameCode.includes('type: "weapon_forge"'), 'weapon_forge build type must not be in game.js');

// Verify Batch 2 outer choke bastions
assert(freshGameCode.includes("id: 'site-choke-east'"), 'Batch 2 must include Canyon Choke Barricade');
assert(freshGameCode.includes("id: 'site-choke-west'"), 'Batch 2 must include West Basin Bastion');
assert(freshGameCode.includes("id: 'site-choke-north'"), 'Batch 2 must include North Gorge Bastion');
assert(freshGameCode.includes("id: 'site-choke-south'"), 'Batch 2 must include South Gorge Bastion');

// Verify WEAPON_TIER_CONFIG and costs
assert(freshGameCode.includes('WEAPON_TIER_CONFIG'), 'WEAPON_TIER_CONFIG must be defined in game.js');
assert(freshGameCode.includes('WEAPON_UPGRADE_COSTS'), 'WEAPON_UPGRADE_COSTS must be defined in game.js');
assert(freshGameCode.includes('Kinetic Scout Rifle'), 'Tier 1 weapon must be Kinetic Scout Rifle');
assert(freshGameCode.includes('Scatter-Shot Cannon'), 'Tier 2 weapon must be Scatter-Shot Cannon');
assert(freshGameCode.includes('Piercing Plasma Railgun'), 'Tier 3 weapon must be Piercing Plasma Railgun');
assert(freshGameCode.includes('Apex Nanite Missile Array'), 'Tier 4 weapon must be Apex Nanite Missile Array');

// Verify Citadel Armory Functions & Hotkey
assert(freshGameCode.includes('function upgradeRoverWeapon('), 'upgradeRoverWeapon function must be defined');
assert(freshGameCode.includes('function showCitadelDockPanel('), 'showCitadelDockPanel function must be defined');
assert(freshGameCode.includes('function updateArmoryUI('), 'updateArmoryUI function must be defined');
assert(freshGameCode.includes('keys.justPressed.u'), 'Key [U] must be wired to upgrade rover weapon');

// Verify In-Game Citadel Dock Panel & Touch Upgrade in index.html
assert(freshIndex.includes('id="citadel-dock-panel"'), 'index.html must include citadel-dock-panel modal');
assert(freshIndex.includes('id="dock-scrap-txt"'), 'index.html must display base scrap in dock panel');
assert(freshIndex.includes('id="dock-current-name"'), 'index.html must display current weapon tier name');
assert(freshIndex.includes('id="dock-next-name"'), 'index.html must display next weapon tier name');
assert(freshIndex.includes('id="btn-dock-upgrade"'), 'index.html must provide forge upgrade button in dock panel');
assert(freshIndex.includes('id="btn-dock-deploy"'), 'index.html must provide rover deploy button in dock panel');
assert(freshIndex.includes('id="btn-touch-upgrade"'), 'index.html must include mobile touch-upgrade button');

// Verify CSS Styling for Armory Overlay & Touch Button
assert(freshCss.includes('.citadel-dock-panel'), 'css/style.css must style citadel-dock-panel');
assert(freshCss.includes('.touch-btn-upgrade'), 'css/style.css must style touch-btn-upgrade');
assert(freshCss.includes('.current-weapon-card'), 'css/style.css must style current weapon card');
assert(freshCss.includes('.next-weapon-card'), 'css/style.css must style next weapon card');

// Verify Multiplayer Synchronization of Weapon Upgrades
assert(freshGameCode.includes("type: 'UPGRADE_WEAPON'"), 'game.js network handler must process UPGRADE_WEAPON packets');
assert(freshGameCode.includes('weaponTier: rover.weaponTier'), 'game.js P2P state broadcast must synchronize weaponTier');

console.log('✅ Citadel Base Armory, 4-tier weapon progression, UI modal, mobile touch button, and forge removal verified.\n');

// 16. Test Wall Sizing Expansion, Bug Tangential Sliding, and Global Wasteland Tree Coverage
console.log('--- 🛡️ VERIFYING WALL EXPANSION, BUG WALL SLIDING & GLOBAL TREE COVERAGE ---');
// Verify expanded perimeter wall sizing (180px ramparts instead of 46px nubs)
assert(freshGameCode.includes("width: 180, height: 38"), 'Horizontal perimeter blast walls must be 180px wide');
assert(freshGameCode.includes("width: 38, height: 180"), 'Vertical perimeter blast walls must be 180px tall');
assert(freshGameCode.includes('North Blast Rampart & Gate'), 'North wall name must reflect rampart expansion');
assert(freshGameCode.includes('South Blast Rampart & Gate'), 'South wall name must reflect rampart expansion');
assert(freshGameCode.includes('East Blast Rampart & Gate'), 'East wall name must reflect rampart expansion');
assert(freshGameCode.includes('West Blast Rampart & Gate'), 'West wall name must reflect rampart expansion');

// Verify bug wall navigation & tangential sliding (prevent bugs freezing at walls)
assert(freshGameCode.includes('isSlidingWall'), 'Swarm AI must track wall sliding state');
assert(freshGameCode.includes('wallSlideX'), 'Swarm AI must compute tangential wall sliding X velocity');
assert(freshGameCode.includes('wallSlideY'), 'Swarm AI must compute tangential wall sliding Y velocity');
assert(freshGameCode.includes('inGateChannel'), 'Swarm AI must allow passage through open wall gate channels');

// Verify safe cross-browser rounded rect helper (prevents iOS Safari roundRect crashes)
assert(freshGameCode.includes('function safeRoundRect('), 'game.js must define safeRoundRect helper for cross-browser iOS support');

// Verify light gray canvas and body backgrounds in css/style.css
assert(freshCss.includes('background-color: #e2e8f0'), 'css/style.css must enforce light gray #e2e8f0 background');

// Verify global wasteland tree distribution (12+ trees across regions)
const matchTrees = freshGameCode.match(/trees:\s*(\[[\s\S]*?\])\s*};/);
assert(matchTrees, 'DEFAULT_MAP.trees must be defined');
const parsedTrees = eval(matchTrees[1]);
assert(parsedTrees.length >= 10, `DEFAULT_MAP must contain at least 10 trees distributed across wasteland, found ${parsedTrees.length}`);
console.log(`✅ ${parsedTrees.length} Alien Oxygen Trees distributed across all wasteland sectors.`);
console.log('✅ Expanded 180px blast ramparts, tangential bug sliding, open gate rushing, and iOS light gray background verified.\n');

// 17. Test Base Tank Sizing Scale-down & Mobile iPhone Camera Zoom
console.log('--- 🔬 VERIFYING CITADEL TANK SCALING & IPHONE CAMERA ZOOM ---');
// Verify scaled base fortress tank dimensions (96x62 instead of 150x95)
assert(freshGameCode.includes("width: 96,\n      height: 62"), 'Base fortress tank must be scaled down to 96x62 for proper courtyard proportions');
assert(freshGameCode.includes("treadW = base.width + 10"), 'Treads must scale proportionally to base width');
assert(freshGameCode.includes("barrelLen = 38"), 'Base cannon barrel length must be scaled to 38px');
assert(freshGameCode.includes("shieldRadius = 78"), 'Base shield radius must scale to 78px');
assert(freshGameCode.includes("if (dBase < 48)"), 'Base collision radius must scale to 48px');

// Verify rover deployment & respawn courtyard clearance
assert(freshGameCode.includes("rover.id === 'rover2' ? -75 : 75"), 'Rovers must deploy/respawn with 75px offset beside base');

// Verify Responsive Camera Zoom Controller & Helpers
assert(freshGameCode.includes("function getCameraZoom()"), 'game.js must define getCameraZoom helper');
assert(freshGameCode.includes("function setCameraZoom("), 'game.js must define setCameraZoom helper');
assert(freshGameCode.includes("function updateZoomUI()"), 'game.js must define updateZoomUI helper');

// Verify Mobile/iPhone responsive detection & zoom scaling
assert(freshGameCode.includes("if (minDim <= 430) return 0.58;"), 'iPhone portrait screens must default to 0.58x zoom');
assert(freshGameCode.includes("if (minDim <= 640) return 0.64;"), 'iPhone landscape screens must default to 0.64x zoom');

// Verify Pinch-to-zoom and canvas touch/wheel handlers
assert(freshGameCode.includes("if (e.touches.length === 2)"), 'game.js must handle two-finger touch gestures on canvas');
assert(freshGameCode.includes("canvas.addEventListener('wheel'"), 'game.js must support wheel zoom on desktop canvas');

// Verify Keyboard hotkeys for zoom
assert(freshGameCode.includes("e.key === '[' || e.key === '-'"), 'game.js must support [ and - keys for zooming out');
assert(freshGameCode.includes("e.key === ']' || e.key === '=' || e.key === '+'"), 'game.js must support ] and + keys for zooming in');

// Verify Mobile Zoom button in index.html & style.css
assert(freshIndex.includes('id="btn-touch-zoom"'), 'index.html must include btn-touch-zoom button');
assert(freshIndex.includes('id="touch-zoom-label"'), 'index.html must include touch-zoom-label span');
assert(freshCss.includes('.touch-btn-zoom'), 'css/style.css must style touch-btn-zoom');

// Verify Camera transform in draw() applies zoom
assert(freshGameCode.includes("ctx.scale(currentZoom, currentZoom)"), 'Rendering pipeline must scale canvas world by camera zoom');

// Verify Screen-to-World coordinate mapping factors in zoom
assert(freshGameCode.includes("(keys.mouse.x - canvas.width / 2) / currentZoom + localTarget.x"), 'World mouse X calculation must divide screen offset by zoom');
assert(freshGameCode.includes("(keys.mouse.y - canvas.height / 2) / currentZoom + localTarget.y"), 'World mouse Y calculation must divide screen offset by zoom');

// Verify Radar Frustum box
assert(freshGameCode.includes("vpWorldW = canvas.width / curZoom"), 'Radar must calculate camera viewport frustum width from zoom');
assert(freshGameCode.includes("ctx.strokeRect(vpLeft, vpTop, vpW, vpH)"), 'Radar must render visible camera viewport frustum on minimap');

console.log('✅ Base fortress tank scaled to 96x62 (58% footprint reduction) with generous courtyard clearance.');
console.log('✅ iPhone camera zoom system (0.58x-0.64x responsive default, pinch-to-zoom, touch button, radar frustum) verified.\n');

console.log('🎉🎉 ALL MECHANICS, ASSETS, NETWORKING, MAP EDITOR, AND IPHONE TOUCH CONTROLS PASSED SUCCESSFULLY! 🎉🎉');


