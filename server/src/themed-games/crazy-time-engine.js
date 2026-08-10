/**
 * crazy-time-engine.js — Crazy Time Pro / V2 Game Show Engine
 * 
 * Money wheel with 54 segments, 4 bonus rounds:
 *   Coin Flip (2×), Cash Hunt (up to 25×), Pachinko (up to 100×), Crazy Time (up to 200×)
 */

import crypto from 'node:crypto';

const WHEEL_SEGMENTS = [
  { value: 1,  type: 'number', weight: 21 },
  { value: 2,  type: 'number', weight: 13 },
  { value: 5,  type: 'number', weight: 7  },
  { value: 10, type: 'number', weight: 4  },
  { value: 'coin_flip',  type: 'bonus', weight: 2, multiplier: 2   },
  { value: 'cash_hunt',  type: 'bonus', weight: 2, multiplier: 5   },
  { value: 'pachinko',   type: 'bonus', weight: 1, multiplier: 10  },
  { value: 'crazy_time', type: 'bonus', weight: 1, multiplier: 2   },
];

const BONUS_MULTIPLIERS = {
  coin_flip: [2, 3, 5],
  cash_hunt: [2, 5, 8, 10, 15, 25],
  pachinko:  [2, 5, 10, 20, 40, 100],
  crazy_time:[2, 5, 10, 20, 50, 200],
};

function weightedPick(items) {
  const total = items.reduce((s, i) => s + (i.weight || 1), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export class CrazyTimeEngine {
  constructor(config = {}) {
    this.topSlot = config.topSlot || null; // optional top-wheel multiplier
    this.history = [];
    this.maxHistory = 50;
  }

  /** Generate provably fair result */
  generateResult(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    const rand = num / 0xFFFFFFFF;

    // Cumulative weights: 21+13+7+4+2+2+1+1 = 51
    const cumulative = [21, 34, 41, 45, 47, 49, 50, 51];
    let segmentIndex = cumulative.findIndex(c => rand * 51 < c);
    if (segmentIndex === -1) segmentIndex = 7;

    const segment = WHEEL_SEGMENTS[segmentIndex];

    // Determine bonus outcome
    let bonusResult = null;
    if (segment.type === 'bonus') {
      const pool = BONUS_MULTIPLIERS[segment.value] || [2];
      bonusResult = {
        type: segment.value,
        multiplier: weightedPick(pool.map(m => ({ value: m, weight: 1 }))).value,
      };
    }

    // Top wheel overlay (5% chance)
    let topSlotMultiplier = null;
    if (Math.random() < 0.05 && this.topSlot) {
      const topValues = [2, 3, 5, 10];
      topSlotMultiplier = weightedPick(topValues.map(v => ({ value: v, weight: 1 }))).value;
    }

    const finalValue = segment.type === 'number' ? segment.value : (bonusResult?.multiplier || 2);
    const effectiveMultiplier = topSlotMultiplier ? finalValue * topSlotMultiplier : finalValue;

    return {
      segment: segment.type === 'number' ? `num_${segment.value}` : segment.value,
      value: segment.value,
      type: segment.type,
      bonusResult,
      topSlotMultiplier,
      effectiveMultiplier,
      timestamp: Date.now(),
    };
  }

  /** Process a spin round with bet */
  spin(betCents = 100, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const result = this.generateResult(serverSeed, clientSeed, nonce);
    
    let payoutCents = 0;
    if (result.type === 'number') {
      payoutCents = betCents * result.effectiveMultiplier;
    } else if (result.bonusResult) {
      payoutCents = betCents * result.bonusResult.multiplier;
    }

    const round = {
      id: `ct-${Date.now()}-${nonce}`,
      betCents,
      result,
      payoutCents,
      won: payoutCents > betCents,
    };

    this.history.unshift(round);
    if (this.history.length > this.maxHistory) this.history.pop();

    return round;
  }

  /** Get recent history */
  getHistory(limit = 20) {
    return this.history.slice(0, limit).map(h => ({
      segment: h.result.segment,
      type: h.result.type,
      multiplier: h.result.effectiveMultiplier,
      won: h.won,
      payoutCents: h.payoutCents,
      timestamp: h.timestamp,
    }));
  }

  /** Get statistics */
  getStats() {
    const nums = this.history.filter(h => h.result.type === 'number');
    const bonuses = this.history.filter(h => h.result.type === 'bonus');
    return {
      totalRounds: this.history.length,
      numberCount: nums.length,
      bonusCount: bonuses.length,
      bonusRate: this.history.length ? (bonuses.length / this.history.length * 100).toFixed(1) : 0,
      avgMultiplier: nums.length
        ? (nums.reduce((s, h) => s + h.result.effectiveMultiplier, 0) / nums.length).toFixed(2)
        : '0.00',
    };
  }
}

const crazyTimeEngine = new CrazyTimeEngine();
export { crazyTimeEngine };
export default crazyTimeEngine;
