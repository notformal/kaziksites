// Живой спин slots-studio: регистрация, открытие титула из лобби, спин, скриншот.
import { chromium } from "playwright";
const base = "http://127.0.0.1:4183";
const S = "C:/Users/anton/AppData/Local/Temp/claude/f--Kaziksites/cc43e957-739f-4c08-ad40-05a5a6d38873/scratchpad";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("[err]", m.text()); });
await page.addInitScript(() => { localStorage.setItem("casino_locale", "ru"); localStorage.setItem("casino_onboarding_v1", "done"); });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ email: `spin${Math.random().toString(16).slice(2)}@e.test`, password: "QaProbe!2026", displayName: "Spin" }) });
  sessionStorage.setItem("casino_authenticated", "1");
});
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.locator(".grid .game").first().waitFor();
// Долистываем каталог до нужного титула кнопкой «показать ещё».
for (let i = 0; i < 12; i++) {
  if (await page.locator('[data-game-slug="slot-original-005"]').count()) break;
  const more = page.locator("button.load");
  if (!(await more.count())) break;
  await more.click();
  await page.waitForTimeout(120);
}
await page.locator('[data-game-slug="slot-original-005"] .gameMain').first().click();
const f = page.frameLocator(".secureGame iframe");
await f.locator("#spin").waitFor({ timeout: 10000 });
await page.waitForTimeout(800);
// Несколько спинов — ловим выигрышную линию с подсветкой арта.
for (let i = 0; i < 6; i++) {
  await f.locator("#spin").click();
  await page.waitForTimeout(2400);
  const win = await f.locator("#win").textContent();
  if (win && win.trim() !== "0") break;
}
await page.screenshot({ path: `${S}/slot-spin-live.png` });
await browser.close();
console.log("done");
