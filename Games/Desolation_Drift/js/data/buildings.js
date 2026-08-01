/**
 * BUILDINGS DATA
 * Add a new building by adding an entry here. `produces` points at a unit
 * id from units.js. `requires` (optional) is a building id that must exist
 * before this one can be built.
 */
const BUILDINGS = {
  factory: {
    id: 'factory',
    name: "Krezkit's Grubstake",
    icon: '🏭',
    size: { w: 2, h: 2 },
    cost: { minerals: 40, wood: 20 },
    buildTime: 6000,
    hp: 150,
    produces: 'worker',
    requires: null,
  },
  barracks: {
    id: 'barracks',
    name: '7th Cavalry Barracks',
    icon: '🪖',
    size: { w: 2, h: 2 },
    cost: { minerals: 50, energy: 20, wood: 15 },
    buildTime: 8000,
    hp: 180,
    produces: 'soldier',
    requires: 'factory',
  },
  storage: {
    id: 'storage',
    name: 'Supply Depot',
    icon: '📦',
    size: { w: 2, h: 2 },
    cost: {},
    buildTime: 0,
    hp: 200,
    produces: null,
    requires: null,
    hidden: true, // pre-placed at game start, not buildable from the build bar
  },
};
