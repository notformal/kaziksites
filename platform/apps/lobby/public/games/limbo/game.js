import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Ощущения игры настраиваются здесь: скорость разгона, порог крупного выигрыша,
// шаг ставки. Ни одно из этих чисел не должно жить в разметке или в логике ниже.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  climbMs: 950,
  tickEveryMs: 55,
  bigWinMultiplier: 10,
  houseEdge: 0.99,
  targetMin: 1.01,
  targetMax: 1000,
};

const sdk = new CasinoBridge('limbo');
const t = createGameI18n();
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);

let busy = false;
let balance = 0;

const target = () =>
  Math.min(CONFIG.targetMax, Math.max(CONFIG.targetMin, Number($('target').value) || CONFIG.targetMin));

function refresh() {
  $('chance').textContent = `${((CONFIG.houseEdge / target()) * 100).toFixed(2)}%`;
  $('payout').textContent = `${target().toFixed(2)}×`;
}
$('target').oninput = refresh;

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
  $('stage').dataset.flight = '';
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
  $('mult').dataset.state = '';
  $('stage').dataset.flight = 'up';
  $('win').textContent = '0';
  play('bet');

  const id = `limbo_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, { target: target() });
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  const result = out.result;

  // Разгон множителя: звук поднимается по высоте вместе с числом.
  await new Promise((resolve) => {
    const started = performance.now();
    let lastTick = 0;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.climbMs);
      const eased = 1 - (1 - progress) ** 2;
      $('mult').textContent = `${(1 + (result - 1) * eased).toFixed(2)}×`;
      if (progress < 1) {
        if (now - lastTick > CONFIG.tickEveryMs) {
          play('tick', { pitch: Math.round(eased * 18) });
          lastTick = now;
        }
        requestAnimationFrame(frame);
      } else {
        $('mult').textContent = `${result.toFixed(2)}×`;
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });

  const win = Number(settled.payload.win || 0);
  const wonMultiplier = amount > 0 ? win / amount : 0;
  $('mult').dataset.state = out.won ? 'win' : 'lose';
  $('result').dataset.state = out.won ? 'win' : 'lose';
  $('stage').dataset.flight = out.won ? 'up' : 'down';
  $('result').textContent = out.won
    ? `${result.toFixed(2)}× · ${t('youWon', { amount: money(win) })}`
    : `${result.toFixed(2)}× < ${target().toFixed(2)}× · ${t('loss')}`;

  if (out.won) {
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

refresh();
sdk.start();
