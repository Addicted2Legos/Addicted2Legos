/**
 * BUILDINGS DATA
 * Add a new building by adding an entry here. `produces` points at a unit
 * id from units.js. `requires` (optional) is a building id that must exist
 * before this one can be built. `attack` (optional) makes the building a
 * static defense that fires on nearby enemies on its own — see
 * updateTowerAttacks in game.js.
 */
const BUILDINGS = {
  barracks: {
    id: 'barracks',
    name: 'Pod Hive',
    icon: '🪖',
    size: { w: 2, h: 2 },
    cost: { crudeOil: 50, energy: 20, wood: 15 },
    buildTime: 8000,
    hp: 180,
    produces: 'soldier',
    requires: null,
  },
  storage: {
    id: 'storage',
    name: 'Matter Vault',
    icon: '📦',
    size: { w: 2, h: 2 },
    cost: {},
    buildTime: 0,
    hp: 200,
    produces: 'worker', // the pre-placed home base trains workers, no separate factory needed
    requires: null,
    hidden: true, // pre-placed at game start, not buildable from the build bar
  },
  tower: {
    id: 'tower',
    name: "Bowman's Watch",
    icon: '🏹',
    size: { w: 1, h: 1 },
    cost: { crudeOil: 30, wood: 25 },
    buildTime: 5000,
    hp: 120,
    produces: null,
    requires: null,
    attack: {
      damage: 8,
      range: 2.2, // tiles — well past a soldier's melee range
      attackInterval: 700, // ms between shots
    },
  },
  roverBay: {
    id: 'roverBay',
    name: 'Rover Bay',
    icon: '🛻',
    size: { w: 2, h: 2 },
    cost: { crudeOil: 50, metal: 30 },
    buildTime: 9000,
    hp: 170,
    produces: 'laserRover',
    requires: null,
  },
  cryoGarage: {
    id: 'cryoGarage',
    name: 'Cryo Garage',
    icon: '🛺',
    size: { w: 2, h: 2 },
    cost: { crudeOil: 35, metal: 25 },
    buildTime: 8000,
    hp: 150,
    produces: 'frostTrike',
    requires: 'roverBay',
  },
};
