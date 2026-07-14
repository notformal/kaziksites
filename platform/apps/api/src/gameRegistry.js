import { SLOT_DEFINITIONS } from "./slotMath.generated.js";

// Immutable, versioned math definitions. New balancing must add a new version;
// never edit an existing version after rounds have been accepted against it.
const slotEntries = SLOT_DEFINITIONS.map((definition) => [
  definition.id,
  definition,
]);

const entries = [
  [
    "slots-classic",
    {
      id: "slots-classic",
      kind: "slot",
      mathProfileId: "classic-base",
      mathVersion: 1,
      math: {
        lossWeight: 500,
        smallWeight: 300,
        mediumWeight: 150,
        largeWeight: 40,
        jackpotWeight: 10,
        multipliersMilli: [0, 1500, 2500, 10000, 50000],
      },
    },
  ],
  [
    "crash",
    { id: "crash", kind: "crash", mathProfileId: "crash-base", mathVersion: 1 },
  ],
  [
    "plinko",
    {
      id: "plinko",
      kind: "plinko",
      mathProfileId: "plinko-base",
      mathVersion: 1,
      math: {
        lossWeight: 450,
        smallWeight: 340,
        mediumWeight: 155,
        largeWeight: 45,
        jackpotWeight: 10,
        multipliersMilli: [0, 1200, 2000, 5000, 15000],
      },
    },
  ],
  [
    "roulette",
    {
      id: "roulette",
      kind: "roulette",
      mathProfileId: "roulette-european",
      mathVersion: 1,
    },
  ],
  [
    "keno",
    { id: "keno", kind: "keno", mathProfileId: "keno-base", mathVersion: 1 },
  ],
  ...slotEntries,
];

export const GAME_REGISTRY = new Map(
  entries.map(([id, definition]) => [id, Object.freeze(definition)]),
);

export function gameDefinition(gameId, mathProfileId, mathVersion) {
  const definition = GAME_REGISTRY.get(gameId);
  if (!definition) return null;
  if (
    mathProfileId !== undefined &&
    (definition.mathProfileId !== mathProfileId ||
      definition.mathVersion !== Number(mathVersion))
  )
    return null;
  return definition;
}

export function publicGameRegistry() {
  return [...GAME_REGISTRY.values()].map(({ math, ...game }) => game);
}
