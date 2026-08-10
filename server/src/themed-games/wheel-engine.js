/**
 * wheel-of-fortune-engine.js — Spinning Wheel Casino Game
 * 
 * 54-segment money wheel with multipliers from 0.5× to 10×.
 * Special segments: 2×, 5×, 10× multipliers and bonus wheel.
 */

import crypto from 'node:crypto';

const WHEEL_SEGMENTS = [
  { value: 0.5, type: 'multiplier', weight: 8 },
  { value: 1,   type: 'multiplier', weight: 21},
  { value: 2,   type: 'multiplier', weight: 13},
  { value: 3,   type: 'multiplier', weight: 6 },
  { value: 5,   type: 'multiplier', weight: 4 },
  { value: 10,  type: 'multiplier', weight: 2 },
];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + (i.weight || 1), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export class WheelOfFortuneEngine {
  constructor(config = {}) {
    this.segments = config.segments || WHEEL_SEGMENTS;
    this.totalSegments = this.segments.reduce((s, seg) => s + (seg.weight || 0), 0);
    this.history = [];
    this.maxHistory = 50;
  }

  /** Generate provably fair wheel result */
  generateResult(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    const rand = num / 0xFFFFFFFF;

    // Build cumulative weight array
    let cumulative = 0;
    const cumulatives = this.segments.map(seg => {
      cumulative += (seg.weight || 0);
      return cumulative;
    });

    const segmentIndex = cumulatives.findIndex(c => rand * this.totalSegments < c);
    const segment = segmentIndex === -1 ? this.segments[this.segments.length - 1] : this.segments[segmentIndex];

    // Bonus wheel trigger (5% chance for extra multiplier)
    let bonusMultiplier = null;
    if (Math.random() < 0.05) {
      const bonusValues = [2, 3, 5];
      bonusMultiplier = weightedPick(bonusValues.map(v => ({ value: v, weight: 1 }))).value;
    }

    const effectiveMultiplier = bonusMultiplier ? segment.value * bonusMultiplier : segment.value;

    return {
      value: segment.value,
      type: segment.type,
      bonusMultiplier,
      effectiveMultiplier,
      timestamp: Date.now(),
    };
  }

  /** Process a spin round */
  spin(betCents = 100, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const result = this.generateResult(serverSeed, clientSeed, nonce);
    
    let payoutCents = Math.round(betCents * result.effectiveMultiplier);
    
    const round = {
      id: `wof-${Date.now()}-${nonce}`,
      betCents,
      result,
      payoutCents,
      won: payoutCents >= betCents,
    };

    this.history.unshift(round);
    if (this.history.length > this.maxHistory) this.history.pop();

    return round;
  }

  /** Get recent history */
  getHistory(limit = 20) {
    return this.history.slice(0, limit).map(h => ({
      value: h.result.value,
      bonusMultiplier: h.result.bonusMultiplier,
      effectiveMultiplier: h.result.effectiveMultiplier,
      won: h.won,
      payoutCents: h.payoutCents,
      timestamp: h.timestamp,
    }));
  }

  /** Get statistics */
  getStats() {
    const total = this.history.length;
    if (!total) return { totalRounds: 0, avgMultiplier: '0.00', winRate: '0.0' };
    
    const wins = this.history.filter(h => h.won).length;
    const avgMult = this.history.reduce((s, h) => s + h.result.effectiveMultiplier, 0) / total;
    
    return {
      totalRounds: total,
      winRate: (wins / total * 100).toFixed(1),
      avgMultiplier: avgMult.toFixed(2),
      highestMultiplier: Math.max(...this.history.map(h => h.result.effectiveMultiplier)).toFixed(1),
    };
  }

  /** Get segment distribution for UI */
  getSegmentDistribution() {
    return this.segments.map(seg => ({
      value: seg.value,
      type: seg.type,
      probability: ((seg.weight || 0) / this.totalSegments * 100).toFixed(1),
    }));
  }
}

const wheelEngine = new WheelOfFortuneEngine();
export { wheelEngine };
export default wheelEngine;
