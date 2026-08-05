import { VideoPokerBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Все настраиваемые значения игры: границы ставки, тайминги вскрытия карт и
// порог «крупного выигрыша». Таблица выплат повторяет серверную (Jacks or
// Better 9/6) только для отображения — исход всегда решает сервер.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  dealStaggerMs: 130, // пауза между вскрытиями соседних карт
  flipSettleMs: 280, // ожидание окончания CSS-переворота последней карты
  bigWinMultiplier: 9, // фулл-хаус и выше празднуем как крупный выигрыш
  royalPayout: 250, // по этой выплате отличаем флеш-рояль от стрит-флеша
  paytable: [
    { key: 'handRoyalFlush', payout: 250 },
    { key: 'handStraightFlush', payout: 50 },
    { key: 'handFourKind', payout: 25 },
    { key: 'handFullHouse', payout: 9 },
    { key: 'handFlush', payout: 6 },
    { key: 'handStraight', payout: 4 },
    { key: 'handThreeKind', payout: 3 },
    { key: 'handTwoPair', payout: 2 },
    { key: 'handPair', payout: 1 },
  ],
};

// Строки именно этой игры на всех языках витрины; общие ключи (balance, bet,
// win, waiting и т.д.) приходят из i18n.js и здесь не дублируются.
const GAME_STRINGS = {
  en: {
    gameTitle: 'Video Poker',
    sound: 'Sound',
    drawAction: 'Draw',
    hold: 'Hold',
    chooseHolds: 'Tap the cards you want to hold, then draw',
    handRoyalFlush: 'Royal Flush',
    handStraightFlush: 'Straight Flush',
    handFourKind: 'Four of a Kind',
    handFullHouse: 'Full House',
    handFlush: 'Flush',
    handStraight: 'Straight',
    handThreeKind: 'Three of a Kind',
    handTwoPair: 'Two Pair',
    handPair: 'Jacks or Better',
    handHighCard: 'High Card',
  },
  ru: {
    gameTitle: 'Видеопокер',
    sound: 'Звук',
    drawAction: 'Обмен',
    hold: 'Держу',
    chooseHolds: 'Отметьте карты, которые держите, и жмите обмен',
    handRoyalFlush: 'Флеш-рояль',
    handStraightFlush: 'Стрит-флеш',
    handFourKind: 'Каре',
    handFullHouse: 'Фулл-хаус',
    handFlush: 'Флеш',
    handStraight: 'Стрит',
    handThreeKind: 'Тройка',
    handTwoPair: 'Две пары',
    handPair: 'Валеты или старше',
    handHighCard: 'Старшая карта',
  },
  uk: {
    gameTitle: 'Відеопокер',
    sound: 'Звук',
    drawAction: 'Обмін',
    hold: 'Тримаю',
    chooseHolds: 'Позначте карти, які тримаєте, і тисніть обмін',
    handRoyalFlush: 'Флеш-рояль',
    handStraightFlush: 'Стрит-флеш',
    handFourKind: 'Каре',
    handFullHouse: 'Фул-хаус',
    handFlush: 'Флеш',
    handStraight: 'Стрит',
    handThreeKind: 'Трійка',
    handTwoPair: 'Дві пари',
    handPair: 'Валети або старші',
    handHighCard: 'Старша карта',
  },
  es: {
    gameTitle: 'Vídeo Póker',
    sound: 'Sonido',
    drawAction: 'Cambiar',
    hold: 'Retener',
    chooseHolds: 'Marca las cartas que retienes y cambia el resto',
    handRoyalFlush: 'Escalera real',
    handStraightFlush: 'Escalera de color',
    handFourKind: 'Póker',
    handFullHouse: 'Full',
    handFlush: 'Color',
    handStraight: 'Escalera',
    handThreeKind: 'Trío',
    handTwoPair: 'Doble pareja',
    handPair: 'Jotas o mejor',
    handHighCard: 'Carta alta',
  },
  de: {
    gameTitle: 'Videopoker',
    sound: 'Ton',
    drawAction: 'Tauschen',
    hold: 'Halten',
    chooseHolds: 'Karten zum Halten antippen, dann tauschen',
    handRoyalFlush: 'Royal Flush',
    handStraightFlush: 'Straight Flush',
    handFourKind: 'Vierling',
    handFullHouse: 'Full House',
    handFlush: 'Flush',
    handStraight: 'Straße',
    handThreeKind: 'Drilling',
    handTwoPair: 'Zwei Paare',
    handPair: 'Buben oder besser',
    handHighCard: 'Höchste Karte',
  },
  fr: {
    gameTitle: 'Vidéo Poker',
    sound: 'Son',
    drawAction: 'Échanger',
    hold: 'Garder',
    chooseHolds: 'Touchez les cartes à garder, puis échangez',
    handRoyalFlush: 'Quinte flush royale',
    handStraightFlush: 'Quinte flush',
    handFourKind: 'Carré',
    handFullHouse: 'Full',
    handFlush: 'Couleur',
    handStraight: 'Quinte',
    handThreeKind: 'Brelan',
    handTwoPair: 'Double paire',
    handPair: 'Valets ou mieux',
    handHighCard: 'Carte haute',
  },
  pt: {
    gameTitle: 'Vídeo Pôquer',
    sound: 'Som',
    drawAction: 'Trocar',
    hold: 'Segurar',
    chooseHolds: 'Toque nas cartas para segurar e troque o resto',
    handRoyalFlush: 'Royal Flush',
    handStraightFlush: 'Straight Flush',
    handFourKind: 'Quadra',
    handFullHouse: 'Full House',
    handFlush: 'Flush',
    handStraight: 'Sequência',
    handThreeKind: 'Trinca',
    handTwoPair: 'Dois pares',
    handPair: 'Valetes ou melhor',
    handHighCard: 'Carta alta',
  },
};

// Соответствие имён комбинаций сервера ключам словаря игры.
const HAND_KEYS = {
  'high-card': 'handHighCard',
  pair: 'handPair',
  'two-pair': 'handTwoPair',
  'three-kind': 'handThreeKind',
  straight: 'handStraight',
  flush: 'handFlush',
  'full-house': 'handFullHouse',
  'four-kind': 'handFourKind',
  'straight-flush': 'handStraightFlush',
};

const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT = ['♠', '♥', '♦', '♣'];

const sdk = new VideoPokerBridge();
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let busy = false;
let session = null;
let balance = 0;
let held = new Set();

// Пять слотов-карт: кнопка с двумя гранями (рубашка/лицо) и маркером HOLD.
const slots = [];
for (let i = 0; i < 5; i++) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.disabled = true;
  card.dataset.face = 'down';
  card.setAttribute('aria-pressed', 'false');
  card.innerHTML =
    '<span class="card__flip">' +
    '<span class="card__face"><b class="card__rank"></b><span class="card__suit"></span></span>' +
    '<span class="card__back"></span>' +
    '</span>' +
    '<span class="card__hold"></span>';
  card.querySelector('.card__hold').textContent = t('hold');
  card.onclick = () => toggle(i);
  $('cards').appendChild(card);
  slots.push(card);
}

/** Лицо карты: ранг, масть и цвет масти. */
function setFace(slot, card) {
  slot.querySelector('.card__rank').textContent = RANK[card.rank];
  slot.querySelector('.card__suit').textContent = SUIT[card.suit];
  slot.dataset.red = String(card.suit === 1 || card.suit === 2);
}

/** Каскадное вскрытие карт по индексам: рубашка → лицо, звук на каждую. */
async function reveal(cards, indexes) {
  for (const i of indexes) slots[i].dataset.face = 'down';
  for (let n = 0; n < indexes.length; n++) {
    const i = indexes[n];
    await delay(CONFIG.dealStaggerMs);
    setFace(slots[i], cards[i]);
    slots[i].dataset.face = 'up';
    play('reveal', { pitch: n * 2 });
  }
  await delay(CONFIG.flipSettleMs);
}

/** Таблица выплат: строится из CONFIG, названия — из словаря игры. */
function buildPaytable() {
  const table = $('paytable');
  table.innerHTML = '';
  for (const row of CONFIG.paytable) {
    const line = document.createElement('div');
    line.className = 'paytable__row';
    line.dataset.hand = row.key;
    const name = document.createElement('span');
    name.textContent = t(row.key);
    const value = document.createElement('b');
    value.textContent = `${row.payout}×`;
    line.append(name, value);
    table.append(line);
  }
}

/** Подсветка выигрышной строки таблицы (data-hit="true"). */
function markHit(key) {
  for (const row of $('paytable').children) row.dataset.hit = String(row.dataset.hand === key);
}

/** Клик по карте: переключает удержание между раздачей и обменом. */
function toggle(i) {
  if (!session || busy) return;
  const holding = !held.has(i);
  if (holding) held.add(i);
  else held.delete(i);
  slots[i].classList.toggle('is-held', holding);
  slots[i].setAttribute('aria-pressed', String(holding));
  play('tick', { pitch: holding ? 4 : 0 });
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
// Синхронизируем кнопку с сохранённым состоянием звука.
$('sound').setAttribute('aria-pressed', String(!audio.muted));
$('sound').textContent = audio.muted ? '♪̶' : '♪';

addEventListener('casino:balance', (e) => {
  balance = Number(e.detail.balance);
  $('balance').textContent = money(balance);
  if (!session) {
    $('deal').disabled = busy;
    $('deal').dataset.idle = String(!busy);
  }
});

/** Единый отказ: возвращает кнопку в строй, сообщает причину, звучит ошибкой. */
function fail(button, key) {
  busy = false;
  button.disabled = false;
  $('result').textContent = t(key);
  $('result').dataset.state = 'lose';
  play('error');
}

$('deal').onclick = async () => {
  if (busy || session) return;
  const amount = Math.trunc(Number($('bet').value));
  if (amount < CONFIG.betMin) return;
  if (amount > balance) {
    $('result').textContent = t('insufficient');
    $('result').dataset.state = 'lose';
    shake($('deal'));
    play('error');
    return;
  }

  busy = true;
  $('deal').disabled = true;
  $('deal').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('stage').dataset.state = '';
  $('win').textContent = '0';
  markHit('');
  held = new Set();
  for (const slot of slots) {
    slot.classList.remove('is-held');
    slot.setAttribute('aria-pressed', 'false');
    slot.disabled = true;
  }
  play('bet');

  const started = await sdk.begin(amount);
  if (started?.type !== 'VP_STARTED') return fail($('deal'), 'betRejected');

  session = started.payload.sessionId;
  await reveal(started.payload.cards, [0, 1, 2, 3, 4]);
  for (const slot of slots) slot.disabled = false;
  busy = false;
  $('deal').hidden = true;
  $('draw').hidden = false;
  $('draw').disabled = false;
  $('draw').dataset.idle = 'true';
  $('result').textContent = t('chooseHolds');
};

$('draw').onclick = async () => {
  if (busy || !session) return;
  busy = true;
  $('draw').disabled = true;
  $('draw').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  const swapped = [0, 1, 2, 3, 4].filter((i) => !held.has(i));

  const ended = await sdk.draw(session, [...held]);
  if (ended?.type !== 'VP_ENDED') return fail($('draw'), 'settleError');

  const out = ended.payload;
  session = null;
  held = new Set();
  await reveal(out.cards, swapped);
  for (const slot of slots) {
    slot.disabled = true;
    slot.classList.remove('is-held');
    slot.setAttribute('aria-pressed', 'false');
  }

  // Сервер шлёт «straight-flush» и для флеш-рояля — различаем по выплате.
  const handKey =
    out.hand === 'straight-flush' && out.payout === CONFIG.royalPayout
      ? 'handRoyalFlush'
      : HAND_KEYS[out.hand];
  const handLabel = handKey ? t(handKey) : String(out.hand);
  const win = Number(out.win || 0);
  markHit(win > 0 ? handKey : '');

  if (win > 0) {
    $('stage').dataset.state = 'win';
    $('result').dataset.state = 'win';
    $('result').textContent = `${handLabel} · ${out.payout}× · ${t('youWon', { amount: money(win) })}`;
    play(out.payout >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier: out.payout, locale: t.locale });
  } else {
    $('stage').dataset.state = 'lose';
    $('result').dataset.state = 'lose';
    $('result').textContent = `${handLabel} · ${t('loss')}`;
    play('lose');
    flash('lose');
    shake($('stage'));
  }

  busy = false;
  $('draw').hidden = true;
  $('deal').hidden = false;
  $('deal').disabled = false;
  $('deal').dataset.idle = 'true';
};

buildPaytable();
sdk.start();
