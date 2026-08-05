import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('blackjack client drives the stateful start/action protocol', async () => {
  const s = await readFile(new URL('../sdk.js', import.meta.url), 'utf8');
  const g = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  for (const m of ['BJ_START', 'BJ_ACTION']) assert.match(s, new RegExp(m));
  assert.match(g, /sdk\.begin\(/);
  assert.match(g, /sdk\.act\(/);
  for (const mv of ['hit', 'stand', 'double']) assert.match(g, new RegExp(`'${mv}'`));
});
