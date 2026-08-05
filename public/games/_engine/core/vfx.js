/**
 * ═══════════════════════════════════════════════════════════
 * VISUAL EFFECTS — particles, screen shake, flashes, tweening.
 *
 * The particle system is pooled: sprites are created once and recycled, so a
 * mega-win burst never triggers a garbage-collection stutter in the middle of
 * the moment it exists to celebrate.
 * ═══════════════════════════════════════════════════════════
 */

import { PARTICLES, MOTION } from '../config/engine.config.js';

// ═══════════════════════════════════════════════════════════
// EASING
// ═══════════════════════════════════════════════════════════

export const Ease = Object.freeze({
  linear: (t) => t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outQuint: (t) => 1 - (1 - t) ** 5,
  /** Overshoots then settles — the reel's landing bounce. */
  outBack: (t, s = 1.9) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  outElastic: (t) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1,
});

/**
 * Minimal tween runner driven by the engine's ticker.
 *
 * Deliberately not a general-purpose tween library: everything animated here is
 * a number over a duration with an easing curve, and a hundred lines that do
 * exactly that beat a dependency that does a thousand things.
 */
export class Tweener {
  constructor() {
    this.active = [];
  }

  /**
   * @param {object} opts
   * @param {number} opts.from
   * @param {number} opts.to
   * @param {number} opts.duration seconds
   * @param {(v:number, t:number) => void} opts.onUpdate
   * @param {() => void} [opts.onComplete]
   * @param {(t:number) => number} [opts.ease]
   * @param {number} [opts.delay] seconds
   * @returns {Promise<void>}
   */
  to({ from, to, duration, onUpdate, onComplete, ease = Ease.outCubic, delay = 0 }) {
    return new Promise((resolve) => {
      this.active.push({
        from, to, duration, onUpdate, ease, delay,
        elapsed: 0,
        done: () => {
          onComplete?.();
          resolve();
        },
      });
    });
  }

  /** Advance every running tween. `dt` is in seconds. */
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const tw = this.active[i];
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / tw.duration);
      const eased = tw.ease(t);
      tw.onUpdate(tw.from + (tw.to - tw.from) * eased, t);
      if (t >= 1) {
        this.active.splice(i, 1);
        tw.done();
      }
    }
  }

  /** Clear all tweens and cancel any pending promises. */
  clear() {
    // Resolve all active tweens so their promises don't hang
    const remaining = [...this.active];
    this.active.length = 0;
    for (const tw of remaining) {
      try {
        tw.done();
      } catch {
        // Promise may have already resolved or been garbage collected
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════

/**
 * Pooled particle emitter.
 *
 * Particles are plain sprites sharing one white round texture, tinted per
 * emission — one draw batch regardless of how many are alive.
 */
export class ParticleSystem {
  /**
   * @param {object} pixi     the PIXI module namespace
   * @param {object} container display-list parent
   * @param {object} [config]
   */
  constructor(pixi, container, config = {}) {
    this.pixi = pixi;
    this.config = { ...PARTICLES, ...config };
    this.container = new pixi.Container();
    this.container.eventMode = 'none';
    container.addChild(this.container);

    this.texture = this._createTexture();
    this.pool = [];
    this.live = [];

    for (let i = 0; i < this.config.poolSize; i++) {
      const sprite = new pixi.Sprite(this.texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.pool.push(sprite);
    }
  }

  /** A soft white disc, generated once and tinted per particle. */
  _createTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    return this.pixi.Texture.from(canvas);
  }

  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.count
   * @param {number[]} opts.colors  tints to pick from
   * @param {number} [opts.speed]   base speed, px/s
   * @param {number} [opts.spread]  cone half-angle in radians; omit for 360°
   * @param {number} [opts.angle]   cone centre in radians
   * @param {number} [opts.gravity]
   */
  emit({ x, y, count, colors, speed = 320, spread = Math.PI, angle = -Math.PI / 2, gravity }) {
    const g = gravity ?? this.config.gravity;
    for (let i = 0; i < count; i++) {
      const sprite = this.pool.pop();
      if (!sprite) return; // Pool exhausted — drop the extras rather than allocate.

      const a = angle + (Math.random() * 2 - 1) * spread;
      const v = speed * (0.45 + Math.random() * 0.85);
      const size =
        this.config.size.min + Math.random() * (this.config.size.max - this.config.size.min);
      const life =
        this.config.lifetime.min +
        Math.random() * (this.config.lifetime.max - this.config.lifetime.min);

      sprite.visible = true;
      sprite.x = x;
      sprite.y = y;
      sprite.alpha = 1;
      sprite.tint = colors[(Math.random() * colors.length) | 0];
      sprite.width = sprite.height = size * 2.4;

      this.live.push({ sprite, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, age: 0, gravity: g, size });
    }
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.sprite.visible = false;
        this.pool.push(p.sprite);
        this.live.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      const k = 1 - p.age / p.life;
      p.sprite.alpha = k * k;
      p.sprite.width = p.sprite.height = p.size * 2.4 * (0.4 + k * 0.6);
    }
  }

  clear() {
    for (const p of this.live) {
      p.sprite.visible = false;
      this.pool.push(p.sprite);
    }
    this.live.length = 0;
  }

  destroy() {
    this.clear();
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SCREEN EFFECTS
// ═══════════════════════════════════════════════════════════

/** Decaying positional shake applied to a container. */
export class ScreenShake {
  constructor(target) {
    this.target = target;
    this.baseX = target.x;
    this.baseY = target.y;
    this.amount = 0;
    this.decay = 0;
  }

  /** @param {'small'|'medium'|'large'} intensity */
  trigger(intensity = 'medium') {
    const amp = MOTION.screenShake[intensity] ?? MOTION.screenShake.medium;
    this.amount = Math.max(this.amount, amp);
    this.decay = amp / (MOTION.screenShake.duration / 1000);
  }

  update(dt) {
    if (this.amount <= 0) return;
    this.amount = Math.max(0, this.amount - this.decay * dt);
    this.target.x = this.baseX + (Math.random() * 2 - 1) * this.amount;
    this.target.y = this.baseY + (Math.random() * 2 - 1) * this.amount;
    if (this.amount === 0) {
      this.target.x = this.baseX;
      this.target.y = this.baseY;
    }
  }

  /** Re-read the rest position after a layout change. */
  rebase() {
    this.baseX = this.target.x;
    this.baseY = this.target.y;
  }
}

/** Full-stage colour flash. */
export class Flash {
  constructor(pixi, container, width, height) {
    this.pixi = pixi;
    this.sprite = new pixi.Graphics().rect(0, 0, width, height).fill({ color: 0xffffff });
    this.sprite.alpha = 0;
    this.sprite.eventMode = 'none';
    container.addChild(this.sprite);
    this.remaining = 0;
    this.duration = 0;
    this.peak = 0;
  }

  trigger(color = 0xffffff, peak = 0.45, durationMs = 220) {
    this.sprite.tint = color;
    this.peak = peak;
    this.duration = durationMs / 1000;
    this.remaining = this.duration;
  }

  update(dt) {
    if (this.remaining <= 0) return;
    this.remaining = Math.max(0, this.remaining - dt);
    this.sprite.alpha = this.peak * (this.remaining / this.duration);
  }

  resize(width, height) {
    this.sprite.clear().rect(0, 0, width, height).fill({ color: 0xffffff });
  }
}

export default { Ease, Tweener, ParticleSystem, ScreenShake, Flash };
