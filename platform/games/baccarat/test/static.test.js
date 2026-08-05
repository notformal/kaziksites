import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('baccarat client bets player/banker/tie and renders both hands', async () => {
  const s = await readFile(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(s, /sdk\.bet\(/);
  assert.match(s, /sdk\.settle\(/);
  assert.match(s, /bet:\s*\$\('betType'\)/);
  assert.match(s, /playerCards/);
  assert.match(s, /bankerCards/);
});
