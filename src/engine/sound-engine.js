// ═══════════════════════════════════════════════════════════
// SOUND ENGINE — Advanced Audio System
// Multi-channel, pitch control, volume per category
// Designed for KazikSites casino platform
// ═══════════════════════════════════════════════════════════

import { CASINO_CONFIG } from '../config/casino-config.js';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = CASINO_CONFIG.effects.sound.enabled;
    this.masterVolume = CASINO_CONFIG.effects.sound.masterVolume;
    this.maxConcurrent = CASINO_CONFIG.effects.sound.maxConcurrentSounds;
    this.activeSources = 0;
    this.categories = { ...CASINO_CONFIG.effects.sound.categories };
    this.sounds = new Map();
    this.initialized = false;
    this.onWin = null;
    this.onBigWin = null;
    this.onJackpot = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.masterGain.connect(this.analyser);
      this.initialized = true;
    } catch {
      this.enabled = false;
    }
  }

  ensureInit() {
    if (!this.initialized) this.init();
  }

  /**
   * Play a tone with specified parameters
   */
  playTone(freq, duration, type = 'sine', volume = 0.3, detune = 0) {
    if (!this.enabled || !this.ctx) return;
    this.ensureInit();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.activeSources >= this.maxConcurrent) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime(detune, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
      this.activeSources++;
      setTimeout(() => { this.activeSources--; }, duration * 1000);
    } catch { /* silent fail */ }
  }

  /**
   * Play noise burst
   */
  playNoise(duration, volume = 0.2, filterFreq = 10000) {
    if (!this.enabled || !this.ctx) return;
    this.ensureInit();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.activeSources >= this.maxConcurrent) return;

    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      source.stop(this.ctx.currentTime + duration);
      this.activeSources++;
      setTimeout(() => { this.activeSources--; }, duration * 1000);
    } catch { /* silent fail */ }
  }

  // ═══════════════════════════════════════════
  // GAME SOUND EFFECTS
  // ═══════════════════════════════════════════

  // ─── Spin / Roll Sounds ───
  playSpin() {
    this.playTone(400, 0.08, 'square', 0.15);
    setTimeout(() => this.playTone(500, 0.06, 'square', 0.12), 80);
  }

  playRoll() {
    this.playNoise(0.15, 0.1, 3000);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.15), 50);
  }

  playCrashTick() {
    this.playTone(800, 0.03, 'square', 0.1);
  }

  // ─── Win Sounds ───
  playWin() {
    const cfg = this.categories.win;
    const v = (cfg?.volume || 0.8) * (this.enabled ? 1 : 0);
    if (v <= 0) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', v * 0.5), i * 100);
    });
    if (this.onWin) this.onWin();
  }

  playBigWin() {
    const cfg = this.categories.bigWin;
    const v = (cfg?.volume || 1.0) * (this.enabled ? 1 : 0);
    if (v <= 0) return;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'sine', v * 0.4), i * 120);
    });
    if (this.onBigWin) this.onBigWin();
  }

  playJackpot() {
    const cfg = this.categories.jackpot;
    const v = (cfg?.volume || 1.0) * (this.enabled ? 1 : 0);
    if (v <= 0) return;
    [1047, 1319, 1568, 2093, 2637, 3136, 3951, 4186].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.4, 'sine', v * 0.35), i * 80);
    });
    if (this.onJackpot) this.onJackpot();
  }

  // ─── Lightning / Special Effects ───
  playLightning() {
    this.playNoise(0.3, 0.3, 8000);
    setTimeout(() => this.playTone(1200, 0.2, 'sawtooth', 0.2), 50);
    setTimeout(() => this.playTone(1500, 0.3, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(800, 0.15, 'square', 0.15), 150);
  }

  playNearMiss() {
    this.playTone(440, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(415, 0.2, 'sawtooth', 0.08), 100);
  }

  playBonusTrigger() {
    const cfg = this.categories.bigWin;
    const v = (cfg?.volume || 0.8) * (this.enabled ? 1 : 0);
    if (v <= 0) return;
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'sine', v * 0.35), i * 80);
    });
  }

  // ─── UI Sounds ───
  playClick() {
    this.playTone(1000, 0.05, 'sine', 0.15);
  }

  playHover() {
    this.playTone(1200, 0.03, 'sine', 0.08);
  }

  playError() {
    this.playTone(330, 0.15, 'square', 0.15);
    setTimeout(() => this.playTone(277, 0.2, 'square', 0.12), 100);
  }

  // ─── Ambient / Background ───
  playAmbient(type = 'calm') {
    if (!this.enabled || !this.ctx) return;
    const cfg = this.categories.ambient;
    const v = (cfg?.volume || 0.2) * (this.enabled ? 1 : 0);
    if (v <= 0) return;
    
    const freqs = type === 'calm' ? [110, 165, 220] : [130, 196, 262];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 2.0, 'sine', v * 0.3), i * 200);
    });
  }

  // ─── Loss Sound ───
  playLoss() {
    this.playTone(330, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this.playTone(277, 0.2, 'sawtooth', 0.08), 100);
  }

  // ─── Streak / Combo Sounds ───
  playStreak(count) {
    const baseFreq = 400 + (count * 50);
    const clampedFreq = Math.min(baseFreq, 2000);
    this.playTone(clampedFreq, 0.15, 'sine', 0.2);
    if (count >= 5) {
      setTimeout(() => this.playTone(clampedFreq * 1.5, 0.2, 'sine', 0.15), 80);
    }
  }

  // ═══════════════════════════════════════════
  // VOLUME & PITCH CONTROL
  // ═══════════════════════════════════════════

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setCategoryVolume(category, volume) {
    if (!this.categories[category]) return;
    this.categories[category].volume = Math.max(0, Math.min(1, volume));
  }

  setCategoryPitch(category, pitch) {
    if (!this.categories[category]) return;
    this.categories[category].pitch = Math.max(0.5, Math.min(2, pitch));
  }

  mute() {
    this.enabled = false;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  unmute() {
    this.enabled = true;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  toggle() {
    if (this.enabled) this.mute();
    else this.unmute();
    return this.enabled;
  }

  // ═══════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════

  destroy() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.initialized = false;
    }
  }
}

// ═══════════════════════════════════════════
// INSTANCE
// ═══════════════════════════════════════════

const soundEngine = new SoundEngine();
export { soundEngine, SoundEngine };
export default soundEngine;