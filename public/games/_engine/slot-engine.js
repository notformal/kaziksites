/**
 * ═══════════════════════════════════════════════════════════
 * SLOT ENGINE
 *
 * Renders and drives a slot game from a build-verified math artefact
 * (`math.json`). The engine never decides what a spin is worth — it asks
 * core/math.js, which is the same code the certification build ran. Its job is
 * everything else: reels that spin convincingly, wins that read at a glance,
 * and controls a player can actually operate.
 *
 * Reel motion uses the *real* strip. The symbols blurring past during a spin
 * are the strip the outcome was drawn from, not decorative filler, so the
 * landing never contradicts what the player watched.
 * ═══════════════════════════════════════════════════════════
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from '../../vendor/pixi.mjs';

import { REELS, BETTING, AUTOPLAY, LAYOUT, MOTION, MATH, ENGAGEMENT } from './config/engine.config.js';
import { buildTheme, ramp } from './art/palette.js';
import { drawSymbol, drawSymbolPlate } from './art/symbol-art.js';
import { buildGrid, drawStops, evaluateGrid } from './core/math.js';
import { Translator } from './core/i18n.js';
import { AudioEngine } from './core/audio.js';
import { Tweener, ParticleSystem, ScreenShake, Flash, Ease } from './core/vfx.js';
import { ProvablyFairRng } from './core/rng.js';
import { createShell } from './ui/shell.js';

const mod = (n, m) => ((n % m) + m) % m;

/** Currency-ish formatting; two decimals, thin thousands separator. */
const fmt = (v) =>
  Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export class SlotEngine {
  /**
   * @param {object} options
   * @param {HTMLElement} options.parent  container the game mounts into
   * @param {object} options.manifest     parsed math.json
   * @param {string} [options.language]
   * @param {number} [options.balance]
   */
  constructor({ parent, manifest, language, balance }) {
    if (!parent) throw new Error('SlotEngine requires a parent element');
    if (!manifest?.math?.strips) throw new Error('SlotEngine requires a built math manifest');

    this.parent = parent;
    this.manifest = manifest;
    this.model = manifest.math;
    this.presentation = manifest.presentation;
    this.theme = buildTheme(this.presentation.theme);

    this.translator = new Translator(language);
    this.audio = new AudioEngine();
    this.rng = new ProvablyFairRng();
    this.tweener = new Tweener();

    this.balance = balance ?? BETTING.startingBalance;
    this.betIndex = BETTING.defaultLevelIndex;
    this.lastWin = 0;

    this.spinning = false;
    this.turbo = false;
    this.autoplay = { active: false, remaining: 0, rounds: AUTOPLAY.roundOptions[0] };
    this.freeSpins = { remaining: 0, total: 0, accumulated: 0 };

    this.symbolTextures = new Map();
    this.symbolById = new Map(this.model.symbols.map((s) => [s.id, s]));
    this.artById = new Map(this.presentation.symbols.map((s) => [s.id, s]));

    this.reels = [];
    this.destroyed = false;
  }

  get bet() {
    return BETTING.levels[this.betIndex];
  }

  get t() {
    return (key) => this.translator.t(key);
  }

  // ═══════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════

  async init() {
    await this.rng.init();

    this.shell = createShell({
      parent: this.parent,
      theme: this.theme,
      title: this.manifest.title,
      t: this.t,
      language: this.translator.language,
    });

    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      width: LAYOUT.designWidth,
      height: LAYOUT.designHeight,
    });
    this.shell.el.board.insertBefore(this.app.canvas, this.shell.el.banner);

    this._computeMetrics();
    this._buildSymbolTextures();
    this._buildStage();
    this._bindControls();
    this._bindTicker();
    this._bindResize();

    this._renderPaytable();
    this._syncStats();
    this._layout();

    return this;
  }

  /** Cell size and board geometry, derived from the design canvas. */
  _computeMetrics() {
    const cols = this.model.strips.length;
    const rows = this.model.rows;
    const availW = LAYOUT.designWidth - LAYOUT.boardPadding * 2;
    const availH = LAYOUT.designHeight - LAYOUT.boardPadding * 2;

    const cell = Math.floor(
      Math.min(
        (availW - LAYOUT.symbolGap * (cols - 1)) / cols,
        (availH - LAYOUT.symbolGap * (rows - 1)) / rows,
      ),
    );

    this.metrics = {
      cols,
      rows,
      cell,
      pitch: cell + LAYOUT.symbolGap,
      boardWidth: cell * cols + LAYOUT.symbolGap * (cols - 1),
      boardHeight: cell * rows + LAYOUT.symbolGap * (rows - 1),
    };
    this.metrics.originX = (LAYOUT.designWidth - this.metrics.boardWidth) / 2;
    this.metrics.originY = (LAYOUT.designHeight - this.metrics.boardHeight) / 2;
  }

  /**
   * Bake every symbol to a texture once.
   *
   * Redrawing vector geometry per sprite per frame would be the single most
   * expensive thing a spinning reel could do; a texture swap is nearly free.
   */
  _buildSymbolTextures() {
    const size = this.metrics.cell;
    for (const art of this.presentation.symbols) {
      const container = new Container();

      const plate = new Graphics();
      drawSymbolPlate(plate, size, this.theme);
      plate.position.set(size / 2, size / 2);
      container.addChild(plate);

      const figure = new Graphics();
      drawSymbol(figure, { ...art.art, ramp: ramp(art.art.hue) }, size * 0.86, this.theme);
      figure.position.set(size / 2, size / 2);
      container.addChild(figure);

      // Card ranks carry their letterform over the themed plate.
      if (art.art.glyph) {
        const label = new Text({
          text: art.art.glyph,
          style: new TextStyle({
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: size * 0.44,
            fontWeight: '700',
            fill: this.theme.text,
            stroke: { color: this.theme.metal.rim, width: size * 0.026 },
            dropShadow: {
              color: 0x000000, alpha: 0.55, blur: 4, distance: size * 0.02, angle: Math.PI / 2,
            },
          }),
        });
        label.anchor.set(0.5);
        label.position.set(size / 2, size / 2);
        container.addChild(label);
      }

      const texture = this.app.renderer.generateTexture({
        target: container,
        resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      });
      this.symbolTextures.set(art.id, texture);
      container.destroy({ children: true });
    }
  }

  _buildStage() {
    const { cell, pitch, rows, cols, originX, originY, boardWidth, boardHeight } = this.metrics;

    this.world = new Container();
    this.app.stage.addChild(this.world);

    // ── Backdrop ──
    const backdrop = new Graphics()
      .roundRect(
        originX - LAYOUT.boardPadding * 0.55,
        originY - LAYOUT.boardPadding * 0.55,
        boardWidth + LAYOUT.boardPadding * 1.1,
        boardHeight + LAYOUT.boardPadding * 1.1,
        LAYOUT.cornerRadius * 1.6,
      )
      .fill({ color: this.theme.panel, alpha: 0.66 })
      .stroke({ width: 2, color: this.theme.metal.base, alpha: 0.5 });
    this.world.addChild(backdrop);

    // ── Reels ──
    this.reelLayer = new Container();
    this.world.addChild(this.reelLayer);

    const buffer = REELS.bufferSymbols;
    for (let col = 0; col < cols; col++) {
      const strip = this.model.strips[col];
      const column = new Container();
      column.x = originX + col * pitch;
      column.y = originY;

      // A mask keeps the buffer symbols outside the visible window hidden.
      const mask = new Graphics()
        .roundRect(0, 0, cell, boardHeight, LAYOUT.cornerRadius)
        .fill({ color: 0xffffff });
      column.addChild(mask);
      column.mask = mask;

      const sprites = [];
      const total = rows + buffer * 2;
      for (let i = 0; i < total; i++) {
        const sprite = new Sprite(this.symbolTextures.get(strip[0]));
        sprite.width = cell;
        sprite.height = cell;
        sprite.anchor.set(0.5);
        sprite.x = cell / 2;
        column.addChild(sprite);
        sprites.push(sprite);
      }

      this.reelLayer.addChild(column);
      this.reels.push({
        col, strip, column, sprites, mask,
        position: 0,
        stopped: true,
        spinPromise: null,
      });
      this._renderReel(this.reels[col]);
    }

    // ── Win lines & highlights ──
    this.winLayer = new Graphics();
    this.world.addChild(this.winLayer);
    this.highlightLayer = new Container();
    this.world.addChild(this.highlightLayer);

    // ── Big-win presentation ──
    this.bigWinLayer = new Container();
    this.bigWinLayer.visible = false;
    this.world.addChild(this.bigWinLayer);

    this.bigWinPanel = new Graphics();
    this.bigWinLayer.addChild(this.bigWinPanel);

    this.bigWinTitle = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 44, fontWeight: '900', fill: this.theme.accent.light,
        stroke: { color: 0x000000, width: 6 },
      }),
    });
    this.bigWinTitle.anchor.set(0.5);
    this.bigWinLayer.addChild(this.bigWinTitle);

    this.bigWinAmount = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 58, fontWeight: '900', fill: this.theme.text,
        stroke: { color: 0x000000, width: 6 },
      }),
    });
    this.bigWinAmount.anchor.set(0.5);
    this.bigWinLayer.addChild(this.bigWinAmount);

    // ── Effects ──
    this.particles = new ParticleSystem({ Container, Sprite, Texture }, this.world);
    this.shake = new ScreenShake(this.world);
    this.flash = new Flash({ Graphics }, this.app.stage, LAYOUT.designWidth, LAYOUT.designHeight);
  }

  // ═══════════════════════════════════════════════════════
  // REEL RENDERING
  // ═══════════════════════════════════════════════════════

  /** Paint one reel's sprites for its current fractional position. */
  _renderReel(reel) {
    const { cell, pitch, rows } = this.metrics;
    const buffer = REELS.bufferSymbols;
    const base = Math.floor(reel.position);
    const frac = reel.position - base;

    for (let i = 0; i < reel.sprites.length; i++) {
      const offset = i - buffer;
      const symbolId = reel.strip[mod(base + offset, reel.strip.length)];
      const sprite = reel.sprites[i];
      const texture = this.symbolTextures.get(symbolId);
      if (sprite.texture !== texture) sprite.texture = texture;
      sprite.width = cell;
      sprite.height = cell;
      sprite.y = (offset - frac) * pitch + cell / 2;
      // Motion blur substitute: fade the symbols leaving the window.
      sprite.alpha = offset < -0.5 || offset > rows - 0.5 ? 0.55 : 1;
    }
  }

  /**
   * Spin one reel to a known stop.
   *
   * The reel accelerates through whole strip revolutions and eases into the
   * target with a short overshoot, so the landing has weight instead of
   * snapping. Duration is fixed, not speed — that keeps the left-to-right
   * cascade evenly spaced whatever the strip length.
   */
  _spinReel(reel, stop, { duration, revolutions = 3 }) {
    const len = reel.strip.length;
    const from = reel.position;
    // Land on `stop` after at least `revolutions` whole turns.
    const target = Math.ceil((from + revolutions * len - stop) / len) * len + stop;

    reel.stopped = false;
    return this.tweener
      .to({
        from,
        to: target,
        duration: duration / 1000,
        ease: Ease.outQuint,
        onUpdate: (v) => {
          reel.position = v;
          this._renderReel(reel);
        },
      })
      .then(() =>
        // Settle bounce: a fraction of a symbol past the stop and back.
        this.tweener.to({
          from: target,
          to: target - REELS.bounceOvershoot / this.metrics.pitch,
          duration: REELS.bounceDuration / 2000,
          ease: Ease.outCubic,
          onUpdate: (v) => {
            reel.position = v;
            this._renderReel(reel);
          },
        }),
      )
      .then(() =>
        this.tweener.to({
          from: target - REELS.bounceOvershoot / this.metrics.pitch,
          to: target,
          duration: REELS.bounceDuration / 1000,
          ease: Ease.outBack,
          onUpdate: (v) => {
            reel.position = v;
            this._renderReel(reel);
          },
          onComplete: () => {
            reel.position = mod(target, len);
            reel.stopped = true;
            this._renderReel(reel);
            this.audio.reelStop(reel.col);
          },
        }),
      );
  }

  // ═══════════════════════════════════════════════════════
  // SPIN FLOW
  // ═══════════════════════════════════════════════════════

  async spin() {
    if (this.spinning || this.destroyed) return null;

    const isFree = this.freeSpins.remaining > 0;
    if (!isFree && this.balance < this.bet) {
      this.audio.error();
      this.shell.toast(this.t('insufficientFunds'));
      this._stopAutoplay();
      return null;
    }

    this.spinning = true;
    let spinCompleted = false;
    try {
      this.shell.setBusy(true, this.t('stop'));
      this._clearWinPresentation();

      if (isFree) {
        this.freeSpins.remaining--;
        this.shell.setBanner(
          `${this.t('freeSpinsLeft')}: ${this.freeSpins.remaining} · ×${this.model.freeSpinMultiplier}`,
        );
      } else {
        this.balance -= this.bet;
        this.lastWin = 0;
      }
      this._syncStats();

      await this.rng.nextRound();
      const stops = drawStops(this.model, () => this.rng.random());
      const grid = buildGrid(this.model, stops);

      this.audio.spinStart();

      // ── Anticipation: if two scatters have already landed, the reel that
      //    could complete the trigger spins on for longer. Presentation only —
      //    the outcome was fixed before the first reel moved.
      const scatterId = this.model.scatter?.id;
      const speed = this.turbo ? REELS.turboFactor : 1;
      const spins = [];

      for (let col = 0; col < this.reels.length; col++) {
        let duration = (REELS.spinDuration + col * REELS.reelStagger) / speed;

        if (ENGAGEMENT.anticipation.enabled && scatterId && col >= ENGAGEMENT.anticipation.scattersNeeded) {
          const landed = grid
            .slice(0, col)
            .reduce((n, column) => n + column.filter((id) => id === scatterId).length, 0);
          if (landed >= ENGAGEMENT.anticipation.scattersNeeded) {
            duration += ENGAGEMENT.anticipation.extraDuration / speed;
            this.audio.anticipation(duration / 1000);
          }
        }

        spins.push(this._spinReel(this.reels[col], stops[col], { duration }));
      }

      await Promise.all(spins);

      const multiplier = isFree ? this.model.freeSpinMultiplier : 1;
      const result = evaluateGrid(this.model, grid, this.bet, multiplier);

      this.balance += result.totalWin;
      this.lastWin = isFree ? this.freeSpins.accumulated + result.totalWin : result.totalWin;
      if (isFree) this.freeSpins.accumulated += result.totalWin;
      this._syncStats();

      if (result.totalWin > 0) await this._presentWin(result);

      if (result.freeSpinsAwarded > 0) await this._awardFreeSpins(result.freeSpinsAwarded);

      // ── Autoplay continuation: decide whether to schedule the next spin.
      //    This must run *before* the finally-block so that win/loss gates
      //    (stop on big win, stop on insufficient funds) are respected.
      this._advanceAutoplay(result);

      spinCompleted = true;
      return result;
    } catch (error) {
      console.error('[SlotEngine] Spin error:', error);
      this.shell.toast(this.t('spinError') || 'Error occurred during spin');
      return null;
    } finally {
      // ALWAYS release the spin lock, even on error — prevents permanent game freeze
      this.spinning = false;
      this.shell.setBusy(false, this.t('spin'));

      if (!spinCompleted) {
        // On error, refund the bet unless it was a free spin
        if (!isFree) {
          this.balance += this.bet;
          this._syncStats();
        }
        // Stop autoplay chains on error
        this._stopAutoplay();
        if (this.freeSpins.remaining > 0) {
          this._endFreeSpins();
        }
      }

      // Continue free spin sequence even after error
      if (this.freeSpins.remaining > 0 && !this.destroyed) {
        setTimeout(() => this.spin(), AUTOPLAY.interRoundDelay);
      } else if (this.freeSpins.total > 0 && this.freeSpins.remaining <= 0) {
        this._endFreeSpins();
      }
    }
  }

  async _presentWin(result) {
    const multiple = result.totalWin / this.bet;

    // Dim every position, then restore the winning ones — the eye goes to the
    // line without needing an arrow pointing at it.
    const winning = new Set();
    for (const line of result.lineWins) {
      for (const { col, row } of line.positions) winning.add(`${col}:${row}`);
    }
    for (const { col, row } of result.scatterPositions) winning.add(`${col}:${row}`);
    this._highlight(winning);

    this._drawWinLines(result.lineWins);

    this.audio.win(multiple);
    const colors = [
      this.theme.accent.base, this.theme.accent.light,
      this.theme.secondary.base, this.theme.metal.highlight,
    ];

    if (multiple >= MATH.bigWinMultiplier) {
      const mega = multiple >= MATH.megaWinMultiplier;
      this.audio.bigWin();
      this.shake.trigger(mega ? 'large' : 'medium');
      this.flash.trigger(this.theme.accent.light, mega ? 0.5 : 0.28, 300);
      this.particles.emit({
        x: LAYOUT.designWidth / 2, y: LAYOUT.designHeight / 2,
        count: mega ? 110 : 46, colors, speed: mega ? 520 : 360,
      });
      await this._showBigWin(mega ? this.t('megaWin') : this.t('bigWin'), result.totalWin);
    } else {
      for (const key of winning) {
        const [col, row] = key.split(':').map(Number);
        this.particles.emit({
          x: this.metrics.originX + col * this.metrics.pitch + this.metrics.cell / 2,
          y: this.metrics.originY + row * this.metrics.pitch + this.metrics.cell / 2,
          count: 6, colors, speed: 180,
        });
      }
      await this._wait(MOTION.winLineHold);
    }
  }

  /** Rounded rectangles over the winning cells. */
  _highlight(keys) {
    this.highlightLayer.removeChildren();
    const { cell, pitch, originX, originY } = this.metrics;
    for (const key of keys) {
      const [col, row] = key.split(':').map(Number);
      const g = new Graphics()
        .roundRect(
          originX + col * pitch - 3, originY + row * pitch - 3,
          cell + 6, cell + 6, LAYOUT.cornerRadius,
        )
        .stroke({ width: 3, color: this.theme.accent.light, alpha: 0.95 });
      this.highlightLayer.addChild(g);
      this.tweener.to({
        from: 0.35, to: 1, duration: MOTION.symbolPulsePeriod / 1000,
        ease: Ease.inOutCubic,
        onUpdate: (v) => { g.alpha = v; },
      });
    }
  }

  _drawWinLines(lineWins) {
    this.winLayer.clear();
    const { cell, pitch, originX, originY } = this.metrics;
    lineWins.forEach((win, i) => {
      const points = win.positions.map(({ col, row }) => ({
        x: originX + col * pitch + cell / 2,
        y: originY + row * pitch + cell / 2,
      }));
      if (points.length < 2) return;
      this.winLayer.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) this.winLayer.lineTo(p.x, p.y);
      this.winLayer.stroke({
        width: 5,
        color: i % 2 ? this.theme.secondary.light : this.theme.accent.light,
        alpha: 0.9,
      });
    });
  }

  async _showBigWin(title, amount) {
    this.bigWinTitle.text = title;
    this.bigWinTitle.position.set(LAYOUT.designWidth / 2, LAYOUT.designHeight / 2 - 52);
    this.bigWinAmount.position.set(LAYOUT.designWidth / 2, LAYOUT.designHeight / 2 + 18);

    this.bigWinPanel
      .clear()
      .roundRect(LAYOUT.designWidth / 2 - 230, LAYOUT.designHeight / 2 - 110, 460, 210, 22)
      .fill({ color: this.theme.backgroundDeep, alpha: 0.9 })
      .stroke({ width: 3, color: this.theme.accent.base, alpha: 0.95 });

    this.bigWinLayer.visible = true;
    this.bigWinLayer.alpha = 0;

    await this.tweener.to({
      from: 0, to: 1, duration: 0.22,
      onUpdate: (v) => { this.bigWinLayer.alpha = v; },
    });

    // Count the number up rather than printing it — the climb is the payoff.
    await this.tweener.to({
      from: 0, to: amount, duration: MOTION.countUpDuration / 1000,
      ease: Ease.outCubic,
      onUpdate: (v) => { this.bigWinAmount.text = fmt(v); },
    });

    await this._wait(MOTION.bigWinDuration - MOTION.countUpDuration);
    await this.tweener.to({
      from: 1, to: 0, duration: 0.28,
      onUpdate: (v) => { this.bigWinLayer.alpha = v; },
      onComplete: () => { this.bigWinLayer.visible = false; },
    });
  }

  async _awardFreeSpins(count) {
    const first = this.freeSpins.total === 0;
    this.freeSpins.remaining += count;
    this.freeSpins.total += count;
    if (first) this.freeSpins.accumulated = 0;

    this.audio.freeSpinsAwarded();
    this.flash.trigger(this.theme.secondary.light, 0.4, 320);
    this.particles.emit({
      x: LAYOUT.designWidth / 2, y: LAYOUT.designHeight / 2,
      count: 70, colors: [this.theme.secondary.base, this.theme.accent.light], speed: 440,
    });
    this.shell.setBanner(`${this.t('freeSpins')}: ${count} · ×${this.model.freeSpinMultiplier}`);
    this.shell.toast(`${this.t('freeSpins')} +${count}`);
    await this._wait(1200);
  }

  _endFreeSpins() {
    const total = this.freeSpins.accumulated;
    this.freeSpins = { remaining: 0, total: 0, accumulated: 0 };
    this.shell.setBanner('');
    if (total > 0) this.shell.toast(`${this.t('totalWin')}: ${fmt(total)}`);
  }

  _clearWinPresentation() {
    this.winLayer.clear();
    this.highlightLayer.removeChildren();
  }

  // ═══════════════════════════════════════════════════════
  // AUTOPLAY
  // ═══════════════════════════════════════════════════════

  _advanceAutoplay(result) {
    if (!this.autoplay.active) return;

    if (result && result.totalWin / this.bet >= AUTOPLAY.forceStopOnWinMultiplier) {
      this._stopAutoplay();
      return;
    }
    if (this.balance < this.bet) {
      this._stopAutoplay();
      return;
    }
    this.autoplay.remaining--;
    if (this.autoplay.remaining <= 0) {
      this._stopAutoplay();
      return;
    }
    setTimeout(() => {
      if (this.autoplay.active && !this.spinning) this.spin();
    }, AUTOPLAY.interRoundDelay);
  }

  _startAutoplay() {
    this.autoplay.active = true;
    this.autoplay.remaining = this.autoplay.rounds;
    this.shell.setPressed('auto', true);
    if (!this.spinning) this.spin();
  }

  _stopAutoplay() {
    this.autoplay.active = false;
    this.autoplay.remaining = 0;
    this.shell.setPressed('auto', false);
  }

  // ═══════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════

  _bindControls() {
    const { el } = this.shell;
    const handlers = [];

    // Store handler references for proper cleanup in destroy()
    const on = (action, event, handler) => {
      const node = el.action(action);
      if (node) {
        node.addEventListener(event, handler);
        handlers.push({ node, event, handler });
      }
    };

    // The audio context may only start inside a gesture, so every control unlocks it.
    const gesture = () => this.audio.unlock();
    el.root.addEventListener('pointerdown', gesture, { once: true });
    handlers.push({ node: el.root, event: 'pointerdown', handler: gesture });

    on('spin', () => {
      this.audio.unlock();
      if (this.autoplay.active) this._stopAutoplay();
      else this.spin();
    });

    on('bet-down', () => this._changeBet(-1));
    on('bet-up', () => this._changeBet(1));

    on('turbo', () => {
      this.turbo = !this.turbo;
      this.shell.setPressed('turbo', this.turbo);
      this.audio.click();
    });

    on('auto', () => {
      this.audio.unlock();
      if (this.autoplay.active) this._stopAutoplay();
      else this._startAutoplay();
    });

    on('autoRounds', (e) => {
      this.autoplay.rounds = Number(e.target.value) || AUTOPLAY.roundOptions[0];
    });

    on('sound', () => {
      this.audio.unlock();
      const muted = this.audio.toggleMute();
      this.shell.setPressed('sound', !muted);
      if (!muted) this.audio.click();
    });
    this.shell.setPressed('sound', true);

    on('paytable', () => {
      this.audio.click();
      this.shell.openPaytable();
    });
    on('closePaytable', () => this.shell.closePaytable());

    on('language', (e) => {
      if (this.translator.setLanguage(e.target.value)) {
        this.shell.applyLanguage(this.t);
        this._renderPaytable();
        this.shell.setBusy(this.spinning, this.spinning ? this.t('stop') : this.t('spin'));
      }
    });

    // Keyboard: space spins, escape closes the paytable.
    const onKey = (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.audio.unlock();
        if (!this.spinning) this.spin();
      } else if (e.code === 'Escape') {
        this.shell.closePaytable();
      }
    };
    this._onKey = onKey;
    this.shell.el.root.tabIndex = 0;
    this.shell.el.root.addEventListener('keydown', onKey);
    handlers.push({ node: this.shell.el.root, event: 'keydown', handler: onKey });

    // Store handlers for cleanup
    this._controlHandlers = handlers;
  }

  _changeBet(delta) {
    if (this.spinning || this.freeSpins.remaining > 0) return;
    const next = Math.min(BETTING.levels.length - 1, Math.max(0, this.betIndex + delta));
    if (next === this.betIndex) return;
    this.betIndex = next;
    this.audio.click();
    this._syncStats();
  }

  _syncStats() {
    this.shell.setStats({
      balance: fmt(this.balance),
      bet: fmt(this.bet),
      win: fmt(this.lastWin),
    });
    this.shell.setBetLimits(this.betIndex);
  }

  // ═══════════════════════════════════════════════════════
  // PAYTABLE
  // ═══════════════════════════════════════════════════════

  _renderPaytable() {
    const { el } = this.shell;
    const cert = this.manifest.certification;

    el.paytableSub.textContent = `${this.manifest.title} — ${this.presentation.volatility} volatility`;

    el.facts.innerHTML = [
      [this.t('rtp'), `${(cert.exactRtp * 100).toFixed(2)}%`],
      [this.t('lines'), String(this.model.paylines.length)],
      [this.t('maxWin'), `${this.model.maxWinMultiplier}×`],
      [this.t('freeSpins'), `×${this.model.freeSpinMultiplier}`],
    ]
      .map(([label, value]) => `<li>${label}<b>${value}</b></li>`)
      .join('');

    el.paytableGrid.innerHTML = '';
    const order = { premium: 0, high: 1, mid: 2, low: 3 };
    const entries = [...this.presentation.symbols].sort(
      (a, b) => (order[a.tier] ?? 9) - (order[b.tier] ?? 9),
    );

    for (const art of entries) {
      const model = this.symbolById.get(art.id);
      const row = document.createElement('div');
      row.className = 'kz-pay';

      const canvas = this._symbolThumbnail(art, 46);
      row.appendChild(canvas);

      const text = document.createElement('div');
      const pays = model?.pays
        ? Object.entries(model.pays)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([n, v]) => `${n}× ${v}`)
            .join(' · ')
        : this.model.scatter?.id === art.id
          ? Object.entries(this.model.scatter.pays)
              .sort((a, b) => Number(b[0]) - Number(a[0]))
              .map(([n, v]) => `${n}× ${v}`)
              .join(' · ')
          : '—';
      text.innerHTML = `<b>${art.name}</b><span>${pays}</span>`;
      row.appendChild(text);
      el.paytableGrid.appendChild(row);
    }

    el.paytableNote.innerHTML = `
      <div>${this.t('wild')}</div>
      <div>${this.t('scatter')}</div>
      <div style="margin-top:8px">${this.t('provablyFair')}: <code>${this.rng.commitment?.slice(0, 32) || '—'}…</code></div>
      <div style="margin-top:8px">${this.t('demoNotice')}</div>`;
  }

  /** Small standalone render of a symbol, for the paytable rows. */
  _symbolThumbnail(art, size) {
    const container = new Container();
    const plate = new Graphics();
    drawSymbolPlate(plate, size, this.theme);
    plate.position.set(size / 2, size / 2);
    container.addChild(plate);
    const figure = new Graphics();
    drawSymbol(figure, { ...art.art, ramp: ramp(art.art.hue) }, size * 0.86, this.theme);
    figure.position.set(size / 2, size / 2);
    container.addChild(figure);

    const texture = this.app.renderer.generateTexture({ target: container, resolution: 2 });
    const canvas = this.app.renderer.extract.canvas(texture);
    container.destroy({ children: true });
    texture.destroy(true);

    // `extract.canvas` may hand back an OffscreenCanvas; normalise to a DOM node.
    if (canvas instanceof HTMLCanvasElement) return canvas;
    const dom = document.createElement('canvas');
    dom.width = canvas.width;
    dom.height = canvas.height;
    dom.getContext('2d').drawImage(canvas, 0, 0);
    return dom;
  }

  // ═══════════════════════════════════════════════════════
  // FRAME LOOP & LAYOUT
  // ═══════════════════════════════════════════════════════

  _bindTicker() {
    this.app.ticker.add((ticker) => {
      const dt = Math.min(0.05, ticker.deltaMS / 1000);
      this.tweener.update(dt);
      this.particles.update(dt);
      this.shake.update(dt);
      this.flash.update(dt);
    });
  }

  _bindResize() {
    this._onResize = () => this._layout();
    globalThis.addEventListener('resize', this._onResize);
    if (globalThis.ResizeObserver) {
      this._observer = new ResizeObserver(() => this._layout());
      this._observer.observe(this.shell.el.board);
    }
  }

  /**
   * The stage is a fixed design canvas letterboxed into whatever space the
   * host gives it — so a game embedded in a 320px iframe and one on a 4K
   * monitor lay out identically and only differ in scale.
   */
  _layout() {
    const box = this.shell.el.board.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const scale = Math.min(box.width / LAYOUT.designWidth, box.height / LAYOUT.designHeight);
    this.app.canvas.style.width = `${Math.floor(LAYOUT.designWidth * scale)}px`;
    this.app.canvas.style.height = `${Math.floor(LAYOUT.designHeight * scale)}px`;
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Clean up all event listeners to prevent memory leaks
    this._controlHandlers?.forEach(({ node, event, handler }) => {
      node.removeEventListener(event, handler);
    });
    this._controlHandlers = null;

    globalThis.removeEventListener('resize', this._onResize);
    this._observer?.disconnect();
    this._onResize = null;

    // Clean up key handler (stored separately for slot shell)
    if (this.shell?.el?.root) {
      this.shell.el.root.removeEventListener('keydown', this._onKey);
    }
    this._onKey = null;

    this._stopAutoplay();
    this.tweener.clear();
    this.particles?.destroy();
    this.audio.destroy();
    for (const tex of this.symbolTextures.values()) tex.destroy(true);
    this.app?.destroy(true, { children: true });
    this.shell?.destroy();
  }
}

/**
 * Convenience boot used by every game page: fetch the manifest next to the
 * page, mount the engine, surface a readable error if anything fails.
 *
 * @param {object} options
 * @param {HTMLElement} options.parent
 * @param {string} options.manifestUrl
 */
export async function bootSlot({ parent, manifestUrl = './math.json', ...rest }) {
  if (!parent) throw new Error('bootSlot requires a parent element');

  let response;
  try {
    response = await fetch(manifestUrl);
  } catch (error) {
    throw new Error(`Failed to fetch ${manifestUrl}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Could not load ${manifestUrl} (HTTP ${response.status})`);
  }

  let manifest;
  try {
    const text = await response.text();
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse ${manifestUrl} as JSON: ${error.message}`);
  }

  if (!manifest?.math?.strips) {
    throw new Error(`Invalid math manifest from ${manifestUrl}: missing math.strips`);
  }

  const engine = new SlotEngine({ parent, manifest, ...rest });
  try {
    await engine.init();
    return engine;
  } catch (error) {
    engine.destroy();
    throw new Error(`Failed to initialize slot engine: ${error.message}`);
  }
}

export default SlotEngine;
