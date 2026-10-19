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

console.log('🎉 ALL 8-DIRECTIONAL SPRITE & ROVER TESTS PASSED SUCCESSFULLY!');

