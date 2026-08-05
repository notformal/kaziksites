// Симуляция матмодели: прогоняет тысячи раундов через ту же функцию outcome(),
// что и прод, и считает фактический RTP каждой игры. Ответ на вопрос
// «остаётся ли казино в плюсе и выигрывает ли игрок достаточно часто».
//
//   node scripts/qa/rtp-sim.mjs [--rounds 200000]
import { randomBytes } from "node:crypto";
import { outcome } from "../../apps/api/src/provablyFair.js";
import { GAME_REGISTRY } from "../../apps/api/src/gameRegistry.js";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const ROUNDS = Number(args.rounds || 50000);

// Ставка игрока для игр, где исход зависит от выбора. Берём типичный вариант.
const CHOICES = {
  roulette: { type: "red" },
  "roulette-us": { type: "red" },
  keno: { numbers: [1, 2, 3, 4, 5] },
  dice: { type: "over", target: 5000 },
  limbo: { target: 2 },
  sicbo: { bet: "small" },
  baccarat: { bet: "banker" },
};
// Игры, где исход зависит от последующих решений игрока (не одноходовые).
const INTERACTIVE = new Set(["mines", "hilo", "blackjack", "holdem", "videopoker", "crash"]);

const serverSeed = randomBytes(32).toString("hex");
const rows = [];

for (const [gameId, definition] of GAME_REGISTRY) {
  if (INTERACTIVE.has(gameId)) continue;
  let staked = 0,
    returned = 0,
    wins = 0,
    best = 0;
  for (let nonce = 0; nonce < ROUNDS; nonce++) {
    const result = outcome({
      serverSeed,
      clientSeed: "rtp-simulation-client",
      nonce,
      gameId,
      kind: definition.kind,
      math: definition.math,
      choice: CHOICES[gameId],
    });
    const multiplier = result.multiplierMilli / 1000;
    staked += 1;
    returned += multiplier;
    if (multiplier > 0) wins++;
    if (multiplier > best) best = multiplier;
  }
  rows.push({
    gameId,
    kind: definition.kind,
    rtp: (returned / staked) * 100,
    edge: (1 - returned / staked) * 100,
    hitRate: (wins / ROUNDS) * 100,
    best,
  });
}

rows.sort((a, b) => a.rtp - b.rtp);
const pad = (s, n) => String(s).padEnd(n);
console.log(`Раундов на игру: ${ROUNDS.toLocaleString("en-US")}\n`);
console.log(`${pad("Игра", 22)}${pad("Тип", 14)}${pad("RTP", 10)}${pad("Преимущество", 14)}${pad("Частота выигрыша", 18)}Макс. ×`);
for (const row of rows) {
  console.log(
    pad(row.gameId, 22) +
      pad(row.kind, 14) +
      pad(`${row.rtp.toFixed(2)}%`, 10) +
      pad(`${row.edge.toFixed(2)}%`, 14) +
      pad(`${row.hitRate.toFixed(1)}%`, 18) +
      `${row.best}×`,
  );
}

// Здоровая социальная модель: казино в плюсе, но игрок выигрывает регулярно.
const LIMITS = { minEdge: 0.5, maxEdge: 12, minHitRate: 5 };
const problems = rows.filter(
  (r) => r.edge < LIMITS.minEdge || r.edge > LIMITS.maxEdge || r.hitRate < LIMITS.minHitRate,
);
console.log("");
if (!problems.length) {
  console.log(
    `Все игры в коридоре: преимущество ${LIMITS.minEdge}–${LIMITS.maxEdge}%, частота выигрыша ≥ ${LIMITS.minHitRate}%.`,
  );
} else {
  for (const p of problems)
    console.log(
      `ВНЕ КОРИДОРА ${p.gameId}: преимущество ${p.edge.toFixed(2)}%, частота выигрыша ${p.hitRate.toFixed(1)}%`,
    );
  process.exitCode = 1;
}
