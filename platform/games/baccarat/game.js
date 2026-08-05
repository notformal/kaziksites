import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки баккары: шаг и границы ставки, темп сдачи карт и порог
// «крупного выигрыша». Баланс ощущений правится здесь, а не в коде ниже.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  // Пауза между картами: сдача по одной делает вскрытие читаемым.
  dealDelayMs: 430,
  // Сколько рубашек лежит на столе до первой сдачи.
  idleBackCards: 2,
  bigWinMultiplier: 5,
};

// Строки именно этой игры; общие ключи (balance, bet, win…) приходят из i18n.js.
const GAME_STRINGS = {
  en: {
    player: 'Player',
    banker: 'Banker',
    tie: 'Tie',
    playerWins: 'Player wins',
    bankerWins: 'Banker wins',
    betOn: 'Bet on',
    sound: 'Sound',
  },
  ru: {
    player: 'Игрок',
    banker: 'Банкир',
    tie: 'Ничья',
    playerWins: 'Победа игрока',
    bankerWins: 'Победа банкира',
    betOn: 'Ставка на',
    sound: 'Звук',
  },
  uk: {
    player: 'Гравець',
    banker: 'Банкір',
    tie: 'Нічия',
    playerWins: 'Перемога гравця',
    bankerWins: 'Перемога банкіра',
    betOn: 'Ставка на',
    sound: 'Звук',
  },
  es: {
    player: 'Jugador',
    banker: 'Banca',
    tie: 'Empate',
    playerWins: 'Gana el jugador',
    bankerWins: 'Gana la banca',
    betOn: 'Apostar a',
    sound: 'Sonido',
  },
  de: {
    player: 'Spieler',
    banker: 'Bank',
    tie: 'Unentschieden',
    playerWins: 'Spieler gewinnt',
    bankerWins: 'Bank gewinnt',
    betOn: 'Wette auf',
    sound: 'Ton',
  },
  fr: {
    player: 'Joueur',
    banker: 'Banque',
    tie: 'Égalité',
    playerWins: 'Le joueur gagne',
    bankerWins: 'La banque gagne',
    betOn: 'Miser sur',
    sound: 'Son',
  },
  pt: {
    player: 'Jogador',
    banker: 'Banca',
    tie: 'Empate',
    playerWins: 'Jogador vence',
    bankerWins: 'Banca vence',
    betOn: 'Apostar em',
    sound: 'Som',
  },
};

const sdk = new CasinoBridge('baccarat');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Формат карт сервера: rank 1..13, suit 0..3. Масти 1 и 2 — красные.
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const RED_SUITS = new Set([1, 2]);
// Ключ строки-победителя по вердикту сервера.
const WINNER_KEY = { player: 'playerWins', banker: 'bankerWins', tie: 'tie' };

let busy = false;
let balance = 0;

/** Стоимость карты в баккаре: туз — 1, десятка и картинки — 0. */
const cardPoints = (card) => (card.rank >= 10 ? 0 : card.rank);

/** DOM-карта: крупный ранг + масть; красные масти красятся токеном темы. */
function cardNode(card) {
  const node = document.createElement('span');
  node.className = 'card';
  node.dataset.red = String(RED_SUITS.has(card.suit));
  const rank = document.createElement('b');
  rank.className = 'card__rank';
  rank.textContent = RANKS[card.rank] || '?';
  const suit = document.createElement('span');
  suit.className = 'card__suit';
  suit.textContent = SUITS[card.suit] || '';
  node.append(rank, suit);
  return node;
}

/** До первой сдачи на столе лежат рубашки — сцена не выглядит пустой. */
function renderIdle() {
  for (const id of ['pCards', 'bCards']) {
    const host = $(id);
    host.replaceChildren();
    for (let i = 0; i < CONFIG.idleBackCards; i++) {
      const back = document.createElement('img');
      back.className = 'card card--back';
      back.src = 'art/card-back.svg';
      back.alt = '';
      host.append(back);
    }
  }
  $('pTotal').textContent = '0';
  $('bTotal').textContent = '0';
}

// Выбор ставки: кнопки — лицо, скрытый селект #betType — источник значения
// (его же дергает внешний QA, поэтому селект остаётся в DOM).
const choiceButtons = [...document.querySelectorAll('#betChoices [data-bet]')];
function syncChoices() {
  const current = $('betType').value;
  for (const button of choiceButtons) {
    const active = button.dataset.bet === current;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
for (const button of choiceButtons) {
  button.addEventListener('click', () => {
    $('betType').value = button.dataset.bet;
    play('tick');
    syncChoices();
  });
}
$('betType').addEventListener('change', syncChoices);

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
  $('result').textContent = t(key);
  $('result').dataset.state = 'lose';
  play('error');
}

/** Сдача по одной карте в порядке стола: игрок, банкир, игрок, банкир… */
async function dealHands(outcome) {
  const queue = [];
  const count = Math.max(outcome.playerCards.length, outcome.bankerCards.length);
  for (let i = 0; i < count; i++) {
    if (outcome.playerCards[i]) queue.push({ hand: 'p', card: outcome.playerCards[i] });
    if (outcome.bankerCards[i]) queue.push({ hand: 'b', card: outcome.bankerCards[i] });
  }
  $('pCards').replaceChildren();
  $('bCards').replaceChildren();
  const totals = { p: 0, b: 0 };
  for (const [index, item] of queue.entries()) {
    if (index > 0) await wait(CONFIG.dealDelayMs);
    $(`${item.hand}Cards`).append(cardNode(item.card));
    // Тотал растёт по мере вскрытия — интрига держится до последней карты.
    totals[item.hand] = (totals[item.hand] + cardPoints(item.card)) % 10;
    $(`${item.hand}Total`).textContent = totals[item.hand];
    play('reveal', { pitch: index * 2 });
  }
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

  busy = true;
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('win').textContent = '0';
  $('stage').dataset.winner = '';
  $('pTotal').dataset.state = '';
  $('bTotal').dataset.state = '';
  for (const row of document.querySelectorAll('.paytable__row')) row.dataset.hit = 'false';
  play('bet');

  const id = `baccarat_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, { bet: $('betType').value });
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  await dealHands(out);

  // Итоговые тоталы — от сервера: клиентский подсчёт лишь сопровождал сдачу.
  $('pTotal').textContent = out.playerTotal;
  $('bTotal').textContent = out.bankerTotal;
  $('stage').dataset.winner = out.result;
  if (out.result === 'tie') {
    $('pTotal').dataset.state = 'tie';
    $('bTotal').dataset.state = 'tie';
  } else {
    $('pTotal').dataset.state = out.result === 'player' ? 'win' : 'lose';
    $('bTotal').dataset.state = out.result === 'banker' ? 'win' : 'lose';
  }
  const hitRow = document.querySelector(`.paytable__row[data-outcome="${out.result}"]`);
  if (hitRow) hitRow.dataset.hit = 'true';

  const win = Number(settled.payload.win || 0);
  const multiplier = amount > 0 ? win / amount : 0;
  const won = win > 0;
  $('result').dataset.state = won ? 'win' : 'lose';
  $('result').textContent = `${t(WINNER_KEY[out.result] || out.result)} · ${
    won ? t('youWon', { amount: money(win) }) : t('loss')
  }`;

  if (won) {
    play(multiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier, locale: t.locale });
  } else {
    play('lose');
    flash('lose');
    shake($('stage'));
  }

  busy = false;
  $('play').disabled = false;
  $('play').dataset.idle = 'true';
};

renderIdle();
sdk.start();
