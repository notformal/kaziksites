import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('limbo client bets a target multiplier and settles server-side', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(/);
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /target:\s*target\(\)/);
  assert.match(s, /1000/); // upper target clamp matches the server bound
});
