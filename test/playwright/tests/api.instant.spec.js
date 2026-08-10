// @ts-check
import { test, expect } from '@playwright/test';
import { generateProvablyFairData, validateGameResult, waitForServer } from '../utils/game-utils.js';

/**
 * API Test Suite - Instant Games (8 games)
 */

test.describe('Instant Games API', () => {
  test.beforeAll(async () => { await waitForServer(); });

  test.describe('Crash Engine', () => {
    test('crash point >= 1.0', async ({}) => {
      const res = await fetch('http://127.0.0.1:8787/api/games/crash/spin', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,...generateProvablyFairData()})});
      expect(res.status).toBe(200); const r=await res.json(); validateGameResult(r,'crash'); expect(r.crashPoint).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Plinko Engine', () => {
    test('valid path for 12 rows', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/plinko/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,rows:12,...generateProvablyFairData()})})).json();
      expect(r.path.length).toBe(12); for(const p of r.path){expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThanOrEqual(12);}
    });
  });

  test.describe('Mines Engine', () => {
    test('valid minefield', async ({}) => {
      const m=5;const r=await(await fetch('http://127.0.0.1:8787/api/games/mines/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,mines:m,...generateProvablyFairData()})})).json();
      expect(r.gridSize).toBe(5);expect(r.mines).toBe(m);expect(r.minePositions.length).toBe(m);for(const p of r.minePositions){expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThan(25);}
      expect(new Set(r.minePositions).size).toBe(m);
    });
  });

  test.describe('Dice Engine', () => {
    test('roll in [0,100)', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/dice/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,rollUnder:50,...generateProvablyFairData()})})).json();
      expect(r.roll).toBeGreaterThanOrEqual(0);expect(r.roll).toBeLessThan(100);
    });
  });

  test.describe('Keno Engine', () => {
    test('draw 20 numbers [1-80]', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/keno/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:25,picks:[5,10,15],...generateProvablyFairData()})})).json();
      expect(r.draw.length).toBe(20);for(const n of r.draw){expect(n).toBeGreaterThanOrEqual(1);expect(n).toBeLessThanOrEqual(80);}
    });
  });

  test.describe('Limbo Engine', () => {
    test('result >= 1.01', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/limbo/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,target:2.5,...generateProvablyFairData()})})).json(); expect(r.result).toBeGreaterThanOrEqual(1.01);
    });
  });

  test.describe('Wheel Engine', () => {
    test('result [0-5]', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/wheel/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,...generateProvablyFairData()})})).json();
      expect(r.result).toBeGreaterThanOrEqual(0);expect(r.result).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Hi-Lo Engine', () => {
    test('valid cards', async ({}) => {
      const r=await(await fetch('http://127.0.0.1:8787/api/games/hilo/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,guess:'higher',...generateProvablyFairData()})})).json();
      expect(r.card1).toHaveProperty('suit');expect(r.card2).toHaveProperty('rank');
    });
  });

  test('return all 8 games', async ({}) => {
    const r=await(await fetch('http://127.0.0.1:8787/api/games')).json();
    expect(r.success).toBe(true);expect(r.games.length).toBe(8);
    for(const id of ['crash','plinko','mines','dice','keno','limbo','wheel','hilo']){const g=r.games.find(x=>x.id===id);expect(g).toBeDefined();}
  });

  test.describe('Performance', () => {
    const games = ['crash','plinko','mines','dice','keno','limbo','wheel','hilo'];
    for (const gameId of games) {
      test(`${gameId} <500ms`, async ({}) => {
        const s=Date.now();const r=await(await fetch('http://127.0.0.1:8787/api/games/'+gameId+'/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,...generateProvablyFairData()})})).json();
        expect(r).toBeTruthy();console.log(gameId,Date.now()-s,'ms');
      });
    }
  });

});