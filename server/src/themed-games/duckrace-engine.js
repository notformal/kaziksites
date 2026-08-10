/**
 * duck-race-engine.js — Duck Race Betting Game
 * 
 * 6 ducks race across a pond; player bets on which duck wins.
 * Each duck has different odds based on speed distribution.
 */
import crypto from 'node:crypto';

const DUCKS = [
  { id:'ruby',name:'Ruby Red',baseSpeed:3.0,color:'#e74c3c',odds:2.5 },
  { id:'goldie',name:'Golden Quack',baseSpeed:3.5,color:'#f1c40f',odds:2.0 },
  { id:'azure',name:'Azure Blue',baseSpeed:2.8,color:'#3498db',odds:3.0 },
  { id:'emerald',name:'Emerald Green',baseSpeed:3.2,color:'#2ecc71',odds:2.3 },
  { id:'violet',name:'Violet Dream',baseSpeed:2.5,color:'#9b59b6',odds:3.5 },
  { id:'silver',name:'Silver Stream',baseSpeed:3.8,color:'#95a5a6',odds:1.8 },
];

const RACE_LENGTH = 300; // pixels to finish

function weightedPick(items) {
  const total = items.reduce((s, i) => s + (1/i.odds), 0);
  let r = Math.random() * total;
  for (const item of items) { r -= (1/item.odds); if (r <= 0) return item; }
  return items[items.length - 1];
}

export class DuckRaceEngine {
  constructor(config = {}) {
    this.ducks = config.ducks || DUCKS;
    this.raceLength = config.raceLength || RACE_LENGTH;
    this.history = [];
  }

  generateRace(betCents, selectedDuckId, serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');

    // Generate positions for all ducks using hash (deterministic per round)
    const duckResults = this.ducks.map((duck, i) => {
      // Speed with variance based on hash segments
      const speedVariance = 0.7 + (parseInt(hash.substring(Math.min(i*5,hash.length-5), Math.min(i*5+5,hash.length)) || '3', 16) % 60) / 100;
      const effectiveSpeed = duck.baseSpeed * speedVariance;
      
      // Simulate race progress in steps
      let position = 0;
      const positions = [{ x: 0, step: 0 }];
      while (position < this.raceLength) {
        const stepSize = effectiveSpeed * (0.5 + Math.random() * 1.5); // burst and cruise
        position = Math.min(position + stepSize, this.raceLength);
        positions.push({ x: position, step: positions.length });
      }

      return { ...duck, finalPosition: position, finishTime: position / effectiveSpeed, positions };
    });

    // Sort by finish time to determine winner
    duckResults.sort((a, b) => a.finishTime - b.finishTime);
    const winner = duckResults[0];
    const selectedDuck = this.ducks.find(d => d.id === selectedDuckId);
    const won = winner.id === selectedDuckId;

    // Calculate payout: if won, use selected duck's odds (capped at 5x for fairness)
    const multiplier = won ? Math.min(selectedDuck.odds, 5.0) : 0;
    const payoutCents = won ? Math.round(betCents * multiplier) : 0;

    return {
      id: `duckrace-${Date.now()}-${nonce}`,
      betCents,
      selectedDuckId,
      winner: { id: winner.id, name: winner.name },
      results: duckResults.map(d => ({ id: d.id, name: d.name, finishTime: Math.round(d.finishTime * 10) / 10 })),
      multiplier,
      payoutCents,
      won,
    };
  }

  playRound(betCents = 100, selectedDuckId = 'goldie', serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const result = this.generateRace(betCents, selectedDuckId, serverSeed, clientSeed, nonce);
    this.history.unshift(result); if (this.history.length > 50) this.history.pop();
    return result;
  }

  getHistory(limit = 20) { return this.history.slice(0, limit).map(h => ({ winner: h.winner.id, selected: h.selectedDuckId, won: h.won, multiplier: h.multiplier })); }
  getStats() { const t = this.history.length; if (!t) return { totalRounds:0 }; const wins = this.history.filter(h=>h.won).length; return { totalRounds:t, winRate:(wins/t*100).toFixed(1), avgMultiplier:(this.history.reduce((s,h)=>s+h.multiplier,0)/t).toFixed(2) }; }
  getDuckOdds() { return this.ducks.map(d => ({ ...d, impliedProbability: Math.round((1/d.odds) * 100 / this.ducks.reduce((s,d2)=>s+(1/d2.odds),0) * 100) / 100 })); }
}

const duckRaceEngine = new DuckRaceEngine();
export { duckRaceEngine }; export default duckRaceEngine;