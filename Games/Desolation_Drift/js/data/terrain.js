/**
 * TERRAIN DATA
 * Tile types + the map layout. To add a new terrain tile, add an entry to
 * TILE_TYPES. To make a new map, write a new layout function and point
 * MAPS at it (or add more maps to the MAPS registry).
 */
const TILE_TYPES = {
  sand: { id: 'sand', walkable: true, colors: ['#5b6472', '#616b79', '#535c68', '#697381'] },
  sandDark: { id: 'sandDark', walkable: true, colors: ['#454e59', '#404850'] },
  rock: { id: 'rock', walkable: false, colors: ['#3c434c', '#30363e', '#363d45'] },
  ruins: { id: 'ruins', walkable: false, colors: ['#9aa4ac', '#8b95a0'] },
};

// Grid size, in tiles. Keep a 16:10-ish ratio to match a widescreen viewport.
const MAP_COLS = 16;
const MAP_ROWS = 10;

/**
 * Builds the default "Frontier Canyon" map.
 * Returns { cols, rows, tiles, nodes, spawnPoints, homeTile }
 *  - tiles: 2D array [row][col] of TILE_TYPES ids
 *  - nodes: resource nodes { id, type, col, row, amount, maxAmount }
 *  - spawnPoints: edge tiles where enemies walk in from
 *  - homeTile: where the starting worker begins
 */
function generateFrontierMap() {
  const cols = MAP_COLS;
  const rows = MAP_ROWS;
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push('sand');
    }
    tiles.push(row);
  }

  // Scatter a bit of rock / darker sand for visual variety (decorative,
  // avoided near the buildable middle of the map).
  const decor = [
    [0, 0, 'rock'], [1, 0, 'rock'], [0, 1, 'rock'],
    [15, 0, 'rock'], [14, 0, 'ruins'], [15, 1, 'rock'],
    [0, 9, 'ruins'], [0, 8, 'rock'],
    [7, 0, 'sandDark'], [8, 0, 'sandDark'], [7, 1, 'sandDark'],
    [3, 9, 'sandDark'], [4, 9, 'sandDark'], [12, 9, 'sandDark'],
  ];
  decor.forEach(([c, r, t]) => { tiles[r][c] = t; });

  const nodes = [
    { id: 'min1', type: 'minerals', col: 2, row: 4, amount: 400, maxAmount: 400 },
    { id: 'min2', type: 'minerals', col: 1, row: 6, amount: 400, maxAmount: 400 },
    { id: 'min3', type: 'minerals', col: 3, row: 7, amount: 300, maxAmount: 300 },
    { id: 'eng1', type: 'energy', col: 13, row: 3, amount: 300, maxAmount: 300 },
    { id: 'eng2', type: 'energy', col: 14, row: 6, amount: 300, maxAmount: 300 },
    { id: 'wood1', type: 'wood', col: 5, row: 1, amount: 150, maxAmount: 150 },
    { id: 'wood2', type: 'wood', col: 6, row: 1, amount: 150, maxAmount: 150 },
    { id: 'wood3', type: 'wood', col: 9, row: 8, amount: 150, maxAmount: 150 },
    { id: 'wood4', type: 'wood', col: 10, row: 8, amount: 150, maxAmount: 150 },
  ];

  // Enemies walk in from the right-hand desert horizon.
  const spawnPoints = [
    { col: 15, row: 2 },
    { col: 15, row: 5 },
    { col: 15, row: 8 },
  ];

  const homeTile = { col: 6, row: 5 };

  return { cols, rows, tiles, nodes, spawnPoints, homeTile };
}

const MAPS = {
  frontierCanyon: generateFrontierMap,
};
