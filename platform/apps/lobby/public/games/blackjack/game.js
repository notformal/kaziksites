import { BlackjackBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки ощущений игры — здесь, а не в разметке: шаг и границы ставки,
// темп раздачи карт и порог «крупного выигрыша» (блэкджек платит 3:2,
// то есть множитель 2.5 от ставки — это и есть большой выигрыш).
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  dealStaggerMs: 220, // пауза между вылетами карт при раздаче
  settlePauseMs: 260, // выдержка после вскрытия дилера перед вердиктом
  bigWinMultiplier: 2.5,
};

// Строки именно блэкджека; общие ключи (balance, bet, deal, waiting…) живут
// в i18n.js и здесь не дублируются. Английский — источник правды.
const GAME_STRINGS = {
  en: {
    gameTitle: 'Blackjack',
    sound: 'Sound',
    dealer: 'Dealer',
    player: 'Player',
    yourMove: 'Your move',
    hit: 'Hit',
    stand: 'Stand',
    double: 'Double ×2',
    won: 'You win',
    lost: 'You lose',
    push: 'Push',
    bust: 'Bust',
    blackjack: 'Blackjack!',
  },
  ru: {
    gameTitle: 'Блэкджек',
    sound: 'Звук',
    dealer: 'Дилер',
    player: 'Игрок',
    yourMove: 'Ваш ход',
    hit: 'Ещё',
    stand: 'Хватит',
    double: 'Удвоить ×2',
    won: 'Выигрыш',
    lost: 'Проигрыш',
    push: 'Ничья',
    bust: 'Перебор',
    blackjack: 'Блэкджек!',
  },
  uk: {
    gameTitle: 'Блекджек',
    sound: 'Звук',
    dealer: 'Дилер',
    player: 'Гравець',
    yourMove: 'Ваш хід',
    hit: 'Ще',
    stand: 'Досить',
    double: 'Подвоїти ×2',
    won: 'Виграш',
    lost: 'Програш',
    push: 'Нічия',
    bust: 'Перебір',
    blackjack: 'Блекджек!',
  },
  es: {
    gameTitle: 'Blackjack',
    sound: 'Sonido',
    dealer: 'Crupier',
    player: 'Jugador',
    yourMove: 'Tu turno',
    hit: 'Pedir',
    stand: 'Plantarse',
    double: 'Doblar ×2',
    won: 'Ganas',
    lost: 'Pierdes',
    push: 'Empate',
    bust: 'Te pasaste',
    blackjack: '¡Blackjack!',
  },
  de: {
    gameTitle: 'Blackjack',
    sound: 'Ton',
    dealer: 'Dealer',
    player: 'Spieler',
    yourMove: 'Dein Zug',
    hit: 'Karte',
    stand: 'Halten',
    double: 'Verdoppeln ×2',
    won: 'Gewonnen',
    lost: 'Verloren',
    push: 'Unentschieden',
    bust: 'Überkauft',
    blackjack: 'Blackjack!',
  },
  fr: {
    gameTitle: 'Blackjack',
    sound: 'Son',
    dealer: 'Croupier',
    player: 'Joueur',
    yourMove: 'À vous',
    hit: 'Tirer',
    stand: 'Rester',
    double: 'Doubler ×2',
    won: 'Gagné',
    lost: 'Perdu',
    push: 'Égalité',
    bust: 'Brûlé',
    blackjack: 'Blackjack !',
  },
  pt: {
    gameTitle: 'Blackjack',
    sound: 'Som',
    dealer: 'Crupiê',
    player: 'Jogador',
    yourMove: 'Sua vez',
    hit: 'Pedir',
    stand: 'Parar',
    double: 'Dobrar ×2',
    won: 'Vitória',
    lost: 'Derrota',
    push: 'Empate',
    bust: 'Estourou',
    blackjack: 'Blackjack!',
  },
};

const sdk = new BlackjackBridge();
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let busy = false;
let session = null;
let balance = 0;
let lastBet = 0; // ставка раунда — из неё считаем множитель выигрыша

// Ранги и масти — данные протокола (индексы сервера), не интерфейсные строки.
const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT = ['♠', '♥', '♦', '♣'];
const RED_SUITS = new Set([1, 2]);

/** DOM-карта: угловые индексы + крупная масть; красные масти — цветом темы. */
function cardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  if (RED_SUITS.has(card.suit)) el.dataset.color = 'red';
  const index = `${RANK[card.rank]}<i>${SUIT[card.suit]}</i>`;
  el.innerHTML =
    `<span class="card__corner">${index}</span>` +
    `<span class="card__pip">${SUIT[card.suit]}</span>` +
    `<span class="card__corner card__corner--flip">${index}</span>`;
  return el;
}

/**
 * Перерисовывает руку. Уже показанные карты остаются на месте, новые вылетают
 * из «башмака» со звуком вскрытия. holeCard добавляет закрытую карту дилера.
 * Возвращает число новых карт — по нему рассчитывается пауза до вердикта.
 */
function renderHand(el, cards, { holeCard = false } = {}) {
  const seen = Number(el.dataset.shown || 0);
  el.innerHTML = '';
  cards.forEach((card, index) => {
    const node = cardEl(card);
    if (index >= seen) {
      node.classList.add('is-new');
      node.style.animationDelay = `${(index - seen) * CONFIG.dealStaggerMs}ms`;
    }
    el.append(node);
  });
  if (holeCard) {
    const back = document.createElement('div');
    back.className = 'card card--back is-new';
    back.style.animationDelay = `${Math.max(0, cards.length - seen) * CONFIG.dealStaggerMs}ms`;
    el.append(back);
  }
  el.dataset.shown = String(cards.length);
  const fresh = Math.max(0, cards.length - seen);
  for (let i = 0; i < fresh; i++) setTimeout(() => play('reveal'), i * CONFIG.dealStaggerMs);
  return fresh;
}

/** Доступность ходов: double показывается только когда сервер его разрешил. */
function showActions(on, canDouble) {
  $('actions').hidden = !on;
  $('double').style.display = canDouble ? '' : 'none';
  ['hit', 'stand', 'double'].forEach((m) => { $(m).disabled = !on; });
}

function setResult(text, state = '') {
  $('result').textContent = text;
  $('result').dataset.state = state;
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
  if (!session) {
    $('deal').disabled = busy;
    $('deal').dataset.idle = String(!busy);
  }
});

$('deal').onclick = async () => {
  if (busy || session) return;
  const bet = Math.trunc(Number($('bet').value));
  if (bet < CONFIG.betMin) return;
  if (bet > balance) {
    setResult(t('insufficient'), 'lose');
    shake($('deal'));
    play('error');
    return;
  }

  busy = true;
  lastBet = bet;
  $('deal').disabled = true;
  $('deal').dataset.idle = 'false';
  $('win').textContent = '0';
  $('pVal').dataset.state = '';
  // Новый раунд: стол очищается, счётчики показанных карт сбрасываются.
  for (const id of ['dealer', 'player']) {
    $(id).innerHTML = '';
    $(id).dataset.shown = '0';
  }
  $('dVal').textContent = '';
  $('pVal').textContent = '';
  setResult(t('waiting'));
  play('bet');

  const r = await sdk.begin(bet);
  busy = false;
  if (r?.type !== 'BJ_STARTED') {
    $('deal').disabled = false;
    $('deal').dataset.idle = 'true';
    setResult(t('betRejected'), 'lose');
    play('error');
    return;
  }
  const p = r.payload;
  renderHand($('player'), p.playerCards);
  $('pVal').textContent = p.playerValue;
  if (p.status === 'active') {
    session = p.sessionId;
    renderHand($('dealer'), [p.dealerUpCard], { holeCard: true });
    $('dVal').textContent = '';
    $('deal').hidden = true;
    showActions(true, p.canDouble);
    setResult(t('yourMove'));
  } else {
    await finishRender(p);
  }
};

async function move(m) {
  if (busy || !session) return;
  busy = true;
  showActions(false);
  const r = await sdk.act(session, m);
  busy = false;
  if (r?.type !== 'BJ_UPDATE') {
    showActions(true, false);
    setResult(t('settleError'), 'lose');
    play('error');
    return;
  }
  const p = r.payload;
  renderHand($('player'), p.playerCards);
  $('pVal').textContent = p.playerValue;
  if (p.status === 'active') {
    showActions(true, false);
    setResult(t('yourMove'));
  } else {
    await finishRender(p);
  }
}
$('hit').onclick = () => move('hit');
$('stand').onclick = () => move('stand');
$('double').onclick = () => move('double');

/** Название исхода: перебор и «натуральный» блэкджек — отдельными фразами. */
function outcomeLabel(p) {
  if (p.status === 'push') return t('push');
  if (p.status === 'lost') return Number(p.playerValue) > 21 ? t('bust') : t('lost');
  const natural = Array.isArray(p.playerCards) && p.playerCards.length === 2 && Number(p.playerValue) === 21;
  return natural ? t('blackjack') : t('won');
}

async function finishRender(p) {
  if (p.dealerCards) {
    const fresh = renderHand($('dealer'), p.dealerCards);
    $('dVal').textContent = p.dealerValue;
    // Даём вскрытию дилера дозвучать и долететь, потом объявляем вердикт.
    await pause(fresh * CONFIG.dealStaggerMs + CONFIG.settlePauseMs);
  }
  const win = Number(p.win || 0);
  const label = outcomeLabel(p);
  const text = win > 0 ? `${label} · +${money(win)}` : label;

  if (p.status === 'won') {
    const multiplier = lastBet > 0 ? win / lastBet : 0;
    setResult(text, 'win');
    $('pVal').dataset.state = 'win';
    play(multiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier, locale: t.locale });
  } else if (p.status === 'lost') {
    setResult(text, 'lose');
    $('pVal').dataset.state = 'lose';
    play('lose');
    flash('lose');
    shake($('stage'));
  } else {
    // Push: ставка возвращается, тон нейтральный — без фанфар и без тряски.
    setResult(text);
    $('win').textContent = money(win);
  }

  session = null;
  $('actions').hidden = true;
  $('deal').hidden = false;
  $('deal').disabled = false;
  $('deal').dataset.idle = 'true';
}

sdk.start();
