// Slot mechanics engine: evaluation correctness, provably-fair determinism, and
// Monte-Carlo RTP verification of the whole library (guards the math from drift).
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGrid, spin, computeRTP, makeHmacRng } from '../src/slotEngine.js';
import { SLOT_LIBRARY } from '../src/slotLibrary.js';

// Fast seeded PRNG for Monte-Carlo (the engine is rng-agnostic).
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('fixed-payline evaluation: 3-of-a-kind, wild substitution + multiplier, and a miss', () => {
  const def = { mode: 'lines', cols: 3, rows: 1, paylines: [[0, 0, 0]], wild: 'W', scatter: 'S', wildMultiplier: 2, paytable: { A: { 3: 5 } } };
  assert.equal(evaluateGrid(def, [['A'], ['A'], ['A']]).win, 5);
  assert.equal(evaluateGrid(def, [['A'], ['W'], ['A']]).win, 10); // a wild in the run doubles it
  assert.equal(evaluateGrid(def, [['A'], ['A'], ['B']]).win, 0); // only 2 in a row -> no pay
});

test('ways-to-win evaluation multiplies matches per column, wild counts for all', () => {
  const def = { mode: 'ways', cols: 3, rows: 2, wild: 'W', paytable: { A: { 3: 2 } } };
  // col0: A,A (2)  col1: A,B (1)  col2: A,W (2)  -> ways 2*1*2 = 4, pay 2 -> 8
  const { win, hits } = evaluateGrid(def, [['A', 'A'], ['A', 'B'], ['A', 'W']]);
  assert.equal(win, 8);
  assert.equal(hits[0].ways, 4);
  assert.equal(hits[0].count, 3);
});

test('scatter pays are awarded flat, independent of lines', () => {
  const def = { id: 's', cols: 3, rows: 1, mode: 'ways', wild: 'W', scatter: 'S', paytable: {}, reels: [['S'], ['S'], ['S']], scatterPays: { 3: 7 } };
  const r = spin(def, () => 0); // stop 0 on single-symbol reels -> all scatters
  assert.equal(r.scatters, 3);
  assert.equal(r.win, 7);
});

test('provably-fair rng is deterministic per (seed, nonce) and yields [0,1)', () => {
  const a = makeHmacRng('server', 'client', 1), b = makeHmacRng('server', 'client', 1);
  const va = [a(), a(), a()];
  assert.deepEqual(va, [b(), b(), b()]);
  for (const x of va) assert.ok(x >= 0 && x < 1);
  // A different nonce produces a different stream.
  assert.notEqual(makeHmacRng('server', 'client', 2)(), makeHmacRng('server', 'client', 1)());
});

test('a spin is fully reproducible from the same seed chain', () => {
  const [def] = SLOT_LIBRARY;
  const s1 = spin(def, makeHmacRng('srv', 'cli', 7));
  const s2 = spin(def, makeHmacRng('srv', 'cli', 7));
  assert.equal(s1.win, s2.win);
  assert.deepEqual(s1.grids, s2.grids);
});

test('cascading reels tumble at least sometimes and every win is finite & non-negative', () => {
  const cascade = SLOT_LIBRARY.find((d) => d.cascade);
  const rng = mulberry32(1);
  let tumbled = false;
  for (let i = 0; i < 3000; i++) {
    const r = spin(cascade, rng);
    assert.ok(Number.isFinite(r.win) && r.win >= 0);
    if (r.grids.length > 1) tumbled = true;
  }
  assert.ok(tumbled, 'expected at least one cascade in 3000 spins');
});

test('every library profile pays out its target RTP (±3%) over Monte-Carlo', () => {
  for (const def of SLOT_LIBRARY) {
    let acc = 0;
    const seeds = [7, 17, 27], N = 120000;
    for (const sd of seeds) acc += computeRTP(def, N, mulberry32(sd)) / def.betUnits;
    const rtp = acc / seeds.length;
    assert.ok(
      Math.abs(rtp - def.targetRtp) < 0.03,
      `${def.id} measured RTP ${(rtp * 100).toFixed(2)}% vs target ${(def.targetRtp * 100).toFixed(1)}%`,
    );
  }
});
