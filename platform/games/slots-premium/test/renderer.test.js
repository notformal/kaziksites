// Контракт клиента премиум-слотов: он обязан оставаться витриной серверного
// расчёта. Тесты читают исходники, поэтому ловят регресс до сборки и до QA.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("renderer is server authoritative: bet/settle only, no local win math", async () => {
  const source = await read("game.js");
  assert.match(source, /sdk\.bet\(amount, roundId\)/);
  assert.match(source, /sdk\.settle\(roundId\)/);
  // Сумма и множитель раунда берутся из ответа сервера, а не считаются.
  assert.match(source, /Number\(payload\.win \|\| 0\)/);
  assert.match(source, /Number\(payload\.multiplier \|\| 0\)/);
  // Сетки — только из outcome.grids.
  assert.match(source, /outcome\.grids/);
  // Ни одной серверной математической константы и ни одного пересчёта выигрыша.
  assert.doesNotMatch(source, /payoutScale/);
  assert.doesNotMatch(source, /\breels\s*:/);
  assert.doesNotMatch(source, /\bwin\s*[+*-]=/);
  assert.doesNotMatch(source, /send\([^)]*win/);
});

test("engine id is validated against the generated allowlist", async () => {
  const source = await read("game.js");
  assert.match(source, /import \{ ENGINES, ENGINE_IDS \} from "\.\/engines\.generated\.js"/);
  assert.match(source, /ENGINE_IDS\.includes\(engineId\)/);
  assert.match(source, /fail\(t\("errUnknownEngine"\)\)/);
});

test("math profiles are not duplicated by hand in the renderer", async () => {
  const source = await read("game.js");
  // Линии, лестница множителей и таблица выплат приходят только из ENGINES.
  assert.doesNotMatch(source, /paylines\s*=\s*\[\s*\[/);
  assert.doesNotMatch(source, /cascadeLadder\s*[:=]\s*\[/);
  assert.doesNotMatch(source, /paytable\s*[:=]\s*\{\s*\w+\s*:\s*\{/);
  assert.match(source, /def = ENGINES\[engineId\]/);
});

test("generated engine snapshot is machine-written from the server library", async () => {
  const source = await read("engines.generated.js");
  assert.match(source, /Сгенерировано scripts\/generate-game-art\.mjs/);
  assert.match(source, /apps\/api\/src\/slotLibrary\.js/);
  assert.match(source, /export const ENGINE_IDS = \[/);
});

test("DOM is built without innerHTML", async () => {
  const source = await read("game.js");
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.doesNotMatch(source, /insertAdjacentHTML/);
  assert.match(source, /textContent\s*=/);
  assert.match(source, /createElementNS\(SVG_NS/);
});

test("bridge pins postMessage to the exact parent origin", async () => {
  const source = await read("sdk.js");
  assert.match(source, /event\.origin!==this\.origin/);
  assert.match(source, /postMessage\([^;]+this\.origin\)/);
  assert.doesNotMatch(source, /postMessage\([^;]+['"]\*['"]/);
});

test("every feel knob lives in CONFIG, not inline in the code", async () => {
  const source = await read("game.js");
  for (const key of [
    "spinMs",
    "reelStopGapMs",
    "churnMs",
    "hitHoldMs",
    "cascadeExplodeMs",
    "cascadeDropMs",
    "freeSpinIntroMs",
    "freeSpinStepMs",
    "bigWinMultiplier",
  ])
    assert.match(source, new RegExp(`\\n\\s{2}${key}: \\d`), key);
  // Никаких «магических» пауз мимо CONFIG.
  assert.doesNotMatch(source, /setTimeout\([^,]+,\s*\d+\)/);
});

test("stylesheet uses design tokens only — no raw hex colours", async () => {
  const css = await read("style.css");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3}\b(?![\w-])/);
  assert.doesNotMatch(css, /\b(?:rgb|rgba|hsl)\(/);
  assert.match(css, /var\(--c-gold\)/);
  assert.match(css, /var\(--d-/);
});

test("renderer holds no colours of its own — art palette comes from tokens", async () => {
  const source = await read("game.js");
  assert.doesNotMatch(source, /"#[0-9a-fA-F]{3,8}"/);
  assert.match(source, /getComputedStyle\(document\.documentElement\)/);
  assert.match(source, /read\("--c-primary"\)/);
});

test("markup is fully localised and wired to the design system", async () => {
  const html = await read("index.html");
  for (const sheet of ["ui-tokens.css", "theme.generated.css", "ui-shell.css", "style.css"])
    assert.ok(html.includes(`href="${sheet}"`), sheet);
  for (const id of ["balance", "win", "sound", "spin", "reels", "overlay", "paytable"])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /data-mood="luxe"/);
  assert.match(html, /data-motif="marble"/);
  // Единственные видимые строки в разметке — фолбэки под data-i18n.
  for (const key of ["tagline", "balance", "win", "spin", "lineBet", "paytable", "connecting"])
    assert.ok(html.includes(`data-i18n="${key}"`), key);
});

test("build copies the renderer, the engine snapshot and the shared design system", async () => {
  const build = await read("build.mjs");
  for (const file of [
    "index.html",
    "style.css",
    "game.js",
    "sdk.js",
    "engines.generated.js",
    "theme.generated.css",
    "ui-symbols.js",
    "ui-tokens.css",
    "ui-shell.css",
    "ui-fx.js",
    "ui-audio.js",
    "i18n.js",
  ])
    assert.ok(build.includes(`'${file}'`), file);
});
