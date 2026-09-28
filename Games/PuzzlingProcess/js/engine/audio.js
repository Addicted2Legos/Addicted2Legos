/**
 * Pop & Protect - Procedural Web Audio API Synthesizer & BGM Engine
 * 100% self-contained: zero external audio assets required.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;

        this.sfxMuted = false;
        this.bgmMuted = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.stepIndex = 0;

        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);

            this.isInitialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }

    resume() {
        if (!this.isInitialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 1. POP! Balloon / Bubble puncture burst
    playPop() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;

        // Noise burst for the rupture
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        filter.Q.setValueAtTime(3.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.08);

        // Low resonant pop thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        oscGain.gain.setValueAtTime(0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // 2. BOING! Rubber / Felt cushion bounce
    playBoing() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // 3. CLANK! Rigid shape impact thud
    playClank(intensity = 1.0) {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

        const vol = Math.min(0.6, 0.2 * intensity);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // 4. ROPE CUT / SWOOSH
    playSlice() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.06;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.06);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.06);
    }

    // 5. STAR COLLECT DING
    playStar(index = 0) {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;
        const pitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const freq = pitches[index % pitches.length];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.18);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // 6. VICTORY FANFARE
    playWin() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const chords = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
        chords.forEach((freq, idx) => {
            const delay = idx * 0.1;
            const now = this.ctx.currentTime + delay;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.45);
        });
    }

    // 7. LOSE / POPPED TROMBONE
    playLose() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const notes = [293.66, 277.18, 261.63, 246.94]; // D4 -> C#4 -> C4 -> B3
        notes.forEach((freq, idx) => {
            const delay = idx * 0.14;
            const now = this.ctx.currentTime + delay;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            // Filter to make comical muted brass sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.16);
        });
    }

    // 8. SNAPPY UI CLICK
    playClick() {
        this.resume();
        if (!this.ctx || this.sfxMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // 9. PROCEDURAL LO-FI BGM SYNTHESIZER
    startBGM() {
        if (this.bgmPlaying) return;
        this.resume();
        this.bgmPlaying = true;

        const chordProgression = [
            // Chord 1: Cmaj7
            { bass: 130.81, treble: [261.63, 329.63, 392.00, 493.88] },
            // Chord 2: Am7
            { bass: 110.00, treble: [220.00, 261.63, 329.63, 392.00] },
            // Chord 3: Fmaj7
            { bass: 87.31,  treble: [174.61, 261.63, 329.63, 392.00] },
            // Chord 4: G7sus4
            { bass: 98.00,  treble: [196.00, 261.63, 293.66, 392.00] }
        ];

        const stepDuration = 280; // ms per step (approx 107 BPM 16th note arpeggios)

        const tickBGM = () => {
            if (!this.bgmPlaying || !this.ctx || this.bgmMuted) {
                this.bgmTimer = setTimeout(tickBGM, stepDuration);
                return;
            }

            const now = this.ctx.currentTime;
            const chordIdx = Math.floor(this.stepIndex / 8) % chordProgression.length;
            const stepInChord = this.stepIndex % 8;
            const currentChord = chordProgression[chordIdx];

            // Bass note on beats 0 and 4
            if (stepInChord === 0 || stepInChord === 4) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                const bassFilter = this.ctx.createBiquadFilter();

                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(currentChord.bass, now);

                bassFilter.type = 'lowpass';
                bassFilter.frequency.setValueAtTime(350, now);

                bassGain.gain.setValueAtTime(0.28, now);
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + (stepDuration * 3.5) / 1000);

                bassOsc.connect(bassFilter);
                bassFilter.connect(bassGain);
                bassGain.connect(this.bgmGain);

                bassOsc.start(now);
                bassOsc.stop(now + (stepDuration * 3.5) / 1000);
            }

            // Arpeggio note
            const arpeggioMap = [0, 1, 2, 3, 2, 1, 2, 3];
            const noteIdx = arpeggioMap[stepInChord];
            const noteFreq = currentChord.treble[noteIdx];

            const arpOsc = this.ctx.createOscillator();
            const arpGain = this.ctx.createGain();

            arpOsc.type = 'sine';
            arpOsc.frequency.setValueAtTime(noteFreq, now);

            arpGain.gain.setValueAtTime(0.12, now);
            arpGain.gain.exponentialRampToValueAtTime(0.001, now + (stepDuration * 1.6) / 1000);

            arpOsc.connect(arpGain);
            arpGain.connect(this.bgmGain);

            arpOsc.start(now);
            arpOsc.stop(now + (stepDuration * 1.6) / 1000);

            this.stepIndex++;
            this.bgmTimer = setTimeout(tickBGM, stepDuration);
        };

        tickBGM();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) clearTimeout(this.bgmTimer);
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        return !this.sfxMuted;
    }

    toggleBGM() {
        this.bgmMuted = !this.bgmMuted;
        if (!this.bgmPlaying && !this.bgmMuted) {
            this.startBGM();
        }
        return !this.bgmMuted;
    }
}

window.soundEngine = new SoundEngine();
