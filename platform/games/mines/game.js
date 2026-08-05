import { MinesBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, burst, flash, shake } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея — здесь, а не в разметке: шаг и границы ставки, порог
// «крупного выигрыша», задержки анимаций и сила эффектов правятся в одном месте.
const CONFIG = {
  gridSize: 25, // поле 5×5 — задано серверной математикой, менять вместе с сервером
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  bigWinMultiplier: 5, // от этого множителя включается bigWin-фанфара
  mineRevealStaggerMs: 70, // каскадный показ мин после подрыва
  revealPitchMax: 12, // потолок повышения тона звука вскрытия
  tileBurst: { count: 12, distance: 120 }, // искры на безопасной плитке
};

/** Строки, специфичные для Mines (общие термины — в i18n.js, не дублируем). */
const GAME_STRINGS = {
  en: {
    title: 'Nova Mines',
    sound: 'Sound',
    minesCount: 'Mines',
    minefield: 'Minefield',
    tile: 'Tile {n}',
    roundStarted: 'Mines: {count} · reveal the tiles',
    nextTile: 'Next tile → {value}×',
    busted: 'Mine! Round lost',
    cashedOut: 'Cashed out {amount} · {value}×',
  },
  ru: {
    title: 'Nova Mines',
    sound: 'Звук',
    minesCount: 'Мины',
    minefield: 'Минное поле',
    tile: 'Плитка {n}',
    roundStarted: 'Мин: {count} · открывайте плитки',
    nextTile: 'Следующая плитка → {value}×',
    busted: 'Мина! Раунд проигран',
    cashedOut: 'Забрано {amount} · {value}×',
  },
  uk: {
    title: 'Nova Mines',
    sound: 'Звук',
    minesCount: 'Міни',
    minefield: 'Мінне поле',
    tile: 'Плитка {n}',
    roundStarted: 'Мін: {count} · відкривайте плитки',
    nextTile: 'Наступна плитка → {value}×',
    busted: 'Міна! Раунд програно',
    cashedOut: 'Забрано {amount} · {value}×',
  },
  es: {
    title: 'Nova Mines',
    sound: 'Sonido',
    minesCount: 'Minas',
    minefield: 'Campo de minas',
    tile: 'Casilla {n}',
    roundStarted: 'Minas: {count} · descubre las casillas',
    nextTile: 'Siguiente casilla → {value}×',
    busted: '¡Mina! Ronda perdida',
    cashedOut: 'Retirado {amount} · {value}×',
  },
  de: {
    title: 'Nova Mines',
    sound: 'Ton',
    minesCount: 'Minen',
    minefield: 'Minenfeld',
    tile: 'Feld {n}',
    roundStarted: 'Minen: {count} · decke die Felder auf',
    nextTile: 'Nächstes Feld → {value}×',
    busted: 'Mine! Runde verloren',
    cashedOut: 'Ausgezahlt {amount} · {value}×',
  },
  fr: {
    title: 'Nova Mines',
    sound: 'Son',
    minesCount: 'Mines',
    minefield: 'Champ de mines',
    tile: 'Case {n}',
    roundStarted: 'Mines : {count} · révélez les cases',
    nextTile: 'Case suivante → {value}×',
    busted: 'Mine ! Manche perdue',
    cashedOut: 'Encaissé {amount} · {value}×',
  },
  pt: {
    title: 'Nova Mines',
    sound: 'Som',
    minesCount: 'Minas',
    minefield: 'Campo minado',
    tile: 'Casa {n}',
    roundStarted: 'Minas: {count} · revele as casas',
    nextTile: 'Próxima casa → {value}×',
    busted: 'Mina! Rodada perdida',
    cashedOut: 'Sacado {amount} · {value}×',
  },
};

const sdk = new MinesBridge();
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const grid = $('grid');

let busy = false;
let session = null;
let revealedCount = 0;
let balance = 0;

// Поле 5×5: плитки создаются один раз, дальше только меняют состояние.
for (let i = 0; i < CONFIG.gridSize; i++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.disabled = true;
  b.setAttribute('aria-label', t('tile', { n: i + 1 }));
  b.onclick = () => onReveal(i);
  grid.appendChild(b);
}
const tiles = () => [...grid.children];

/** Содержимое плитки — арт из art/: tile (закрыта), gem (безопасна), mine (подрыв). */
function setTileArt(b, kind) {
  b.className = kind === 'gem' ? 'safe' : kind === 'mine' ? 'mine' : '';
  b.innerHTML = `<img src="art/${kind}.svg" alt="">`;
}

/** Возвращает плитки к закрытому виду; active — можно ли их нажимать. */
function resetGrid(active) {
  for (const b of tiles()) {
    setTileArt(b, 'tile');
    b.disabled = !active;
  }
}
resetGrid(false);

addEventListener('casino:balance', (e) => {
  balance = Number(e.detail.balance);
  $('balance').textContent = money(balance);
  if (!session) {
    $('play').disabled = busy;
    $('play').dataset.idle = String(!busy);
  }
});

const stepBet = (delta) => {
  $('bet').value = Math.min(
    CONFIG.betMax,
    Math.max(CONFIG.betMin, Math.trunc(Number($('bet').value) + delta)),
  );
  play('tick');
};
$('betUp').onclick = () => stepBet(CONFIG.betStep);
$('betDown').onclick = () => stepBet(-CONFIG.betStep);
$('mines').onchange = () => play('tick');

$('sound').onclick = (event) => {
  const muted = audio.toggle();
  event.currentTarget.setAttribute('aria-pressed', String(!muted));
  event.currentTarget.textContent = muted ? '♪̶' : '♪';
  if (!muted) play('click');
};

$('play').onclick = async () => {
  if (busy || session) return;
  const amount = Math.trunc(Number($('bet').value));
  const mines = Number($('mines').value);
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

  const r = await sdk.begin(amount, mines);
  busy = false;
  if (r?.type !== 'MINES_STARTED') {
    $('play').disabled = false;
    $('play').dataset.idle = 'true';
    $('result').textContent = t('betRejected');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  session = r.payload.sessionId;
  revealedCount = 0;
  resetGrid(true);
  $('play').hidden = true;
  $('cashout').hidden = false;
  updateCashout(r.payload.multiplierNext, 0);
  $('result').textContent = t('roundStarted', { count: mines });
};

async function onReveal(i) {
  if (busy || !session) return;
  busy = true;
  const b = tiles()[i];
  b.disabled = true;
  const r = await sdk.reveal(session, i);
  busy = false;
  if (r?.type !== 'MINES_UPDATE') {
    b.disabled = false;
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }

  const p = r.payload;
  if (p.status === 'busted') {
    setTileArt(b, 'mine');
    return endGame(p, false);
  }

  revealedCount = p.revealed?.length ?? revealedCount + 1;
  setTileArt(b, 'gem');
  // Тон вскрытия растёт с каждой находкой — напряжение слышно.
  play('reveal', { pitch: Math.min(CONFIG.revealPitchMax, revealedCount) });
  burst(b, CONFIG.tileBurst);
  if (p.status === 'cashed') return endGame(p, true, 'auto');
  updateCashout(p.multiplierNext, p.multiplier);
  $('result').textContent = `${t('multiplier')} ${p.multiplier.toFixed(2)}×`;
  $('result').dataset.state = 'win';
}

$('cashout').onclick = async () => {
  if (busy || !session || revealedCount < 1) return;
  busy = true;
  $('cashout').disabled = true;
  const r = await sdk.cashout(session);
  busy = false;
  if (r?.type !== 'MINES_ENDED') {
    $('cashout').disabled = false;
    $('result').textContent = t('settleError');
    $('result').dataset.state = 'lose';
    play('error');
    return;
  }
  endGame(r.payload, true, 'cashout');
};

/** Обновляет кнопку «забрать» и подсказку о множителе следующей плитки. */
function updateCashout(next, cur) {
  $('cashout').textContent = cur > 0 ? `${t('cashout')} ${cur.toFixed(2)}×` : t('cashout');
  $('cashout').disabled = cur <= 0;
  $('next').textContent = next ? t('nextTile', { value: next.toFixed(2) }) : '';
  $('next').dataset.state = cur > 0 ? 'win' : '';
}

/** Завершает раунд: показывает мины, играет фидбек, возвращает кнопку «играть». */
function endGame(p, won, source) {
  const minePositions = Array.isArray(p.minePositions) ? p.minePositions : [];
  // Каскадный показ мин: поле «раскрывается», а не переключается скачком.
  minePositions.forEach((m, idx) => {
    const b = tiles()[m];
    if (!b || b.classList.contains('safe') || b.classList.contains('mine')) return;
    setTimeout(() => setTileArt(b, 'mine'), idx * CONFIG.mineRevealStaggerMs);
  });
  tiles().forEach((b) => { b.disabled = true; });
  $('next').textContent = '';
  $('next').dataset.state = '';
  session = null;
  $('cashout').hidden = true;
  $('cashout').disabled = true;
  $('play').hidden = false;
  $('play').disabled = false;
  $('play').dataset.idle = 'true';

  if (won) {
    const win = Number(p.win || 0);
    const multiplier = Number(p.multiplier || 0);
    $('result').textContent = t('cashedOut', { amount: money(win), value: multiplier.toFixed(2) });
    $('result').dataset.state = 'win';
    // «Забрать» звучит как кассовый чек; автозавершение поля — как победа.
    play(source === 'cashout' ? 'cashout' : multiplier >= CONFIG.bigWinMultiplier ? 'bigWin' : 'win');
    celebrate({ element: $('win'), from: 0, to: win, multiplier, locale: t.locale });
  } else {
    $('result').textContent = t('busted');
    $('result').dataset.state = 'lose';
    play('lose');
    flash('lose');
    shake($('stage'));
  }
}

sdk.start();
