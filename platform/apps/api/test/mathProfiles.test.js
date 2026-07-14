import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SLOT_DEFINITIONS } from '../src/slotMath.generated.js';
import { outcome, verify } from '../src/provablyFair.js';

test('all 127 slot math profiles are deterministic and produce valid server grids', () => {
  assert.equal(SLOT_DEFINITIONS.length, 127);
  for (const definition of SLOT_DEFINITIONS) {
    const allowed = new Set(definition.math.symbols.map((symbol) => symbol.id));
    let settled = 0;
    for (let nonce = 0; nonce < 100; nonce++) {
      const input = {
        serverSeed: createHash('sha256').update(`${definition.id}:${nonce}`).digest('hex'),
        clientSeed: `simulation-client-${definition.id}`,
        nonce,
        gameId: definition.id,
        kind: definition.kind,
        math: definition.math,
      };
      const result = outcome(input);
      assert.equal(verify(input, result), true, `${definition.id}:${nonce} is not reproducible`);
      const value = JSON.parse(result.value);
      assert.equal(value.grid.length, 15, `${definition.id}:${nonce} grid size`);
      assert.ok(value.grid.every((symbol) => allowed.has(symbol)), `${definition.id}:${nonce} unknown symbol`);
      assert.ok(Number.isSafeInteger(result.multiplierMilli) && result.multiplierMilli >= 0);
      settled++;
    }
    assert.equal(settled, 100);
  }
});
