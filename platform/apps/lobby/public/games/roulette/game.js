import { CasinoBridge } from './sdk.js';
import { createGameI18n } from './i18n.js';
import { celebrate, shake, flash } from './ui-fx.js';
import { initAudio, audio } from './ui-audio.js';

// Всё «ощущение» рулетки настраивается здесь: шаг и границы ставки, длительность
// и число оборотов колеса и шарика, геометрия сцены и порог крупного выигрыша.
const CONFIG = {
  betStep: 10,
  betMin: 1,
  betMax: 100000,
  pockets: 37, // европейское колесо: 0..36
  spinMs: 2200, // длительность вращения — как в исходной версии игры
  fullTurns: 5, // полных оборотов колеса за спин
  ballTurns: 3, // обороты шарика против хода колеса
  tickMinMs: 50, // минимальный интервал между «щелчками» секторов
  wheelRadius: 0.48, // радиус колеса в долях стороны канваса
  numberRadius: 0.44, // радиус кольца номеров
  hubRadius: 0.13, // радиус ступицы под бейджем результата
  ballOrbit: 0.4, // орбита шарика в долях стороны канваса
  bigWinMultiplier: 10, // straight платит 36×, ровные ставки 2× — порог между ними
};

// Строки именно этой игры на всех языках витрины. Общие ключи (balance, bet,
// win, waiting, youWon и т.д.) уже лежат в i18n.js — здесь их не дублируем.
const GAME_STRINGS = {
  en: {
    sound: 'Sound',
    choice: 'Bet type',
    choiceRed: 'Red',
    choiceBlack: 'Black',
    choiceEven: 'Even',
    choiceOdd: 'Odd',
    choiceStraight: 'Straight number',
    straightNumber: 'Number',
    landedOn: 'Landed on {number}',
    colorRed: 'red',
    colorBlack: 'black',
    colorGreen: 'green',
  },
  ru: {
    sound: 'Звук',
    choice: 'Тип ставки',
    choiceRed: 'Красное',
    choiceBlack: 'Чёрное',
    choiceEven: 'Чётное',
    choiceOdd: 'Нечётное',
    choiceStraight: 'Точное число',
    straightNumber: 'Число',
    landedOn: 'Выпало {number}',
    colorRed: 'красное',
    colorBlack: 'чёрное',
    colorGreen: 'зелёное',
  },
  uk: {
    sound: 'Звук',
    choice: 'Тип ставки',
    choiceRed: 'Червоне',
    choiceBlack: 'Чорне',
    choiceEven: 'Парне',
    choiceOdd: 'Непарне',
    choiceStraight: 'Точне число',
    straightNumber: 'Число',
    landedOn: 'Випало {number}',
    colorRed: 'червоне',
    colorBlack: 'чорне',
    colorGreen: 'зелене',
  },
  es: {
    sound: 'Sonido',
    choice: 'Tipo de apuesta',
    choiceRed: 'Rojo',
    choiceBlack: 'Negro',
    choiceEven: 'Par',
    choiceOdd: 'Impar',
    choiceStraight: 'Número exacto',
    straightNumber: 'Número',
    landedOn: 'Salió el {number}',
    colorRed: 'rojo',
    colorBlack: 'negro',
    colorGreen: 'verde',
  },
  de: {
    sound: 'Ton',
    choice: 'Einsatzart',
    choiceRed: 'Rot',
    choiceBlack: 'Schwarz',
    choiceEven: 'Gerade',
    choiceOdd: 'Ungerade',
    choiceStraight: 'Genaue Zahl',
    straightNumber: 'Zahl',
    landedOn: 'Gefallen: {number}',
    colorRed: 'Rot',
    colorBlack: 'Schwarz',
    colorGreen: 'Grün',
  },
  fr: {
    sound: 'Son',
    choice: 'Type de mise',
    choiceRed: 'Rouge',
    choiceBlack: 'Noir',
    choiceEven: 'Pair',
    choiceOdd: 'Impair',
    choiceStraight: 'Numéro plein',
    straightNumber: 'Numéro',
    landedOn: 'Le {number} est sorti',
    colorRed: 'rouge',
    colorBlack: 'noir',
    colorGreen: 'vert',
  },
  pt: {
    sound: 'Som',
    choice: 'Tipo de aposta',
    choiceRed: 'Vermelho',
    choiceBlack: 'Preto',
    choiceEven: 'Par',
    choiceOdd: 'Ímpar',
    choiceStraight: 'Número exato',
    straightNumber: 'Número',
    landedOn: 'Saiu o {number}',
    colorRed: 'vermelho',
    colorBlack: 'preto',
    colorGreen: 'verde',
  },
};

const sdk = new CasinoBridge('roulette');
const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const canvas = $('wheel');
const ctx = canvas.getContext('2d');

// Порядок лунок европейского колеса и красные номера — правила игры, не тема.
const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

let busy = false;
let balance = 0;
let rotation = 0;
let ballAngle = -Math.PI / 2; // шарик стартует сверху

/** Цвета берём из активной темы — колесо всегда в палитре бренда. */
const themeColor = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Цвет лунки: zero — выигрышный зелёный, красные — цвет проигрыша, чёрные — тёмный. */
function pocketColor(number) {
  if (number === 0) return themeColor('--c-win', '#3ddc84');
  return REDS.includes(number)
    ? themeColor('--c-loss', '#ff5d73')
    : themeColor('--c-surface-2', '#151718');
}

function draw() {
  const ratio = devicePixelRatio || 1;
  const size = canvas.clientWidth || 360;
  canvas.width = canvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.rotate(rotation);

  for (let i = 0; i < CONFIG.pockets; i++) {
    const from = (i / CONFIG.pockets) * Math.PI * 2;
    const to = ((i + 1) / CONFIG.pockets) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size * CONFIG.wheelRadius, from, to);
    ctx.fillStyle = pocketColor(NUMBERS[i]);
    ctx.fill();
    ctx.strokeStyle = themeColor('--c-base', '#0a140f');
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.rotate((from + to) / 2);
    ctx.fillStyle = themeColor('--c-text', '#eef4ff');
    ctx.font = `700 ${Math.max(9, Math.round(size * 0.032))}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(NUMBERS[i], size * CONFIG.numberRadius, 4);
    ctx.restore();
  }

  ctx.rotate(-rotation);
  // Ступица под DOM-бейджем результата даёт колесу глубину.
  ctx.beginPath();
  ctx.arc(0, 0, size * CONFIG.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = themeColor('--c-surface', '#12251b');
  ctx.fill();
  ctx.strokeStyle = themeColor('--c-gold', '#ffd15c');
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

/** Ставит шарик на канвасный угол `angle` (0 — «3 часа», по часовой стрелке). */
function placeBall(angle) {
  const orbit = (canvas.clientWidth || 360) * CONFIG.ballOrbit;
  const degrees = (angle * 180) / Math.PI + 90; // CSS-поворот отсчитывается от «12 часов»
  $('ball').style.transform = `translate(-50%, -50%) rotate(${degrees}deg) translateY(${-orbit}px)`;
}

draw();
placeBall(ballAngle);
addEventListener('resize', () => {
  draw();
  placeBall(ballAngle);
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

$('choice').onchange = () => {
  $('straightWrap').hidden = $('choice').value !== 'straight';
  play('tick');
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
  $('play').disabled = busy;
  $('play').dataset.idle = String(!busy);
});

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
  const amount = Math.trunc(Number($('bet').value));
  if (amount < CONFIG.betMin) return;
  if (amount > balance) {
    $('result').textContent = t('insufficient');
    $('result').dataset.state = 'lose';
    shake($('play'));
    play('error');
    return;
  }

  // Payload ставки — ровно как раньше: {type} или {type, number} для straight.
  const type = $('choice').value;
  const choice = type === 'straight' ? { type, number: Number($('straight').value) } : { type };

  busy = true;
  $('play').disabled = true;
  $('play').dataset.idle = 'false';
  $('result').textContent = t('waiting');
  $('result').dataset.state = '';
  $('pocket').dataset.state = '';
  $('win').textContent = '0';
  play('bet');

  const id = `roulette_${crypto.randomUUID().replaceAll('-', '')}`;
  const ok = await sdk.bet(amount, id, choice);
  if (ok?.type !== 'BET_APPROVED') return fail('betRejected');
  const settled = await sdk.settle(id);
  if (settled?.type !== 'ROUND_SETTLED') return fail('settleError');

  const out = settled.payload.outcome;
  const index = NUMBERS.indexOf(out.number);
  const from = rotation;
  // Формула остановки — как в исходной игре: fullTurns оборотов минус угол лунки.
  const to = from + Math.PI * 2 * CONFIG.fullTurns - (index / CONFIG.pockets) * Math.PI * 2;
  // Шарик летит навстречу колесу и садится точно в центр выигрышной лунки.
  const pocketAngle = to + ((index + 0.5) / CONFIG.pockets) * Math.PI * 2;
  const ballFrom = ballAngle;
  const backward =
    ((((ballFrom - pocketAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) +
    Math.PI * 2 * CONFIG.ballTurns;
  const ballTo = ballFrom - backward;

  $('stage').dataset.spinning = 'true';
  play('spin');

  await new Promise((resolve) => {
    const started = performance.now();
    let lastPocket = -1;
    let lastTickAt = 0;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / CONFIG.spinMs);
      const eased = 1 - (1 - progress) ** 3;
      rotation = from + (to - from) * eased;
      ballAngle = ballFrom + (ballTo - ballFrom) * eased;
      draw();
      placeBall(ballAngle);
      // Щелчок на каждой пройденной лунке — замедление слышно так же, как видно.
      const pocket = Math.floor((rotation / (Math.PI * 2)) * CONFIG.pockets);
      if (pocket !== lastPocket && now - lastTickAt >= CONFIG.tickMinMs) {
        play('tick', { gain: 0.5 });
        lastPocket = pocket;
        lastTickAt = now;
      }
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  $('stage').dataset.spinning = 'false';
  const win = Number(settled.payload.win || 0);
  const won = win > 0;
  const wonMultiplier = amount > 0 ? win / amount : 0;
  const colorKey =
    out.color === 'red' ? 'colorRed' : out.color === 'black' ? 'colorBlack' : 'colorGreen';

  play('reveal');
  $('pocket').textContent = out.number;
  $('pocket').dataset.color = out.color === 'red' || out.color === 'black' ? out.color : 'green';
  $('pocket').dataset.state = won ? 'win' : 'lose';
  $('result').dataset.state = won ? 'win' : 'lose';
  $('result').textContent = `${t('landedOn', { number: out.number })} · ${t(colorKey)} · ${
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

sdk.start();
