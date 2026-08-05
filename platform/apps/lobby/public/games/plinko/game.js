import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash, burst } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';
import { PAYTABLE } from './paytable.generated.js';

// Геометрия доски и «ощущение» падения. Сервер решает корзину, клиент лишь
// показывает правдоподобный путь до неё — все параметры пути здесь.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  rows: PAYTABLE.rows,
  buckets: PAYTABLE.multipliers.length,
  dropMs: 1900,
  pegRadius: 4.5,
  ballRadius: 9,
  bounceScale: 0.42,
  bigWinMultiplier: 5,
};

const sdk = new CasinoBridge('plinko');
const t = createGameI18n();
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const canvas = $('board');
const ctx = canvas.getContext('2d');
const themeColor = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

let busy = false;
let balance = 0;
// Таблица известна до первой ставки — игрок видит, за что играет.
let multipliers = PAYTABLE.multipliers;
let highlighted = -1;

/** Координаты колышка ряда r, позиции j — одна формула для отрисовки и пути. */
function pegPosition(row, index, width, height) {
  const top = height * 0.08;
  const bottom = height * 0.78;
  const step = (bottom - top) / CONFIG.rows;
  const spacing = width / (CONFIG.rows + 4);
  return {
    x: width / 2 + (index - row / 2) * spacing,
    y: top + row * step,
  };
}

function drawScene(ball) {
  const ratio = devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Колышки.
  ctx.fillStyle = themeColor('--c-line', '#2a3a4a');
  for (let row = 1; row <= CONFIG.rows; row++) {
    for (let index = 0; index <= row; index++) {
      const { x, y } = pegPosition(row, index, width, height);
      ctx.beginPath();
      ctx.arc(x, y, CONFIG.pegRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Корзины: цвет по величине множителя, победная подсвечивается.
  const bucketWidth = (width * 0.94) / CONFIG.buckets;
  const bucketTop = height - 46;
  for (let i = 0; i < CONFIG.buckets; i++) {
    const value = multipliers[i] ?? 0;
    const x = width * 0.03 + i * bucketWidth;
    const isHit = i === highlighted;
    ctx.fillStyle = isHit
      ? themeColor('--c-gold', '#ffd15c')
      : value >= 3
        ? themeColor('--c-primary', '#39e0b8')
        : value >= 1
          ? themeColor('--c-secondary', '#5ec6ff')
          : themeColor('--c-surface-2', '#16202f');
    ctx.beginPath();
    ctx.roundRect(x + 2, bucketTop, bucketWidth - 4, 34, 8);
    ctx.fill();

    ctx.fillStyle = isHit || value >= 1 ? themeColor('--c-base', '#04121a') : themeColor('--c-muted', '#93a4bd');
    ctx.font = `700 ${Math.max(10, Math.round(bucketWidth * 0.28))}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${value}×`, x + bucketWidth / 2, bucketTop + 22);
  }

  if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CONFIG.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = themeColor('--c-gold', '#ffd15c');
    ctx.shadowColor = themeColor('--c-gold', '#ffd15c');
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

drawScene();
addEventListener('resize', () => drawScene());

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

function fail(key) {
  busy = false;
  $('play').disabled = false;
  $('result').textContent = t(key);
  $('result').dataset.state = 'lose';
  play('error');
}

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
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('win').textContent = '0';
  highlighted = -1;
  play('bet');

  const id = `plinko_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id);
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  multipliers = out.multipliers || multipliers;
  const bin = out.bin;

  // Путь шарика: последовательность отклонений, которая гарантированно
  // приводит в присланную сервером корзину — визуал не спорит с расчётом.
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const rights = bin;
  const steps = Array.from({ length: CONFIG.rows }, (_, i) => (i < rights ? 1 : 0));
  for (let i = steps.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [steps[i], steps[j]] = [steps[j], steps[i]];
  }

  await new Promise((resolve) => {
    const started = performance.now();
    let lastRow = -1;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.dropMs);
      const rowFloat = progress * CONFIG.rows;
      const row = Math.min(CONFIG.rows - 1, Math.floor(rowFloat));
      const local = rowFloat - row;

      let index = 0;
      for (let i = 0; i < row; i++) index += steps[i];
      const start = pegPosition(row, index, width, height);
      const end = pegPosition(row + 1, index + steps[row], width, height);
      const x = start.x + (end.x - start.x) * local;
      // Небольшая дуга между колышками — движение читается как отскок.
      const y = start.y + (end.y - start.y) * local - Math.sin(local * Math.PI) * (end.y - start.y) * CONFIG.bounceScale;

      drawScene({ x, y });
      if (row !== lastRow) {
        play('tick', { gain: 0.35, pitch: row });
        lastRow = row;
      }
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  highlighted = bin;
  drawScene();

  const win = Number(settled.payload.win || 0);
  const multiplier = out.multiplier;
  $('result').dataset.state = multiplier >= 1 ? 'win' : 'lose';
  $('result').textContent = `${t('pocket')} ${bin + 1} · ${multiplier}× · ${
    win > 0 ? t('youWon', { amount: money(win) }) : t('loss')
  }`;

  if (multiplier >= 1) {
    play(multiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    burst($('stage'));
    celebrate({ element: $('win'), from: 0, to: win, multiplier, locale: t.locale });
  } else {
    play('lose');
    flash('lose');
  }

  busy = false;
  $('play').disabled = false;
  $('play').dataset.idle = 'true';
};

sdk.start();
