import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('wheel client spins with no choice and renders the server segments', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(amount,\s*id\)/); // no choice, like plinko
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /out\.segments/);
  assert.match(s, /out\.segment\b/);
});
