/**
 * ═══════════════════════════════════════════════════════════
 * LIGHTNING DICE ENGINE
 *
 * Three dice, sixteen totals, a straight bet on any of them. Before every roll
 * lightning strikes a few totals and multiplies what they pay.
 *
 * Same split as the slot engine: PIXI draws the dice and the strike effects,
 * DOM carries everything a player reads or clicks. Payouts come from
 * core/dice-math.js — the module the build verified — so the game cannot
 * disagree with its own certification.
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

import { BETTING, LAYOUT, MOTION, MATH } from './config/engine.config.js';
import { buildTheme } from './art/palette.js';
import { TOTALS, drawLightning, rollDice, settle, probability } from './core/dice-math.js';
import { Translator, LANGUAGE_NAMES } from './core/i18n.js';
import { AudioEngine } from './core/audio.js';
import { Tweener, ParticleSystem, ScreenShake, Flash, Ease } from './core/vfx.js';
import { ProvablyFairRng } from './core/rng.js';
import { ensureShellStyle, applyThemeVars } from './ui/shell.js';

const fmt = (v) =>
  Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Stage geometry for the dice tray. */
const TRAY = Object.freeze({
  width: 520,
  height: 190,
  dieSize: 96,
  dieGap: 26,
  pipRadius: 8,
  cornerRadius: 18,
  /** How long the dice tumble before settling, ms. */
  rollDuration: 1100,
  /** Tumbles per second while rolling. */
  tumbleRate: 14,
});

/** Pip layout per face, in unit coordinates from the die centre. */
const PIPS = Object.freeze({
  1: [[0, 0]],
  2: [[-0.26, -0.26], [0.26, 0.26]],
  3: [[-0.26, -0.26], [0, 0], [0.26, 0.26]],
  4: [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]],
  5: [[-0.26, -0.26], [0.26, -0.26], [0, 0], [-0.26, 0.26], [0.26, 0.26]],
  6: [[-0.26, -0.3], [0.26, -0.3], [-0.26, 0], [0.26, 0], [-0.26, 0.3], [0.26, 0.3]],
});

export class DiceEngine {
  constructor({ parent, manifest, language, balance }) {
    if (!parent) throw new Error('DiceEngine requires a parent element');
    if (!manifest?.math?.payouts) throw new Error('DiceEngine requires a built math manifest');

    this.parent = parent;
    this.manifest = manifest;
    this.model = manifest.math;
    this.theme = buildTheme(manifest.presentation.theme);

    this.translator = new Translator(language);
    this.audio = new AudioEngine();
    this.rng = new ProvablyFairRng();
    this.tweener = new Tweener();

    this.balance = balance ?? BETTING.startingBalance;
    this.betIndex = BETTING.defaultLevelIndex;
    this.bets = {};
    this.struck = {};
    this.lastWin = 0;
    this.rolling = false;
    this.destroyed = false;
    this.history = [];
  }

  get chip() {
    return BETTING.levels[this.betIndex];
  }

  get stake() {
    return Object.values(this.bets).reduce((a, b) => a + b, 0);
  }

  get t() {
    return (key) => this.translator.t(key);
  }

  // ═══════════════════════════════════════════════════════

  async init() {
    await this.rng.init();
    ensureShellStyle();
    this._buildDom();

    this.app = new Application();
    await this.app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      width: TRAY.width,
      height: TRAY.height,
    });
    this.el.stage.appendChild(this.app.canvas);

    this._buildTray();
    this._bindTicker();
    this._newRound();
    this._syncStats();
    this._applyLanguage();
    return this;
  }

  _buildDom() {
    const root = applyThemeVars(document.createElement('div'), this.theme);
    root.className = 'kz-shell';

    const langOptions = Object.entries(LANGUAGE_NAMES)
      .map(([c, n]) => `<option value="${c}"${c === this.translator.language ? ' selected' : ''}>${n}</option>`)
      .join('');

    root.innerHTML = `
      <header class="kz-top">
        <span class="kz-title"><i></i>${this.manifest.title}</span>
        <span class="kz-stat"><small data-i18n="balance"></small><b data-field="balance">0</b></span>
        <span class="kz-stat"><small data-i18n="bet"></small><b data-field="stake">0</b></span>
        <span class="kz-stat kz-win"><small data-i18n="win"></small><b data-field="win">0</b></span>
      </header>

      <div class="kz-board">
        <div class="kz-dice-board">
          <div class="kz-dice-stage" data-role="stage"></div>
          <div class="kz-grid" data-role="grid"></div>
        </div>
        <div class="kz-banner" data-role="banner" hidden></div>
      </div>

      <footer class="kz-bottom">
        <button class="kz-tool" data-action="paytable" data-i18n="paytable"></button>
        <button class="kz-tool" data-action="sound" aria-pressed="true" data-i18n="sound"></button>
        <div class="kz-betgroup">
          <button data-action="chip-down" aria-label="Smaller chip">−</button>
          <span class="kz-betval"><small data-i18n="bet"></small><span data-field="chip">0</span></span>
          <button data-action="chip-up" aria-label="Larger chip">+</button>
        </div>
        <button class="kz-spin" data-action="roll" data-i18n="spin"></button>
        <button class="kz-tool" data-action="clear">Clear</button>
        <button class="kz-tool" data-action="repeat">Rebet</button>
        <select class="kz-tool" data-action="language" aria-label="Language">${langOptions}</select>
      </footer>

      <div class="kz-modal" data-role="paytableModal" hidden role="dialog" aria-modal="true" aria-label="Paytable">
        <div class="kz-sheet">
          <button class="kz-close" data-action="closePaytable" aria-label="Close">✕</button>
          <h2 data-i18n="paytable"></h2>
          <p class="kz-sub" data-role="paytableSub"></p>
          <ul class="kz-facts" data-role="facts"></ul>
          <div class="kz-paytable" data-role="paytableGrid"></div>
          <div class="kz-note" data-role="paytableNote"></div>
        </div>
      </div>

      <div class="kz-toast" data-role="toast" role="status" aria-live="polite"></div>
    `;

    this.parent.appendChild(root);
    const $ = (s) => root.querySelector(s);
    this.el = {
      root,
      stage: $('[data-role="stage"]'),
      grid: $('[data-role="grid"]'),
      banner: $('[data-role="banner"]'),
      toast: $('[data-role="toast"]'),
      modal: $('[data-role="paytableModal"]'),
      payGrid: $('[data-role="paytableGrid"]'),
      paySub: $('[data-role="paytableSub"]'),
      payNote: $('[data-role="paytableNote"]'),
      facts: $('[data-role="facts"]'),
      balance: $('[data-field="balance"]'),
      stakeField: $('[data-field="stake"]'),
      win: $('[data-field="win"]'),
      chip: $('[data-field="chip"]'),
      roll: $('[data-action="roll"]'),
      action: (n) => root.querySelector(`[data-action="${n}"]`),
    };

    this._buildGrid();
    this._bindControls();
  }

  /** One button per total, showing its payout and any lightning multiplier. */
  _buildGrid() {
    this.tiles = new Map();
    for (const total of TOTALS) {
      const button = document.createElement('button');
      button.className = 'kz-cellbtn';
      button.dataset.total = String(total);
      button.setAttribute(
        'aria-label',
        `Bet on total ${total}, pays ${this.model.payouts[total]} to 1`,
      );
      button.innerHTML =
        `<b>${total}</b><span data-role="odds">${this.model.payouts[total]}×</span>` +
        `<span class="kz-stakechip" data-role="chip" hidden></span>`;
      button.addEventListener('click', () => this._placeBet(total));
      this.el.grid.appendChild(button);
      this.tiles.set(total, button);
    }
  }

  // ═══════════════════════════════════════════════════════
  // TRAY
  // ═══════════════════════════════════════════════════════

  _buildTray() {
    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.world.addChild(
      new Graphics()
        .roundRect(6, 6, TRAY.width - 12, TRAY.height - 12, TRAY.cornerRadius)
        .fill({ color: this.theme.panel, alpha: 0.7 })
        .stroke({ width: 2, color: this.theme.metal.base, alpha: 0.55 }),
    );

    const span = TRAY.dieSize * 3 + TRAY.dieGap * 2;
    const originX = (TRAY.width - span) / 2;
    const y = TRAY.height / 2;

    this.dice = [];
    for (let i = 0; i < 3; i++) {
      const die = new Container();
      die.position.set(originX + i * (TRAY.dieSize + TRAY.dieGap) + TRAY.dieSize / 2, y);
      const face = new Graphics();
      die.addChild(face);
      this.world.addChild(die);
      this.dice.push({ container: die, face, value: 1 });
      this._drawDie(this.dice[i], 1);
    }

    this.particles = new ParticleSystem({ Container, Sprite, Texture }, this.world);
    this.shake = new ScreenShake(this.world);
    this.flash = new Flash({ Graphics }, this.app.stage, TRAY.width, TRAY.height);
  }

  /** Draw one die face: rounded body, bevel, pips. */
  _drawDie(die, value, { highlight = false } = {}) {
    const s = TRAY.dieSize;
    const half = s / 2;
    const g = die.face;
    g.clear();

    g.roundRect(-half + 3, -half + 5, s, s, TRAY.cornerRadius);
    g.fill({ color: 0x000000, alpha: 0.35 });

    g.roundRect(-half, -half, s, s, TRAY.cornerRadius);
    g.fill({ color: highlight ? this.theme.accent.light : 0xf3f5fb });
    g.roundRect(-half, -half, s, s, TRAY.cornerRadius);
    g.stroke({ width: 2, color: this.theme.metal.rim, alpha: 0.7 });

    // Bevel: a lighter inset along the top-left edge.
    g.roundRect(-half + 6, -half + 6, s - 12, s * 0.3, TRAY.cornerRadius * 0.6);
    g.fill({ color: 0xffffff, alpha: 0.5 });

    for (const [px, py] of PIPS[value]) {
      g.circle(px * s, py * s, TRAY.pipRadius);
      g.fill({ color: highlight ? 0x1a1206 : 0x14161f });
      g.circle(px * s - 2, py * s - 2, TRAY.pipRadius * 0.35);
      g.fill({ color: 0xffffff, alpha: 0.28 });
    }
    die.value = value;
  }

  // ═══════════════════════════════════════════════════════
  // ROUND FLOW
  // ═══════════════════════════════════════════════════════

  /** Draw this round's lightning before any bet is placed. */
  _newRound() {
    // Use the provably-fair RNG for lightning selection to ensure reproducibility
    this.struck = drawLightning(this.model.lightning, () => this.rng?.random() ?? Math.random());
    for (const [total, tile] of this.tiles) {
      const multiplier = this.struck[total];
      tile.dataset.struck = String(Boolean(multiplier));
      tile.dataset.win = 'false';
      tile.querySelector('[data-role="odds"]').textContent = multiplier
        ? `${this.model.payouts[total] * multiplier}×`
        : `${this.model.payouts[total]}×`;
    }
    const struckList = Object.entries(this.struck)
      .map(([t, m]) => `${t}·×${m}`)
      .join('   ');
    this._banner(struckList ? `⚡ ${struckList}` : '');
  }

  _placeBet(total) {
    if (this.rolling) return;
    this.audio.unlock();
    if (this.balance < this.chip) {
      this.audio.error();
      this._toast(this.t('insufficientFunds'));
      return;
    }
    this.balance -= this.chip;
    this.bets[total] = (this.bets[total] || 0) + this.chip;
    this.audio.click();
    this._syncStats();
  }

  _clearBets({ refund = true } = {}) {
    if (this.rolling) return;
    if (refund) this.balance += this.stake;
    this.bets = {};
    this.audio.click();
    this._syncStats();
  }

  async roll() {
    if (this.rolling || this.destroyed) return null;
    if (this.stake <= 0) {
      this.audio.error();
      this._toast(this.t('insufficientFunds'));
      return null;
    }

    let rollCompleted = false;
    try {
      this.rolling = true;
      this.el.roll.dataset.busy = 'true';
      this.el.roll.textContent = this.t('stop');
      this.lastWin = 0;
      for (const tile of this.tiles.values()) tile.dataset.win = 'false';

      await this.rng.nextRound();
      const outcome = rollDice(() => this.rng.random());

      this.audio.spinStart();
      await this._animateRoll(outcome.dice);

      const result = settle(this.model, this.bets, this.struck, outcome.total);
      this.balance += result.payout;
      this.lastWin = result.payout;
      this.history.unshift({ total: outcome.total, multiplier: result.multiplier });
      this.history.length = Math.min(this.history.length, 30);
      this._syncStats();

      const tile = this.tiles.get(outcome.total);
      if (tile) tile.dataset.win = 'true';

      if (result.payout > 0) await this._celebrate(result);
      else this._toast(`${outcome.total} — ${this.t('win')} 0`);

      rollCompleted = true;
      return result;
    } catch (error) {
      console.error('[DiceEngine] Roll error:', error);
      this._toast(this.t('rollError') || 'Error occurred during roll');
      return null;
    } finally {
      // ALWAYS release the rolling lock, even on error
      this.rolling = false;
      this.el.roll.dataset.busy = 'false';
      this.el.roll.textContent = this.t('spin');

      if (!rollCompleted) {
        // On error, refund all bets
        this.balance += this.stake;
        this.bets = {};
        this._syncStats();
      } else {
        // Settled bets are cleared; the round's lightning is redrawn.
        this.bets = {};
        this._newRound();
        this._syncStats();
      }
    }
  }

  /**
   * Tumble the dice, then settle them one at a time left to right — the
   * staggered reveal is what makes a three-dice total feel like it is being
   * counted rather than announced.
   */
  async _animateRoll(finalDice) {
    const tumbleUntil = performance.now() + TRAY.rollDuration;
    const tumble = () =>
      new Promise((resolve) => {
        const step = () => {
          if (performance.now() >= tumbleUntil || this.destroyed) return resolve();
          for (const die of this.dice) {
            this._drawDie(die, 1 + Math.floor(Math.random() * 6));
            die.container.rotation = (Math.random() - 0.5) * 0.25;
          }
          setTimeout(step, 1000 / TRAY.tumbleRate);
        };
        step();
      });

    await tumble();

    for (let i = 0; i < this.dice.length; i++) {
      this._drawDie(this.dice[i], finalDice[i]);
      this.dice[i].container.rotation = 0;
      this.audio.reelStop(i);
      await this.tweener.to({
        from: 1.22,
        to: 1,
        duration: 0.22,
        ease: Ease.outBack,
        onUpdate: (v) => this.dice[i].container.scale.set(v),
      });
    }
  }

  async _celebrate(result) {
    const multiple = result.payout / Math.max(result.stake, 1e-9);
    const colors = [this.theme.accent.base, this.theme.accent.light, this.theme.secondary.base];

    this.audio.win(multiple);
    this.particles.emit({
      x: TRAY.width / 2, y: TRAY.height / 2,
      count: result.struck ? 90 : 36, colors, speed: result.struck ? 460 : 300,
    });

    if (result.struck) {
      this.audio.bigWin();
      this.flash.trigger(this.theme.accent.light, 0.45, 300);
      this.shake.trigger('medium');
      this._toast(`⚡ ${result.total} ×${result.multiplier} — ${fmt(result.payout)}`);
    } else {
      this._toast(`${result.total} — ${this.t('win')} ${fmt(result.payout)}`);
    }

    if (multiple >= MATH.bigWinMultiplier) this.shake.trigger('large');
    await new Promise((r) => setTimeout(r, MOTION.winLineHold));
  }

  // ═══════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════

  _bindControls() {
    const handlers = [];

    // Store handler references for proper cleanup in destroy()
    const on = (action, event, handler) => {
      const node = this.el.action(action);
      if (node) {
        node.addEventListener(event, handler);
        handlers.push({ node, event, handler });
      }
    };

    const gesture = () => this.audio.unlock();
    this.el.root.addEventListener('pointerdown', gesture, { once: true });
    handlers.push({ node: this.el.root, event: 'pointerdown', handler: gesture });

    on('roll', 'click', () => {
      this.audio.unlock();
      this.roll();
    });
    on('clear', 'click', () => this._clearBets());
    on('repeat', 'click', () => {
      if (this.rolling) return;
      const last = this.lastBets;
      if (!last) return;
      const cost = Object.values(last).reduce((a, b) => a + b, 0);
      if (cost > this.balance) {
        this.audio.error();
        this._toast(this.t('insufficientFunds'));
        return;
      }
      this.balance -= cost;
      this.bets = { ...last };
      this.audio.click();
      this._syncStats();
    });
    on('chip-down', 'click', () => this._changeChip(-1));
    on('chip-up', 'click', () => this._changeChip(1));
    on('sound', 'click', () => {
      this.audio.unlock();
      const muted = this.audio.toggleMute();
      this.el.action('sound').setAttribute('aria-pressed', String(!muted));
    });
    on('paytable', 'click', () => {
      this._renderPaytable();
      this.el.modal.hidden = false;
    });
    on('closePaytable', 'click', () => {
      this.el.modal.hidden = true;
    });
    on('language', 'change', (e) => {
      if (this.translator.setLanguage(e.target.value)) this._applyLanguage();
    });

    // Keyboard: space rolls, escape closes paytable
    const onKey = (e) => {
      if (e.target.tagName === 'SELECT') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.audio.unlock();
        if (!this.rolling) this.roll();
      } else if (e.code === 'Escape') {
        this.el.modal.hidden = true;
      }
    };
    this._onKey = onKey;
    this.el.root.tabIndex = 0;
    this.el.root.addEventListener('keydown', onKey);
    handlers.push({ node: this.el.root, event: 'keydown', handler: onKey });

    // Store for cleanup
    this._controlHandlers = handlers;
  }

  _changeChip(delta) {
    const next = Math.min(BETTING.levels.length - 1, Math.max(0, this.betIndex + delta));
    if (next === this.betIndex) return;
    this.betIndex = next;
    this.audio.click();
    this._syncStats();
  }

  _applyLanguage() {
    this.el.root.querySelectorAll('[data-i18n]').forEach((n) => {
      n.textContent = this.t(n.dataset.i18n);
    });
    this.el.roll.textContent = this.rolling ? this.t('stop') : this.t('spin');
  }

  _syncStats() {
    // Remember the last non-empty bet layout so Rebet has something to restore.
    if (this.stake > 0) this.lastBets = { ...this.bets };

    this.el.balance.textContent = fmt(this.balance);
    this.el.stakeField.textContent = fmt(this.stake);
    this.el.win.textContent = fmt(this.lastWin);
    this.el.chip.textContent = fmt(this.chip);
    this.el.action('chip-down').disabled = this.betIndex <= 0;
    this.el.action('chip-up').disabled = this.betIndex >= BETTING.levels.length - 1;

    for (const [total, tile] of this.tiles) {
      const chip = tile.querySelector('[data-role="chip"]');
      const wager = this.bets[total];
      chip.hidden = !wager;
      if (wager) chip.textContent = wager >= 100 ? `${Math.round(wager)}` : fmt(wager);
    }
  }

  _banner(text) {
    this.el.banner.textContent = text || '';
    this.el.banner.hidden = !text;
  }

  _toast(message, ms = 2400) {
    this.el.toast.textContent = message;
    this.el.toast.dataset.show = 'true';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.el.toast.dataset.show = 'false';
    }, ms);
  }

  _renderPaytable() {
    const cert = this.manifest.certification;
    this.el.paySub.textContent = `${this.manifest.title} — three dice, totals 3 to 18`;
    this.el.facts.innerHTML = [
      [this.t('rtp'), `${(cert.averageRtp * 100).toFixed(2)}%`],
      ['Bets', String(TOTALS.length)],
      [this.t('maxWin'), `${this.model.maxWinMultiplier}×`],
      ['Lightning', `×${cert.lightningFactor.toFixed(2)}`],
    ]
      .map(([l, v]) => `<li>${l}<b>${v}</b></li>`)
      .join('');

    this.el.payGrid.innerHTML = TOTALS.map(
      (t) =>
        `<div class="kz-pay"><div><b>Total ${t}</b><span>${this.model.payouts[t]}× · ` +
        `${(probability(t) * 100).toFixed(2)}% · RTP ${(cert.perTotalRtp[t] * 100).toFixed(2)}%</span></div></div>`,
    ).join('');

    const multipliers = Object.keys(this.model.lightning.multipliers).join('×, ×');
    this.el.payNote.innerHTML = `
      <div>Each round, lightning strikes one to three totals and multiplies what they pay (×${multipliers}×).</div>
      <div>Base payouts are set below true odds by exactly what the strikes give back.</div>
      <div style="margin-top:8px">${this.t('provablyFair')}: <code>${this.rng.commitment?.slice(0, 32) || '—'}…</code></div>
      <div style="margin-top:8px">${this.t('demoNotice')}</div>`;
  }

  _bindTicker() {
    this.app.ticker.add((ticker) => {
      const dt = Math.min(0.05, ticker.deltaMS / 1000);
      this.tweener.update(dt);
      this.particles.update(dt);
      this.shake.update(dt);
      this.flash.update(dt);
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    // Clean up all event listeners to prevent memory leaks
    this._controlHandlers?.forEach(({ node, event, handler }) => {
      node.removeEventListener(event, handler);
    });
    this._controlHandlers = null;

    if (this.el?.root) {
      this.el.root.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }

    clearTimeout(this._toastTimer);
    this.tweener.clear();
    this.particles?.destroy();
    this.audio.destroy();
    this.app?.destroy(true, { children: true });
    this.el?.root.remove();
  }
}

/** Boot helper mirroring `bootSlot`. */
export async function bootDice({ parent, manifestUrl = './math.json', ...rest }) {
  if (!parent) throw new Error('bootDice requires a parent element');

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

  if (!manifest?.math?.payouts) {
    throw new Error(`Invalid math manifest from ${manifestUrl}: missing math.payouts`);
  }

  const engine = new DiceEngine({ parent, manifest, ...rest });
  try {
    await engine.init();
    return engine;
  } catch (error) {
    engine.destroy();
    throw new Error(`Failed to initialize dice engine: ${error.message}`);
  }
}

export default DiceEngine;
