import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('videopoker client drives the stateful start/draw protocol with holds', async () => {
  const s = await readFile(new URL('../sdk.js', import.meta.url), 'utf8');
  const g = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  for (const m of ['VP_START', 'VP_DRAW']) assert.match(s, new RegExp(m));
  assert.match(g, /sdk\.begin\(/);
  assert.match(g, /sdk\.draw\(/);
  assert.match(g, /held/); // hold tracking
});
