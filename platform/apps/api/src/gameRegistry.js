import { SLOT_DEFINITIONS } from "./slotMath.generated.js";
import { SLOT_LIBRARY } from "./slotLibrary.js";
import { CLASSIC_SLOT, PLINKO } from "./mathProfiles.js";

// Immutable, versioned math definitions. New balancing must add a new version;
// never edit an existing version after rounds have been accepted against it.
const slotEntries = SLOT_DEFINITIONS.map((definition) => [
  definition.id,
  definition,
]);

// Premium slots driven by the reusable slotEngine (lines / ways / cascade). The
// whole definition IS the math profile — a new balancing bumps mathVersion.
const engineSlotEntries = SLOT_LIBRARY.map((def) => [
  def.id,
  { id: def.id, kind: "slot-engine", mathProfileId: def.id, mathVersion: 1, math: def },
]);

const entries = [
  [
    "slots-classic",
    {
      id: "slots-classic",
      kind: "slot",
      mathProfileId: "classic-base",
      mathVersion: 1,
      math: CLASSIC_SLOT,
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
      math: PLINKO,
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
  [
    "dice",
    { id: "dice", kind: "dice", mathProfileId: "dice-base", mathVersion: 1 },
  ],
  [
    "limbo",
    { id: "limbo", kind: "limbo", mathProfileId: "limbo-base", mathVersion: 1 },
  ],
  [
    "wheel",
    { id: "wheel", kind: "wheel", mathProfileId: "wheel-base", mathVersion: 1 },
  ],
  [
    "sicbo",
    { id: "sicbo", kind: "sicbo", mathProfileId: "sicbo-base", mathVersion: 1 },
  ],
  [
    "baccarat",
    { id: "baccarat", kind: "baccarat", mathProfileId: "baccarat-base", mathVersion: 1 },
  ],
  [
    "roulette-us",
    { id: "roulette-us", kind: "roulette-us", mathProfileId: "roulette-american", mathVersion: 1 },
  ],
  ...slotEntries,
  ...engineSlotEntries,
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
