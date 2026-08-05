import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('holdem client drives the stateful start/call/fold protocol', async () => {
  const s = await readFile(new URL('../sdk.js', import.meta.url), 'utf8');
  const g = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  for (const m of ['CH_START', 'CH_ACTION']) assert.match(s, new RegExp(m));
  assert.match(g, /sdk\.begin\(/);
  assert.match(g, /sdk\.act\(/);
  assert.match(g, /'call'/);
  assert.match(g, /'fold'/);
});
