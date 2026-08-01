/**
 * UNITS DATA
 * Player-controlled unit types. Add a new one here and reference its id
 * from a building's `produces` field to make it trainable.
 */
const UNITS = {
  worker: {
    id: 'worker',
    name: 'Worker',
    icon: '👷',
    color: '#cfe8ff',
    speed: 2.2, // tiles/sec
    hp: 25,
    gatherRate: 8, // resource units per second while on a node
    carryCapacity: 10,
    cost: { minerals: 15 },
    buildTime: 4000,
  },
  soldier: {
    id: 'soldier',
    name: 'Cavalry Trooper',
    icon: '🤠',
    color: '#ffd8a8',
    speed: 2.6, // tiles/sec
    hp: 45,
    damage: 6,
    range: 0.85, // tiles
    attackInterval: 900, // ms between attacks
    cost: { minerals: 20, energy: 10 },
    buildTime: 5000,
  },
};
