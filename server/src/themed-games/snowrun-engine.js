/**
 * snow-run-engine.js — Snow/Ice Racing Instant Game
 * 
 * Snowboarder descends a mountain slope collecting coins and avoiding obstacles.
 * Distance traveled determines the multiplier; crash = loss.
 */
import crypto from 'node:crypto';

const OBSTACLES = [
  { id:'rock',name:'Rock',damage:1,weight:30 },
  { id:'tree',name:'Pine Tree',damage:2,weight:25 },
  { id:'ice_patch',name:'Ice Patch',damage:1,weight:20 },
  { id:'avalanche',name:'Avalanche',damage:3,weight:8 },
  { id:'eagle',name:'Eagle',damage:1,weight:12 },
  { id:'coin',name:'Gold Coin',damage:-5,weight:35 }, // negative damage = heal/gain
];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

export class SnowRunEngine {
  constructor(config = {}) {
    this.obstacles = config.obstacles || OBSTACLES;
    this.maxDistance = config.maxDistance || 500; // meters
    this.history = [];
  }

  generateRun(betCents, serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');

    let distance = 0;
    let health = 100;
    const events = [];
    let crashed = false;
    let coinsCollected = 0;

    while (distance < this.maxDistance && health > 0 && !crashed) {
      // Distance increment per step (5-25m based on hash)
      const distStep = 5 + (parseInt(hash.substring((events.length * 3) % (hash.length - 3), (events.length * 3 + 3) % hash.length === 0 ? 3 : events.length * 3 + 3), 16) % 21);
      distance += distStep;

      // Random event: obstacle or coin
      const eventRoll = parseInt(hash.substring(Math.min(events.length * 4, hash.length - 4), Math.min(events.length * 4 + 4, hash.length)) || '0', 16) / 0xFFFFFFFF;
      
      if (eventRoll < 0.35) {
        // Coin collected
        const coin = weightedPick(OBSTACLES.filter(o => o.damage < 0));
        coinsCollected++;
        events.push({ type:'coin', name: coin.name, distance });
      } else {
        // Obstacle hit
        const obs = weightedPick(OBSTACLES.filter(o => o.damage > 0));
        health -= obs.damage * 15;
        events.push({ type:'obstacle', name: obs.name, damage: obs.damage * 15, distance });
      }

      // Speed boost every 50m (natural progression)
      if (distance % 50 === 0 && health > 30) {
        events.push({ type:'boost', distance });
      }
    }

    // Calculate multiplier from distance and coins
    const distanceMultiplier = Math.min(distance / this.maxDistance, 1);
    const coinBonus = coinsCollected * 0.15;
    const healthPenalty = health < 50 ? 0.7 : (health < 25 ? 0.5 : 1);
    const multiplier = Math.round(Math.max(0.1, distanceMultiplier + coinBonus) * healthPenalty * 100) / 100;
    const payoutCents = crashed || health <= 0 ? 0 : Math.round(betCents * multiplier);

    return {
      id: `snowrun-${Date.now()}-${nonce}`,
      betCents,
      distance,
      maxDistance: this.maxDistance,
      health,
      coinsCollected,
      crashed: health <= 0,
      multiplier,
      payoutCents,
      won: payoutCents > 0,
      events: events.slice(-10), // last 10 events for display
    };
  }

  playRound(betCents = 100, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const result = this.generateRun(betCents, serverSeed, clientSeed, nonce);
    this.history.unshift(result); if (this.history.length > 50) this.history.pop();
    return result;
  }

  getHistory(limit = 20) { return this.history.slice(0, limit).map(h => ({ distance: h.distance, coins: h.coinsCollected, crashed: h.crashed, multiplier: h.multiplier, won: h.won })); }
  getStats() { const t = this.history.length; if (!t) return { totalRounds:0 }; const wins = this.history.filter(h=>h.won).length; return { totalRounds:t, winRate:(wins/t*100).toFixed(1), avgDistance:(this.history.reduce((s,h)=>s+h.distance,0)/t).toFixed(0), avgMultiplier:(this.history.reduce((s,h)=>s+h.multiplier,0)/t).toFixed(2) }; }
}

const snowRunEngine = new SnowRunEngine();
export { snowRunEngine }; export default snowRunEngine;