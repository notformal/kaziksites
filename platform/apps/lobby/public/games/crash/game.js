import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Все «ручки» игры собраны здесь: границы ставки, тайминги полёта, геометрия
// кривой и порог крупного выигрыша. Формулы роста множителя и кривой — те же,
// что были в оригинале: current = exp(elapsed / multiplierDivisorMs),
// прогресс отрисовки = elapsed / curveFillMs, автозавершение по roundTimeoutMs.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  multiplierDivisorMs: 10000,
  curveFillMs: 12000,
  roundTimeoutMs: 20000,
  // Геометрия кривой — исходные константы отрисовки.
  curveExponent: 2.5,
  curveStepPx: 4,
  curveBottomPad: 35,
  curveTopPad: 100,
  curveFillAlpha: 0.12,
  glowBlur: 18,
  // Щелчки роста множителя: не чаще интервала, высота тона растёт с кратностью.
  tickIntervalMs: 160,
  tickPitchScale: 4,
  tickMaxPitch: 24,
  bigWinMultiplier: 5,
  rocketInset: 10,
};

// Строки именно этой игры на всех 7 языках; общие ключи приходят из i18n.js.
const GAME_STRINGS = {
  en: {
    crashTitle: 'Neon Flight',
    launch: 'Launch',
    waitingBet: 'Waiting for bet',
    inFlight: 'In flight…',
    crashedAt: 'Crashed at {value}×',
    cashedOutAt: 'Cashed out at {value}×',
    sound: 'Sound',
  },
  ru: {
    crashTitle: 'Neon Flight',
    launch: 'Запустить',
    waitingBet: 'Ожидание ставки',
    inFlight: 'В полёте…',
    crashedAt: 'Краш на {value}×',
    cashedOutAt: 'Забрано на {value}×',
    sound: 'Звук',
  },
  uk: {
    crashTitle: 'Neon Flight',
    launch: 'Запустити',
    waitingBet: 'Очікування ставки',
    inFlight: 'У польоті…',
    crashedAt: 'Краш на {value}×',
    cashedOutAt: 'Забрано на {value}×',
    sound: 'Звук',
  },
  es: {
    crashTitle: 'Neon Flight',
    launch: 'Lanzar',
    waitingBet: 'Esperando apuesta',
    inFlight: 'En vuelo…',
    crashedAt: 'Se estrelló en {value}×',
    cashedOutAt: 'Retirado en {value}×',
    sound: 'Sonido',
  },
  de: {
    crashTitle: 'Neon Flight',
    launch: 'Starten',
    waitingBet: 'Warten auf Einsatz',
    inFlight: 'Im Flug…',
    crashedAt: 'Absturz bei {value}×',
    cashedOutAt: 'Ausgezahlt bei {value}×',
    sound: 'Ton',
  },
  fr: {
    crashTitle: 'Neon Flight',
    launch: 'Décoller',
    waitingBet: 'En attente de mise',
    inFlight: 'En vol…',
    crashedAt: 'Crash à {value}×',
    cashedOutAt: 'Encaissé à {value}×',
    sound: 'Son',
  },
  pt: {
    crashTitle: 'Neon Flight',
    launch: 'Lançar',
    waitingBet: 'Aguardando aposta',
    inFlight: 'Em voo…',
    crashedAt: 'Caiu em {value}×',
    cashedOutAt: 'Sacado em {value}×',
    sound: 'Som',
  },
};

const sdk = new CasinoBridge('crash');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

/** Цвета берём из темы игры — кривая всегда в палитре бренда. */
const themeColor = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

let busy = false;
let balance = 0;
let roundId;
let start;
let raf;
let crashed = false;
let lastProgress = 0;
let lastTickAt = 0;

/** Исходная формула кривой: экспоненциальный подъём слева направо. */
function curveY(i, w, h, p) {
  return (
    h -
    CONFIG.curveBottomPad -
    ((Math.exp((i / w) * CONFIG.curveExponent) - 1) / (Math.exp(CONFIG.curveExponent) - 1)) *
      (h - CONFIG.curveTopPad) *
      Math.min(1, p)
  );
}

/** Ракета сидит на вершине кривой; наклон — по касательной в правой точке. */
function moveRocket(w, h, p) {
  const rocket = $('rocket');
  const size = rocket.clientWidth || 44;
  const slope =
    (-(CONFIG.curveExponent / w) * Math.exp(CONFIG.curveExponent) * (h - CONFIG.curveTopPad) * Math.min(1, p)) /
    (Math.exp(CONFIG.curveExponent) - 1);
  const angle = 90 + (Math.atan2(slope, 1) * 180) / Math.PI;
  const cx = w - CONFIG.rocketInset - size / 2;
  const cy = curveY(w, w, h, p);
  rocket.style.transform = `translate(${cx - size / 2}px, ${cy - size / 2}px) rotate(${angle}deg)`;
}

function draw(p = 0) {
  lastProgress = p;
  const ratio = devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const stroke = crashed ? themeColor('--c-loss', '#ff5d73') : themeColor('--c-primary', '#ff5a3c');

  // Мягкая заливка под кривой — глубина сцены без лишнего шума.
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i <= w; i += CONFIG.curveStepPx) ctx.lineTo(i, curveY(i, w, h, p));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.globalAlpha = CONFIG.curveFillAlpha;
  ctx.fillStyle = stroke;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Сама кривая со свечением в цвет темы.
  ctx.beginPath();
  for (let i = 0; i <= w; i += CONFIG.curveStepPx) {
    const y = curveY(i, w, h, p);
    i ? ctx.lineTo(i, y) : ctx.moveTo(i, y);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = CONFIG.glowBlur;
  ctx.stroke();
  ctx.shadowBlur = 0;

  moveRocket(w, h, p);
}

/** Вспышка пламени в точке краша — там, где только что была ракета. */
function puffFlame() {
  const flame = $('flame');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  flame.style.left = `${w - CONFIG.rocketInset - ($('rocket').clientWidth || 44) / 2}px`;
  flame.style.top = `${curveY(w, w, h, lastProgress)}px`;
  flame.dataset.live = 'true';
}

/** Кадр полёта: рост множителя, кривая и учащающиеся щелчки. */
function tick(now) {
  if (!busy) return;
  const elapsed = now - start;
  const current = Math.exp(elapsed / CONFIG.multiplierDivisorMs);
  $('mult').textContent = `${current.toFixed(2)}×`;
  draw(Math.min(1, elapsed / CONFIG.curveFillMs));
  if (now - lastTickAt >= CONFIG.tickIntervalMs) {
    play('tick', {
      pitch: Math.min(CONFIG.tickMaxPitch, Math.round((current - 1) * CONFIG.tickPitchScale)),
    });
    lastTickAt = now;
  }
  if (elapsed >= CONFIG.roundTimeoutMs) finish();
  else raf = requestAnimationFrame(tick);
}

/** Завершение раунда: кэшаут игрока или краш/таймаут — исход решает сервер. */
async function finish(action) {
  if (!busy) return;
  busy = false;
  cancelAnimationFrame(raf);
  $('cashout').disabled = true;

  const settled = await sdk.settle(roundId, action);
  if (settled?.type !== 'ROUND_SETTLED') {
    $('status').textContent = t('settleError');
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    $('play').disabled = false;
    $('play').dataset.idle = 'true';
    return;
  }

  const out = settled.payload.outcome;
  const win = Number(settled.payload.win || 0);
  const crashPoint = Number(out.crashPoint).toFixed(2);
  $('mult').textContent = `${crashPoint}×`;

  if (out.cashedOut) {
    const wonMultiplier = Number(out.cashoutMultiplier);
    const cashedText = t('cashedOutAt', { value: wonMultiplier.toFixed(2) });
    $('mult').dataset.state = 'win';
    $('status').textContent = cashedText;
    $('result').dataset.state = 'win';
    $('result').textContent = `${cashedText} · ${t('youWon', { amount: money(win) })}`;
    play('cashout');
    if (wonMultiplier >= CONFIG.bigWinMultiplier) play('bigWin');
    celebrate({ element: $('win'), from: 0, to: win, multiplier: wonMultiplier, locale: t.locale });
  } else {
    crashed = true;
    draw(lastProgress);
    $('rocket').dataset.visible = 'false';
    puffFlame();
    const crashText = t('crashedAt', { value: crashPoint });
    $('mult').dataset.state = 'lose';
    $('status').textContent = crashText;
    $('result').dataset.state = 'lose';
    $('result').textContent = `${crashText} · ${t('loss')}`;
    play('lose');
    flash('lose');
    shake($('stage'));
  }

  $('play').disabled = false;
  $('play').dataset.idle = 'true';
}

const stepBet = (delta) => {
  $('bet').value = Math.min(
    CONFIG.betMax,
    Math.max(CONFIG.betMin, Math.trunc(Number($('bet').value) + delta)),
  );
  play('tick');
};
$('betUp').onclick = () => stepBet(CONFIG.betStep);
$('betDown').onclick = () => stepBet(-CONFIG.betStep);

$('sound').onclick = (event) => {
  const muted = audio.toggle();
  event.currentTarget.setAttribute('aria-pressed', String(!muted));
  event.currentTarget.textContent = muted ? '♪̶' : '♪';
  if (!muted) play('click');
};

addEventListener('casino:balance', (e) => {
  balance = Number(e.detail.balance);
  $('balance').textContent = money(balance);
  $('play').disabled = busy;
  $('play').dataset.idle = String(!busy);
});

$('play').onclick = async () => {
  if (busy) return;
  const amount = Math.trunc(Number($('bet').value));
  if (amount < CONFIG.betMin) return;
  if (amount > balance) {
    $('result').textContent = t('insufficient');
    $('result').dataset.state = 'lose';
    shake($('play'));
    play('error');
    return;
  }

  busy = true;
  crashed = false;
  lastTickAt = 0;
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('mult').dataset.state = '';
  $('mult').textContent = '1.00×';
  $('win').textContent = '0';
  $('status').textContent = t('waiting');
  $('rocket').dataset.visible = 'true';
  $('flame').dataset.live = 'false';
  play('bet');

  roundId = `crash_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, roundId);
  if (ok?.type !== 'BET_APPROVED') {
    busy = false;
    $('play').disabled = false;
    $('play').dataset.idle = 'true';
    $('result').textContent = t('betRejected');
    $('result').dataset.state = 'lose';
    $('status').textContent = t('waitingBet');
    play('error');
    return;
  }

  $('status').textContent = t('inFlight');
  $('cashout').disabled = false;
  start = performance.now();
  raf = requestAnimationFrame(tick);
};

$('cashout').onclick = () => finish({ type: 'cashout' });

addEventListener('resize', () => draw(lastProgress));

draw();
sdk.start();
