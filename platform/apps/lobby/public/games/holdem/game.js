import { HoldemBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея — здесь, а не в разметке: шаг ставки, темп вскрытия карт
// и порог «крупного выигрыша» подкручиваются в одном месте.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  // Пауза между вскрытиями карт: борд и рука открываются по одной.
  revealDelayMs: 260,
  // Карты дилера держат интригу чуть дольше.
  dealerRevealDelayMs: 380,
  // Порог bigWin — множитель выигрыша к суммарной ставке раунда.
  bigWinMultiplier: 5,
  // Колл добавляет две анте: итоговая ставка раунда = анте × 3.
  callStakeMultiplier: 3,
  // Слоты стола: борд из пяти карт, по две карты в руках.
  boardSlots: 5,
  handSlots: 2,
  flopSize: 3,
};

// Строки именно этой игры; общие ключи (balance, bet, win, waiting…) уже в i18n.js.
const GAME_STRINGS = {
  en: {
    gameTitle: "Casino Hold'em",
    sound: 'Sound',
    dealer: 'Dealer',
    board: 'Board',
    player: 'You',
    ante: 'Ante',
    callX2: 'Call ×2',
    foldMove: 'Fold',
    callOrFold: 'Call (×2) or fold?',
    dealerNoQualify: "Dealer doesn't qualify",
    push: 'Push',
    handHighCard: 'High card',
    handPair: 'Pair',
    handTwoPair: 'Two pair',
    handThreeKind: 'Three of a kind',
    handStraight: 'Straight',
    handFlush: 'Flush',
    handFullHouse: 'Full house',
    handFourKind: 'Four of a kind',
    handStraightFlush: 'Straight flush',
  },
  ru: {
    gameTitle: "Casino Hold'em",
    sound: 'Звук',
    dealer: 'Дилер',
    board: 'Стол',
    player: 'Вы',
    ante: 'Анте',
    callX2: 'Колл ×2',
    foldMove: 'Фолд',
    callOrFold: 'Колл (×2) или фолд?',
    dealerNoQualify: 'Дилер не прошёл',
    push: 'Ничья',
    handHighCard: 'Старшая карта',
    handPair: 'Пара',
    handTwoPair: 'Две пары',
    handThreeKind: 'Сет',
    handStraight: 'Стрит',
    handFlush: 'Флеш',
    handFullHouse: 'Фулл-хаус',
    handFourKind: 'Каре',
    handStraightFlush: 'Стрит-флеш',
  },
  uk: {
    gameTitle: "Casino Hold'em",
    sound: 'Звук',
    dealer: 'Дилер',
    board: 'Стіл',
    player: 'Ви',
    ante: 'Анте',
    callX2: 'Кол ×2',
    foldMove: 'Фолд',
    callOrFold: 'Кол (×2) чи фолд?',
    dealerNoQualify: 'Дилер не пройшов',
    push: 'Нічия',
    handHighCard: 'Старша карта',
    handPair: 'Пара',
    handTwoPair: 'Дві пари',
    handThreeKind: 'Сет',
    handStraight: 'Стріт',
    handFlush: 'Флеш',
    handFullHouse: 'Фул-хаус',
    handFourKind: 'Каре',
    handStraightFlush: 'Стріт-флеш',
  },
  es: {
    gameTitle: "Casino Hold'em",
    sound: 'Sonido',
    dealer: 'Crupier',
    board: 'Mesa',
    player: 'Tú',
    ante: 'Ante',
    callX2: 'Igualar ×2',
    foldMove: 'Retirarse',
    callOrFold: '¿Igualar (×2) o retirarse?',
    dealerNoQualify: 'El crupier no califica',
    push: 'Empate',
    handHighCard: 'Carta alta',
    handPair: 'Pareja',
    handTwoPair: 'Doble pareja',
    handThreeKind: 'Trío',
    handStraight: 'Escalera',
    handFlush: 'Color',
    handFullHouse: 'Full',
    handFourKind: 'Póker',
    handStraightFlush: 'Escalera de color',
  },
  de: {
    gameTitle: "Casino Hold'em",
    sound: 'Ton',
    dealer: 'Dealer',
    board: 'Board',
    player: 'Sie',
    ante: 'Ante',
    callX2: 'Mitgehen ×2',
    foldMove: 'Passen',
    callOrFold: 'Mitgehen (×2) oder passen?',
    dealerNoQualify: 'Dealer nicht qualifiziert',
    push: 'Unentschieden',
    handHighCard: 'Hohe Karte',
    handPair: 'Paar',
    handTwoPair: 'Zwei Paare',
    handThreeKind: 'Drilling',
    handStraight: 'Straße',
    handFlush: 'Flush',
    handFullHouse: 'Full House',
    handFourKind: 'Vierling',
    handStraightFlush: 'Straight Flush',
  },
  fr: {
    gameTitle: "Casino Hold'em",
    sound: 'Son',
    dealer: 'Croupier',
    board: 'Table',
    player: 'Vous',
    ante: 'Ante',
    callX2: 'Suivre ×2',
    foldMove: 'Se coucher',
    callOrFold: 'Suivre (×2) ou se coucher ?',
    dealerNoQualify: 'Croupier non qualifié',
    push: 'Égalité',
    handHighCard: 'Carte haute',
    handPair: 'Paire',
    handTwoPair: 'Deux paires',
    handThreeKind: 'Brelan',
    handStraight: 'Quinte',
    handFlush: 'Couleur',
    handFullHouse: 'Full',
    handFourKind: 'Carré',
    handStraightFlush: 'Quinte flush',
  },
  pt: {
    gameTitle: "Casino Hold'em",
    sound: 'Som',
    dealer: 'Crupiê',
    board: 'Mesa',
    player: 'Você',
    ante: 'Ante',
    callX2: 'Pagar ×2',
    foldMove: 'Desistir',
    callOrFold: 'Pagar (×2) ou desistir?',
    dealerNoQualify: 'Crupiê não se qualificou',
    push: 'Empate',
    handHighCard: 'Carta alta',
    handPair: 'Par',
    handTwoPair: 'Dois pares',
    handThreeKind: 'Trinca',
    handStraight: 'Sequência',
    handFlush: 'Flush',
    handFullHouse: 'Full house',
    handFourKind: 'Quadra',
    handStraightFlush: 'Straight flush',
  },
};

const sdk = new HoldemBridge();
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT = ['♠', '♥', '♦', '♣'];
// Коды комбинаций сервера → ключи словаря GAME_STRINGS.
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
const handName = (code) => (code ? (HAND_KEYS[code] ? t(HAND_KEYS[code]) : code) : '');

let busy = false;
let session = null;
let balance = 0;
let ante = 0; // анте текущего раунда — для множителя bigWin

/** Карта лицом (rank+suit), рубашкой ('back') или пустой слот ('slot'). */
function cardNode(card, still = false) {
  const node = document.createElement('span');
  if (card === 'slot') {
    node.className = 'card card--slot';
    return node;
  }
  if (card === 'back') {
    node.className = still ? 'card card--back card--still' : 'card card--back';
    return node;
  }
  node.className = still ? 'card card--still' : 'card';
  node.dataset.red = String(card.suit === 1 || card.suit === 2);
  const rank = document.createElement('b');
  rank.textContent = RANK[card.rank];
  const suit = document.createElement('i');
  suit.textContent = SUIT[card.suit];
  node.append(rank, suit);
  return node;
}

/** Заполняет контейнер N одинаковыми картами (слоты или рубашки). */
function fillCards(el, count, kind) {
  el.replaceChildren();
  for (let i = 0; i < count; i++) el.append(cardNode(kind, true));
}

/** Меняет карту в слоте index (с анимацией входа, если карта не still). */
function setSlot(el, index, node) {
  if (el.children[index]) el.replaceChild(node, el.children[index]);
  else el.append(node);
}

/** Пустой стол до первой раздачи: только слоты, без карт. */
function renderIdleTable() {
  fillCards($('dealer'), CONFIG.handSlots, 'slot');
  fillCards($('board'), CONFIG.boardSlots, 'slot');
  fillCards($('player'), CONFIG.handSlots, 'slot');
  $('pName').textContent = '';
  $('dName').textContent = '';
  $('playerHand').dataset.state = '';
}

/** Раздача: рубашки дилеру, затем по одной — рука игрока и флоп. */
async function dealTable(p) {
  renderIdleTable();
  fillCards($('dealer'), CONFIG.handSlots, 'back');
  for (let i = 0; i < p.playerCards.length; i++) {
    await wait(CONFIG.revealDelayMs);
    setSlot($('player'), i, cardNode(p.playerCards[i]));
    play('reveal');
  }
  for (let i = 0; i < p.flop.length; i++) {
    await wait(CONFIG.revealDelayMs);
    setSlot($('board'), i, cardNode(p.flop[i]));
    play('reveal');
  }
}

/** Вскрытие: терн и ривер по одной карте, затем рука дилера. */
async function revealShowdown(p) {
  const community = p.community || [];
  for (let i = 0; i < community.length; i++) {
    if (i < CONFIG.flopSize) {
      // Флоп уже на столе — просто синхронизируем с сервером без анимации.
      setSlot($('board'), i, cardNode(community[i], true));
    } else {
      await wait(CONFIG.revealDelayMs);
      setSlot($('board'), i, cardNode(community[i]));
      play('reveal');
    }
  }
  const dealer = p.dealerCards || [];
  for (let i = 0; i < dealer.length; i++) {
    await wait(CONFIG.dealerRevealDelayMs);
    setSlot($('dealer'), i, cardNode(dealer[i]));
    play('reveal');
  }
  (p.playerCards || []).forEach((card, i) => setSlot($('player'), i, cardNode(card, true)));
}

function showActions(on) {
  $('actions').hidden = !on;
  $('call').disabled = $('fold').disabled = !on;
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
    $('deal').disabled = busy;
    $('deal').dataset.idle = String(!busy);
  }
});

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
  $('win').textContent = '0';
  play('bet');

  const r = await sdk.begin(amount);
  busy = false;
  if (r?.type !== 'CH_STARTED') {
    $('deal').disabled = false;
    $('deal').dataset.idle = 'true';
    $('result').textContent = t('betRejected');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const p = r.payload;
  session = p.sessionId;
  ante = amount;
  await dealTable(p);
  $('deal').hidden = true;
  showActions(true);
  $('result').textContent = t('callOrFold');
};

async function act(move) {
  if (busy || !session) return;
  busy = true;
  showActions(false);
  if (move === 'call') play('bet'); // колл — это ещё две анте в банк
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';

  const r = await sdk.act(session, move);
  busy = false;
  if (r?.type !== 'CH_ENDED') {
    showActions(true);
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const p = r.payload;
  await revealShowdown(p);
  $('pName').textContent = handName(p.playerHand);
  $('dName').textContent = p.dealerHand
    ? handName(p.dealerHand) + (p.dealerQualified === false ? ` · ${t('dealerNoQualify')}` : '')
    : '';

  const win = Number(p.win || 0);
  const staked = move === 'call' ? ante * CONFIG.callStakeMultiplier : ante;
  const wonMultiplier = staked > 0 ? win / staked : 0;

  if (p.status === 'won') {
    $('result').textContent = t('youWon', { amount: money(win) });
    $('result').dataset.state = 'win';
    $('playerHand').dataset.state = 'win';
    play(wonMultiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier: wonMultiplier, locale: t.locale });
  } else if (p.status === 'push') {
    $('result').textContent = win ? `${t('push')} · +${money(win)}` : t('push');
    $('result').dataset.state = '';
    play('cashout'); // ставка вернулась игроку
  } else {
    $('result').textContent = t('loss');
    $('result').dataset.state = 'lose';
    $('playerHand').dataset.state = 'lose';
    play('lose');
    flash('lose');
    shake($('stage'));
  }

  session = null;
  ante = 0;
  $('actions').hidden = true;
  $('deal').hidden = false;
  $('deal').disabled = false;
  $('deal').dataset.idle = 'true';
}
$('call').onclick = () => act('call');
$('fold').onclick = () => act('fold');

renderIdleTable();
sdk.start();
