import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUND_STATES,
  assertRoundState,
  assertRoundTransition,
  canTransition,
} from "../src/roundState.js";

test("round state machine permits only open to settled", () => {
  assert.equal(canTransition(ROUND_STATES.OPEN, ROUND_STATES.SETTLED), true);
  assert.equal(canTransition(ROUND_STATES.OPEN, ROUND_STATES.OPEN), false);
  assert.equal(canTransition(ROUND_STATES.SETTLED, ROUND_STATES.OPEN), false);
  assert.equal(canTransition(ROUND_STATES.SETTLED, ROUND_STATES.SETTLED), false);
});

test("round state machine rejects unknown states and terminal transitions", () => {
  assert.throws(() => assertRoundState("paid"), { code: "invalid_round_state" });
  assert.throws(() => assertRoundTransition("settled", "open"), {
    code: "invalid_round_transition",
  });
});
