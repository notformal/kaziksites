import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея Roulette 00 — правка баланса ощущений (шаг ставки,
// тайминги прокрутки лунки, порог «крупного выигрыша») делается только здесь.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  // Длительность прокрутки случайных номеров до серверного результата.
  spinMs: 1600,
  // Частота «щелчков» во время прокрутки.
  tickEveryMs: 70,
  // От этого множителя включается bigWin: straight платит 36×, цвет/чёт — 2×.
  bigWinMultiplier: 10,
  // Американское колесо: 0, 1..36 и «00» (индекс 37).
  pocketCount: 38,
};

// Строки именно этой игры на всех 7 языках витрины. Общие ключи (balance, bet,
// win, waiting, youWon и т.д.) уже живут в i18n.js и здесь не дублируются.
const GAME_STRINGS = {
  en: {
    gameTitle: 'Roulette 00',
    sound: 'Sound',
    betType: 'Bet type',
    betRed: 'Red',
    betBlack: 'Black',
    betEven: 'Even',
    betOdd: 'Odd',
    betStraight: 'Straight (36:1)',
    numberLabel: 'Number (0–36, 37 = 00)',
    landed: 'Landed on {value}',
    colorGreen: 'Green',
  },
  ru: {
    gameTitle: 'Roulette 00',
    sound: 'Звук',
    betType: 'Тип ставки',
    betRed: 'Красное',
    betBlack: 'Чёрное',
    betEven: 'Чёт',
    betOdd: 'Нечёт',
    betStraight: 'Число (36:1)',
    numberLabel: '№ (0–36, 37 = 00)',
    landed: 'Выпало {value}',
    colorGreen: 'Зелёное',
  },
  uk: {
    gameTitle: 'Roulette 00',
    sound: 'Звук',
    betType: 'Тип ставки',
    betRed: 'Червоне',
    betBlack: 'Чорне',
    betEven: 'Парне',
    betOdd: 'Непарне',
    betStraight: 'Число (36:1)',
    numberLabel: '№ (0–36, 37 = 00)',
    landed: 'Випало {value}',
    colorGreen: 'Зелене',
  },
  es: {
    gameTitle: 'Roulette 00',
    sound: 'Sonido',
    betType: 'Tipo de apuesta',
    betRed: 'Rojo',
    betBlack: 'Negro',
    betEven: 'Par',
    betOdd: 'Impar',
    betStraight: 'Pleno (36:1)',
    numberLabel: 'Número (0–36, 37 = 00)',
    landed: 'Salió {value}',
    colorGreen: 'Verde',
  },
  de: {
    gameTitle: 'Roulette 00',
    sound: 'Ton',
    betType: 'Einsatzart',
    betRed: 'Rot',
    betBlack: 'Schwarz',
    betEven: 'Gerade',
    betOdd: 'Ungerade',
    betStraight: 'Zahl (36:1)',
    numberLabel: 'Zahl (0–36, 37 = 00)',
    landed: 'Gefallen: {value}',
    colorGreen: 'Grün',
  },
  fr: {
    gameTitle: 'Roulette 00',
    sound: 'Son',
    betType: 'Type de mise',
    betRed: 'Rouge',
    betBlack: 'Noir',
    betEven: 'Pair',
    betOdd: 'Impair',
    betStraight: 'Plein (36:1)',
    numberLabel: 'Numéro (0–36, 37 = 00)',
    landed: 'Sorti : {value}',
    colorGreen: 'Vert',
  },
  pt: {
    gameTitle: 'Roulette 00',
    sound: 'Som',
    betType: 'Tipo de aposta',
    betRed: 'Vermelho',
    betBlack: 'Preto',
    betEven: 'Par',
    betOdd: 'Ímpar',
    betStraight: 'Número (36:1)',
    numberLabel: 'Número (0–36, 37 = 00)',
    landed: 'Saiu {value}',
    colorGreen: 'Verde',
  },
};

const sdk = new CasinoBridge('roulette-us');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
// Подпись лунки по индексу: последний индекс американского колеса — «00».
const pocketLabel = (index) => (index === CONFIG.pocketCount - 1 ? '00' : String(index));
// Серверный цвет лунки → ключ перевода для строки результата.
const COLOR_KEYS = { red: 'betRed', black: 'betBlack', green: 'colorGreen' };

let busy = false;
let balance = 0;

/** Поле номера показываем только для ставки straight — поведение сохранено. */
const refresh = () => { $('numWrap').hidden = $('betType').value !== 'straight'; };
$('betType').onchange = () => {
  play('tick');
  refresh();
};

const stepBet = (delta) => {
  const next = Math.min(CONFIG.betMax, Math.max(CONFIG.betMin, Math.trunc(Number($('amt').value) + delta)));
  $('amt').value = next;
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

/** Единый выход из раунда по ошибке: текст, состояние, звук. */
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
  const amount = Math.trunc(Number($('amt').value));
  if (amount < CONFIG.betMin) return;
  if (amount > balance) {
    $('result').textContent = t('insufficient');
    $('result').dataset.state = 'lose';
    shake($('play'));
    play('error');
    return;
  }

  // Payload ставки не меняем: straight несёт номер, остальные — только тип.
  const type = $('betType').value;
  const choice = type === 'straight' ? { type, number: Number($('num').value) } : { type };

  busy = true;
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('pocket').dataset.color = '';
  $('pocket').dataset.state = '';
  $('win').textContent = '0';
  play('bet');

  const id = `rus_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, choice);
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');

  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const o = settled.payload.outcome;

  // Прокрутка случайных лунок со «щелчками» до серверного номера:
  // ожидание результата и есть вращение колеса.
  $('stage').dataset.spinning = 'true';
  play('spin');
  await new Promise((resolve) => {
    const started = performance.now();
    let lastTick = 0;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.spinMs);
      if (progress < 1) {
        $('pocket').textContent = pocketLabel(Math.floor(Math.random() * CONFIG.pocketCount));
        if (now - lastTick > CONFIG.tickEveryMs) {
          play('tick', { pitch: Math.round(progress * 12) });
          lastTick = now;
        }
        requestAnimationFrame(frame);
      } else {
        $('pocket').textContent = o.label;
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
  $('stage').dataset.spinning = 'false';
  $('pocket').dataset.color = o.color;
  play('reveal');

  const win = Number(settled.payload.win || 0);
  const wonMultiplier = amount > 0 ? win / amount : 0;
  const won = win > 0;
  $('pocket').dataset.state = won ? 'win' : 'lose';
  $('result').dataset.state = won ? 'win' : 'lose';
  $('result').textContent = `${t('landed', { value: o.label })} · ${t(COLOR_KEYS[o.color] || 'betBlack')} · ${
    won ? t('youWon', { amount: money(win) }) : t('loss')
  }`;

  if (won) {
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
