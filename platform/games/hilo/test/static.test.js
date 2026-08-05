import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('hilo client drives the stateful start/guess/cashout protocol', async () => {
  const s = await readFile(new URL('../sdk.js', import.meta.url), 'utf8');
  const g = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  for (const m of ['HILO_START', 'HILO_GUESS', 'HILO_CASHOUT']) assert.match(s, new RegExp(m));
  assert.match(g, /sdk\.begin\(/);
  assert.match(g, /sdk\.guess\(/);
  assert.match(g, /sdk\.cashout\(/);
});
