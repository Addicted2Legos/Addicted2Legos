/**
 * UNITS DATA
 * Player-controlled unit types. Add a new one here and reference its id
 * from a building's `produces` field to make it trainable. `freezeMs`
 * (optional) makes a hit lock the target enemy in place — see the
 * 'attack' job handling in game.js's updateUnits.
 */
const UNITS = {
  worker: {
    id: 'worker',
    name: 'Krezkit',
    icon: '👷',
    color: '#cfe8ff',
    speed: 2.2, // tiles/sec
    hp: 25,
    gatherRate: 8, // resource units per second while on a node
    carryCapacity: 10,
    cost: { metal: 10 }, // raw ore
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
    cost: { crudeOil: 20, energy: 10 },
    buildTime: 5000,
  },
  laserRover: {
    id: 'laserRover',
    name: 'Star Rover',
    icon: '🛻',
    color: '#8fd1ff',
    speed: 1.7, // tiles/sec — heavy six-wheeler, slower than the trooper
    hp: 90,
    damage: 16,
    range: 1.6, // tiles — the laser reaches well past melee
    attackInterval: 1000,
    projectileColor: '#ff5d5d',
    projectileKind: 'laser',
    cost: { crudeOil: 60, metal: 20 },
    buildTime: 9000,
  },
  frostTrike: {
    id: 'frostTrike',
    name: 'Frost Trike',
    icon: '🛺',
    color: '#bdf2ff',
    speed: 2.8, // tiles/sec — light three-wheeler, faster than anything else
    hp: 35,
    damage: 2, // minor — it's a control unit, not a damage dealer
    range: 1.8,
    attackInterval: 2200,
    freezeMs: 5000, // locks the target in place on hit, for your attackers to finish off
    projectileColor: '#bdf2ff',
    projectileKind: 'freeze',
    cost: { crudeOil: 45, metal: 15 },
    buildTime: 7000,
  },
};
