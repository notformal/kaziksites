// Локализация премиум-слотов: en/ru через ЖИВОЕ лобби (каждая локаль — свой
// контекст, чтобы initScript не перебивал casino_locale) + прямой ?locale= для
// всех семи языков. Ищем непереведённые подписи, сырые ключи и пустые строки.
//
//   node scripts/qa/premium-slots-i18n.mjs [--base http://127.0.0.1:4183]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const BASE = args.base || "http://127.0.0.1:4183";
const SHOTS = args.shots || process.env.QA_SHOTS || ".";
const T = 40000;
mkdirSync(SHOTS, { recursive: true });

const problems = [];
const bad = (m) => { problems.push(m); console.log(`  !! ${m}`); };

const KEYS = [
  "modeLines", "modeWays", "modeCascade", "linesCount", "waysCount", "lineBet", "totalBet",
  "betFormula", "rtpLabel", "lineHit", "waysHit", "scatterHit", "cascadeLabel", "cascadeStep",
  "cascadeLadderLabel", "freeSpinsLabel", "freeSpinsAwarded", "freeSpinRound", "freeSpinsTotal",
  "roundMultiplier", "wildPays", "scatterPaysLabel", "paytableNote", "symTen", "symJack",
  "symQueen", "symKing", "symAce", "symRuby", "symCrown", "symWild", "symScatter", "bigWinLabel",
  "errUnknownEngine", "errLoad", "tagline", "connecting", "ready", "betPending", "settling",
  "reelsLabel", "sound", "credits", "spin", "balance", "win", "paytable", "serverResult",
  "engineWays", "engineLines", "engineCascade",
];

const browser = await chromium.launch({ headless: true });
const consoleErrors = [];

const creds = {
  email: `qa-i18n-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
  password: "QaRunner!2026",
  displayName: "QA I18N",
};

const snap = {};
for (const locale of ["en", "ru"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${locale}: ${m.text()}`));
  page.on("pageerror", (e) => consoleErrors.push(`${locale} pageerror: ${e.message}`));
  await page.addInitScript((l) => {
    localStorage.setItem("casino_locale", l);
    localStorage.setItem("casino_onboarding_v1", "done");
    localStorage.setItem("casino_analytics_consent", "denied");
  }, locale);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const auth = await page.evaluate(async (b) => {
    const reg = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(b),
    });
    if (reg.status === 201) return reg.status;
    const login = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ email: b.email, password: b.password }),
    });
    return login.status;
  }, creds);
  if (![200, 201].includes(auth)) { bad(`${locale}: авторизация не прошла (${auth})`); await ctx.close(); continue; }
  await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor({ timeout: T });
  const card = page.locator('[data-game-slug="cascade-ways"] .gameMain');
  for (let i = 0; i < 16 && !(await card.count()); i++) {
    const more = page.locator("button.load");
    if (!(await more.count())) break;
    await more.click();
    await page.waitForTimeout(140);
  }
  if (!(await card.count())) { bad(`${locale}: карточка cascade-ways не найдена`); await ctx.close(); continue; }
  await card.first().click();
  const frame = page.frameLocator(".secureGame iframe");
  await frame.locator("#spin").waitFor({ state: "visible", timeout: T });
  await frame.locator("#balance").waitFor({ state: "visible", timeout: T });
  await page.waitForTimeout(400);

  const iframeSrc = await page.locator(".secureGame iframe").getAttribute("src");
  await frame.locator("details summary").click();
  await page.waitForTimeout(250);

  snap[locale] = await frame.locator("#app").evaluate((root) => {
    const text = (s) => root.querySelector(s)?.textContent?.trim() ?? null;
    const leaves = [...root.querySelectorAll("*")].filter((n) => !n.children.length);
    return {
      lang: document.documentElement.lang,
      docTitle: document.title,
      tagline: text(".eyebrow"),
      mode: text("#mode"),
      rtp: text("#rtp"),
      lineBet: text(".field__label"),
      totalBet: text("#totalBet"),
      spin: text("#spin"),
      status: text("#status"),
      balanceLabel: text(".stat .stat__label"),
      winLabel: text(".stat--win .stat__label"),
      ladderLabel: text(".ladder__label"),
      paytableSummary: text("details summary"),
      paytableNote: text(".paytable__note"),
      firstPayRow: text(".paytable__row span"),
      engineInfo: text("#engineInfo"),
      result: text("#result"),
      betOption: root.querySelector("#bet option")?.textContent?.trim() ?? null,
      soundAria: root.querySelector("#sound")?.getAttribute("aria-label"),
      reelsAria: root.querySelector("#reels")?.getAttribute("aria-label"),
      leaves: leaves.map((n) => n.textContent.trim()).filter(Boolean),
      emptyI18n: [...root.querySelectorAll("[data-i18n]")].filter((n) => !n.textContent.trim()).map((n) => n.dataset.i18n),
    };
  });
  snap[locale].iframeSrc = iframeSrc;
  await page.screenshot({ path: `${SHOTS}/i18n-lobby-${locale}.png` }).catch(() => {});
  console.log(`\n[${locale}] iframe src: ${iframeSrc}`);
  for (const [k, v] of Object.entries(snap[locale])) {
    if (["leaves", "emptyI18n", "iframeSrc"].includes(k)) continue;
    console.log(`   ${k.padEnd(16)} ${v}`);
  }
  const raw = snap[locale].leaves.filter((s) => KEYS.includes(s));
  if (raw.length) bad(`${locale}: сырые ключи на экране: ${[...new Set(raw)].join(", ")}`);
  if (snap[locale].emptyI18n.length) bad(`${locale}: пустые data-i18n: ${snap[locale].emptyI18n.join(", ")}`);
  if (snap[locale].lang !== locale) bad(`${locale}: document.lang=${snap[locale].lang}`);
  if (!iframeSrc.includes(`locale=${locale}`)) bad(`${locale}: лобби не передало locale= в iframe: ${iframeSrc}`);
  await ctx.close();
}

if (snap.en && snap.ru) {
  const fields = ["tagline", "mode", "rtp", "lineBet", "totalBet", "spin", "status", "balanceLabel",
    "winLabel", "ladderLabel", "paytableSummary", "paytableNote", "firstPayRow", "result",
    "betOption", "soundAria", "reelsAria"];
  const same = fields.filter((f) => snap.en[f] && snap.en[f] === snap.ru[f]);
  if (same.length) bad(`подписи не меняются между en и ru: ${same.join(", ")}`);
  const cyr = /[Ѐ-ӿ]/;
  const enCyr = fields.filter((f) => typeof snap.en[f] === "string" && cyr.test(snap.en[f]));
  if (enCyr.length) bad(`кириллица в английской локали: ${enCyr.join(", ")}`);
  const ruLat = ["mode", "lineBet", "spin", "ladderLabel", "paytableSummary"].filter(
    (f) => typeof snap.ru[f] === "string" && !cyr.test(snap.ru[f]),
  );
  if (ruLat.length) bad(`русская локаль без кириллицы: ${ruLat.join(", ")}`);
}

/* --- Все семь языков напрямую, без лобби (t.apply отрабатывает на boot). --- */
console.log("\n=== прямой ?locale= для 7 языков ===");
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => consoleErrors.push(`direct pageerror: ${e.message}`));
p.on("console", (m) => m.type() === "error" && consoleErrors.push(`direct: ${m.text()}`));
for (const locale of ["en", "ru", "uk", "es", "de", "fr", "pt", "zz"]) {
  await p.goto(`${BASE}/games/slots-premium/index.html?engine=cascade-ways&locale=${locale}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(300);
  const s = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    mode: document.getElementById("mode").textContent.trim(),
    ladder: document.querySelector(".ladder__label").textContent.trim(),
    note: document.querySelector(".paytable__note").textContent.trim(),
    row: document.querySelector(".paytable__row span")?.textContent.trim(),
    spin: document.getElementById("spin").textContent.trim(),
    total: document.getElementById("totalBet").textContent.trim(),
    empty: [...document.querySelectorAll("[data-i18n]")].filter((n) => !n.textContent.trim()).map((n) => n.dataset.i18n),
  }));
  console.log(`  ${locale}: lang=${s.lang} mode=«${s.mode}» ladder=«${s.ladder}» spin=«${s.spin}» row=«${s.row}» total=«${s.total}»`);
  if (s.empty.length) bad(`${locale}: пустые data-i18n ${s.empty.join(",")}`);
  const leaves = await p.evaluate(() => [...document.querySelectorAll("*")].filter((n) => !n.children.length).map((n) => n.textContent.trim()).filter(Boolean));
  const raw = leaves.filter((x) => KEYS.includes(x));
  if (raw.length) bad(`${locale}: сырые ключи ${[...new Set(raw)].join(",")}`);
}
await ctx.close();
await browser.close();

console.log(`\nОшибок консоли: ${consoleErrors.length}`);
consoleErrors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
console.log(`Дефектов: ${problems.length}`);
process.exit(problems.length || consoleErrors.length ? 1 : 0);
