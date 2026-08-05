// Собирает визуальный слой каждой игры из config/game-themes.json:
//   • theme.generated.css — палитра игры в токенах дизайн-системы
//   • art/<symbol>.svg    — набор символов, отрисованный в цветах этой темы
//
// Один прогон — и все 17 игр получают согласованную, но не одинаковую графику.
//
//   node scripts/generate-game-art.mjs [--game dice]
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { GAME_BUNDLES, resolveFromRoot } from "../config/index.mjs";
import { renderSymbol } from "../packages/game-ui/src/symbols.mjs";
import { PLINKO, WHEEL_SEGMENTS_MILLI } from "../apps/api/src/mathProfiles.js";
import { SLOT_LIBRARY } from "../apps/api/src/slotLibrary.js";

// Публичные таблицы выплат: игрок обязан видеть их до ставки. Значения берутся
// из серверных матпрофилей, поэтому витрина не может разойтись с расчётом.
const PUBLIC_PAYTABLES = {
  plinko: { multipliers: PLINKO.multipliersMilli.map((m) => m / 1000), rows: PLINKO.rows },
  wheel: { segments: WHEEL_SEGMENTS_MILLI.map((m) => m / 1000) },
};

// Дискретные ставки НА ЛИНИЮ для премиум-слотов. Общая ставка, которая уходит
// на сервер, = betUnits × line-bet, поэтому список один на все профили: разницу
// делает betUnits самого профиля (10 линий → ×10, ways → ×1).
const LINE_BET_OPTIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

/**
 * Витринное описание одного слот-профиля. Копирует ТОЛЬКО то, что игрок обязан
 * видеть; payoutScale и reel-стрипы остаются на сервере. Всё, что попадает сюда,
 * приходит из apps/api/src/slotLibrary.js — один источник правды для расчёта и
 * для витрины.
 */
function publicEngine(def) {
  // Символы по убыванию старшинства (по выплате за 5 в ряд), затем wild и scatter.
  const ranked = Object.keys(def.paytable).sort(
    (a, b) => (def.paytable[b][5] ?? 0) - (def.paytable[a][5] ?? 0),
  );
  return {
    id: def.id,
    name: def.name,
    cols: def.cols,
    rows: def.rows,
    mode: def.mode,
    betUnits: def.betUnits,
    targetRtp: def.targetRtp,
    wild: def.wild ?? null,
    scatter: def.scatter ?? null,
    wildMultiplier: def.wildMultiplier ?? 1,
    paylines: def.paylines ?? null,
    paytable: def.paytable,
    scatterPays: def.scatterPays ?? null,
    freeSpins: def.freeSpins ?? null,
    cascade: Boolean(def.cascade),
    cascadeLadder: def.cascadeLadder ?? null,
    // Способов выиграть: rows^cols (243 у 5×3, 3125 у 5×5). Для линий — null.
    ways: def.mode === "ways" ? def.rows ** def.cols : null,
    symbols: [...ranked, ...(def.wild ? [def.wild] : []), ...(def.scatter ? [def.scatter] : [])],
    betOptions: LINE_BET_OPTIONS,
  };
}

// Игры, которым нужен сгенерированный слепок серверных слот-профилей.
const PUBLIC_ENGINES = {
  "slots-premium": SLOT_LIBRARY.map(publicEngine),
};

/** JSON с отступами, но числовые массивы (линии, лестница) — в одну строку. */
const compactJson = (value) =>
  JSON.stringify(value, null, 2).replace(
    /\[\n\s*((?:-?[\d.]+,\n\s*)*-?[\d.]+)\n\s*\]/g,
    (_, body) => `[${body.replace(/\s+/g, " ")}]`,
  );

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);

const themeFile = JSON.parse(await readFile(resolveFromRoot("config/game-themes.json"), "utf8"));
const bundles = args.game ? GAME_BUNDLES.filter((b) => b.slug === args.game) : GAME_BUNDLES;

/** Полная палитра игры: дефолты + переопределения темы + производные оттенки. */
function paletteFor(slug) {
  const theme = themeFile.games[slug] || {};
  const palette = { ...themeFile.defaults.palette, ...(theme.palette || {}) };
  return {
    ...palette,
    mood: theme.mood || themeFile.defaults.mood,
    motif: theme.motif || themeFile.defaults.motif,
    symbols: theme.symbols || [],
    surface2: mix(palette.surface, palette.primary, 0.12),
    line: mix(palette.surface, palette.primary, 0.3),
    text: palette.text || "#eef4ff",
    muted: mix(palette.text || "#eef4ff", palette.base, 0.42),
    onPrimary: readableOn(palette.primary),
  };
}

/** Линейное смешение двух hex-цветов — чтобы производные оттенки шли из палитры. */
function mix(a, b, amount) {
  const pa = hex(a), pb = hex(b);
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const hex = (value) => {
  const clean = value.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
};
/** Контрастный цвет текста на акценте — чтобы кнопки читались в любой теме. */
function readableOn(color) {
  const [r, g, b] = hex(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#08121c" : "#f7fbff";
}

function themeCss(slug, p) {
  return `/* Сгенерировано scripts/generate-game-art.mjs из config/game-themes.json. Не редактируйте вручную. */
:root {
  --c-base: ${p.base};
  --c-surface: ${p.surface};
  --c-surface-2: ${p.surface2};
  --c-line: ${p.line};
  --c-primary: ${p.primary};
  --c-secondary: ${p.secondary};
  --c-gold: ${p.gold};
  --c-win: ${p.win};
  --c-loss: ${p.loss};
  --c-text: ${p.text};
  --c-muted: ${p.muted};
  --c-on-primary: ${p.onPrimary};
}
`;
}

let symbolCount = 0;
for (const bundle of bundles) {
  const dir = resolveFromRoot(bundle.dir);
  const palette = paletteFor(bundle.slug);
  await writeFile(path.join(dir, "theme.generated.css"), themeCss(bundle.slug, palette));

  const paytable = PUBLIC_PAYTABLES[bundle.slug];
  if (paytable) {
    await writeFile(
      path.join(dir, "paytable.generated.js"),
      `// Сгенерировано scripts/generate-game-art.mjs из apps/api/src/mathProfiles.js.\n` +
        `// Не редактируйте вручную: значения обязаны совпадать с серверными.\n` +
        `export const PAYTABLE = ${JSON.stringify(paytable)};\n`,
    );
  }

  const engines = PUBLIC_ENGINES[bundle.slug];
  if (engines) {
    await writeFile(
      path.join(dir, "engines.generated.js"),
      `// Сгенерировано scripts/generate-game-art.mjs из apps/api/src/slotLibrary.js.\n` +
        `// Не редактируйте вручную: витрина обязана совпадать с серверным расчётом.\n` +
        `export const ENGINES = ${compactJson(Object.fromEntries(engines.map((e) => [e.id, e])))};\n\n` +
        `/** Белый список движков: ?engine= принимает только эти идентификаторы. */\n` +
        `export const ENGINE_IDS = ${JSON.stringify(engines.map((e) => e.id))};\n`,
    );
  }

  const artDir = path.join(dir, "art");
  await rm(artDir, { recursive: true, force: true });
  await mkdir(artDir, { recursive: true });
  for (const symbol of palette.symbols) {
    await writeFile(path.join(artDir, `${symbol}.svg`), renderSymbol(symbol, palette));
    symbolCount++;
  }
  console.log(`${bundle.slug}: тема + ${palette.symbols.length} символов (${palette.mood}/${palette.motif})`);
}

console.log(`\nОформлено игр: ${bundles.length}, символов отрисовано: ${symbolCount}`);
