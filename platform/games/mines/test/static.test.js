import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('mines client drives the stateful start/reveal/cashout protocol', async () => {
  const s = await readFile(new URL('../sdk.js', import.meta.url), 'utf8');
  const g = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  for (const m of ['MINES_START', 'MINES_REVEAL', 'MINES_CASHOUT']) assert.match(s, new RegExp(m));
  assert.match(g, /sdk\.begin\(/);
  assert.match(g, /sdk\.reveal\(/);
  assert.match(g, /sdk\.cashout\(/);
  assert.match(g, /gridSize: 25/); // 25-tile grid
});
