/**
 * PYRAMID BUILDER - Ancient Egyptian Architecture Game
 * High-performance HTML5 Canvas Game Engine with Procedural Web Audio API
 */

// ==========================================
// AUDIO ENGINE (Web Audio API Synthesizer)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, type = 'sine', duration = 0.2, gainVal = 0.3, detune = 0) {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (detune !== 0) osc.detune.setValueAtTime(detune, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playDropSound() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      
      // Heavy stone impact thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      // Noise click for stone texture
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(600, now);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playPerfectSound(combo = 1) {
    if (!this.enabled || !this.ctx) return;
    // Ancient Egyptian Pentatonic chords (D - F - G - A - C - D)
    const scale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99, 880.00];
    const baseIdx = Math.min(scale.length - 3, (combo - 1) % (scale.length - 2));
    
    const f1 = scale[baseIdx];
    const f2 = scale[baseIdx + 1];
    const f3 = scale[baseIdx + 2];

    this.playTone(f1, 'sine', 0.4, 0.25);
    setTimeout(() => this.playTone(f2, 'sine', 0.45, 0.25), 60);
    setTimeout(() => this.playTone(f3, 'triangle', 0.6, 0.3), 120);
    setTimeout(() => this.playTone(f3 * 2, 'sine', 0.5, 0.15), 160);
  }

  playGreatSound() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(440, 'sine', 0.3, 0.2);
    setTimeout(() => this.playTone(554.37, 'sine', 0.35, 0.2), 70);
  }

  playGoodSound() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(330, 'triangle', 0.25, 0.2);
  }

  playMissSound() {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      
      // Cracking stone crumble noise
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.35);
      
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playVictoryFanfare() {
    if (!this.enabled || !this.ctx) return;
    const notes = [
      { f: 293.66, t: 0, d: 0.25 },
      { f: 392.00, t: 150, d: 0.25 },
      { f: 440.00, t: 300, d: 0.25 },
      { f: 587.33, t: 450, d: 0.7 },
      { f: 783.99, t: 650, d: 0.9 },
      { f: 880.00, t: 800, d: 1.2 },
    ];
    notes.forEach(n => {
      setTimeout(() => {
        this.playTone(n.f, 'triangle', n.d, 0.3);
        this.playTone(n.f * 1.5, 'sine', n.d * 0.8, 0.15);
      }, n.t);
    });
  }
}

// ==========================================
// PARTICLES & VISUAL FX
// ==========================================
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  spawnImpactDust(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 0.8) + Math.random() * (Math.PI * 1.4); // upward & sideways
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 3 + Math.random() * 6,
        color: Math.random() > 0.4 ? '#e6b980' : '#c4975f',
        alpha: 0.7 + Math.random() * 0.3,
        decay: 0.02 + Math.random() * 0.02,
        type: 'dust'
      });
    }
  }

  spawnGoldenSparks(x, y, count = 28) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 3.5,
        color: Math.random() > 0.3 ? '#ffe082' : '#ffb300',
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02,
        type: 'spark'
      });
    }
  }

  spawnStoneCrumble(x, y, count = 18) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 8,
        color: '#8d5b36',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        decay: 0.015,
        type: 'rock'
      });
    }
  }

  spawnFloatingText(text, x, y, color = '#ffe082', scale = 1) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.8,
      alpha: 1,
      scale: scale,
      color: color,
      decay: 0.016
    });
  }

  spawnVictoryCelebration(w, h) {
    const colors = ['#ffe082', '#f5b342', '#ff5722', '#4fc3f7', '#81c784', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: w * 0.5 + (Math.random() - 0.5) * 200,
        y: h * 0.35 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: -4 - Math.random() * 10,
        radius: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.008 + Math.random() * 0.008,
        type: 'confetti'
      });
    }
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.alpha -= p.decay;
      if (p.type === 'dust') {
        p.radius += 0.15;
      }
      if (p.type === 'rock') {
        p.rotation += p.vRot;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.alpha -= t.decay;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Render particles
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.type === 'rock') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render floating texts
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = `bold ${Math.round(20 * t.scale)}px 'Cinzel', serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}

// ==========================================
// PYRAMID CONFIGURATIONS & CAMPAIGN LEVELS
// ==========================================
const CAMPAIGN_LEVELS = [
  {
    id: 1,
    name: "Mastaba of Saqqara",
    subtitle: "Ancient Royal Tomb",
    layers: [4, 3, 2, 1], // 10 blocks
    speed: 4.5,
    wind: 0,
    skyTheme: 'day'
  },
  {
    id: 2,
    name: "Step Pyramid of Djoser",
    subtitle: "Imhotep's Masterpiece",
    layers: [6, 5, 4, 3, 2, 1], // 21 blocks
    speed: 6.0,
    wind: 0.4,
    skyTheme: 'sunset'
  },
  {
    id: 3,
    name: "The Great Pyramid of Giza",
    subtitle: "Eternal Wonder of Khufu",
    layers: [7, 6, 5, 4, 3, 2, 1], // 28 blocks
    speed: 7.5,
    wind: 0.9,
    skyTheme: 'night'
  }
];

// Hieroglyph glyph symbols for block carvings
const HIEROGLYPH_GLYPHS = ['𓋹', '𓊽', '𓊹', '𓉐', '𓃭', '𓆣', '𓂀', '𓇳', '𓆓', '𓌃'];

// ==========================================
// MAIN GAME ENGINE
// ==========================================
class PyramidGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();
    this.particles = new ParticleSystem();

    // Game state
    this.state = 'START'; // 'START', 'PLAYING', 'DROPPING', 'PAUSED', 'VICTORY', 'GAMEOVER'
    this.gameMode = 'campaign'; // 'campaign', 'endless', 'zen'
    this.currentLevelIdx = 0;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pyramid_high_score') || '0', 10);
    this.lives = 3;
    this.maxLives = 3;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.totalAttempts = 0;
    this.totalAccuracySum = 0;

    // Viewport & Scaling
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Pyramid structure parameters
    this.blockWidth = 64;
    this.blockHeight = 36;
    this.baseY = 0;
    this.pyramid = []; // Array of placed blocks: { layer, slot, x, y, width, height, isCapstone, glyph, perfect }
    this.currentLayerIdx = 0;
    this.currentSlotIdx = 0;

    // Flying block state
    this.flyingBlock = {
      x: 0,
      y: 0,
      vx: 5,
      direction: 1,
      width: 64,
      height: 36,
      isCapstone: false,
      glyph: '𓋹'
    };

    // Dropping block state
    this.droppingBlock = null;

    // Visual camera & Screen shake
    this.cameraShake = 0;
    this.ambientDust = [];
    this.stars = [];
    this.sunGlowPhase = 0;

    // DOM UI Elements
    this.dom = {
      score: document.getElementById('score-display'),
      highScore: document.getElementById('high-score-display'),
      comboBadge: document.getElementById('combo-badge'),
      comboText: document.getElementById('combo-text'),
      levelTitle: document.getElementById('level-title'),
      progressBar: document.getElementById('progress-bar-fill'),
      blockProgress: document.getElementById('block-progress-text'),
      livesContainer: document.getElementById('lives-container'),
      ankhs: document.querySelectorAll('.ankh-life'),
      btnSound: document.getElementById('btn-sound'),
      btnPause: document.getElementById('btn-pause'),
      btnMobileDrop: document.getElementById('btn-mobile-drop'),
      modalStart: document.getElementById('modal-start'),
      modalPause: document.getElementById('modal-pause'),
      modalVictory: document.getElementById('modal-victory'),
      modalGameOver: document.getElementById('modal-gameover'),
      btnStartGame: document.getElementById('btn-start-game'),
      btnResume: document.getElementById('btn-resume'),
      btnRestart: document.getElementById('btn-restart'),
      btnMenu: document.getElementById('btn-menu'),
      btnNextLevel: document.getElementById('btn-next-level'),
      btnVictoryReplay: document.getElementById('btn-victory-replay'),
      btnTryAgain: document.getElementById('btn-try-again'),
      btnGameOverMenu: document.getElementById('btn-gameover-menu'),
      statAccuracy: document.getElementById('stat-accuracy'),
      statPerfects: document.getElementById('stat-perfects'),
      statMaxCombo: document.getElementById('stat-max-combo'),
      statTotalScore: document.getElementById('stat-total-score'),
      statRank: document.getElementById('stat-rank'),
      gameoverScore: document.getElementById('gameover-score'),
      gameoverHighScore: document.getElementById('gameover-high-score'),
      gameoverBlocks: document.getElementById('gameover-blocks'),
      gameoverAccuracy: document.getElementById('gameover-accuracy'),
      modeBtns: document.querySelectorAll('.mode-btn')
    };

    this.initBackgroundElements();
    this.setupEventListeners();
    this.resizeCanvas();
    this.updateHUD();

    // Start Animation Loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  initBackgroundElements() {
    // Generate twinkling stars
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: 0.02 + Math.random() * 0.05,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Generate ambient drifting desert dust motes
    this.ambientDust = [];
    for (let i = 0; i < 40; i++) {
      this.ambientDust.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        vx: 0.5 + Math.random() * 1.2,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
  }

  resizeCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    this.ctx.resetTransform();
    this.ctx.scale(this.dpr, this.dpr);

    // Dynamic block dimensions based on screen width
    if (this.width < 600) {
      this.blockWidth = Math.min(52, Math.floor((this.width - 40) / 7));
      this.blockHeight = Math.round(this.blockWidth * 0.58);
    } else if (this.width < 1000) {
      this.blockWidth = 64;
      this.blockHeight = 36;
    } else {
      this.blockWidth = 76;
      this.blockHeight = 42;
    }

    this.baseY = this.height - 110;

    // Reposition placed blocks to match new dimensions
    if (this.pyramid && this.pyramid.length > 0) {
      const config = this.getLevelConfig();
      for (const b of this.pyramid) {
        const layerBlockCount = config.layers[b.layer];
        if (layerBlockCount) {
          const layerTotalWidth = layerBlockCount * this.blockWidth;
          const layerStartX = (this.width - layerTotalWidth) / 2;
          const slotX = layerStartX + b.slot * this.blockWidth;
          const slotY = this.baseY - (b.layer * this.blockHeight);
          b.width = this.blockWidth;
          b.height = this.blockHeight;
          b.x = slotX + (b.offsetRatio || 0) * this.blockWidth;
          b.y = slotY;
        }
      }
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.triggerDrop();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleSound();
      } else if (e.code === 'KeyR') {
        if (this.state === 'PLAYING' || this.state === 'DROPPING' || this.state === 'PAUSED') {
          this.restartLevel();
        }
      }
    });

    // Canvas click & touch to drop
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state === 'PLAYING') {
        this.triggerDrop();
      }
    });

    // Mobile drop button
    this.dom.btnMobileDrop.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.triggerDrop();
    });

    // Mode buttons
    this.dom.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.modeBtns.forEach(b => b.classList.remove('primary'));
        btn.classList.add('primary');
        this.gameMode = btn.dataset.mode;
      });
    });

    // Start Button
    this.dom.btnStartGame.addEventListener('click', () => {
      this.sound.init();
      this.startNewGame();
    });

    // Pause / Resume / Sound Controls
    this.dom.btnPause.addEventListener('click', () => this.togglePause());
    this.dom.btnSound.addEventListener('click', () => this.toggleSound());
    this.dom.btnResume.addEventListener('click', () => this.togglePause());
    this.dom.btnRestart.addEventListener('click', () => this.restartLevel());
    this.dom.btnMenu.addEventListener('click', () => this.showStartScreen());

    // Victory & Game Over Buttons
    this.dom.btnNextLevel.addEventListener('click', () => this.nextLevel());
    this.dom.btnVictoryReplay.addEventListener('click', () => this.restartLevel());
    this.dom.btnTryAgain.addEventListener('click', () => this.restartLevel());
    this.dom.btnGameOverMenu.addEventListener('click', () => this.showStartScreen());
  }

  toggleSound() {
    const isEnabled = this.sound.toggle();
    this.dom.btnSound.textContent = isEnabled ? '🔊' : '🔇';
    this.dom.btnSound.title = isEnabled ? 'Mute Sound (M)' : 'Unmute Sound (M)';
  }

  togglePause() {
    if (this.state === 'PLAYING' || this.state === 'DROPPING') {
      this.state = 'PAUSED';
      this.dom.modalPause.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.dom.modalPause.classList.add('hidden');
    }
  }

  showStartScreen() {
    this.state = 'START';
    this.hideAllModals();
    this.dom.modalStart.classList.remove('hidden');
    this.dom.modalStart.classList.add('active');
  }

  hideAllModals() {
    this.dom.modalStart.classList.add('hidden');
    this.dom.modalStart.classList.remove('active');
    this.dom.modalPause.classList.add('hidden');
    this.dom.modalVictory.classList.add('hidden');
    this.dom.modalGameOver.classList.add('hidden');
  }

  startNewGame() {
    this.hideAllModals();
    this.currentLevelIdx = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.totalAttempts = 0;
    this.totalAccuracySum = 0;
    this.loadLevel(this.currentLevelIdx);
  }

  loadLevel(levelIdx) {
    this.currentLevelIdx = levelIdx;
    const config = this.getLevelConfig();
    this.pyramid = [];
    this.currentLayerIdx = 0;
    this.currentSlotIdx = 0;
    this.lives = this.gameMode === 'zen' ? 99 : this.maxLives;
    this.particles.clear();
    this.droppingBlock = null;

    this.spawnFlyingBlock();
    this.state = 'PLAYING';
    this.updateHUD();
  }

  getLevelConfig() {
    if (this.gameMode === 'campaign') {
      return CAMPAIGN_LEVELS[this.currentLevelIdx % CAMPAIGN_LEVELS.length];
    } else if (this.gameMode === 'endless') {
      const layerSize = Math.max(3, 7 - Math.floor(this.currentLayerIdx / 3));
      return {
        id: this.currentLevelIdx + 1,
        name: `Endless Obelisk - Tier ${this.currentLayerIdx + 1}`,
        subtitle: "Climb to the Stars",
        layers: Array.from({ length: 15 }, (_, i) => Math.max(1, 7 - i)),
        speed: 5.5 + Math.min(6, this.currentLayerIdx * 0.4),
        wind: 0.3 + Math.min(1.2, this.currentLayerIdx * 0.08),
        skyTheme: this.currentLayerIdx > 6 ? 'night' : 'sunset'
      };
    } else { // 'zen'
      return {
        id: 1,
        name: "Zen of the Nile",
        subtitle: "Peaceful Meditation",
        layers: [6, 5, 4, 3, 2, 1],
        speed: 4.2,
        wind: 0,
        skyTheme: 'sunset'
      };
    }
  }

  getTotalBlocksInLevel() {
    const config = this.getLevelConfig();
    return config.layers.reduce((sum, n) => sum + n, 0);
  }

  getCurrentTargetSlot() {
    const config = this.getLevelConfig();
    const layerCount = config.layers.length;
    if (this.currentLayerIdx >= layerCount) return null;

    const layerBlockCount = config.layers[this.currentLayerIdx];
    const layerTotalWidth = layerBlockCount * this.blockWidth;
    const layerStartX = (this.width - layerTotalWidth) / 2;

    const slotX = layerStartX + this.currentSlotIdx * this.blockWidth;
    const slotY = this.baseY - (this.currentLayerIdx * this.blockHeight);

    const isCapstone = (this.currentLayerIdx === layerCount - 1 && layerBlockCount === 1);

    return {
      layer: this.currentLayerIdx,
      slot: this.currentSlotIdx,
      x: slotX,
      y: slotY,
      centerX: slotX + this.blockWidth / 2,
      width: this.blockWidth,
      height: this.blockHeight,
      isCapstone: isCapstone
    };
  }

  spawnFlyingBlock() {
    const target = this.getCurrentTargetSlot();
    if (!target) return;

    const config = this.getLevelConfig();
    const isCapstone = target.isCapstone;

    // Choose flying height well above the current construction level
    const flyY = Math.max(70, target.y - 180);

    // Randomize initial side
    const startLeft = Math.random() > 0.5;
    const speed = config.speed * (startLeft ? 1 : -1);

    this.flyingBlock = {
      x: startLeft ? 40 : this.width - this.blockWidth - 40,
      y: flyY,
      vx: speed,
      direction: startLeft ? 1 : -1,
      width: this.blockWidth,
      height: this.blockHeight,
      isCapstone: isCapstone,
      glyph: isCapstone ? '𓇳' : HIEROGLYPH_GLYPHS[Math.floor(Math.random() * HIEROGLYPH_GLYPHS.length)]
    };
  }

  triggerDrop() {
    if (this.state !== 'PLAYING') return;

    this.state = 'DROPPING';
    const target = this.getCurrentTargetSlot();

    this.droppingBlock = {
      x: this.flyingBlock.x,
      y: this.flyingBlock.y,
      vx: 0,
      vy: 2,
      gravity: 1.4,
      width: this.flyingBlock.width,
      height: this.flyingBlock.height,
      isCapstone: this.flyingBlock.isCapstone,
      glyph: this.flyingBlock.glyph,
      target: target
    };
  }

  evaluatePlacement(block, target) {
    this.totalAttempts++;
    const blockCenter = block.x + block.width / 2;
    const targetCenter = target.centerX;
    const offset = blockCenter - targetCenter;
    const absOffset = Math.abs(offset);

    // Max allowance based on block width fraction
    const perfectThreshold = Math.max(4, this.blockWidth * 0.07);
    const greatThreshold = Math.max(12, this.blockWidth * 0.22);
    const goodThreshold = Math.max(24, this.blockWidth * 0.42);
    const maxAllowedOffset = Math.max(38, this.blockWidth * 0.65);

    // Accuracy percentage for this block
    const accuracy = Math.max(0, Math.min(100, Math.round(100 - (absOffset / (this.blockWidth * 0.5)) * 100)));
    this.totalAccuracySum += accuracy;

    const landingX = target.x; // Snapped or aligned
    const landingY = target.y;

    if (absOffset <= perfectThreshold) {
      // ===== PERFECT DROP =====
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.perfectCount++;
      
      const multiplier = Math.min(8, this.combo);
      const points = 300 * multiplier;
      this.score += points;

      this.sound.playDropSound();
      this.sound.playPerfectSound(this.combo);
      this.particles.spawnGoldenSparks(target.centerX, landingY + this.blockHeight / 2, 32);
      this.particles.spawnImpactDust(target.centerX, landingY + this.blockHeight, 18);
      
      const comboMsg = this.combo > 1 ? ` (${this.combo}x COMBO!)` : '';
      this.particles.spawnFloatingText(`+${points} PERFECT!${comboMsg}`, target.centerX, landingY - 20, '#ffe082', 1.2);
      this.cameraShake = 4;

      this.placeBlockInPyramid({
        ...block,
        layer: target.layer,
        slot: target.slot,
        offsetRatio: 0,
        x: target.x, // Perfect snap
        y: landingY,
        perfect: true
      });

      this.advancePyramidSlot();

    } else if (absOffset <= greatThreshold) {
      // ===== GREAT DROP =====
      if (this.combo > 0) this.combo++;
      else this.combo = 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      const points = 150 * this.combo;
      this.score += points;

      this.sound.playDropSound();
      this.sound.playGreatSound();
      this.particles.spawnImpactDust(target.centerX, landingY + this.blockHeight, 14);
      this.particles.spawnGoldenSparks(target.centerX, landingY + this.blockHeight / 2, 12);
      this.particles.spawnFloatingText(`+${points} GREAT!`, target.centerX, landingY - 15, '#81c784', 1.0);
      this.cameraShake = 3;

      // Slight snap with realistic offset feel
      this.placeBlockInPyramid({
        ...block,
        layer: target.layer,
        slot: target.slot,
        offsetRatio: (offset * 0.4) / this.blockWidth,
        x: target.x + offset * 0.4,
        y: landingY,
        perfect: false
      });

      this.advancePyramidSlot();

    } else if (absOffset <= goodThreshold) {
      // ===== GOOD DROP =====
      this.combo = 0; // Combo reset
      const points = 75;
      this.score += points;

      this.sound.playDropSound();
      this.sound.playGoodSound();
      this.particles.spawnImpactDust(target.centerX, landingY + this.blockHeight, 10);
      this.particles.spawnFloatingText(`+${points} GOOD`, target.centerX, landingY - 10, '#d99b66', 0.9);
      this.cameraShake = 2;

      this.placeBlockInPyramid({
        ...block,
        layer: target.layer,
        slot: target.slot,
        offsetRatio: (offset * 0.6) / this.blockWidth,
        x: target.x + offset * 0.6,
        y: landingY,
        perfect: false
      });

      this.advancePyramidSlot();

    } else if (absOffset <= maxAllowedOffset) {
      // ===== OKAY / ROUGH DROP =====
      this.combo = 0;
      const points = 30;
      this.score += points;

      this.sound.playDropSound();
      this.sound.playGoodSound();
      this.particles.spawnImpactDust(target.centerX, landingY + this.blockHeight, 8);
      this.particles.spawnFloatingText(`+${points} OKAY`, target.centerX, landingY - 10, '#bcaaa4', 0.85);

      this.placeBlockInPyramid({
        ...block,
        layer: target.layer,
        slot: target.slot,
        offsetRatio: (offset * 0.8) / this.blockWidth,
        x: target.x + offset * 0.8,
        y: landingY,
        perfect: false
      });

      this.advancePyramidSlot();

    } else {
      // ===== MISS / CRUMBLE =====
      this.combo = 0;
      this.sound.playMissSound();
      this.cameraShake = 10;
      this.particles.spawnStoneCrumble(block.x + block.width / 2, landingY + this.blockHeight, 22);
      this.particles.spawnFloatingText('MISSED!', block.x + block.width / 2, landingY - 15, '#ef4444', 1.1);

      if (this.gameMode !== 'zen') {
        this.lives--;
      }

      this.updateHUD();

      if (this.lives <= 0) {
        this.triggerGameOver();
        return;
      }

      // Retry slot with new flying block
      this.state = 'PLAYING';
      this.spawnFlyingBlock();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pyramid_high_score', this.highScore.toString());
    }

    this.updateHUD();
  }

  placeBlockInPyramid(placedBlock) {
    this.pyramid.push(placedBlock);
  }

  advancePyramidSlot() {
    const config = this.getLevelConfig();
    const currentLayerCapacity = config.layers[this.currentLayerIdx];

    this.currentSlotIdx++;
    if (this.currentSlotIdx >= currentLayerCapacity) {
      // Move to next layer above
      this.currentLayerIdx++;
      this.currentSlotIdx = 0;
    }

    // Check if pyramid complete
    if (this.currentLayerIdx >= config.layers.length) {
      this.triggerLevelVictory();
    } else {
      this.state = 'PLAYING';
      this.spawnFlyingBlock();
    }
  }

  triggerLevelVictory() {
    this.state = 'VICTORY';
    this.sound.playVictoryFanfare();
    this.particles.spawnVictoryCelebration(this.width, this.height);

    const accuracyPct = this.totalAttempts > 0 
      ? Math.round(this.totalAccuracySum / this.totalAttempts) 
      : 100;

    let rank = "APPRENTICE MASON";
    if (accuracyPct >= 96 && this.perfectCount >= 10) {
      rank = "IMHOTEP - DIVINE CHIEF ARCHITECT 𓋹";
    } else if (accuracyPct >= 90) {
      rank = "PHARAOH'S MASTER ARCHITECT 𓊹";
    } else if (accuracyPct >= 80) {
      rank = "ROYAL BUILDER OF THE PYRAMIDS 𓉐";
    } else if (accuracyPct >= 70) {
      rank = "SENIOR QUARRY CHIEF 𓍝";
    }

    // Populate modal stats
    this.dom.statAccuracy.textContent = `${accuracyPct}%`;
    this.dom.statPerfects.textContent = this.perfectCount.toString();
    this.dom.statMaxCombo.textContent = `x${Math.max(1, this.maxCombo)}`;
    this.dom.statTotalScore.textContent = this.score.toLocaleString();
    this.dom.statRank.textContent = rank;

    const config = this.getLevelConfig();
    const isLastLevel = (this.gameMode === 'campaign' && this.currentLevelIdx >= CAMPAIGN_LEVELS.length - 1);
    this.dom.btnNextLevel.textContent = isLastLevel ? "CAMPAIGN COMPLETE! ➔" : "NEXT WONDER ➔";

    this.dom.modalVictory.classList.remove('hidden');
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    const accuracyPct = this.totalAttempts > 0 
      ? Math.round(this.totalAccuracySum / this.totalAttempts) 
      : 0;

    this.dom.gameoverScore.textContent = this.score.toLocaleString();
    this.dom.gameoverHighScore.textContent = this.highScore.toLocaleString();
    this.dom.gameoverBlocks.textContent = `${this.pyramid.length} / ${this.getTotalBlocksInLevel()}`;
    this.dom.gameoverAccuracy.textContent = `${accuracyPct}%`;

    this.dom.modalGameOver.classList.remove('hidden');
  }

  nextLevel() {
    this.dom.modalVictory.classList.add('hidden');
    if (this.gameMode === 'campaign' && this.currentLevelIdx >= CAMPAIGN_LEVELS.length - 1) {
      // Completed full campaign! Return to menu
      this.showStartScreen();
    } else {
      this.loadLevel(this.currentLevelIdx + 1);
    }
  }

  restartLevel() {
    this.hideAllModals();
    this.loadLevel(this.currentLevelIdx);
  }

  updateHUD() {
    this.dom.score.textContent = this.score.toLocaleString();
    this.dom.highScore.textContent = this.highScore.toLocaleString();

    // Combo badge
    if (this.combo >= 2) {
      this.dom.comboBadge.classList.remove('hidden');
      this.dom.comboText.textContent = `x${this.combo} COMBO!`;
    } else {
      this.dom.comboBadge.classList.add('hidden');
    }

    // Level & progress
    const config = this.getLevelConfig();
    this.dom.levelTitle.textContent = config.name;

    const totalBlocks = this.getTotalBlocksInLevel();
    const placedBlocks = this.pyramid.length;
    const progressPercent = Math.min(100, (placedBlocks / totalBlocks) * 100);

    this.dom.progressBar.style.width = `${progressPercent}%`;
    this.dom.blockProgress.textContent = `Block ${Math.min(totalBlocks, placedBlocks + 1)} / ${totalBlocks}`;

    // Lives
    if (this.gameMode === 'zen') {
      this.dom.livesContainer.style.display = 'none';
    } else {
      this.dom.livesContainer.style.display = 'flex';
      this.dom.ankhs.forEach((ankh, idx) => {
        if (idx < this.lives) {
          ankh.classList.add('active');
        } else {
          ankh.classList.remove('active');
        }
      });
    }
  }

  // ==========================================
  // GAME UPDATE & PHYSICS
  // ==========================================
  update(deltaTime) {
    this.particles.update();

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake -= deltaTime * 18;
      if (this.cameraShake < 0) this.cameraShake = 0;
    }

    // Background dust motes movement
    for (const dust of this.ambientDust) {
      dust.x += dust.vx;
      dust.y += dust.vy;
      if (dust.x > this.width + 20) dust.x = -20;
      if (dust.y > this.height) dust.y = 0;
      if (dust.y < 0) dust.y = this.height;
    }

    this.sunGlowPhase += deltaTime * 1.5;

    // Update Flying Block
    if (this.state === 'PLAYING') {
      const config = this.getLevelConfig();
      const margin = 20;
      this.flyingBlock.x += this.flyingBlock.vx * this.flyingBlock.direction;

      // Bounce at screen edges
      if (this.flyingBlock.direction > 0 && this.flyingBlock.x >= this.width - this.blockWidth - margin) {
        this.flyingBlock.direction = -1;
        this.flyingBlock.x = this.width - this.blockWidth - margin;
      } else if (this.flyingBlock.direction < 0 && this.flyingBlock.x <= margin) {
        this.flyingBlock.direction = 1;
        this.flyingBlock.x = margin;
      }
    }

    // Update Dropping Block
    if (this.state === 'DROPPING' && this.droppingBlock) {
      this.droppingBlock.vy += this.droppingBlock.gravity;
      this.droppingBlock.y += this.droppingBlock.vy;

      const target = this.droppingBlock.target;
      if (this.droppingBlock.y >= target.y) {
        this.droppingBlock.y = target.y;
        const blockRef = { ...this.droppingBlock };
        this.droppingBlock = null;
        this.evaluatePlacement(blockRef, target);
      }
    }
  }

  // ==========================================
  // RENDERING PIPELINE
  // ==========================================
  render() {
    this.ctx.save();

    // Apply camera shake if active
    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShake * 2;
      const shakeY = (Math.random() - 0.5) * this.cameraShake * 2;
      this.ctx.translate(shakeX, shakeY);
    }

    this.renderSkyAndAtmosphere();
    this.renderDunesAndDesert();
    this.renderBedrockFoundation();
    this.renderPyramidBlocks();
    this.renderTargetGuide();
    this.renderFlyingAndDroppingBlock();
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }

  renderSkyAndAtmosphere() {
    const config = this.getLevelConfig();
    const skyTheme = config.skyTheme;

    // Sky Gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    if (skyTheme === 'day') {
      skyGrad.addColorStop(0, '#1a3b5c');
      skyGrad.addColorStop(0.4, '#d87d39');
      skyGrad.addColorStop(0.8, '#e6ab5b');
      skyGrad.addColorStop(1, '#ecc27d');
    } else if (skyTheme === 'sunset') {
      skyGrad.addColorStop(0, '#150f24');
      skyGrad.addColorStop(0.3, '#4c1936');
      skyGrad.addColorStop(0.65, '#9d382d');
      skyGrad.addColorStop(0.88, '#e67332');
      skyGrad.addColorStop(1, '#f7b055');
    } else { // 'night'
      skyGrad.addColorStop(0, '#060713');
      skyGrad.addColorStop(0.5, '#12172b');
      skyGrad.addColorStop(0.85, '#2e1c28');
      skyGrad.addColorStop(1, '#532b28');
    }

    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    if (skyTheme === 'sunset' || skyTheme === 'night') {
      const starAlpha = skyTheme === 'night' ? 0.9 : 0.45;
      this.ctx.fillStyle = '#ffffff';
      for (const s of this.stars) {
        const twinkle = Math.sin(Date.now() * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        this.ctx.globalAlpha = starAlpha * twinkle;
        this.ctx.beginPath();
        this.ctx.arc(s.x * this.width, s.y * this.height, s.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }

    // Celestial Body (Sun / Moon)
    const sunX = this.width * 0.8;
    const sunY = this.height * 0.22;
    const sunRadius = 45;

    if (skyTheme === 'night') {
      // Golden Crescent Moon
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(255, 235, 170, 0.6)';
      this.ctx.shadowBlur = 30;
      this.ctx.fillStyle = '#fffae0';
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
      this.ctx.fill();

      // Shadow cutout for crescent
      this.ctx.fillStyle = '#12172b';
      this.ctx.beginPath();
      this.ctx.arc(sunX + 14, sunY - 6, 28, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    } else {
      // Egyptian Radiant Sun Disk
      this.ctx.save();
      const glow = Math.sin(this.sunGlowPhase) * 10 + 40;
      this.ctx.shadowColor = skyTheme === 'day' ? '#ffe082' : '#ff7043';
      this.ctx.shadowBlur = glow;

      const sunGrad = this.ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.3, '#ffe082');
      sunGrad.addColorStop(0.8, skyTheme === 'day' ? '#ffb300' : '#ff5722');
      sunGrad.addColorStop(1, 'rgba(255, 112, 67, 0)');

      this.ctx.fillStyle = sunGrad;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, sunRadius * 1.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Ambient floating sand particles
    this.ctx.fillStyle = '#ffe082';
    for (const dust of this.ambientDust) {
      this.ctx.globalAlpha = dust.alpha;
      this.ctx.beginPath();
      this.ctx.arc(dust.x, dust.y, dust.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  renderDunesAndDesert() {
    // Distant Sand Dune Layer (Back)
    this.ctx.fillStyle = '#7a3e20';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 230);
    this.ctx.quadraticCurveTo(this.width * 0.25, this.height - 290, this.width * 0.55, this.height - 220);
    this.ctx.quadraticCurveTo(this.width * 0.8, this.height - 180, this.width, this.height - 240);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.fill();

    // Distant Sphinx Silhouette
    this.renderSphinxSilhouette(this.width * 0.12, this.height - 210);

    // Mid Dune Layer
    this.ctx.fillStyle = '#9c532b';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 180);
    this.ctx.quadraticCurveTo(this.width * 0.35, this.height - 150, this.width * 0.7, this.height - 200);
    this.ctx.quadraticCurveTo(this.width * 0.9, this.height - 220, this.width, this.height - 160);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.fill();

    // Foreground Desert Floor
    const groundGrad = this.ctx.createLinearGradient(0, this.baseY, 0, this.height);
    groundGrad.addColorStop(0, '#b86b36');
    groundGrad.addColorStop(0.5, '#783e1b');
    groundGrad.addColorStop(1, '#3d1d0c');
    this.ctx.fillStyle = groundGrad;
    this.ctx.fillRect(0, this.baseY + 30, this.width, this.height - (this.baseY + 30));
  }

  renderSphinxSilhouette(x, y) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(60, 28, 14, 0.6)';
    this.ctx.beginPath();
    // Body & Paws
    this.ctx.ellipse(x + 40, y + 25, 45, 18, 0, 0, Math.PI * 2);
    // Head & Nemes Headdress
    this.ctx.arc(x + 10, y, 16, 0, Math.PI * 2);
    // Headdress flare
    this.ctx.moveTo(x - 5, y + 8);
    this.ctx.lineTo(x - 14, y + 22);
    this.ctx.lineTo(x + 5, y + 20);
    this.ctx.fill();
    this.ctx.restore();
  }

  renderBedrockFoundation() {
    const config = this.getLevelConfig();
    const baseBlockCount = config.layers[0];
    const totalBaseWidth = baseBlockCount * this.blockWidth + 60;
    const startX = (this.width - totalBaseWidth) / 2;
    const foundationY = this.baseY + this.blockHeight;

    // Stone foundation slab
    this.ctx.save();
    this.ctx.fillStyle = '#4a2916';
    this.ctx.fillRect(startX - 10, foundationY, totalBaseWidth + 20, 24);

    // Beveled top highlight
    this.ctx.fillStyle = '#8f522e';
    this.ctx.fillRect(startX - 10, foundationY, totalBaseWidth + 20, 4);

    // Bedrock hieroglyphic etchings
    this.ctx.fillStyle = '#30180c';
    this.ctx.font = '12px serif';
    for (let i = startX + 20; i < startX + totalBaseWidth - 20; i += 40) {
      this.ctx.fillText('𓊹', i, foundationY + 16);
    }
    this.ctx.restore();
  }

  renderPyramidBlocks() {
    for (const b of this.pyramid) {
      this.drawSingleBlock(b.x, b.y, b.width, b.height, b.isCapstone, b.glyph, b.perfect);
    }
  }

  renderTargetGuide() {
    if (this.state !== 'PLAYING' && this.state !== 'DROPPING') return;
    const target = this.getCurrentTargetSlot();
    if (!target) return;

    this.ctx.save();
    
    // Glowing landing hologram guide
    const pulse = Math.sin(Date.now() * 0.006) * 0.25 + 0.75;
    this.ctx.strokeStyle = `rgba(255, 224, 130, ${0.45 * pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);

    if (target.isCapstone) {
      // Triangle Capstone guide
      this.ctx.beginPath();
      this.ctx.moveTo(target.centerX, target.y);
      this.ctx.lineTo(target.x + target.width, target.y + target.height);
      this.ctx.lineTo(target.x, target.y + target.height);
      this.ctx.closePath();
      this.ctx.stroke();

      this.ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
      this.ctx.fill();
    } else {
      // Rectangular Block guide
      this.ctx.strokeRect(target.x, target.y, target.width, target.height);
      this.ctx.fillStyle = `rgba(245, 179, 66, ${0.12 * pulse})`;
      this.ctx.fillRect(target.x, target.y, target.width, target.height);
    }

    // Vertical alignment guide laser beam
    const guideBeamGrad = this.ctx.createLinearGradient(target.centerX, target.y - 180, target.centerX, target.y);
    guideBeamGrad.addColorStop(0, 'rgba(255, 224, 130, 0)');
    guideBeamGrad.addColorStop(1, `rgba(255, 224, 130, ${0.35 * pulse})`);

    this.ctx.fillStyle = guideBeamGrad;
    this.ctx.fillRect(target.centerX - 1.5, target.y - 180, 3, 180);

    // Center target reticle notch
    this.ctx.fillStyle = '#ffe082';
    this.ctx.beginPath();
    this.ctx.arc(target.centerX, target.y, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  renderFlyingAndDroppingBlock() {
    if (this.state === 'PLAYING') {
      const b = this.flyingBlock;
      this.drawSingleBlock(b.x, b.y, b.width, b.height, b.isCapstone, b.glyph, false, true);
    } else if (this.state === 'DROPPING' && this.droppingBlock) {
      const b = this.droppingBlock;
      this.drawSingleBlock(b.x, b.y, b.width, b.height, b.isCapstone, b.glyph, false, true);
    }
  }

  drawSingleBlock(x, y, w, h, isCapstone = false, glyph = '𓋹', perfect = false, isFlying = false) {
    this.ctx.save();

    if (isCapstone) {
      // ==========================================
      // GOLDEN CAPSTONE (PYRAMIDION)
      // ==========================================
      const apexX = x + w / 2;
      const apexY = y;
      const leftX = x;
      const rightX = x + w;
      const baseY = y + h;

      this.ctx.save();
      // Golden halo aura
      this.ctx.shadowColor = '#ffd700';
      this.ctx.shadowBlur = 18;

      // Left face (Lit by morning sun)
      const goldLeftGrad = this.ctx.createLinearGradient(leftX, y, apexX, baseY);
      goldLeftGrad.addColorStop(0, '#fff6d6');
      goldLeftGrad.addColorStop(0.4, '#ffd54f');
      goldLeftGrad.addColorStop(1, '#ffb300');

      this.ctx.fillStyle = goldLeftGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(apexX, apexY);
      this.ctx.lineTo(leftX, baseY);
      this.ctx.lineTo(apexX, baseY);
      this.ctx.closePath();
      this.ctx.fill();

      // Right face (Shaded)
      const goldRightGrad = this.ctx.createLinearGradient(apexX, y, rightX, baseY);
      goldRightGrad.addColorStop(0, '#ffd54f');
      goldRightGrad.addColorStop(0.7, '#d49320');
      goldRightGrad.addColorStop(1, '#9e670d');

      this.ctx.fillStyle = goldRightGrad;
      this.ctx.beginPath();
      this.ctx.moveTo(apexX, apexY);
      this.ctx.lineTo(apexX, baseY);
      this.ctx.lineTo(rightX, baseY);
      this.ctx.closePath();
      this.ctx.fill();

      // Glowing Eye of Ra / Hieroglyphic Sun icon
      this.ctx.fillStyle = '#5c3a03';
      this.ctx.font = `bold ${Math.round(h * 0.45)}px serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('𓇳', apexX, y + h * 0.65);

      this.ctx.restore();

    } else {
      // ==========================================
      // STANDARD CARVED SANDSTONE BLOCK
      // ==========================================
      const bevel = 4;

      // Drop shadow underneath
      if (!isFlying) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        this.ctx.fillRect(x + 2, y + h - 2, w - 4, 5);
      }

      // Main Stone Face Gradient
      const stoneGrad = this.ctx.createLinearGradient(x, y, x, y + h);
      if (perfect) {
        stoneGrad.addColorStop(0, '#f2d399');
        stoneGrad.addColorStop(0.5, '#e0b875');
        stoneGrad.addColorStop(1, '#b58849');
      } else {
        stoneGrad.addColorStop(0, '#deb078');
        stoneGrad.addColorStop(0.5, '#c79257');
        stoneGrad.addColorStop(1, '#9e6834');
      }

      this.ctx.fillStyle = stoneGrad;
      this.ctx.fillRect(x, y, w, h);

      // Top Bevel (Lit by sun)
      this.ctx.fillStyle = perfect ? '#fff0c7' : '#f7d3a1';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + w, y);
      this.ctx.lineTo(x + w - bevel, y + bevel);
      this.ctx.lineTo(x + bevel, y + bevel);
      this.ctx.closePath();
      this.ctx.fill();

      // Left Bevel (Sunlit edge)
      this.ctx.fillStyle = perfect ? '#ffe4a3' : '#eec28a';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + bevel, y + bevel);
      this.ctx.lineTo(x + bevel, y + h - bevel);
      this.ctx.lineTo(x, y + h);
      this.ctx.closePath();
      this.ctx.fill();

      // Right Bevel (Shaded edge)
      this.ctx.fillStyle = '#7a4a20';
      this.ctx.beginPath();
      this.ctx.moveTo(x + w, y);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.lineTo(x + w - bevel, y + h - bevel);
      this.ctx.lineTo(x + w - bevel, y + bevel);
      this.ctx.closePath();
      this.ctx.fill();

      // Bottom Bevel (Dark shade)
      this.ctx.fillStyle = '#573010';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + h);
      this.ctx.lineTo(x + bevel, y + h - bevel);
      this.ctx.lineTo(x + w - bevel, y + h - bevel);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.closePath();
      this.ctx.fill();

      // Stone texture scratches & carved hieroglyph
      this.ctx.fillStyle = perfect ? 'rgba(92, 58, 3, 0.65)' : 'rgba(74, 41, 15, 0.55)';
      this.ctx.font = `${Math.round(h * 0.5)}px serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(glyph, x + w / 2, y + h / 2 + 1);

      // Perfect golden glow border if placed with 100% precision
      if (perfect) {
        this.ctx.strokeStyle = '#ffe082';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }
    }

    this.ctx.restore();
  }

  // ==========================================
  // MAIN ANIMATION LOOP
  // ==========================================
  gameLoop(timestamp) {
    const deltaTime = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state !== 'PAUSED') {
      this.update(deltaTime);
    }

    this.render();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// Initialize Game on DOM Content Loaded
window.addEventListener('DOMContentLoaded', () => {
  window.pyramidGame = new PyramidGame();
});
