/**
 * ENEMIES DATA
 * Enemy unit types + the wave schedule that spawns them. Add a new enemy
 * type here, then reference its id from WAVE_CONFIG.enemyPool.
 */
const ENEMIES = {
  raider: {
    id: 'raider',
    name: 'Raider',
    icon: '👽',
    color: '#c98cff',
    speed: 1.6, // tiles/sec
    hp: 22,
    damage: 4,
    range: 0.7, // tiles
    attackInterval: 1000,
  },
  outlawBot: {
    id: 'outlawBot',
    name: 'Outlaw Bot',
    icon: '🤖',
    color: '#ff8a6b',
    speed: 1.3, // tiles/sec
    hp: 45,
    damage: 7,
    range: 0.7, // tiles
    attackInterval: 1200,
  },
};

/**
 * Wave pacing. First wave arrives after `firstWaveDelay` ms, then a new
 * wave every `waveInterval` ms, each wave slightly bigger.
 */
const WAVE_CONFIG = {
  firstWaveDelay: 150000,
  waveInterval: 35000,
  baseEnemyCount: 2,
  enemyCountGrowth: 1, // extra enemies added per wave
  enemyPool: ['raider', 'raider', 'outlawBot'],
};
