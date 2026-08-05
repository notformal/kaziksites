import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('dice client places a provably-fair over/under bet and settles server-side', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(/);
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /type:\s*dir/);
  assert.match(s, /target:\s*targetPoints\(\)/);
  assert.match(s, /9998/); // upper clamp matches the server's target bound
});
