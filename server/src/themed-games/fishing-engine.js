/**
 * fishing-tank-engine.js — Fishing Arcade Casino Game
 * Player shoots at fish; different fish have different values/rarities.
 */
import crypto from 'node:crypto';

const FISH_TYPES = [
  { id:'gold_guppy',name:'Gold Guppy',value:0.5,rarity:0.35,speed:2,size:1 },
  { id:'blue_tang',name:'Blue Tang',value:1,rarity:0.25,speed:3,size:2 },
  { id:'clown_fish',name:'Clown Fish',value:2,rarity:0.18,speed:4,size:2 },
  { id:'barracuda',name:'Barracuda',value:5,rarity:0.10,speed:6,size:3 },
  { id:'shark',name:'Shark',value:10,rarity:0.06,speed:5,size:4 },
  { id:'whale',name:'Whale',value:25,rarity:0.04,speed:3,size:5 },
  { id:'treasure_chest',name:'Treasure Chest',value:50,rarity:0.015,speed:2,size:4 },
  { id:'golden_dragon',name:'Golden Dragon',value:100,rarity:0.005,speed:7,size:5 },
];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.rarity, 0);
  let r = Math.random() * total;
  for (const item of items) { r -= item.rarity; if (r <= 0) return item; }
  return items[items.length - 1];
}

export class FishingTankEngine {
  constructor(config = {}) { this.fishTypes = config.fishTypes || FISH_TYPES; this.history = []; }

  generateRound(betCents = 100, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    const fishCount = 3 + (parseInt(hash.substring(0, 2), 16) % 6);
    const pool = []; let totalValue = 0;

    for (let i = 0; i < fishCount; i++) {
      const subHash = hash.substring(Math.min(i*4,hash.length-4), Math.min(i*4+4,hash.length)) || '0';
      const num = parseInt(subHash, 16) % 1000; const rand = num / 1000;
      let cumulative = 0;
      for (const ft of this.fishTypes) {
        cumulative += ft.rarity * 1000;
        if (rand < cumulative) {
          pool.push(ft); totalValue += ft.value; break;
        }
      }
    }

    // Power-based catch: power 50-100, bigger fish harder to catch
    const power = 50 + (parseInt(hash.substring(4,8), 16) % 51);
    const caughtFish = pool.filter(f => {
      const threshold = f.size * 12 + f.speed * 3;
      return power >= threshold || Math.random() < (power / (threshold * 2));
    });
    const multiplier = caughtFish.reduce((s, f) => s + f.value, 0);
    const payoutCents = Math.round(betCents * multiplier);

    const round = { id:`fishing-${Date.now()}-${nonce}`, betCents, power, caughtFish, totalValue: caughtFish.length, multiplier, payoutCents, won: payoutCents > 0 };
    this.history.unshift(round); if (this.history.length > 50) this.history.pop();
    return round;
  }

  getHistory(limit = 20) { return this.history.slice(0, limit).map(h => ({ caughtFish: h.caughtFish.map(f=>f.name), multiplier: h.multiplier, payoutCents: h.payoutCents, won: h.won })); }
  getStats() { const t = this.history.length; if (!t) return { totalRounds:0 }; return { totalRounds:t, biggestCatch: Math.max(...this.history.map(h=>h.multiplier)), avgMultiplier: (this.history.reduce((s,h)=>s+h.multiplier,0)/t).toFixed(2) }; }
  getFishCatalog() { return this.fishTypes; }
}

const fishingEngine = new FishingTankEngine();
export { fishingEngine }; export default fishingEngine;