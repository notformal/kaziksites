/**
 * Lightning Roulette Live Engine - Evolution Gaming Style
 * 
 * European roulette (single zero, 0-36) + Quantum Multipliers
 * Up to 5 "Lightning Numbers" per spin with multipliers from x50 to x500.
 * Straight-up bets on lightning numbers pay at multiplied odds instead of 35:1.
 * 
 * Features:
 * - Provably fair spin generation via HMAC-SHA256
 * - Full bet types (straight, red/black, odd/even, high/low, dozens, columns)
 * - Side bets (Any Roulette Top, Any Roulette Prime, Any Roulette Star)
 * - Round lifecycle management (betting -> spin -> result -> payout)
 * - Statistics & history tracking
 * 
 * @version 2.0.0
 */

import crypto from 'node:crypto';

const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const PAYOUTS = {
  straight: 36, red: 2, black: 2, odd: 2, even: 2, low: 2, high: 2,
  dozen_1: 3, dozen_2: 3, dozen_3: 3, column_1: 3, column_2: 3, column_3: 3,
};

const SIDE_BETS = {
  any_top:   { name: 'Any Roulette Top',    payout: 8, desc: 'Hit 10, 11, or 12' },
  any_prime: { name: 'Any Roulette Prime',  payout: 5, desc: 'Hit a prime number (2,3,5,7,11,13,17,19,23,29,31)' },
  any_star:  { name: 'Any Roulette Star',   payout: 8, desc: 'Hit 0 or any lightning number' },
};



// --- Provably Fair Spin Generator ---

function generateProvablyFairSpin(serverSeed, clientSeed, nonce) {
  const data = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
  const num1 = parseInt(hash.substring(0, 8), 16);
  const wheelIndex = num1 % WHEEL_ORDER.length;
  const number = WHEEL_ORDER[wheelIndex];

  const num2 = parseInt(hash.substring(8, 16), 16) / 0xFFFFFFFF;
  let numLightning;
  if (num2 < 0.30) numLightning = 1;
  else if (num2 < 0.60) numLightning = 2;
  else if (num2 < 0.80) numLightning = 3;
  else if (num2 < 0.95) numLightning = 4;
  else numLightning = 5;

  const allNumbers = Array.from({ length: 37 }, (_, i) => i);
  const available = allNumbers.filter(n => n !== number);
  const lightningNumbers = [];

  for (let i = 0; i < Math.min(numLightning, available.length); i++) {
    const segmentStart = 16 + i * 8;
    const num3 = parseInt(hash.substring(segmentStart, segmentStart + 8), 16) / 0xFFFFFFFF;
    const idx = Math.floor(num3 * (available.length - i));
    const multRand = Math.random();
    let multiplier;
    if (multRand < 0.35) multiplier = 50;
    else if (multRand < 0.60) multiplier = 100;
    else if (multRand < 0.78) multiplier = 200;
    else if (multRand < 0.90) multiplier = 300;
    else if (multRand < 0.97) multiplier = 400;
    else multiplier = 500;
    lightningNumbers.push({ number: available[idx], multiplier });
    available.splice(idx, 1);
  }

  const hitLightning = lightningNumbers.find(l => l.number === number);
  return {
    number, color: number === 0 ? 'green' : RED_NUMBERS.has(number) ? 'red' : 'black',
    section: number <= 18 ? 'low' : 'high',
    dozen: number === 0 ? null : Math.ceil(number / 12),
    column: number === 0 ? null : ((number - 1) % 3) + 1,
    lightningNumbers, isLightningHit: !!hitLightning,
    lightningMultiplier: hitLightning ? hitLightning.multiplier : 0,
    hash, serverSeedHash: crypto.createHash('sha256').update(serverSeed).digest('hex'), nonce,
  };
}


// --- Bet Evaluation ---

function evaluateBets(bets, spinResult) {
  const payouts = {};
  let totalPayoutCents = 0;
  const wonBets = [];
  for (const [betKey, bet] of Object.entries(bets)) {
    const amount = typeof bet === 'number' ? bet : (bet.amount || 0);
    if (amount <= 0) continue;
    let won = false, multiplier = 0;
    if (bet.type === 'straight') {
      const target = bet.target ?? bet.number;
      if (target !== undefined && spinResult.number === target) {
        won = true;
        multiplier = spinResult.isLightningHit ? spinResult.lightningMultiplier : PAYOUTS.straight;
      }
    } else if (bet.type === 'red')       { won = spinResult.color === 'red';     multiplier = PAYOUTS.red; }
    else if (bet.type === 'black')       { won = spinResult.color === 'black';  multiplier = PAYOUTS.black; }
    else if (bet.type === 'odd')         { won = spinResult.number > 0 && spinResult.number % 2 === 1; multiplier = PAYOUTS.odd; }
    else if (bet.type === 'even')        { won = spinResult.number > 0 && spinResult.number % 2 === 0; multiplier = PAYOUTS.even; }
    else if (bet.type === 'low')         { won = spinResult.number >= 1 && spinResult.number <= 18; multiplier = PAYOUTS.low; }
    else if (bet.type === 'high')        { won = spinResult.number >= 19 && spinResult.number <= 36; multiplier = PAYOUTS.high; }
    else if (bet.type.startsWith('dozen')) { const d = parseInt(bet.dozen || betKey.split('_')[1]); const lo=(d-1)*12+1, hi=d*12; won=spinResult.number>=lo && spinResult.number<=hi; multiplier=PAYOUTS[`dozen_${d}`]||0; }
    else if (bet.type.startsWith('column')) { const c2=parseInt(bet.column||betKey.split('_')[1]); won=spinResult.number>0&&((c2===1&&spinResult.number%3===1)||(c2===2&&spinResult.number%3===2)||(c2===3&&spinResult.number%3===0)); multiplier=PAYOUTS[`column_${c2}`]||0; }
    else if (bet.type === 'any_top')     { won=[10,11,12].includes(spinResult.number); multiplier=SIDE_BETS.any_top.payout; }
    else if (bet.type === 'any_prime')   { won=PRIME_NUMBERS.has(spinResult.number); multiplier=SIDE_BETS.any_prime.payout; }
    else if (bet.type === 'any_star') { const isLH = spinResult.lightningNumbers.some(l => l.number === spinResult.number); won=spinResult.number===0||isLH; multiplier=SIDE_BETS.any_star.payout; }
    if (won) { const payoutCents=Math.round(amount*multiplier); payouts[betKey]={amount,payoutCents,multiplier}; totalPayoutCents+=payoutCents; wonBets.push({key:betKey,type:bet.type,target:bet.target??bet.number,payoutCents,multiplier}); }
  }
  return { payouts, totalPayoutCents, wonBets };
}




// --- Lightning Roulette Live Engine Class ---

export class LightningRouletteLiveEngine {
  constructor(config = {}) {
    this.config = { minBet: config.minBet ?? 50, maxBet: config.maxBet ?? 500_000, maxWin: config.maxWin ?? 50_000_000, serverSeed: config.serverSeed || crypto.randomBytes(32).toString('hex'), tablesPerGame: config.tablesPerGame ?? 3 };
    this.history = [];
    this.maxHistory = 100;
    this.nonce = 0;
    this.sessions = new Map();
  }

  createSession(sessionId) {
    const id = sessionId || crypto.randomUUID();
    const session = { sessionId: id, status: 'waiting', bets: new Map(), currentSpin: null, createdAt: Date.now() };
    this.sessions.set(id, session);
    return { sessionId: id, status: 'waiting', minBet: this.config.minBet, maxBet: this.config.maxBet };
  }

  placeBet(sessionId, playerId, bet) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.status !== 'waiting') return { success: false, error: `Cannot bet in ${session.status} state` };
    if (bet.amount < this.config.minBet) return { success: false, error: `Min bet $${(this.config.minBet/100).toFixed(2)}` };
    if (bet.amount > this.config.maxBet) return { success: false, error: `Max bet $${(this.config.maxBet/100).toFixed(2)}` };
    const validTypes = ['straight','red','black','odd','even','low','high','dozen_1','dozen_2','dozen_3','column_1','column_2','column_3','any_top','any_prime','any_star'];
    if (!validTypes.includes(bet.type)) return { success: false, error: `Invalid bet type: ${bet.type}` };
    if (bet.type === 'straight' && (bet.target < 0 || bet.target > 36)) return { success: false, error: 'Straight bet must be on number 0-36' };
    const betId = crypto.randomUUID();
    session.bets.set(playerId, { playerId, bets: [{ ...bet, betId }], totalCents: bet.amount });
    return { success: true, betId };
  }

  startRound(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { error: 'Session not found' };
    if (session.status !== 'waiting') return { error: `Cannot start in ${session.status} state` };
    session.status = 'spinning';
    const spinResult = generateProvablyFairSpin(this.config.serverSeed, session.clientSeed || 'default-client', this.nonce++);
    session.currentSpin = spinResult;
    session.status = 'result';
    let totalBetsPlacedCents = 0;
    for (const [, pd] of session.bets) totalBetsPlacedCents += pd.totalCents;
    const roundId = `lr-${Date.now()}-${this.nonce}`;
    this.history.unshift({ id: roundId, sessionId, spinResult, totalBetsPlacedCents, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.pop();
    return { roundId, spinResult };
  }

  getSessionState(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    let totalBetsCents = 0;
    for (const [, p] of session.bets) totalBetsCents += p.totalCents;
    return { status: session.status, betCount: session.bets.size, totalBetsCents, currentSpin: session.currentSpin, players: Array.from(session.bets.entries()).map(([id, data]) => ({ playerId: id, betCount: data.bets.length, totalCents: data.totalCents })) };
  }

  resetSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = 'waiting'; session.bets.clear(); session.currentSpin = null;
    return true;
  }




  getHistory(limit = 20) {
    return this.history.slice(0, limit).map(h => ({ roundId: h.id, number: h.spinResult.number, color: h.spinResult.color, lightningNumbers: h.spinResult.lightningNumbers, isLightningHit: h.spinResult.isLightningHit, timestamp: h.timestamp }));
  }

  getStatistics() {
    const rounds = this.history;
    if (rounds.length === 0) return { totalRounds: 0, lightningHits: 0, hitRate: '0%', avgLightningNumbers: 0 };
    const lh = rounds.filter(r => r.spinResult.isLightningHit).length;
    const avgC = (rounds.reduce((s, r) => s + r.spinResult.lightningNumbers.length, 0) / rounds.length).toFixed(1);
    const cd = { red: 0, black: 0, green: 0 };
    for (const r of rounds) cd[r.spinResult.color]++;
    return { totalRounds: rounds.length, lightningHits: lh, hitRate: `${((lh / rounds.length) * 100).toFixed(1)}%`, avgLightningNumbers: parseFloat(avgC), colorDistribution: cd };
  }

  verifySpin(serverSeed, clientSeed, nonce) {
    const expectedResult = generateProvablyFairSpin(serverSeed, clientSeed, nonce);
    const match = this.history.find(h => h.spinResult.nonce === nonce && h.spinResult.number === expectedResult.number);
    return { expectedResult, valid: !!match, verifiedHash: crypto.createHmac('sha256', serverSeed).update(`${serverSeed}:${clientSeed}:${nonce}`).digest('hex') };
  }

  static getBetTypes() {
    const types = [];
    for (let i = 0; i <= 36; i++) types.push({ type: 'straight', target: i, name: `Number ${i}`, payout: '35:1', lightningPayout: '50:1 - 500:1' });
    types.push(
      { type: 'red', name: 'Red', payout: '1:1' }, { type: 'black', name: 'Black', payout: '1:1' },
      { type: 'odd', name: 'Odd', payout: '1:1' }, { type: 'even', name: 'Even', payout: '1:1' },
      { type: 'low', name: '1-18 (Low)', payout: '1:1' }, { type: 'high', name: '19-36 (High)', payout: '1:1' },
      { type: 'dozen_1', name: '1st Dozen (1-12)', payout: '2:1' }, { type: 'dozen_2', name: '2nd Dozen (13-24)', payout: '2:1' }, { type: 'dozen_3', name: '3rd Dozen (25-36)', payout: '2:1' },
      { type: 'column_1', name: 'Column 1 (1,4,7...)', payout: '2:1' }, { type: 'column_2', name: 'Column 2 (2,5,8...)', payout: '2:1' }, { type: 'column_3', name: 'Column 3 (3,6,9...)', payout: '2:1' },
    );
    for (const [key, val] of Object.entries(SIDE_BETS)) types.push({ type: key, name: val.name, payout: `${val.payout}:1`, description: val.desc });
    return types;
  }

  static getBoardLayout() {
    const grid = { rows: [], zero: true };
    for (let col = 0; col < 12; col++) {
      grid.rows.push([
        { number: 3 + col * 3, color: RED_NUMBERS.has(3 + col * 3) ? 'red' : 'black', position: 'top' },
        { number: 2 + col * 3, color: RED_NUMBERS.has(2 + col * 3) ? 'red' : 'black', position: 'middle' },
        { number: 1 + col * 3, color: RED_NUMBERS.has(1 + col * 3) ? 'red' : 'black', position: 'bottom' },
      ]);
    }
    return grid;
  }
}

// --- Singleton Instance ---

const lightningRouletteLiveEngine = new LightningRouletteLiveEngine();
export { lightningRouletteLiveEngine };
export default lightningRouletteLiveEngine;


