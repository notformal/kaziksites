// Живая проверка трёх флагманских слотов: спины, каскад, локализация.
import { chromium } from "playwright";
const base = "http://127.0.0.1:4183";
const S = "C:/Users/anton/AppData/Local/Temp/claude/f--Kaziksites/cc43e957-739f-4c08-ad40-05a5a6d38873/scratchpad";
const ENGINES = ["classic-lines", "ways-243", "cascade-ways"];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.addInitScript(() => { localStorage.setItem("casino_locale", "ru"); localStorage.setItem("casino_onboarding_v1", "done"); });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ email: `prem${Math.random().toString(16).slice(2)}@e.test`, password: "QaProbe!2026", displayName: "Prem" }) });
  sessionStorage.setItem("casino_authenticated", "1");
});
const balance = () => page.evaluate(async () => (await (await fetch("/api/wallet/balance", { credentials: "include" })).json()).balance);

for (const engine of ENGINES) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor();
  for (let i = 0; i < 14; i++) {
    if (await page.locator(`[data-game-slug="${engine}"]`).count()) break;
    const more = page.locator("button.load");
    if (!(await more.count())) break;
    await more.click();
    await page.waitForTimeout(100);
  }
  const card = page.locator(`[data-game-slug="${engine}"] .gameMain`);
  if (!(await card.count())) { console.log(`${engine}: КАРТОЧКА НЕ НАЙДЕНА`); continue; }
  await card.first().click();
  const f = page.frameLocator(".secureGame iframe");
  await f.locator("#spin").waitFor({ timeout: 12000 });
  await page.waitForTimeout(700);

  const before = await balance();
  let wins = 0, cascades = 0;
  for (let i = 0; i < 10; i++) {
    await f.locator("#spin").click();
    await page.waitForTimeout(2600);
    const win = (await f.locator("#win").textContent())?.trim();
    if (win && win !== "0") wins++;
    // Каскад: игра выставляет счётчик ступени, если сеток было больше одной.
    const cascadeShown = await f.locator('[data-cascade], .cascadeStep, #cascade').count();
    if (cascadeShown) cascades++;
    if (wins >= 2 && i >= 5) break;
  }
  const after = await balance();
  const cells = await f.locator(".symbol, .cell, [data-symbol]").count();
  console.log(`${engine}: баланс ${before} → ${after}, выигрышных ${wins}/10, ячеек ${cells}, каскад-элемент ${cascades ? "есть" : "нет"}`);
  await page.screenshot({ path: `${S}/premium-${engine}.png` });
  await page.keyboard.press("Escape");
}

// Мобильный вид на флагмане с каскадом.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.locator(".grid .game").first().waitFor();
for (let i = 0; i < 14; i++) {
  if (await page.locator('[data-game-slug="cascade-ways"]').count()) break;
  const more = page.locator("button.load");
  if (!(await more.count())) break;
  await more.click();
  await page.waitForTimeout(100);
}
await page.locator('[data-game-slug="cascade-ways"] .gameMain').first().click();
await page.frameLocator(".secureGame iframe").locator("#spin").waitFor({ timeout: 12000 });
await page.waitForTimeout(600);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await page.screenshot({ path: `${S}/premium-mobile.png` });
console.log("mobile overflow:", overflow);
console.log("console errors:", errors.length, errors.slice(0, 3));
await browser.close();
