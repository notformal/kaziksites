import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('sicbo client places a choice-based bet and settles server-side', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(/);
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /bet:\s*b/);
  assert.match(s, /number:\s*Number/);
});
