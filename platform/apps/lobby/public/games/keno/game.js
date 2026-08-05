import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash, burst } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Настройки геймплея — здесь, а не в разметке: шаг ставки, размеры табло,
// темп вскрытия шаров и порог «крупного выигрыша» правятся в одном месте.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  numbersTotal: 80, // табло чисел 1..80
  maxPicks: 10, // лимит выбранных чисел
  drawRevealMs: 110, // пауза между вскрытиями шаров
  bigWinMultiplier: 5, // от этого множителя играет bigWin вместо win
  hitBurst: { count: 10, spread: 140, distance: 70, size: [3, 7] }, // маленький залп искр на совпадении
};

// Строки именно этой игры на всех языках витрины; общие ключи живут в i18n.js.
const GAME_STRINGS = {
  en: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Pick up to {max} numbers',
    clearPicks: 'Clear',
    hits: 'Hits {hits}/{picks}',
    sound: 'Sound',
  },
  ru: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Выберите до {max} чисел',
    clearPicks: 'Очистить',
    hits: 'Совпадений {hits}/{picks}',
    sound: 'Звук',
  },
  uk: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Оберіть до {max} чисел',
    clearPicks: 'Очистити',
    hits: 'Збігів {hits}/{picks}',
    sound: 'Звук',
  },
  es: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Elige hasta {max} números',
    clearPicks: 'Borrar',
    hits: 'Aciertos {hits}/{picks}',
    sound: 'Sonido',
  },
  de: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Wähle bis zu {max} Zahlen',
    clearPicks: 'Leeren',
    hits: 'Treffer {hits}/{picks}',
    sound: 'Ton',
  },
  fr: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Choisissez jusqu’à {max} numéros',
    clearPicks: 'Effacer',
    hits: 'Trouvés {hits}/{picks}',
    sound: 'Son',
  },
  pt: {
    kenoTitle: 'Lucky 80 Keno',
    pickHint: 'Escolha até {max} números',
    clearPicks: 'Limpar',
    hits: 'Acertos {hits}/{picks}',
    sound: 'Som',
  },
};

const sdk = new CasinoBridge('keno');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);

const grid = $('grid');
const selected = new Set();
let busy = false;
let balance = null; // null — баланс от хоста ещё не пришёл, ставку не разрешаем

// Подсказка с параметром: data-i18n не умеет подстановок, проставляем вручную.
$('pickHint').textContent = t('pickHint', { max: CONFIG.maxPicks });

// Табло 1..80: кнопки — прямые дети #grid, выбор доступен сразу после загрузки.
for (let n = 1; n <= CONFIG.numbersTotal; n++) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.textContent = n;
  cell.dataset.n = n;
  cell.onclick = () => toggle(n);
  grid.append(cell);
}

function toggle(n) {
  if (busy) return;
  if (selected.has(n)) {
    selected.delete(n);
  } else if (selected.size < CONFIG.maxPicks) {
    selected.add(n);
  } else {
    // Лимит выбора исчерпан — мягкий отказ вместо тихого игнорирования.
    play('error');
    shake($('count'));
    return;
  }
  play('tick');
  render();
}

function clearDrawn() {
  for (const cell of grid.children) cell.classList.remove('drawn', 'hit');
}

function render() {
  for (const cell of grid.children) cell.classList.toggle('selected', selected.has(Number(cell.dataset.n)));
  $('count').textContent = `${selected.size} / ${CONFIG.maxPicks}`;
  const ready = !busy && selected.size > 0 && balance !== null;
  $('play').disabled = !ready;
  $('play').dataset.idle = String(ready);
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

$('clear').onclick = () => {
  if (busy) return;
  selected.clear();
  clearDrawn();
  play('tick');
  render();
};

$('sound').onclick = (event) => {
  const muted = audio.toggle();
  event.currentTarget.setAttribute('aria-pressed', String(!muted));
  event.currentTarget.textContent = muted ? '♪̶' : '♪';
  if (!muted) play('click');
};

addEventListener('casino:balance', (e) => {
  balance = Number(e.detail.balance);
  $('balance').textContent = money(balance);
  render();
});

function fail(key) {
  busy = false;
  $('result').textContent = t(key);
  $('result').dataset.state = 'lose';
  play('error');
  render();
}

$('play').onclick = async () => {
  if (busy || !selected.size) return;
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
  render();
  clearDrawn();
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('count').dataset.state = '';
  $('win').textContent = '0';
  play('bet');

  const id = `keno_${crypto.randomUUID().replaceAll('-', '')}`;
  const picks = [...selected].sort((a, b) => a - b);
  const ok = await sdk.bet(amount, id, { numbers: picks });
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  const pickSet = new Set(picks);

  // Вскрываем шары по одному: щелчок на каждом, совпадение звучит ярче,
  // золотится и искрит — ожидание результата превращается в мини-шоу.
  for (const n of out.drawn) {
    await new Promise((resolve) => setTimeout(resolve, CONFIG.drawRevealMs));
    const cell = grid.children[n - 1];
    if (!cell) continue;
    cell.classList.add('drawn');
    if (pickSet.has(n)) {
      cell.classList.add('hit');
      play('reveal');
      burst(cell, CONFIG.hitBurst);
    } else {
      play('tick');
    }
  }

  const win = Number(settled.payload.win || 0);
  const hits = Number(out.hits || 0);
  const wonMultiplier = amount > 0 ? win / amount : 0;
  const won = win > 0;
  $('result').dataset.state = won ? 'win' : 'lose';
  $('count').dataset.state = won ? 'win' : 'lose';
  $('result').textContent = `${t('hits', { hits, picks: picks.length })} · ${
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
  render();
};

render();
sdk.start();
