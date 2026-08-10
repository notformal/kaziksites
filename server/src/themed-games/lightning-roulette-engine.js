/**
 * lightning-roulette-pro-engine.js — Lightning Roulette with Multiplier Cards
 * 
 * European roulette (single zero) + 1-5 "Lightning Numbers" per spin
 * with multipliers from 50× to 500× on straight-up bets.
 */
import crypto from 'node:crypto';

const ROULETTE_NUMBERS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const ROULETTE_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const LIGHTNING_MULTIPLIERS = [50, 100, 150, 200, 250, 300, 400, 500];
const NUM_LIGHTNING = { low: 1, mid: 3, high: 5 }; // min/avg/max lightning numbers

export class LightningRouletteEngine {
  constructor(config = {}) {
    this.history = [];
    this.maxHistory = 50;
  }

  generateSpin(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    
    // Determine wheel result using hash
    const num1 = parseInt(hash.substring(0, 4), 16);
    const wheelIndex = num1 % ROULETTE_NUMBERS.length;
    const number = ROULETTE_NUMBERS[wheelIndex];

    // Determine lightning configuration using next hash segment
    const num2 = parseInt(hash.substring(4, 8), 16) / 0xFFFFFFFF;
    let numLightning;
    if (num2 < 0.33) numLightning = NUM_LIGHTNING.low;
    else if (num2 < 0.7) numLightning = NUM_LIGHTNING.mid;
    else numLightning = NUM_LIGHTNING.high;

    // Select lightning numbers (random distinct numbers from 0-36, excluding the wheel result)
    const allNumbers = Array.from({length: 37}, (_, i) => i);
    const available = allNumbers.filter(n => n !== number);
    const lightningNumbers = [];
    
    for (let i = 0; i < Math.min(numLightning, available.length); i++) {
      const num3 = parseInt(hash.substring(8 + i * 4, 12 + i * 4), 16) / 0xFFFFFFFF;
      const idx = Math.floor(num3 * (available.length - i));
      lightningNumbers.push({ number: available[idx], multiplier: LIGHTNING_MULTIPLIERS[Math.floor(Math.random() * LIGHTNING_MULTIPLIERS.length)] });
      available.splice(idx, 1);
    }

    // Check if wheel result is a lightning number
    const isLightningHit = lightningNumbers.some(l => l.number === number);
    const lightningMultiplier = isLightningHit ? lightningNumbers.find(l => l.number === number)?.multiplier || 0 : 0;

    return {
      number,
      color: number === 0 ? 'green' : ROULETTE_RED.has(number) ? 'red' : 'black',
      section: number <= 18 ? 'low' : 'high',
      dozen: number === 0 ? null : Math.ceil(number / 12),
      column: number === 0 ? null : ((number - 1) % 3) + 1,
      lightningNumbers,
      isLightningHit,
      lightningMultiplier,
    };
  }

  evaluateBets(bets, spinResult) {
    const payouts = {};
    for (const [type, amount] of Object.entries(bets)) {
      let won = false, multiplier = 0;
      
      if (type === 'straight' && bets.target !== undefined) {
        won = spinResult.number === bets.target;
        multiplier = spinResult.isLightningHit ? spinResult.lightningMultiplier : 36;
      } else if (type === 'red') { won = spinResult.color === 'red'; multiplier = 2; }
      else if (type === 'black') { won = spinResult.color === 'black'; multiplier = 2; }
      else if (type === 'odd') { won = spinResult.number > 0 && spinResult.number % 2 === 1; multiplier = 2; }
      else if (type === 'even') { won = spinResult.number > 0 && spinResult.number % 2 === 0; multiplier = 2; }
      else if (type === 'low') { won = spinResult.number >= 1 && spinResult.number <= 18; multiplier = 2; }
      else if (type === 'high') { won = spinResult.number >= 19 && spinResult.number <= 36; multiplier = 2; }
      else if (type.startsWith('dozen')) { const d = parseInt(type.split('_')[1]); const lo = (d-1)*12+1, hi = d*12; won = spinResult.number >= lo && spinResult.number <= hi; multiplier = 3; }
      else if (type.startsWith('column')) { const c = parseInt(type.split('_')[1]); won = spinResult.number > 0 && ((c===1&&spinResult.number%3===1)||(c===2&&spinResult.number%3===2)||(c===3&&spinResult.number%3===0)); multiplier = 3; }
      
      payouts[type] = won ? Math.round(amount * multiplier) : 0;
    }
    return { spinResult, payouts };
  }

  playRound(betCents = 100, betType = 'red', target = null, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const bets = { [betType]: betCents };
    if (target !== null && betType === 'straight') bets.target = target;
    
    const spinResult = this.generateSpin(serverSeed, clientSeed, nonce);
    const { payouts } = this.evaluateBets(bets, spinResult);
    const totalPayout = Object.values(payouts).reduce((s, v) => s + v, 0);

    const round = { id:`lightning-${Date.now()}-${nonce}`, betCents, spinResult, payouts, totalPayout, won: totalPayout > betCents };
    this.history.unshift(round); if (this.history.length > 50) this.history.pop();
    return round;
  }

  getHistory(limit = 20) { return this.history.slice(0, limit).map(h => ({ number: h.spinResult.number, color: h.spinResult.color, lightningHit: h.spinResult.isLightningHit, multiplier: h.spinResult.lightningMultiplier, payoutCents: h.totalPayout })); }
  getStats() { const t = this.history.length; if (!t) return { totalRounds:0 }; return { totalRounds:t, lightningHits:this.history.filter(h=>h.spinResult.isLightningHit).length, avgMultiplier:(this.history.reduce((s,h)=>s+h.spinResult.lightningMultiplier,0)/Math.max(1,this.history.filter(h=>h.spinResult.isLightningHit).length)).toFixed(0) }; }
}

const lightningRouletteEngine = new LightningRouletteEngine();
export { lightningRouletteEngine }; export default lightningRouletteEngine;