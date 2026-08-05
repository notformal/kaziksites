import { HiloBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея — здесь, а не в разметке: шаг ставки, порог «крупного
// выигрыша» и тайминги карты правятся в одном месте.
const CONFIG = {
  betStep: 10, // шаг степпера ставки
  betMin: 1, // нижняя граница ставки
  betMax: 100000, // верхняя граница ставки
  bigWinMultiplier: 5, // от этого множителя кэшаут получает фанфары bigWin
  cardFlipMs: 340, // полуоборот карты до рубашки (чуть больше --d-base темы luxe)
  revealPitchStep: 2, // рост высоты звука reveal с каждым верным шагом серии
};

// Строки именно этой игры. Общие ключи (balance, bet, win, cashout, waiting,
// betRejected, settleError, youWon, insufficient, serverResult…) живут в i18n.js.
// Кириллица записана \u-эскейпами, читаемый текст — в комментариях рядом.
const GAME_STRINGS = {
  en: {
    sound: 'Sound',
    dealCard: 'Deal card',
    higher: 'Higher',
    lower: 'Lower',
    higherOrLower: 'Higher or lower?',
    correct: 'Correct! Multiplier {value}×',
    busted: 'Bust! {card} · round lost',
    cashedOut: 'Cashed out {amount} · {value}×',
  },
  ru: {
    sound: '\u0417\u0432\u0443\u043a', // Звук
    dealCard: '\u0421\u0434\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u0443', // Сдать карту
    higher: '\u0412\u044b\u0448\u0435', // Выше
    lower: '\u041d\u0438\u0436\u0435', // Ниже
    higherOrLower: '\u0412\u044b\u0448\u0435 \u0438\u043b\u0438 \u043d\u0438\u0436\u0435?', // Выше или ниже?
    correct: '\u0412\u0435\u0440\u043d\u043e! \u041c\u043d\u043e\u0436\u0438\u0442\u0435\u043b\u044c {value}×', // Верно! Множитель {value}×
    busted: '\u041c\u0438\u043c\u043e! {card} · \u0440\u0430\u0443\u043d\u0434 \u043f\u0440\u043e\u0438\u0433\u0440\u0430\u043d', // Мимо! {card} · раунд проигран
    cashedOut: '\u0417\u0430\u0431\u0440\u0430\u043d\u043e {amount} · {value}×', // Забрано {amount} · {value}×
  },
  uk: {
    sound: '\u0417\u0432\u0443\u043a', // Звук
    dealCard: '\u0420\u043e\u0437\u0434\u0430\u0442\u0438 \u043a\u0430\u0440\u0442\u0443', // Роздати карту
    higher: '\u0412\u0438\u0449\u0435', // Вище
    lower: '\u041d\u0438\u0436\u0447\u0435', // Нижче
    higherOrLower: '\u0412\u0438\u0449\u0435 \u0447\u0438 \u043d\u0438\u0436\u0447\u0435?', // Вище чи нижче?
    correct: '\u0412\u0456\u0440\u043d\u043e! \u041c\u043d\u043e\u0436\u043d\u0438\u043a {value}×', // Вірно! Множник {value}×
    busted: '\u041d\u0435 \u0432\u0433\u0430\u0434\u0430\u043b\u0438! {card} · \u0440\u0430\u0443\u043d\u0434 \u043f\u0440\u043e\u0433\u0440\u0430\u043d\u043e', // Не вгадали! {card} · раунд програно
    cashedOut: '\u0417\u0430\u0431\u0440\u0430\u043d\u043e {amount} · {value}×', // Забрано {amount} · {value}×
  },
  es: {
    sound: 'Sonido',
    dealCard: 'Repartir carta',
    higher: 'Más alta',
    lower: 'Más baja',
    higherOrLower: '¿Más alta o más baja?',
    correct: '¡Correcto! Multiplicador {value}×',
    busted: '¡Fallo! {card} · ronda perdida',
    cashedOut: 'Retirado {amount} · {value}×',
  },
  de: {
    sound: 'Ton',
    dealCard: 'Karte geben',
    higher: 'Höher',
    lower: 'Niedriger',
    higherOrLower: 'Höher oder niedriger?',
    correct: 'Richtig! Multiplikator {value}×',
    busted: 'Daneben! {card} · Runde verloren',
    cashedOut: 'Ausgezahlt {amount} · {value}×',
  },
  fr: {
    sound: 'Son',
    dealCard: 'Distribuer une carte',
    higher: 'Plus haute',
    lower: 'Plus basse',
    higherOrLower: 'Plus haute ou plus basse ?',
    correct: 'Correct ! Multiplicateur {value}×',
    busted: 'Raté ! {card} · manche perdue',
    cashedOut: 'Encaissé {amount} · {value}×',
  },
  pt: {
    sound: 'Som',
    dealCard: 'Distribuir carta',
    higher: 'Mais alta',
    lower: 'Mais baixa',
    higherOrLower: 'Mais alta ou mais baixa?',
    correct: 'Correto! Multiplicador {value}×',
    busted: 'Errou! {card} · rodada perdida',
    cashedOut: 'Sacado {amount} · {value}×',
  },
};

const sdk = new HiloBridge();
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ранги и масти — символы, не переводятся. Индексы совпадают с протоколом сервера.
const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT = ['♠', '♥', '♦', '♣'];
const cardLabel = (card) => RANK[card.rank] + SUIT[card.suit];

let busy = false;
let session = null;
let steps = 0;
let balance = 0;

/** Заполняет лицо карты: ранг в углах, масть крупно по центру, цвет по масти. */
function setFace(card) {
  const el = $('card');
  el.dataset.color = card.suit === 1 || card.suit === 2 ? 'red' : 'black';
  for (const node of el.querySelectorAll('.card__rank')) node.textContent = RANK[card.rank];
  for (const node of el.querySelectorAll('.card__suit')) node.textContent = SUIT[card.suit];
}

/**
 * Показ новой карты: старое лицо прячется за рубашкой, лицо подменяется
 * невидимым и карта открывается. Каждое вскрытие озвучивается reveal.
 */
async function revealCard(card) {
  const el = $('card');
  if (el.dataset.face === 'front') {
    el.dataset.face = 'back';
    await delay(CONFIG.cardFlipMs);
  }
  setFace(card);
  el.dataset.face = 'front';
  play('reveal', { pitch: steps * CONFIG.revealPitchStep });
}

/** Множители догадок на кнопках «выше»/«ниже». */
function setOptions(options) {
  $('hiMult').textContent = `${options.higher.toFixed(2)}×`;
  $('loMult').textContent = `${options.lower.toFixed(2)}×`;
}

/** Дисплей множителя раунда на сцене; state подсвечивает рост или проигрыш. */
function setMult(value, state = '') {
  $('mult').textContent = `${value.toFixed(2)}×`;
  $('mult').dataset.state = state;
}

/** Текущий множитель на кнопке кэшаута — виден размер потенциального выигрыша. */
function setCashoutMult(value) {
  const el = $('cashoutMult');
  el.hidden = !(value > 0);
  if (value > 0) el.textContent = `${value.toFixed(2)}×`;
}

function enable(active) {
  $('hi').disabled = $('lo').disabled = !active;
  $('cashout').disabled = !active || steps < 1;
}

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
  if (!session) {
    $('play').disabled = busy;
    $('play').dataset.idle = String(!busy);
  }
});

$('play').onclick = async () => {
  if (busy || session) return;
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
  $('card').dataset.face = 'back'; // рубашка на время раздачи
  play('bet');

  const r = await sdk.begin(amount);
  busy = false;
  if (r?.type !== 'HILO_STARTED') {
    $('play').disabled = false;
    $('play').dataset.idle = 'true';
    $('result').textContent = t('betRejected');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  session = r.payload.sessionId;
  steps = 0;
  await revealCard(r.payload.card);
  setOptions(r.payload.options);
  setMult(1);
  setCashoutMult(0);
  $('play').hidden = true;
  $('controls').hidden = false;
  enable(true);
  $('result').textContent = t('higherOrLower');
};

async function makeGuess(direction) {
  if (busy || !session) return;
  busy = true;
  enable(false);
  const r = await sdk.guess(session, direction);
  if (r?.type !== 'HILO_UPDATE') {
    busy = false;
    enable(true);
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const p = r.payload;
  await revealCard(p.card);

  if (p.status === 'busted') {
    busy = false;
    $('mult').dataset.state = 'lose';
    play('lose');
    flash('lose');
    shake($('stage'));
    return endGame(t('busted', { card: cardLabel(p.card) }), 'lose');
  }

  steps++;
  setOptions(p.options);
  setMult(p.multiplier, 'win');
  setCashoutMult(p.multiplier);
  play('win', { gain: 0.6 }); // короткая нота удачи: серия ещё не закрыта
  busy = false;
  enable(true);
  $('result').textContent = t('correct', { value: p.multiplier.toFixed(2) });
  $('result').dataset.state = 'win';
}
$('hi').onclick = () => makeGuess('hi');
$('lo').onclick = () => makeGuess('lo');

$('cashout').onclick = async () => {
  if (busy || !session || steps < 1) return;
  busy = true;
  enable(false);
  const r = await sdk.cashout(session);
  busy = false;
  if (r?.type !== 'HILO_ENDED') {
    enable(true);
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const win = Number(r.payload.win || 0);
  const mult = Number(r.payload.multiplier || 0);
  play('cashout');
  if (mult >= CONFIG.bigWinMultiplier) play('bigWin');
  celebrate({ element: $('win'), from: 0, to: win, multiplier: mult, locale: t.locale });
  endGame(t('cashedOut', { amount: money(win), value: mult.toFixed(2) }), 'win');
};

function endGame(message, state) {
  session = null;
  steps = 0;
  setCashoutMult(0);
  $('controls').hidden = true;
  $('play').hidden = false;
  $('play').disabled = false;
  $('play').dataset.idle = 'true';
  $('result').textContent = message;
  $('result').dataset.state = state;
}

sdk.start();
