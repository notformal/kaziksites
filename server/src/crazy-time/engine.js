import crypto from 'node:crypto';

/**
 * Crazy Time Engine — Evolution Gaming Game Show
 * Main wheel (54 segments) + 4 bonus rounds:
 *   Coin Flip, Cash Hunt, Pachinko, Crazy Time
 */

function uuid() { return crypto.randomBytes(16).toString('hex'); }

const WHEEL_SEGMENTS = [
  ...Array(7).fill({ type: 'number', value: 1, multiplier: 1 }),
  ...Array(8).fill({ type: 'number', value: 2, multiplier: 2 }),
  ...Array(5).fill({ type: 'number', value: 5, multiplier: 5 }),
  ...Array(4).fill({ type: 'number', value: 10, multiplier: 10 }),
  { type: 'bonus', name: 'coin_flip', multiplier: 2 },
  { type: 'bonus', name: 'cash_hunt', multiplier: 2 },
  { type: 'bonus', name: 'pachinko', multiplier: 2 },
  { type: 'bonus', name: 'crazy_time', multiplier: 2 },
];

const BONUS_CONFIG = {
  coin_flip: { name: 'Coin Flip', icon: '\ud83e\ude99', description: 'Two-sided coin with multipliers', possibleMultipliers: [2,5,10,25,50,100], maxMultiplier: 100 },
  cash_hunt: { name: 'Cash Hunt', icon: '\ud83c\udfaf', description: 'Select from 108 hidden targets', possibleMultipliers: [5,8,10,12,15,20,25,50,75,100,250,500], maxMultiplier: 500 },
  pachinko: { name: 'Pachinko', icon: '\ud83c\udfb2', description: 'Drop a puck through pegboard to multipliers', possibleMultipliers: [2,4,6,10,20,50,100,200,500], maxMultiplier: 500 },
  crazy_time: { name: 'Crazy Time', icon: '\ud83c\udf89', description: 'Giant wheel with escalating multipliers', possibleMultipliers: [2,5,10,20,50,100,200,500], maxMultiplier: 500 },
};

const TOP_SLOT_SYMBOLS = [
  ...Array(4).fill({ label: 'x1', value: 1 }),
  ...Array(3).fill({ label: 'x2', value: 2 }),
  ...Array(2).fill({ label: 'x5', value: 5 }),
  { label: 'x10', value: 10 },
];

class FairSpinGenerator {
  constructor(seed = null) {
    this.seed = seed || crypto.randomBytes(32).toString('hex');
    this.serverSeed = crypto.randomBytes(32).toString('hex');
    this.clientSeed = 'client-seed-default';
    this.nonce = 0;
  }
  generate() {
    const data = `${this.seed}:${this.serverSeed}:${this.clientSeed}:${this.nonce}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    this.nonce++;
    return { hash, seed: this.seed };
  }
  verify(hash) { return /^([0-9a-f]{64})$/.test(hash); }
}

const BET_TYPES = [
  { id: 'number_1', label: 'x1', payout: 1, color: '#f5f5dc' },
  { id: 'number_2', label: 'x2', payout: 2, color: '#4a90d9' },
  { id: 'number_5', label: 'x5', payout: 5, color: '#e8751a' },
  { id: 'number_10', label: 'x10', payout: 10, color: '#8b5cf6' },
  { id: 'bonus_coin_flip', label: 'Coin Flip', payout: 2, color: '#22c55e' },
  { id: 'bonus_cash_hunt', label: 'Cash Hunt', payout: 2, color: '#ec4899' },
  { id: 'bonus_pachinko', label: 'Pachinko', payout: 2, color: '#eab308' },
  { id: 'bonus_crazy_time', label: 'Crazy Time', payout: 2, color: '#ef4444' },
];


class CrazyTimeEngine {
  constructor() {
    this.fair = new FairSpinGenerator();
    this.sessions = new Map();
    this.history = [];
    this.stats = { totalSpins: 0, bonusHits: 0 };
  }

  createSession(userId) {
    const sid = `ct_${userId}_${uuid().slice(0,8)}`;
    this.sessions.set(sid, { id: sid, userId, bets: [], balance: 10000, currentSpin: null, roundNumber: 1 });
    return { success: true, sessionId: sid };
  }

  placeBet(sessionId, betTypeId, amount) {
    const s = this.sessions.get(sessionId);
    if (!s || s.currentSpin) return { error: 'Session not found or spin in progress' };
    if (amount <= 0 || amount > s.balance) return { error: 'Invalid amount' };
    const bt = BET_TYPES.find(b => b.id === betTypeId);
    if (!bt) return { error: 'Unknown bet type' };
    s.bets.push({ id: uuid().slice(0,12), betTypeId, label: bt.label, payout: bt.payout, amount, status: 'pending' });
    return { success: true, bets: s.bets };
  }

  clearBets(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s) return { error: 'Session not found' };
    s.bets.forEach(b => { s.balance += b.amount; });
    s.bets = [];
    return { success: true, balance: s.balance };
  }

  spin(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s || s.bets.length === 0) return { error: 'No bets placed' };
    const { hash } = this.fair.generate();
    const segIdx = parseInt(hash.slice(0,8), 16) % WHEEL_SEGMENTS.length;
    const resultSeg = WHEEL_SEGMENTS[segIdx];
    const slotRng = Math.floor(Math.random() * TOP_SLOT_SYMBOLS.length);
    const topSlotMult = TOP_SLOT_SYMBOLS[slotRng].value;

    s.currentSpin = { id: uuid().slice(0,12), roundNumber: s.roundNumber++, hash, segIdx, resultSeg, topSlotMult, timestamp: new Date().toISOString(), bets: [...s.bets] };
    const totalPayout = this.calcPayouts(s.currentSpin);
    s.balance += totalPayout - s.bets.reduce((sum,b) => sum + b.amount, 0);
    this.stats.totalSpins++;
    if (resultSeg.type === 'bonus') this.stats.bonusHits++;

    const spinResult = { ...s.currentSpin, totalPayout, balance: s.balance };
    this.history.unshift(spinResult);
    if (this.history.length > 100) this.history.pop();
    return { success: true, spin: spinResult };
  }

  calcPayouts(spin) {
    let total = 0;
    const seg = spin.resultSegment || spin.resultSeg;
    const mult = seg.type === 'bonus' ? seg.multiplier : seg.multiplier * spin.topSlotMult;
    for (const bet of spin.bets) {
      if (bet.status !== 'pending') continue;
      let won = false, winAmt = 0;
      if (seg.type === 'number') {
        const map = { number_1:1, number_2:2, number_5:5, number_10:10 };
        if (map[bet.betTypeId] === seg.value) { won = true; winAmt = bet.amount * seg.multiplier * spin.topSlotMult; }
      } else if (seg.type === 'bonus') {
        if (bet.betTypeId === `bonus_${seg.name}`) { won = true; winAmt = bet.amount * seg.multiplier; }
      }
      if (won) { total += winAmt; bet.status = 'won'; bet.winAmount = winAmt; } else { bet.status = 'lost'; }
    }
    return total;
  }


  playBonus(bonusName, baseMultiplier) {
    const cfg = BONUS_CONFIG[bonusName];
    if (!cfg) return { error: 'Unknown bonus' };
    let result = {};
    switch (bonusName) {
      case 'coin_flip': result = this._playCoinFlip(); break;
      case 'cash_hunt': result = this._playCashHunt(baseMultiplier); break;
      case 'pachinko': result = this._playPachinko(baseMultiplier); break;
      case 'crazy_time': result = this._playCrazyTime(baseMultiplier); break;
    }
    return { bonus: bonusName, ...cfg, baseMultiplier, result, finalMultiplier: (baseMultiplier || 2) * result.multiplier, timestamp: new Date().toISOString() };
  }

  _playCoinFlip() {
    const sides = [
      { label: 'Heads', multiplier: [2,5,10,25][Math.floor(Math.random()*4)] },
      { label: 'Tails', multiplier: [2,5,10,25][Math.floor(Math.random()*4)] },
    ];
    const flip = Math.random() < 0.5 ? sides[0] : sides[1];
    return { type: 'coin_flip', winner: flip.label, multiplier: flip.multiplier, sides };
  }

  _playCashHunt(baseMultiplier) {
    const grid = [];
    for (let i = 0; i < 108; i++) {
      const r = Math.random(); let mult;
      if (r < 0.35) mult = [5,8,10][Math.floor(Math.random()*3)];
      else if (r < 0.6) mult = [12,15,20][Math.floor(Math.random()*3)];
      else if (r < 0.8) mult = [25,50][Math.floor(Math.random()*2)];
      else if (r < 0.95) mult = 75;
      else mult = [100,250,500][Math.floor(Math.random()*3)];
      grid.push({ index: i, multiplier: mult, revealed: false });
    }
    const picked = Math.floor(Math.random() * 108);
    grid[picked].revealed = true;
    return { type: 'cash_hunt', grid, selected: picked, multiplier: grid[picked].multiplier };
  }

  _playPachinko(baseMultiplier) {
    const r = Math.random(); let mult;
    if (r < 0.25) mult = [2,4][Math.floor(Math.random()*2)];
    else if (r < 0.5) mult = [6,10][Math.floor(Math.random()*2)];
    else if (r < 0.75) mult = [20,50][Math.floor(Math.random()*2)];
    else if (r < 0.92) mult = 100;
    else mult = [200,500][Math.floor(Math.random()*2)];
    const pegs = []; for (let row = 0; row < 8; row++) { const cols = row + 3; for (let col = 0; col < cols; col++) pegs.push({ row, col }); }
    return { type: 'pachinko', multiplier: mult, rows: 8, pegCount: pegs.length };
  }

  _playCrazyTime(baseMultiplier) {
    const segments = [...Array(7).fill({value:2}), ...Array(5).fill({value:5}), ...Array(4).fill({value:10}), ...Array(3).fill({value:20}), {value:50},{value:100},{value:200},{value:500}];
    const idx = Math.floor(Math.random() * segments.length);
    return { type: 'crazy_time', multiplier: segments[idx].value, segments, totalSegments: segments.length + 46, landingIndex: idx, animationDuration: 5000 + Math.random() * 3000 };
  }

  getBetTypes() { return BET_TYPES; }
  getWheelSegments() { return WHEEL_SEGMENTS; }
  getBonusConfig() { return BONUS_CONFIG; }
  getTopSlotSymbols() { return TOP_SLOT_SYMBOLS; }
  getSession(sessionId) { return this.sessions.get(sessionId) || null; }
  getHistory(limit = 20) { return this.history.slice(0, limit); }
  getStats() { return { ...this.stats }; }
}

export { CrazyTimeEngine };
export default CrazyTimeEngine;
