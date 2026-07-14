import { createHash, createHmac, randomBytes } from "node:crypto";
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
export function outcome(input) {
  const h = digest(input),
    n = Number.parseInt(h.slice(0, 13), 16) / 0x10000000000000,
    kind = input.kind || input.gameId;
  if (kind === "roulette") {
    const number=Math.floor(n*37), red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]), choice=input.choice;
    const won=choice?.type==='straight'?number===choice.number:number!==0&&((choice?.type==='red'&&red.has(number))||(choice?.type==='black'&&!red.has(number))||(choice?.type==='even'&&number%2===0)||(choice?.type==='odd'&&number%2===1));
    return {value:JSON.stringify({number,color:number===0?'green':red.has(number)?'red':'black',choice}),multiplierMilli:won?(choice.type==='straight'?36000:2000):0};
  }
  if (kind === "keno") {
    const pool=Array.from({length:80},(_,i)=>i+1), drawn=[];
    for(let i=0;i<20;i++){const p=Number.parseInt(h.slice((i*3)%61,(i*3)%61+3),16)%pool.length;drawn.push(pool.splice(p,1)[0]);}
    const picks=input.choice?.numbers||[],hits=picks.filter(x=>drawn.includes(x)).length;
    const tables={1:[0,3],2:[0,0,12],3:[0,0,2,40],4:[0,0,1,5,100],5:[0,0,0,3,20,300],6:[0,0,0,2,8,50,500],7:[0,0,0,1,4,15,100,1000],8:[0,0,0,0,2,8,30,250,2000],9:[0,0,0,0,1,4,15,80,500,5000],10:[0,0,0,0,1,3,10,50,250,1000,10000]};
    return {value:JSON.stringify({drawn,picks,hits}),multiplierMilli:(tables[picks.length]?.[hits]||0)*1000};
  }
  if(kind==='plinko') {const multipliers=[9,3,1.5,.5,.2,.5,1.5,3,9],bin=Math.min(8,Math.floor(n*9));return{value:JSON.stringify({bin,multiplier:multipliers[bin]}),multiplierMilli:Math.round(multipliers[bin]*1000)}}
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
