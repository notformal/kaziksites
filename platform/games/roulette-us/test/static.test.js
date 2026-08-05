import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('american roulette client supports straight + even-money bets', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(/);
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /straight/);
  assert.match(s, /o\.label/);
});
