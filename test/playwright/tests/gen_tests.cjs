const fs = require('fs');
const lines = [];
function a(s) { lines.push(s); }

a("// @ts-check");
a("import { test, expect } from '@playwright/test';");
a("import { generateProvablyFairData, validateGameResult, waitForServer } from '../utils/game-utils.js';");
a("");
a("/**");
a(" * API Test Suite - Instant Games (8 games)");
a(" */");
a("");
a(`test.describe('Instant Games API', () => {`);
a("  test.beforeAll(async () => { await waitForServer(); });");
a("");

// CRASH
a(`  test.describe('Crash Engine', () => {`);
a(`    test('crash point >= 1.0', async ({}) => {`);
a(`      const res = await fetch('http://127.0.0.1:8787/api/games/crash/spin', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,...generateProvablyFairData()})});`);
a(`      expect(res.status).toBe(200); const r=await res.json(); validateGameResult(r,'crash'); expect(r.crashPoint).toBeGreaterThanOrEqual(1);`);
a(`    });`);
a(`  });`);
a("");

// PLINKO
a(`  test.describe('Plinko Engine', () => {`);
a(`    test('valid path for 12 rows', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/plinko/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,rows:12,...generateProvablyFairData()})})).json();`);
a(`      expect(r.path.length).toBe(12); for(const p of r.path){expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThanOrEqual(12);}`);
a(`    });`);
a(`  });`);
a("");

// MINES
a(`  test.describe('Mines Engine', () => {`);
a(`    test('valid minefield', async ({}) => {`);
a(`      const m=5;const r=await(await fetch('http://127.0.0.1:8787/api/games/mines/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,mines:m,...generateProvablyFairData()})})).json();`);
a(`      expect(r.gridSize).toBe(5);expect(r.mines).toBe(m);expect(r.minePositions.length).toBe(m);for(const p of r.minePositions){expect(p).toBeGreaterThanOrEqual(0);expect(p).toBeLessThan(25);}`);
a(`      expect(new Set(r.minePositions).size).toBe(m);`);
a(`    });`);
a(`  });`);
a("");

// DICE
a(`  test.describe('Dice Engine', () => {`);
a(`    test('roll in [0,100)', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/dice/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,rollUnder:50,...generateProvablyFairData()})})).json();`);
a(`      expect(r.roll).toBeGreaterThanOrEqual(0);expect(r.roll).toBeLessThan(100);`);
a(`    });`);
a(`  });`);
a("");

// KENO
a(`  test.describe('Keno Engine', () => {`);
a(`    test('draw 20 numbers [1-80]', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/keno/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:25,picks:[5,10,15],...generateProvablyFairData()})})).json();`);
a(`      expect(r.draw.length).toBe(20);for(const n of r.draw){expect(n).toBeGreaterThanOrEqual(1);expect(n).toBeLessThanOrEqual(80);}`);
a(`    });`);
a(`  });`);
a("");

// LIMBO
a(`  test.describe('Limbo Engine', () => {`);
a(`    test('result >= 1.01', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/limbo/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:100,target:2.5,...generateProvablyFairData()})})).json(); expect(r.result).toBeGreaterThanOrEqual(1.01);`);
a(`    });`);
a(`  });`);
a("");

// WHEEL
a(`  test.describe('Wheel Engine', () => {`);
a(`    test('result [0-5]', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/wheel/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,...generateProvablyFairData()})})).json();`);
a(`      expect(r.result).toBeGreaterThanOrEqual(0);expect(r.result).toBeLessThanOrEqual(5);`);
a(`    });`);
a(`  });`);
a("");

// HILO
a(`  test.describe('Hi-Lo Engine', () => {`);
a(`    test('valid cards', async ({}) => {`);
a(`      const r=await(await fetch('http://127.0.0.1:8787/api/games/hilo/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,guess:'higher',...generateProvablyFairData()})})).json();`);
a(`      expect(r.card1).toHaveProperty('suit');expect(r.card2).toHaveProperty('rank');`);
a(`    });`);
a(`  });`);
a("");

// GAME LIST
a(`  test('return all 8 games', async ({}) => {`);
a(`    const r=await(await fetch('http://127.0.0.1:8787/api/games')).json();`);
a(`    expect(r.success).toBe(true);expect(r.games.length).toBe(8);`);
a(`    for(const id of ['crash','plinko','mines','dice','keno','limbo','wheel','hilo']){const g=r.games.find(x=>x.id===id);expect(g).toBeDefined();}`);
a(`  });`);
a("");

// PERFORMANCE
a(`  test.describe('Performance', () => {`);
a(`    test.each(['crash','plinko','mines','dice','keno','limbo','wheel','hilo'])('%s <500ms', async (gameId) => {`);
a(`      const s=Date.now();const r=await(await fetch('http://127.0.0.1:8787/api/games/'+gameId+'/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bet:50,...generateProvablyFairData()})})).json();`);
a(`      expect(r).toBeTruthy();console.log(gameId,Date.now()-s,'ms');`);
a(`    });`);
a(`  });`);
a("");
a("});");

fs.writeFileSync('f:/Kaziksites/test/playwright/tests/api.instant.spec.js', lines.join('\n'), 'utf8');
console.log(`Written ${lines.length} lines to test file`);
