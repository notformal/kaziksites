// Витрина обязана совпадать с расчётом: сгенерированный слепок сверяется с
// живым apps/api/src/slotLibrary.js. Любая правка математики без пересборки
// engines.generated.js падает здесь, а не у игрока.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ENGINES, ENGINE_IDS } from "../engines.generated.js";
import { SLOT_LIBRARY } from "../../../apps/api/src/slotLibrary.js";

const server = new Map(SLOT_LIBRARY.map((def) => [def.id, def]));

test("snapshot covers exactly the server slot library", () => {
  assert.deepEqual([...ENGINE_IDS].sort(), [...server.keys()].sort());
  assert.deepEqual(Object.keys(ENGINES).sort(), [...server.keys()].sort());
});

test("every public field matches the server math profile", () => {
  for (const id of ENGINE_IDS) {
    const shown = ENGINES[id];
    const def = server.get(id);
    assert.equal(shown.name, def.name, id);
    assert.equal(shown.cols, def.cols, id);
    assert.equal(shown.rows, def.rows, id);
    assert.equal(shown.mode, def.mode, id);
    assert.equal(shown.betUnits, def.betUnits, id);
    assert.equal(shown.targetRtp, def.targetRtp, id);
    assert.equal(shown.wild, def.wild ?? null, id);
    assert.equal(shown.scatter, def.scatter ?? null, id);
    assert.equal(shown.wildMultiplier, def.wildMultiplier ?? 1, id);
    assert.deepEqual(shown.paylines, def.paylines ?? null, id);
    assert.deepEqual(shown.paytable, def.paytable, id);
    assert.deepEqual(shown.scatterPays, def.scatterPays ?? null, id);
    assert.deepEqual(shown.freeSpins, def.freeSpins ?? null, id);
    assert.equal(shown.cascade, Boolean(def.cascade), id);
    assert.deepEqual(shown.cascadeLadder, def.cascadeLadder ?? null, id);
  }
});

test("secret math never leaks into the client bundle", () => {
  for (const id of ENGINE_IDS) {
    assert.equal(ENGINES[id].payoutScale, undefined, id);
    assert.equal(ENGINES[id].reels, undefined, id);
  }
});

test("ways counters and line counts are derived from the grid", () => {
  for (const id of ENGINE_IDS) {
    const engine = ENGINES[id];
    if (engine.mode === "ways") assert.equal(engine.ways, engine.rows ** engine.cols, id);
    else assert.equal(engine.paylines.length, engine.betUnits, id);
  }
});

test("symbol list covers the paytable plus wild and scatter", () => {
  for (const id of ENGINE_IDS) {
    const engine = ENGINES[id];
    for (const symbol of [...Object.keys(engine.paytable), engine.wild, engine.scatter])
      assert.ok(engine.symbols.includes(symbol), `${id}/${symbol}`);
  }
});

test("renderer maps every profile symbol to vector art and a localised name", async () => {
  const source = await readFile(new URL("../game.js", import.meta.url), "utf8");
  const art = source.slice(source.indexOf("const SYMBOL_ART"), source.indexOf("const SYMBOL_LABEL"));
  const label = source.slice(source.indexOf("const SYMBOL_LABEL"), source.indexOf("const GAME_STRINGS"));
  for (const id of ENGINE_IDS)
    for (const symbol of ENGINES[id].symbols) {
      assert.match(art, new RegExp(`\\n\\s+${symbol}: "`), `art:${symbol}`);
      assert.match(label, new RegExp(`\\n\\s+${symbol}: "sym`), `label:${symbol}`);
    }
});

test("bet options keep the total bet inside the server limits", () => {
  for (const id of ENGINE_IDS) {
    const engine = ENGINES[id];
    assert.ok(engine.betOptions.length > 1, id);
    assert.ok(engine.betOptions.every(Number.isSafeInteger), id);
    assert.ok(engine.betOptions.every((value) => value >= 1), id);
    // Сервер принимает ставку 1..1e5; общая ставка = betUnits × line-bet.
    assert.ok(Math.max(...engine.betOptions) * engine.betUnits <= 1e5, id);
  }
});

test("every game string exists in all seven locales", async () => {
  const source = await readFile(new URL("../game.js", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("const GAME_STRINGS"), source.indexOf("const t = createGameI18n"));
  const locales = ["en", "ru", "uk", "es", "de", "fr", "pt"];
  const dicts = locales.map((locale) => {
    const start = block.indexOf(`\n  ${locale}: {`);
    assert.ok(start > -1, locale);
    const end = block.indexOf("\n  },", start);
    return [...block.slice(start, end).matchAll(/\n {4}(\w+):/g)].map((m) => m[1]);
  });
  for (const [index, keys] of dicts.entries())
    assert.deepEqual(keys, dicts[0], `locale ${locales[index]} key set`);
});
