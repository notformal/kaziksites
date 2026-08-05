// Прицельная проверка счётчика выигрыша (#win) премиум-слота:
//  1) не мигает ли отрицательное число в начале роллапа,
//  2) сходится ли итоговое значение с суммой сервера,
//  3) не «протекает» ли роллап прошлого раунда в следующий спин.
//
//   node scripts/qa/premium-slots-counter.mjs [--base ...] [--spins 40]
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const BASE = args.base || "http://127.0.0.1:4183";
const SPINS = Number(args.spins || 40);
const T = 60000;

const problems = [];
const bad = (m) => { problems.push(m); console.log(`  !! ${m}`); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

const settles = [];
page.on("response", async (res) => {
  if (!res.url().includes("/wallet/settle")) return;
  try { const b = await res.json(); settles.push({ win: b.win, multiplier: b.multiplier }); } catch { /* ignore */ }
});

await page.addInitScript(() => {
  localStorage.setItem("casino_locale", "en");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});
const creds = { email: `qa-cnt-${Date.now()}@example.test`, password: "QaRunner!2026", displayName: "QA Counter" };
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(async (b) => fetch("/api/auth/register", {
  method: "POST", headers: { "Content-Type": "application/json" },
  credentials: "include", body: JSON.stringify(b),
}), creds);
await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.locator(".grid .game").first().waitFor({ timeout: T });
const card = page.locator('[data-game-slug="ways-243"] .gameMain');
for (let i = 0; i < 16 && !(await card.count()); i++) {
  const more = page.locator("button.load");
  if (!(await more.count())) break;
  await more.click();
  await page.waitForTimeout(140);
}
await card.first().click();
const frame = page.frameLocator(".secureGame iframe");
await frame.locator("#spin").waitFor({ state: "visible", timeout: T });
await frame.locator("#balance").waitFor({ state: "visible", timeout: T });
await frame.locator("#bet").selectOption("100");

// Пишем каждое изменение #win в лог внутри самой страницы — MutationObserver
// ловит кадры, которые опросом снаружи не поймать.
await frame.locator("#app").evaluate(() => {
  window.__winLog = [];
  const target = document.getElementById("win");
  new MutationObserver(() => window.__winLog.push({ t: Math.round(performance.now()), v: target.textContent })).observe(
    target, { childList: true, characterData: true, subtree: true },
  );
});

let paid = 0, negativeFlashes = 0, bleed = 0;
for (let i = 0; i < SPINS && paid < 5; i++) {
  const mark = settles.length;
  await frame.locator("#app").evaluate(() => { window.__winLog.length = 0; });
  await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
  await frame.locator("#spin").click();
  const dl = Date.now() + T;
  while (Date.now() < dl) {
    if (await frame.locator("#spin").evaluate((b) => b.disabled === false)) break;
    await page.waitForTimeout(60);
  }
  if (settles.length === mark) continue;
  const win = settles.at(-1).win;
  if (!win) continue;
  paid++;

  // Роллап длится ~900 мс — ждём его окончания и смотрим итог + весь лог.
  await page.waitForTimeout(1400);
  const log = await frame.locator("#app").evaluate(() => window.__winLog.slice());
  const final = await frame.locator("#win").textContent();
  const values = log.map((e) => Number(String(e.v).replace(/,/g, "")));
  const negatives = log.filter((e) => String(e.v).trim().startsWith("-"));
  if (negatives.length) {
    negativeFlashes++;
    bad(`роллап показал отрицательное число: ${negatives.map((e) => `«${e.v}»`).join(" ")} (сервер начислил ${win})`);
  }
  const finalNum = Number(String(final).replace(/,/g, ""));
  if (finalNum !== win) bad(`после роллапа #win = «${final}», сервер начислил ${win}`);
  const overshoot = values.filter((v) => v > win);
  if (overshoot.length) bad(`роллап перескочил сумму: max ${Math.max(...overshoot)} > ${win}`);
  console.log(`  выигрыш ${win}: кадров ${log.length}, первый «${log[0]?.v}», итог «${final}»`);

  // Мгновенный следующий спин: не течёт ли прошлый роллап в новый раунд?
  const mark2 = settles.length;
  await frame.locator("#app").evaluate(() => { window.__winLog.length = 0; });
  await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
  await frame.locator("#spin").click();
  await page.waitForTimeout(600);
  const during = await frame.locator("#app").evaluate(() => window.__winLog.slice());
  const nonZero = during.filter((e) => Number(String(e.v).replace(/,/g, "")) !== 0);
  if (nonZero.length) {
    bleed++;
    bad(`после старта нового спина #win показывает прошлый выигрыш: ${nonZero.slice(0, 4).map((e) => `«${e.v}»`).join(" ")}`);
  }
  const dl2 = Date.now() + T;
  while (Date.now() < dl2) {
    if (await frame.locator("#spin").evaluate((b) => b.disabled === false)) break;
    await page.waitForTimeout(60);
  }
  if (settles.length > mark2 && settles.at(-1).win) paid++;
}

await browser.close();
console.log(`\nОплаченных раундов проверено: ${paid}, отрицательных вспышек: ${negativeFlashes}, протечек роллапа: ${bleed}`);
console.log(`Ошибок консоли: ${consoleErrors.length}`);
console.log(`Дефектов: ${problems.length}`);
process.exit(problems.length ? 1 : 0);
