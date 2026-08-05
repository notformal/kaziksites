import { createHash, createHmac, randomBytes } from "node:crypto";
import { baccaratResult } from "./baccarat.js";
import { spin as slotSpin, makeHmacRng } from "./slotEngine.js";
import {
  BACCARAT_DECKS,
  BACCARAT_PAYOUTS_MILLI,
  CLASSIC_SLOT,
  KENO_PAYTABLE,
  PLINKO,
  SICBO_PAYOUTS_MILLI,
  WHEEL_SEGMENTS_MILLI,
  uniformFromHash,
  weightedIndex,
} from "./mathProfiles.js";
const hbyte = (h, i) => Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
export const newServerSeed = () => randomBytes(32).toString("hex");
export const seedHash = (seed) =>
  createHash("sha256").update(seed).digest("hex");
export function digest({ serverSeed, clientSeed, nonce, gameId }) {
  return createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}:${gameId}`)
    .digest("hex");
}
const paylines = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2],
  [1, 1, 0, 1, 1],
];
function slotOutcome(h, math) {
  const symbols = math.symbols,
    total = symbols.reduce((n, s) => n + math.weights[s.id], 0),
    bytes = Array.from({ length: 15 }, (_, i) =>
      Number.parseInt(h.slice((i * 4) % 60, ((i * 4) % 60) + 4), 16),
    );
  const grid = bytes.map((byte) => {
      let point = (byte / 65536) * total;
      return (
        symbols.find((s) => (point -= math.weights[s.id]) <= 0) ||
        symbols.at(-1)
      ).id;
    }),
    wild = symbols.find((s) => s.kind === "wild")?.id,
    scatter = symbols.find((s) => s.kind === "scatter")?.id;
  let pay = 0;
  const winningLines = [];
  for (const [lineIndex, rows] of paylines.slice(0, math.lines).entries()) {
    const ids = rows.map((row, col) => grid[col * 3 + row]),
      base = ids.find((id) => id !== wild && id !== scatter);
    if (!base) continue;
    let count = 0;
    for (const id of ids) {
      if (id === base || id === wild) count++;
      else break;
    }
    const award = math.paytable[base]?.[count - 1] || 0;
    if (award) {
      pay += award;
      winningLines.push({ line: lineIndex + 1, symbol: base, count, award });
    }
  }
  const scatterCount = grid.filter((id) => id === scatter).length;
  let bonus = null;
  if (scatterCount >= math.bonus.triggerCount) {
    const type = math.bonus.type;
    if (type === "multiplier") pay *= math.bonus.multiplier;
    bonus = {
      type,
      count: scatterCount,
      multiplier: type === "multiplier" ? math.bonus.multiplier : 1,
      awardedSpins:
        type === "free-spins" ? math.bonus.freeSpins : type === "respin" ? 1 : 0,
    };
  }
  return {
    value: JSON.stringify({ grid, winningLines, bonus }),
    multiplierMilli: Math.max(0, Math.round((pay / math.lines) * 1000)),
  };
}
/**
 * Раздаёт `count` карт из шуза на `decks` колод, тасуя Фишером-Йетсом по хешу.
 * Возвращает {rank:1..13, suit:0..3} — формат, который ждут резолверы игр.
 */
function dealFromShoe(hash, count, decks) {
  const size = 52 * decks;
  const shoe = Array.from({ length: size }, (_, i) => i);
  const dealt = [];
  for (let i = 0; i < count; i++) {
    const pick = uniformFromHash(hash, i, shoe.length);
    const card = shoe.splice(pick, 1)[0];
    dealt.push({ rank: (card % 13) + 1, suit: Math.floor(card / 13) % 4 });
  }
  return dealt;
}

export function outcome(input) {
  const h = digest(input),
    n = Number.parseInt(h.slice(0, 13), 16) / 0x10000000000000,
    kind = input.kind || input.gameId;
  if (kind === "slot-engine") {
    // Data-driven slots (slotEngine): the spin is derived from an HMAC stream
    // keyed by the same (serverSeed, clientSeed, nonce), so a revealed round is
    // fully reproducible. `multiplier` is the total return in bet multiples.
    const rng = makeHmacRng(input.serverSeed, input.clientSeed, input.nonce);
    const res = slotSpin(input.math, rng);
    const mult = res.win / (input.math.betUnits || 1);
    return {
      value: JSON.stringify({ grids: res.grids, win: res.win, multiplier: mult, scatters: res.scatters, freeSpins: res.freeSpins }),
      multiplierMilli: Math.max(0, Math.round(mult * 1000)),
    };
  }
  if (kind === "roulette") {
    const number=Math.floor(n*37), red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]), choice=input.choice;
    const won=choice?.type==='straight'?number===choice.number:number!==0&&((choice?.type==='red'&&red.has(number))||(choice?.type==='black'&&!red.has(number))||(choice?.type==='even'&&number%2===0)||(choice?.type==='odd'&&number%2===1));
    return {value:JSON.stringify({number,color:number===0?'green':red.has(number)?'red':'black',choice}),multiplierMilli:won?(choice.type==='straight'?36000:2000):0};
  }
  if (kind === "keno") {
    const pool=Array.from({length:80},(_,i)=>i+1), drawn=[];
    for(let i=0;i<20;i++){const p=Number.parseInt(h.slice((i*3)%61,(i*3)%61+3),16)%pool.length;drawn.push(pool.splice(p,1)[0]);}
    const picks=input.choice?.numbers||[],hits=picks.filter(x=>drawn.includes(x)).length;
    return {value:JSON.stringify({drawn,picks,hits}),multiplierMilli:Math.round((KENO_PAYTABLE[picks.length]?.[hits]||0)*1000)};
  }
  if (kind === "plinko") {
    // Шарик проходит PLINKO.rows рядов колышков: распределение по корзинам
    // биномиальное, как в физической доске. Равномерный выбор давал RTP 310%.
    const bin = weightedIndex(PLINKO.weights, n),
      multiplierMilli = PLINKO.multipliersMilli[bin];
    return {
      value: JSON.stringify({ bin, rows: PLINKO.rows, multiplier: multiplierMilli / 1000, multipliers: PLINKO.multipliersMilli.map((m) => m / 1000) }),
      multiplierMilli,
    };
  }
  if (kind === "dice") {
    // roll is 0..9999 (display roll/100 = 0.00..99.99); target is in hundredths (1..9998).
    // 1% house edge: multiplier = 0.99 / winChance = 9900 / winCount, capped at 990x.
    const roll = Math.floor(n * 10000), c = input.choice || {}, over = c.type === "over";
    const winCount = over ? 9999 - c.target : c.target;
    const won = over ? roll > c.target : roll < c.target;
    return {
      value: JSON.stringify({ roll, target: c.target, type: c.type, won }),
      multiplierMilli: won ? Math.min(990000, Math.round(9900000 / winCount)) : 0,
    };
  }
  if (kind === "roulette-us") {
    // 38 pockets: 0, 00 (=37), 1..36. Even-money bets lose on 0 and 00.
    const number = Math.floor(n * 38),
      red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]),
      choice = input.choice,
      zero = number === 0 || number === 37;
    const won =
      choice?.type === "straight"
        ? number === choice.number
        : !zero &&
          ((choice?.type === "red" && red.has(number)) ||
            (choice?.type === "black" && !red.has(number)) ||
            (choice?.type === "even" && number % 2 === 0) ||
            (choice?.type === "odd" && number % 2 === 1));
    return {
      value: JSON.stringify({ number, label: number === 37 ? "00" : String(number), color: zero ? "green" : red.has(number) ? "red" : "black", choice }),
      multiplierMilli: won ? (choice.type === "straight" ? 36000 : 2000) : 0,
    };
  }
  if (kind === "sicbo") {
    const dice = [0, 1, 2].map((i) => uniformFromHash(h, i, 6) + 1),
      sum = dice[0] + dice[1] + dice[2],
      triple = dice[0] === dice[1] && dice[1] === dice[2],
      c = input.choice || {};
    let mult = 0;
    if (c.bet === "small") mult = !triple && sum >= 4 && sum <= 10 ? SICBO_PAYOUTS_MILLI.smallBig : 0;
    else if (c.bet === "big") mult = !triple && sum >= 11 && sum <= 17 ? SICBO_PAYOUTS_MILLI.smallBig : 0;
    else if (c.bet === "single") { const m = dice.filter((d) => d === c.number).length; mult = m > 0 ? SICBO_PAYOUTS_MILLI.singlePerMatch * (1 + m) : 0; }
    else if (c.bet === "anytriple") mult = triple ? SICBO_PAYOUTS_MILLI.anyTriple : 0;
    else if (c.bet === "triple") mult = triple && dice[0] === c.number ? SICBO_PAYOUTS_MILLI.specificTriple : 0;
    return { value: JSON.stringify({ dice, sum, triple, bet: c.bet, number: c.number }), multiplierMilli: mult };
  }
  if (kind === "baccarat") {
    // Карты берутся из тасованного шуза (без возврата) — независимая выборка
    // с modulo-bias искажала вероятности и уводила RTP выше 100%.
    const cards = dealFromShoe(h, 6, BACCARAT_DECKS);
    const r = baccaratResult(cards), c = input.choice || {};
    let mult = 0;
    if (c.bet === "player") mult = r.result === "player" ? BACCARAT_PAYOUTS_MILLI.player : r.result === "tie" ? BACCARAT_PAYOUTS_MILLI.push : 0;
    else if (c.bet === "banker") mult = r.result === "banker" ? BACCARAT_PAYOUTS_MILLI.banker : r.result === "tie" ? BACCARAT_PAYOUTS_MILLI.push : 0;
    else if (c.bet === "tie") mult = r.result === "tie" ? BACCARAT_PAYOUTS_MILLI.tie : 0;
    return { value: JSON.stringify({ ...r, bet: c.bet }), multiplierMilli: mult };
  }
  if (kind === "wheel") {
    // 10 equal segments; multipliers average 0.99 (1% house edge). No player input.
    const segments = WHEEL_SEGMENTS_MILLI;
    const idx = Math.min(segments.length - 1, Math.floor(n * segments.length));
    return {
      value: JSON.stringify({ segment: idx, segments: segments.map((m) => m / 1000), multiplier: segments[idx] / 1000 }),
      multiplierMilli: segments[idx],
    };
  }
  if (kind === "limbo") {
    // Result multiplier m = 0.99/(1-n) (same curve as crash). The player wins their
    // chosen target multiplier when m >= target. EV = target * (0.99/target) = 0.99.
    const resultMilli = Math.min(1_000_000_000, Math.max(990, Math.floor(990 / (1 - n))));
    const targetMilli = Math.round((input.choice?.target || 0) * 1000), won = resultMilli >= targetMilli;
    return {
      value: JSON.stringify({ result: resultMilli / 1000, target: input.choice?.target, won }),
      multiplierMilli: won ? Math.min(1_000_000, targetMilli) : 0,
    };
  }
  if (kind === "crash")
    return {
      value: Number((0.99 / (1 - n)).toFixed(2)),
      multiplierMilli: Math.max(
        1000,
        Math.min(100000, Math.floor(990 / (1 - n))),
      ),
    };
  if (input.math?.symbols) return slotOutcome(h, input.math);
  if (input.math) {
    const weights = [
        input.math.lossWeight,
        input.math.smallWeight,
        input.math.mediumWeight,
        input.math.largeWeight,
        input.math.jackpotWeight,
      ],
      total = weights.reduce((a, b) => a + b, 0),
      point = Math.floor(n * total);
    let sum = 0,
      index = weights.findIndex((w) => (sum += w) > point);
    if (index < 0) index = weights.length - 1;
    return {
      value: h.slice(0, 16),
      multiplierMilli: input.math.multipliersMilli[index],
    };
  }
  return {
    value: h.slice(0, 16),
    multiplierMilli: n < 0.45 ? 0 : n < 0.8 ? 1500 : n < 0.97 ? 2500 : 10000,
  };
}
export function verify(input, expected) {
  return JSON.stringify(outcome(input)) === JSON.stringify(expected);
}
