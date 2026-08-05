// Живой прогон mines/blackjack/roulette: регистрация, раунд, скриншоты в динамике.
import { chromium } from "playwright";
const base = "http://127.0.0.1:4183";
const S = "C:/Users/anton/AppData/Local/Temp/claude/f--Kaziksites/cc43e957-739f-4c08-ad40-05a5a6d38873/scratchpad";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1050 } })).newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[err]", m.text()); });
await page.addInitScript(() => { localStorage.setItem("casino_locale", "ru"); localStorage.setItem("casino_onboarding_v1", "done"); });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ email: `probe${Math.random().toString(16).slice(2)}@e.test`, password: "QaProbe!2026", displayName: "Probe" }) });
  sessionStorage.setItem("casino_authenticated", "1");
});
const openGame = async (slug) => {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor();
  for (let i = 0; i < 12; i++) { if (await page.locator(`[data-game-slug="${slug}"]`).count()) break; const m = page.locator("button.load"); if (!(await m.count())) break; await m.click(); await page.waitForTimeout(100); }
  await page.locator(`[data-game-slug="${slug}"] .gameMain`).first().click();
  const f = page.frameLocator(".secureGame iframe");
  await f.locator("#balance").waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
  return f;
};

// mines: старт + вскрыть 3 плитки
let f = await openGame("mines");
await f.locator("#play").click();
await page.waitForTimeout(700);
for (const n of [1, 7, 13]) { await f.locator(`#grid button:nth-child(${n})`).click().catch(()=>{}); await page.waitForTimeout(500); }
await page.screenshot({ path: `${S}/live-mines.png` });
await page.keyboard.press("Escape");

// blackjack: раздача
f = await openGame("blackjack");
await f.locator("#deal").click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${S}/live-blackjack.png` });
await page.keyboard.press("Escape");

// roulette: ставка straight — поле числа должно появиться; ставка red — скрыться
f = await openGame("roulette");
await f.locator("#choice").selectOption("straight");
await page.waitForTimeout(300);
const straightVisible = await f.locator("#straightWrap").isVisible();
await f.locator("#choice").selectOption("red");
await page.waitForTimeout(300);
const straightHidden = !(await f.locator("#straightWrap").isVisible());
console.log("roulette straight toggle: shown=", straightVisible, "hidden=", straightHidden);
await f.locator("#play").click();
await page.waitForTimeout(2200);
await page.screenshot({ path: `${S}/live-roulette.png` });

await browser.close();
console.log("done");
