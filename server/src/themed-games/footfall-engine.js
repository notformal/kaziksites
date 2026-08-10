/**
 * footfall-engine.js — Soccer-Themed Instant Game
 * 
 * Player kicks balls at goals; defenders try to block.
 * Each successful goal earns a multiplier based on difficulty.
 */
import crypto from 'node:crypto';

const GOAL_POSITIONS = [
  { x: 0.15, y: 0.3, name: 'Low Left', difficulty: 1 },
  { x: 0.5,  y: 0.2, name: 'Top Center', difficulty: 2 },
  { x: 0.85, y: 0.4, name: 'High Right', difficulty: 1.5 },
  { x: 0.3,  y: 0.7, name: 'Low Left Corner', difficulty: 2.5 },
  { x: 0.7,  y: 0.6, name: 'Mid Right', difficulty: 1.8 },
];

const DEFENDER_SPEEDS = [0.3, 0.5, 0.7, 0.9]; // goalkeeper reflex speed

export class FootfallEngine {
  constructor(config = {}) {
    this.goalPositions = config.goalPositions || GOAL_POSITIONS;
    this.maxDefenders = config.maxDefenders || 4;
    this.history = [];
  }

  generateKick(betCents, serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');

    // Determine number of defenders (1-4) using hash
    const defenderCount = 1 + (parseInt(hash.substring(0, 2), 16) % this.maxDefenders);
    
    // Determine shot position using hash
    const shotIndex = parseInt(hash.substring(2, 4), 16) % this.goalPositions.length;
    const goalPos = this.goalPositions[shotIndex];

    // Generate defender positions (randomized near goal)
    const defenders = Array.from({ length: defenderCount }, (_, i) => ({
      id: `def-${i}`,
      x: 0.2 + (parseInt(hash.substring(4 + i * 3, 7 + i * 3), 16) % 60) / 100,
      y: 0.1 + (parseInt(hash.substring(7 + i * 3, 10 + i * 3), 16) % 80) / 100,
      speed: DEFENDER_SPEEDS[parseInt(hash.substring(10 + i * 2, 12 + i * 2), 16) % DEFENDER_SPEEDS.length],
    }));

    // Determine if goal is scored based on shot difficulty vs defender speed
    const shotPower = parseInt(hash.substring(4, 8), 16) / 0xFFFFFFFF;
    const totalDefense = defenders.reduce((s, d) => s + d.speed, 0);
    const saveThreshold = (defenderCount * 0.3) + (goalPos.difficulty * 0.15);
    const scored = shotPower > saveThreshold || Math.random() < (1 - saveThreshold * 0.8);

    // Multiplier based on defenders and goal position difficulty
    const baseMultiplier = scored ? goalPos.difficulty * defenderCount : 0;
    const multiplier = scored ? Math.round(baseMultiplier * 100) / 100 : 0;
    const payoutCents = scored ? Math.round(betCents * multiplier) : 0;

    return {
      id: `footfall-${Date.now()}-${nonce}`,
      betCents,
      shotPosition: goalPos.name,
      defenderCount,
      defenders,
      scored,
      multiplier,
      payoutCents,
      won: scored,
    };
  }

  playRound(betCents = 100, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const result = this.generateKick(betCents, serverSeed, clientSeed, nonce);
    this.history.unshift(result); if (this.history.length > 50) this.history.pop();
    return result;
  }

  getHistory(limit = 20) { return this.history.slice(0, limit).map(h => ({ shot: h.shotPosition, defenders: h.defenderCount, scored: h.scored, multiplier: h.multiplier, won: h.won })); }
  getStats() { const t = this.history.length; if (!t) return { totalRounds:0 }; const goals = this.history.filter(h=>h.scored).length; return { totalRounds:t, goalRate:(goals/t*100).toFixed(1), avgMultiplier:(this.history.reduce((s,h)=>s+h.multiplier,0)/t).toFixed(2) }; }
  getGoalPositions() { return this.goalPositions; }
}

const footfallEngine = new FootfallEngine();
export { footfallEngine }; export default footfallEngine;