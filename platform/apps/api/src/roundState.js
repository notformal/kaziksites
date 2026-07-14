export const ROUND_STATES = Object.freeze({
  OPEN: "open",
  SETTLED: "settled",
});

const transitions = new Map([
  [ROUND_STATES.OPEN, new Set([ROUND_STATES.SETTLED])],
  [ROUND_STATES.SETTLED, new Set()],
]);

export function isRoundState(value) {
  return transitions.has(value);
}

export function canTransition(from, to) {
  return isRoundState(from) && isRoundState(to) && transitions.get(from).has(to);
}

export function assertRoundState(value) {
  if (!isRoundState(value)) {
    const error = new Error(`invalid_round_state:${value}`);
    error.code = "invalid_round_state";
    throw error;
  }
  return value;
}

export function assertRoundTransition(from, to) {
  assertRoundState(from);
  assertRoundState(to);
  if (!canTransition(from, to)) {
    const error = new Error(`invalid_round_transition:${from}->${to}`);
    error.code = "invalid_round_transition";
    throw error;
  }
  return to;
}
