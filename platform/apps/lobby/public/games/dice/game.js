import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея — здесь, а не в разметке: правку баланса ощущений
// (шаг ставки, длительность броска, порог «крупного выигрыша») делают тут.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  rollAnimationMs: 750,
  tickEveryMs: 60,
  bigWinMultiplier: 5,
  houseEdge: 0.99,
  // Цель игрок задаёт в процентах, сервер принимает сотые доли (1..9998).
  targetMinPercent: 2,
  targetMaxPercent: 98,
  serverTargetMin: 1,
  serverTargetMax: 9998,
  diceFaces: 6,
};

const sdk = new CasinoBridge('dice');
const t = createGameI18n();
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);

let busy = false;
let dir = 'over';
let balance = 0;

// Полоса кубиков на сцене: декоративная, но задаёт игре характер.
$('diceTrack').innerHTML = Array.from(
  { length: CONFIG.diceFaces },
  (_, i) => `<img src="art/die-${i + 1}.svg" alt="" loading="lazy">`,
).join('');

/** Цель в сотых долях: зажимаем и по интерфейсу, и по границам сервера. */
const targetPoints = () => {
  const percent = Math.min(
    CONFIG.targetMaxPercent,
    Math.max(CONFIG.targetMinPercent, Number($('target').value) || CONFIG.targetMinPercent),
  );
  return Math.min(CONFIG.serverTargetMax, Math.max(CONFIG.serverTargetMin, Math.round(percent * 100)));
};
const winCount = () => (dir === 'over' ? 9999 - targetPoints() : targetPoints());
const multiplier = () => Math.min(990, (CONFIG.houseEdge * 10000) / winCount());

function refresh() {
  $('mult').textContent = `${multiplier().toFixed(2)}×`;
  $('chance').textContent = `${(winCount() / 100).toFixed(2)}%`;
  for (const [id, active] of [['overBtn', dir === 'over'], ['underBtn', dir === 'under']]) {
    $(id).classList.toggle('is-active', active);
    $(id).setAttribute('aria-pressed', String(active));
  }
}

const setDirection = (next) => {
  dir = next;
  play('tick');
  refresh();
};
$('overBtn').onclick = () => setDirection('over');
$('underBtn').onclick = () => setDirection('under');
$('target').oninput = refresh;

const stepBet = (delta) => {
  const next = Math.min(CONFIG.betMax, Math.max(CONFIG.betMin, Math.trunc(Number($('bet').value) + delta)));
  $('bet').value = next;
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
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('roll').dataset.state = '';
  $('win').textContent = '0';
  play('bet');

  const id = `dice_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, { type: dir, target: targetPoints() });
  if (ok?.type !== 'BET_APPROVED') {
    busy = false;
    $('play').disabled = false;
    $('result').textContent = t('betRejected');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') {
    busy = false;
    $('play').disabled = false;
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const out = settled.payload.outcome;
  const roll = (out.roll / 100).toFixed(2);

  // Прокрутка числа со «щелчками»: ожидание результата — часть удовольствия.
  await new Promise((resolve) => {
    const started = performance.now();
    let lastTick = 0;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.rollAnimationMs);
      if (progress < 1) {
        $('roll').textContent = (Math.random() * 100).toFixed(2);
        if (now - lastTick > CONFIG.tickEveryMs) {
          play('tick', { pitch: Math.round(progress * 12) });
          lastTick = now;
        }
        requestAnimationFrame(frame);
      } else {
        $('roll').textContent = roll;
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });

  const win = Number(settled.payload.win || 0);
  const wonMultiplier = amount > 0 ? win / amount : 0;
  $('roll').dataset.state = out.won ? 'win' : 'lose';
  $('result').dataset.state = out.won ? 'win' : 'lose';
  $('result').textContent = `${t('rolled', { value: roll })} · ${
    out.won ? t('youWon', { amount: money(win) }) : t('loss')
  }`;

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
