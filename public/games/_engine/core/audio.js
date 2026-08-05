/**
 * ═══════════════════════════════════════════════════════════
 * AUDIO — fully synthesised, zero asset files.
 *
 * Every sound the games make is generated from oscillators and shaped noise at
 * runtime. That is a deliberate choice, not a shortcut: it means the audio is
 * unambiguously ours, it costs nothing to download, it cannot go out of sync
 * with a CDN, and a reel-stop can be pitched per game from the same code.
 *
 * The context stays suspended until the first real gesture, because browsers
 * require it and because a game that blares before the player touches anything
 * is a game they mute permanently.
 * ═══════════════════════════════════════════════════════════
 */

import { AUDIO } from '../config/engine.config.js';

export class AudioEngine {
  constructor({ tuning = {} } = {}) {
    this.config = { ...AUDIO, ...tuning };
    this.context = null;
    this.master = null;
    this.muted = false;
    this.ready = false;
    this._destroyed = false;
    this._unlockAttempts = 0;
    this._maxUnlockAttempts = 3;
  }

  /** Lazily create the context; safe to call repeatedly. */
  unlock() {
    if (this._destroyed) return;
    
    if (this.context) {
      if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
      }
      return;
    }
    
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) {
      // Web Audio API not supported — mark as ready=false, audio will be silent
      this.ready = false;
      return;
    }
    
    try {
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = this.config.masterVolume;
      
      // Connect to destination with error handling for permission-denied scenarios
      try {
        this.master.connect(this.context.destination);
      } catch (connectError) {
        console.warn('[AudioEngine] Could not connect to audio destination:', connectError.message);
        // No fallback produces speaker output — audio will be silent until user gesture grants permission
        this.ready = false;
      }
      
      this.ready = true;
      this._unlockAttempts = 0;
    } catch (error) {
      console.warn('[AudioEngine] AudioContext creation failed:', error.message);
      this.context = null;
      this._unlockAttempts++;
      
      // After multiple failures, give up silently to avoid spamming console
      if (this._unlockAttempts >= this._maxUnlockAttempts) {
        this.ready = false;
      }
    }
  }

  setMuted(muted) {
    if (this._destroyed) return this.muted;
    this.muted = muted;
    if (this.master && this.context) {
      try {
        this.master.gain.setTargetAtTime(muted ? 0 : this.config.masterVolume, this.now, 0.02);
      } catch (error) {
        // Gain node may be disconnected — silently ignore
      }
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  get now() {
    return this.context ? this.context.currentTime : 0;
  }
  
  /** Check if audio is actually available (context created and connected). */
  isAvailable() {
    return !this._destroyed && this.ready && this.context?.state !== 'closed';
  }

  /**
   * One shaped tone. Everything else in this class is a composition of these.
   *
   * @param {object} opts
   * @param {number} opts.frequency
   * @param {number} [opts.duration]  seconds
   * @param {number} [opts.gain]      peak gain before the master bus
   * @param {OscillatorType} [opts.type]
   * @param {number} [opts.delay]     seconds from now
   * @param {number} [opts.glide]     frequency to slide to over the duration
   */
  tone({ frequency, duration = 0.16, gain = 0.5, type = 'triangle', delay = 0, glide = null }) {
    if (!this.isAvailable() || this.muted) return;
    
    try {
      const t0 = this.now + delay;
      const osc = this.context.createOscillator();
      const env = this.context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t0);
      if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glide), t0 + duration);

      // Short attack, exponential decay — reads as "plucked" rather than "beeped".
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(env).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (error) {
      // Oscillator creation failed — context may be in a bad state
      this.ready = false;
    }
  }

  /** Filtered noise burst — reel stops, impacts, explosions. */
  noise({ duration = 0.12, gain = 0.35, frequency = 900, q = 3, delay = 0 }) {
    if (!this.isAvailable() || this.muted) return;
    
    try {
      const t0 = this.now + delay;
      const frames = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        // Decaying white noise; the envelope is baked into the buffer so short
        // bursts stay sample-accurate rather than depending on param scheduling.
        data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
      }

      const src = this.context.createBufferSource();
      src.buffer = buffer;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const env = this.context.createGain();
      env.gain.value = gain;

      src.connect(filter).connect(env).connect(this.master);
      src.start(t0);
    } catch (error) {
      // Noise generation failed — context may be in a bad state
      this.ready = false;
    }
  }

  // ── Game events ──────────────────────────────────────────

  click() {
    this.tone({ frequency: this.config.clickFrequency, duration: 0.05, gain: 0.25, type: 'square' });
  }

  spinStart() {
    this.tone({ frequency: 220, glide: 480, duration: 0.28, gain: 0.2, type: 'sawtooth' });
  }

  /** Reel stops rise in pitch left-to-right, so the ear tracks the cascade. */
  reelStop(index = 0) {
    this.noise({
      duration: this.config.reelStopDecay,
      gain: 0.3,
      frequency: this.config.reelStopFrequency * (1 + index * 0.22),
      q: 1.6,
    });
    this.tone({
      frequency: this.config.reelStopFrequency * (1 + index * 0.18),
      duration: 0.09,
      gain: 0.18,
      type: 'sine',
    });
  }

  /** Rising tension tone while an anticipation reel spins on. */
  anticipation(durationSeconds = 0.6) {
    this.tone({
      frequency: this.config.anticipationFrequency,
      glide: this.config.anticipationFrequency * 2.4,
      duration: durationSeconds,
      gain: 0.16,
      type: 'sawtooth',
    });
  }

  /**
   * Win arpeggio. The run gets longer and higher with the size of the win, so
   * a player learns the scale of their result before reading the number.
   */
  win(multiplier) {
    const scale = this.config.winScale;
    const steps = Math.min(scale.length, 2 + Math.floor(Math.log2(1 + Math.max(0, multiplier)) * 1.6));
    for (let i = 0; i < steps; i++) {
      this.tone({
        frequency: scale[i],
        duration: 0.16,
        gain: 0.3,
        type: 'triangle',
        delay: i * 0.07,
      });
    }
  }

  bigWin() {
    this.config.bigWinChord.forEach((f, i) => {
      this.tone({ frequency: f, duration: 0.9, gain: 0.24, type: 'triangle', delay: i * 0.05 });
      this.tone({ frequency: f * 2, duration: 0.6, gain: 0.1, type: 'sine', delay: 0.12 + i * 0.05 });
    });
    this.noise({ duration: 0.5, gain: 0.18, frequency: 2600, q: 0.8, delay: 0.08 });
  }

  freeSpinsAwarded() {
    [0, 1, 2, 3, 4].forEach((i) =>
      this.tone({
        frequency: this.config.winScale[i] * 1.5,
        duration: 0.22,
        gain: 0.26,
        type: 'triangle',
        delay: i * 0.11,
      }),
    );
  }

  error() {
    this.tone({ frequency: 180, glide: 110, duration: 0.22, gain: 0.24, type: 'square' });
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    
    try {
      if (this.context) {
        // Stop all active audio before closing
        if (this.context.state !== 'closed') {
          this.context.close().catch(() => {});
        }
      }
    } catch (error) {
      // Context may already be closed or invalid
    }
    
    this.context = null;
    this.master = null;
    this.ready = false;
  }
}

export default AudioEngine;
