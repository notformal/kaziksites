// ═══════════════════════════════════════════════════════════
// VFX ENGINE — Visual Effects System
// Particle systems, screen shake, flash effects
// Designed for KazikSites casino platform
// ═══════════════════════════════════════════════════════════

import { CASINO_CONFIG } from '../config/casino-config.js';

// ═══════════════════════════════════════════
// PARTICLE CONFIG
// ═══════════════════════════════════════════
const PARTICLE_PRESETS = Object.freeze({
  coin: {
    shape: 'circle',
    colors: ['#FFD700', '#FFA500', '#FFD700', '#FFF8DC'],
    sizeRange: [4, 8],
    gravity: 0.15,
    friction: 0.99,
    lifetime: 180,
    spread: Math.PI * 2,
    speedRange: [2, 6],
  },
  star: {
    shape: 'star',
    colors: ['#FFD700', '#FFF8DC', '#FFA500', '#FFE4B5'],
    sizeRange: [6, 14],
    gravity: 0.08,
    friction: 0.98,
    lifetime: 200,
    spread: Math.PI * 2,
    speedRange: [1, 5],
    rotation: true,
    rotSpeed: [0.05, 0.15],
  },
  heart: {
    shape: 'heart',
    colors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FF6EB4'],
    sizeRange: [8, 16],
    gravity: -0.05,
    friction: 0.99,
    lifetime: 150,
    spread: Math.PI,
    speedRange: [1, 4],
    float: true,
  },
  spark: {
    shape: 'spark',
    colors: ['#FFFFFF', '#FFFF00', '#FFA500', '#FF6347'],
    sizeRange: [2, 5],
    gravity: 0.2,
    friction: 0.97,
    lifetime: 60,
    spread: Math.PI * 2,
    speedRange: [4, 10],
    trail: true,
  },
  lightning: {
    shape: 'line',
    colors: ['#00E5FF', '#00BFFF', '#1E90FF', '#FFFFFF'],
    sizeRange: [2, 4],
    gravity: 0,
    friction: 0.95,
    lifetime: 30,
    spread: Math.PI * 2,
    speedRange: [8, 20],
    flash: true,
  },
  confetti: {
    shape: 'rect',
    colors: ['#FF1744', '#00E676', '#2979FF', '#FFEA00', '#FF9100', '#D500F9', '#00BFA5'],
    sizeRange: [5, 10],
    gravity: 0.12,
    friction: 0.98,
    lifetime: 240,
    spread: Math.PI * 2,
    speedRange: [2, 5],
    rotation: true,
    rotSpeed: [0.1, 0.3],
    wobble: true,
  },
  gem: {
    shape: 'diamond',
    colors: ['#00E5FF', '#AA00FF', '#FF1493', '#00FF88', '#FFD700'],
    sizeRange: [6, 12],
    gravity: 0.1,
    friction: 0.98,
    lifetime: 180,
    spread: Math.PI * 2,
    speedRange: [1, 4],
    glow: true,
    glowColor: true,
  },
  fire: {
    shape: 'circle',
    colors: ['#FF4500', '#FF6347', '#FFA500', '#FFD700', '#FFFF00'],
    sizeRange: [4, 12],
    gravity: -0.15,
    friction: 0.97,
    lifetime: 100,
    spread: Math.PI,
    speedRange: [1, 4],
    rise: true,
    fadeColor: true,
  },
});

// ═══════════════════════════════════════════
// PARTICLE CLASS
// ═══════════════════════════════════════════
class Particle {
  constructor(x, y, preset, color) {
    this.x = x;
    this.y = y;
    this.preset = preset;
    this.color = color || preset.colors[Math.floor(Math.random() * preset.colors.length)];
    this.size = preset.sizeRange[0] + Math.random() * (preset.sizeRange[1] - preset.sizeRange[0]);
    const angle = preset.spread ? (Math.random() * preset.spread) : (Math.random() * Math.PI * 2);
    const speed = preset.speedRange[0] + Math.random() * (preset.speedRange[1] - preset.speedRange[0]);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = preset.lifetime;
    this.maxLife = preset.lifetime;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = preset.rotation ? (preset.rotSpeed[0] + Math.random() * (preset.rotSpeed[1] - preset.rotSpeed[0])) : 0;
    this.alpha = 1;
    this.wobblePhase = Math.random() * Math.PI * 2;
  }

  update() {
    const p = this.preset;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= p.friction;
    this.vy *= p.friction;
    this.vy += p.gravity;
    this.rotation += this.rotSpeed;
    this.life--;
    this.alpha = Math.max(0, this.life / this.maxLife);
    
    if (p.wobble) {
      this.wobblePhase += 0.1;
      this.x += Math.sin(this.wobblePhase) * 0.5;
    }
    
    if (p.rise) {
      this.vy -= 0.05;
    }
    
    if (p.fadeColor && this.alpha < 0.5) {
      this.color = '#FFFF00';
    }
    
    return this.life > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    
    switch (this.preset.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'star':
        this.drawStar(ctx, 0, 0, 5, this.size / 2, this.size / 4);
        break;
      case 'heart':
        this.drawHeart(ctx, 0, 0, this.size);
        break;
      case 'spark':
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.stroke();
        break;
      case 'line':
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size / 3;
        ctx.beginPath();
        ctx.moveTo(-this.size * 2, 0);
        ctx.lineTo(this.size * 2, 0);
        ctx.stroke();
        break;
      case 'rect':
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(this.size / 2, 0);
        ctx.lineTo(0, this.size / 2);
        ctx.lineTo(-this.size / 2, 0);
        ctx.closePath();
        ctx.fill();
        if (this.preset.glow) {
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 10;
          ctx.fill();
        }
        break;
    }
    
    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  }

  drawHeart(ctx, cx, cy, size) {
    const s = size / 20;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10 * s);
    ctx.bezierCurveTo(cx - 30 * s, cy - 10 * s, cx - 20 * s, cy - 30 * s, cx, cy - 20 * s);
    ctx.bezierCurveTo(cx + 20 * s, cy - 30 * s, cx + 30 * s, cy - 10 * s, cx, cy + 10 * s);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = CASINO_CONFIG.effects.vfx.particles.maxParticles;
    this.onComplete = null;
  }

  emit(x, y, presetName, count = 20) {
    const preset = PARTICLE_PRESETS[presetName];
    if (!preset) return;
    
    const remaining = this.maxParticles - this.particles.length;
    const actualCount = Math.min(count, remaining);
    
    for (let i = 0; i < actualCount; i++) {
      this.particles.push(new Particle(x, y, preset));
    }
  }

  update() {
    this.particles = this.particles.filter(p => p.update());
    return this.particles.length === 0;
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }

  get count() {
    return this.particles.length;
  }
}

// ═══════════════════════════════════════════
// SCREEN SHAKE SYSTEM
// ═══════════════════════════════════════════
class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.maxIntensity = CASINO_CONFIG.effects.vfx.screenShake.maxIntensity;
    this.decay = 0.9;
    this.active = false;
  }

  trigger(intensity) {
    this.intensity = Math.min(intensity, this.maxIntensity);
    this.active = true;
  }

  update() {
    if (!this.active) return { x: 0, y: 0 };
    if (this.intensity < 0.1) {
      this.active = false;
      this.intensity = 0;
      return { x: 0, y: 0 };
    }
    const x = (Math.random() - 0.5) * this.intensity * 2;
    const y = (Math.random() - 0.5) * this.intensity * 2;
    this.intensity *= this.decay;
    return { x, y };
  }

  clear() {
    this.intensity = 0;
    this.active = false;
  }
}

// ═══════════════════════════════════════════
// FLASH EFFECT SYSTEM
// ═══════════════════════════════════════════
class FlashSystem {
  constructor() {
    this.flashes = [];
    this.maxFlashes = CASINO_CONFIG.effects.vfx.flashEffects.maxFlashes;
  }

  trigger(color = '#FFFFFF', duration = 150) {
    if (this.flashes.length >= this.maxFlashes) return;
    this.flashes.push({
      color,
      startTime: Date.now(),
      duration,
      alpha: 0.8,
    });
  }

  update() {
    const now = Date.now();
    this.flashes = this.flashes.filter(f => {
      const elapsed = now - f.startTime;
      if (elapsed >= f.duration) return false;
      f.alpha = 0.8 * (1 - elapsed / f.duration);
      return true;
    });
    return this.flashes.length === 0;
  }

  draw(ctx) {
    this.flashes.forEach(f => {
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    });
  }

  clear() {
    this.flashes = [];
  }
}

// ═══════════════════════════════════════════
// TEXT POPUP SYSTEM
// ═══════════════════════════════════════════
class TextPopup {
  constructor() {
    this.popups = [];
  }

  add(text, x, y, color = '#FFD700', size = 24) {
    this.popups.push({
      text, x, y, color, size,
      startTime: Date.now(),
      duration: 1500,
      alpha: 1,
      scale: 0.5,
    });
  }

  update() {
    const now = Date.now();
    this.popups = this.popups.filter(p => {
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) return false;
      const progress = elapsed / p.duration;
      p.alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
      p.scale = progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1 + Math.sin(progress * Math.PI) * 0.1;
      p.y -= 0.5;
      return true;
    });
    return this.popups.length === 0;
  }

  draw(ctx) {
    this.popups.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.font = `bold ${p.size * p.scale}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    });
  }

  clear() {
    this.popups = [];
  }
}

// ═══════════════════════════════════════════
// VFX ENGINE (Main)
// ═══════════════════════════════════════════
class VFXEngine {
  constructor() {
    this.enabled = CASINO_CONFIG.effects.vfx.enabled;
    this.particleSystem = new ParticleSystem();
    this.screenShake = new ScreenShake();
    this.flashSystem = new FlashSystem();
    this.textPopups = new TextPopup();
    this.onBigWin = null;
    this.onJackpot = null;
  }

  // ─── Win Effects ───
  playWinEffect(x, y) {
    if (!this.enabled) return;
    this.particleSystem.emit(x, y, 'coin', 20);
    this.particleSystem.emit(x, y, 'spark', 10);
    this.screenShake.trigger(2);
    this.flashSystem.trigger('#FFD700', 100);
    this.textPopups.add('WIN!', x, y - 30, '#FFD700', 20);
  }

  playBigWinEffect(x, y) {
    if (!this.enabled) return;
    this.particleSystem.emit(x, y, 'star', 40);
    this.particleSystem.emit(x, y, 'coin', 30);
    this.particleSystem.emit(x, y, 'confetti', 50);
    this.particleSystem.emit(x, y, 'spark', 20);
    this.screenShake.trigger(5);
    this.flashSystem.trigger('#FFD700', 200);
    this.flashSystem.trigger('#FFFFFF', 100);
    this.textPopups.add('BIG WIN!', x, y - 40, '#FFD700', 32);
    if (this.onBigWin) this.onBigWin();
  }

  playJackpotEffect(x, y) {
    if (!this.enabled) return;
    this.particleSystem.emit(x, y, 'confetti', 80);
    this.particleSystem.emit(x, y, 'star', 50);
    this.particleSystem.emit(x, y, 'gem', 40);
    this.particleSystem.emit(x, y, 'spark', 30);
    this.particleSystem.emit(x, y, 'lightning', 20);
    this.particleSystem.emit(x, y, 'fire', 30);
    this.screenShake.trigger(8);
    this.flashSystem.trigger('#FFD700', 300);
    this.flashSystem.trigger('#FFFFFF', 150);
    this.flashSystem.trigger('#00E5FF', 100);
    this.textPopups.add('🎰 JACKPOT! 🎰', x, y - 50, '#FFD700', 40);
    if (this.onJackpot) this.onJackpot();
  }

  playBonusEffect(x, y) {
    if (!this.enabled) return;
    this.particleSystem.emit(x, y, 'heart', 25);
    this.particleSystem.emit(x, y, 'spark', 15);
    this.screenShake.trigger(2);
    this.textPopups.add('BONUS!', x, y - 30, '#FF69B4', 28);
  }

  playNearMissEffect(x, y) {
    if (!this.enabled) return;
    this.screenShake.trigger(1.5);
    this.flashSystem.trigger('#FF1744', 80);
  }

  playStreakEffect(x, y, count) {
    if (!this.enabled) return;
    const color = count >= 10 ? '#FFD700' : count >= 5 ? '#00E676' : '#2979FF';
    this.particleSystem.emit(x, y, 'spark', count * 3);
    this.textPopups.add(`${count}x STREAK!`, x, y - 25, color, 22);
  }

  // ─── Game Type Effects ───
  playCrashEffect(x, y, crashed) {
    if (!this.enabled) return;
    if (crashed) {
      this.screenShake.trigger(4);
      this.flashSystem.trigger('#FF1744', 150);
      this.particleSystem.emit(x, y, 'spark', 15);
    } else {
      this.particleSystem.emit(x, y, 'coin', 5);
    }
  }

  playPlinkoEffect(x, y, multiplier) {
    if (!this.enabled) return;
    if (multiplier >= 50) {
      this.playJackpotEffect(x, y);
    } else if (multiplier >= 10) {
      this.playBigWinEffect(x, y);
    } else if (multiplier >= 3) {
      this.playWinEffect(x, y);
    } else {
      this.particleSystem.emit(x, y, 'coin', 8);
    }
  }

  // ─── Animation Loop ───
  update() {
    if (!this.enabled) return;
    this.particleSystem.update();
    this.screenShake.update();
    this.flashSystem.update();
    this.textPopups.update();
  }

  draw(ctx) {
    if (!this.enabled) return;
    this.particleSystem.draw(ctx);
    this.textPopups.draw(ctx);
    this.flashSystem.draw(ctx);
  }

  get shakeOffset() {
    return this.screenShake.update();
  }

  clear() {
    this.particleSystem.clear();
    this.screenShake.clear();
    this.flashSystem.clear();
    this.textPopups.clear();
  }

  destroy() {
    this.clear();
  }
}

// ═══════════════════════════════════════════
// INSTANCE
// ═══════════════════════════════════════════

const vfxEngine = new VFXEngine();
export { vfxEngine, VFXEngine, ParticleSystem, ScreenShake, FlashSystem, TextPopup };
export default vfxEngine;