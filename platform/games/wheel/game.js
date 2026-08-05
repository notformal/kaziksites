import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';
import { PAYTABLE } from './paytable.generated.js';

// Всё, что задаёт «ощущение» колеса: длительность вращения, число оборотов,
// частота щелчков и порог крупного выигрыша.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  spinMs: 3200,
  fullTurns: 5,
  bigWinMultiplier: 3,
  wheelRadius: 0.46,
  hubRadius: 0.1,
};

const sdk = new CasinoBridge('wheel');
const t = createGameI18n();
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const canvas = $('wheel');
const ctx = canvas.getContext('2d');

let busy = false;
let balance = 0;
let rotation = 0;
let segments = PAYTABLE.segments;

/** Цвета берём из темы игры — колесо всегда в палитре бренда. */
const themeColor = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

function segmentColor(multiplier) {
  if (multiplier === 0) return themeColor('--c-surface-2', '#222');
  if (multiplier < 2) return themeColor('--c-win', '#3ddc84');
  if (multiplier < 3) return themeColor('--c-primary', '#56e4ff');
  return themeColor('--c-gold', '#ffd15c');
}

function draw() {
  const ratio = devicePixelRatio || 1;
  const size = canvas.clientWidth || 360;
  const count = segments.length;
  canvas.width = canvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.rotate(rotation);

  for (let i = 0; i < count; i++) {
    const from = (i / count) * Math.PI * 2;
    const to = ((i + 1) / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size * CONFIG.wheelRadius, from, to);
    ctx.fillStyle = segmentColor(segments[i]);
    ctx.fill();
    ctx.strokeStyle = themeColor('--c-base', '#000');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate((from + to) / 2);
    ctx.fillStyle = themeColor('--c-base', '#06131f');
    ctx.font = `700 ${Math.round(size * 0.05)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${segments[i]}×`, size * 0.42, 5);
    ctx.restore();
  }

  ctx.rotate(-rotation);
  ctx.beginPath();
  ctx.arc(0, 0, size * CONFIG.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = themeColor('--c-surface', '#101828');
  ctx.fill();
  ctx.strokeStyle = themeColor('--c-gold', '#ffd15c');
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

draw();
addEventListener('resize', draw);

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
  $('stage').dataset.spinning = 'false';
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
  play('bet');

  const id = `wheel_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id);
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  segments = out.segments;
  const count = segments.length;
  const from = rotation;
  // Останавливаем центр выигрышного сектора точно под указателем.
  const to =
    from +
    Math.PI * 2 * CONFIG.fullTurns +
    (Math.PI * 2 - ((out.segment + 0.5) / count) * Math.PI * 2) -
    (from % (Math.PI * 2));

  $('stage').dataset.spinning = 'true';
  play('spin');

  await new Promise((resolve) => {
    const started = performance.now();
    let lastSegment = -1;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.spinMs);
      rotation = from + (to - from) * (1 - (1 - progress) ** 3);
      draw();
      // Щелчок на каждом секторе: замедление слышно так же, как видно.
      const segment = Math.floor((rotation / (Math.PI * 2)) * count);
      if (segment !== lastSegment) {
        play('tick', { gain: 0.5 });
        lastSegment = segment;
      }
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  $('stage').dataset.spinning = 'false';
  const win = Number(settled.payload.win || 0);
  const wonMultiplier = out.multiplier;
  $('result').dataset.state = wonMultiplier > 0 ? 'win' : 'lose';
  $('result').textContent = `${wonMultiplier}× · ${
    wonMultiplier > 0 ? t('youWon', { amount: money(win) }) : t('loss')
  }`;

  if (wonMultiplier > 0) {
    play(wonMultiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier: wonMultiplier, locale: t.locale });
  } else {
    play('lose');
    flash('lose');
    shake($('stage'));
  }

  busy = false;
  $('play').disabled = false;
  $('play').dataset.idle = 'true';
};

sdk.start();
