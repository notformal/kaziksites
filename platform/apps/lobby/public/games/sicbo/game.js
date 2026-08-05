import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея Sic Bo: шаг и границы ставки, тайминги анимации броска
// и порог «крупного выигрыша». Баланс ощущений правится здесь, а не по коду.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  rollMs: 700, // длительность анимации броска костей
  tickEveryMs: 70, // частота смены случайных граней и щелчков
  bigWinMultiplier: 5, // множитель, с которого звучит «крупный выигрыш»
  diceCount: 3,
  faces: 6,
  pipsPerDie: 9, // сетка 3×3 — грань собирается видимостью пипсов в CSS
};

// Строки именно этой игры. Общие ключи (balance, bet, waiting, youWon и т.д.)
// уже есть в i18n.js и здесь не дублируются.
const GAME_STRINGS = {
  en: {
    sound: 'Sound',
    betType: 'Bet type',
    number: 'Number',
    betSmall: 'Small (4–10)',
    betBig: 'Big (11–17)',
    betSingle: 'Single number',
    betAnyTriple: 'Any triple (30:1)',
    betTriple: 'Specific triple (180:1)',
    triple: 'Triple!',
    diceTotal: 'Dice {dice} · total {sum}',
  },
  ru: {
    sound: 'Звук',
    betType: 'Тип ставки',
    number: 'Число',
    betSmall: 'Малое (4–10)',
    betBig: 'Большое (11–17)',
    betSingle: 'На число',
    betAnyTriple: 'Любой трипл (30:1)',
    betTriple: 'Трипл числа (180:1)',
    triple: 'Трипл!',
    diceTotal: 'Кости {dice} · сумма {sum}',
  },
  uk: {
    sound: 'Звук',
    betType: 'Тип ставки',
    number: 'Число',
    betSmall: 'Мале (4–10)',
    betBig: 'Велике (11–17)',
    betSingle: 'На число',
    betAnyTriple: 'Будь-який трипл (30:1)',
    betTriple: 'Трипл числа (180:1)',
    triple: 'Трипл!',
    diceTotal: 'Кістки {dice} · сума {sum}',
  },
  es: {
    sound: 'Sonido',
    betType: 'Tipo de apuesta',
    number: 'Número',
    betSmall: 'Pequeña (4–10)',
    betBig: 'Grande (11–17)',
    betSingle: 'Número exacto',
    betAnyTriple: 'Cualquier triple (30:1)',
    betTriple: 'Triple exacto (180:1)',
    triple: '¡Triple!',
    diceTotal: 'Dados {dice} · total {sum}',
  },
  de: {
    sound: 'Ton',
    betType: 'Einsatzart',
    number: 'Zahl',
    betSmall: 'Klein (4–10)',
    betBig: 'Groß (11–17)',
    betSingle: 'Einzelne Zahl',
    betAnyTriple: 'Beliebiger Drilling (30:1)',
    betTriple: 'Bestimmter Drilling (180:1)',
    triple: 'Drilling!',
    diceTotal: 'Würfel {dice} · Summe {sum}',
  },
  fr: {
    sound: 'Son',
    betType: 'Type de mise',
    number: 'Numéro',
    betSmall: 'Petit (4–10)',
    betBig: 'Grand (11–17)',
    betSingle: 'Numéro exact',
    betAnyTriple: 'Triple quelconque (30:1)',
    betTriple: 'Triple précis (180:1)',
    triple: 'Triple !',
    diceTotal: 'Dés {dice} · total {sum}',
  },
  pt: {
    sound: 'Som',
    betType: 'Tipo de aposta',
    number: 'Número',
    betSmall: 'Pequeno (4–10)',
    betBig: 'Grande (11–17)',
    betSingle: 'Número exato',
    betAnyTriple: 'Qualquer trinca (30:1)',
    betTriple: 'Trinca exata (180:1)',
    triple: 'Trinca!',
    diceTotal: 'Dados {dice} · soma {sum}',
  },
};

const sdk = new CasinoBridge('sicbo');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);

let busy = false;
let balance = 0;

// Три кости на сцене: пипсы рисует CSS по data-value, JS только меняет грань.
$('dice').innerHTML = Array.from(
  { length: CONFIG.diceCount },
  () => `<span class="die" data-value="1">${'<i></i>'.repeat(CONFIG.pipsPerDie)}</span>`,
).join('');
const diceEls = [...$('dice').children];
const setFaces = (values) =>
  diceEls.forEach((die, i) => {
    die.dataset.value = String(values[i]);
  });

// Поле «число» нужно только для ставок на конкретное значение или его трипл.
const refresh = () => {
  const b = $('betType').value;
  $('numWrap').hidden = !(b === 'single' || b === 'triple');
};
$('betType').onchange = () => {
  play('tick');
  refresh();
};
$('num').onchange = () => play('tick');

const stepBet = (delta) => {
  $('amt').value = Math.min(
    CONFIG.betMax,
    Math.max(CONFIG.betMin, Math.trunc(Number($('amt').value) + delta)),
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
  $('play').dataset.idle = 'true';
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

  // Payload ставки не меняется: тип + число для single/triple.
  const b = $('betType').value;
  const choice =
    b === 'single' || b === 'triple' ? { bet: b, number: Number($('num').value) } : { bet: b };

  busy = true;
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('sum').textContent = '—';
  $('sum').dataset.state = '';
  $('dice').dataset.triple = 'false';
  $('win').textContent = '0';
  play('bet');

  const id = `sicbo_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, choice);
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;

  // Бросок: кости кувыркаются и перебирают случайные грани со щелчками.
  // Финальные значения всегда приходят с сервера — визуал не спорит с расчётом.
  $('dice').dataset.rolling = 'true';
  await new Promise((resolve) => {
    const started = performance.now();
    let lastTick = 0;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.rollMs);
      if (progress < 1) {
        if (now - lastTick > CONFIG.tickEveryMs) {
          setFaces(diceEls.map(() => 1 + Math.floor(Math.random() * CONFIG.faces)));
          play('tick', { pitch: Math.round(progress * 8) });
          lastTick = now;
        }
        requestAnimationFrame(frame);
      } else {
        setFaces(out.dice);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
  $('dice').dataset.rolling = 'false';
  play('reveal');

  const win = Number(settled.payload.win || 0);
  const won = win > 0;
  const wonMultiplier = amount > 0 ? win / amount : 0;
  $('dice').dataset.triple = String(Boolean(out.triple));
  $('sum').textContent = String(out.sum);
  $('sum').dataset.state = won ? 'win' : 'lose';
  $('result').dataset.state = won ? 'win' : 'lose';
  $('result').textContent = [
    t('diceTotal', { dice: out.dice.join('-'), sum: out.sum }),
    out.triple ? t('triple') : '',
    won ? t('youWon', { amount: money(win) }) : t('loss'),
  ]
    .filter(Boolean)
    .join(' · ');

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
