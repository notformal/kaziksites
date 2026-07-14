import { chromium, request } from "playwright";
import fs from "node:fs/promises";

const base = process.env.AURORA_URL || "http://127.0.0.1:8190";
const gamesOrigin = process.env.GAMES_URL || "http://127.0.0.1:8181";
const report = { brand: "aurora", base, startedAt: new Date().toISOString(), checks: [], errors: [] };
const check = (name, ok, detail = "") => {
  report.checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${detail}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("console", m => { if (m.type() === "error") report.errors.push(`console: ${m.text()}`); });
page.on("pageerror", e => report.errors.push(`pageerror: ${e.message}`));
page.on("requestfailed", r => {
  const why = r.failure()?.errorText || "";
  if (!why.includes("ERR_ABORTED")) report.errors.push(`requestfailed: ${r.url()} ${why}`);
});

async function dismissFirstVisit() {
  for (const label of ["NEXT", "NEXT", "START EXPLORING"])
    if (await page.getByRole("button", { name: label, exact: true }).count()) await page.getByRole("button", { name: label, exact: true }).click();
  if (await page.getByRole("button", { name: "ALLOW", exact: true }).count()) await page.getByRole("button", { name: "ALLOW", exact: true }).click();
}

await page.goto(base, { waitUntil: "networkidle" });
await dismissFirstVisit();
check("fixed Aurora identity", await page.getByText("Aurora Play", { exact: true }).count() >= 1, await page.title());
await page.goto(`${base}/?brand=ember`, { waitUntil: "networkidle" });
check("autonomous brand ignores query override", await page.getByText("Aurora Play", { exact: true }).count() >= 1, await page.title());
check("analytics consent persisted", await page.evaluate(() => localStorage.getItem("arcade_consent")) === "yes");

while (await page.getByRole("button", { name: "LOAD MORE", exact: true }).count()) await page.getByRole("button", { name: "LOAD MORE", exact: true }).click();
const cards = page.getByRole("button", { name: /^Play / });
check("200 catalog cards", await cards.count() === 200, `rendered=${await cards.count()}`);
const names = await cards.evaluateAll(xs => xs.map(x => x.getAttribute("aria-label")));
const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
check("unique accessible game names", new Set(names).size === 200, `unique=${new Set(names).size}; duplicates=${duplicateNames.join(",")}`);

const api = await request.newContext();
const urls = await cards.evaluateAll(xs => xs.map(x => x.getAttribute("aria-label")?.slice(5)));
check("all cards have titles", urls.every(Boolean), `titles=${urls.length}`);
const littleJs = JSON.parse(await fs.readFile(new URL("../apps/lobby/src/littlejs.generated.json", import.meta.url), "utf8"));
const catalogText = await fs.readFile(new URL("../apps/lobby/src/catalog.js", import.meta.url), "utf8");
const paths = [...new Set([
  ...littleJs.map(g => g.url),
  ...[...catalogText.matchAll(/url:\s*["'`]([^"'`]+)["'`]/g)].map(m => m[1]),
])];
let reachable = 0;
for (const path of paths) {
  const response = await api.get(new URL(path, gamesOrigin).href);
  if (response.ok()) reachable++;
}
check("all self-hosted URL entries reachable", reachable === paths.length, `${reachable}/${paths.length}`);

await page.getByLabel("Search games").fill("European Roulette");
check("search exact result", await cards.count() === 1, `results=${await cards.count()}`);
await page.getByLabel("Search games").fill("");
await page.getByRole("button", { name: "Table", exact: true }).click();
check("category filtering", (await cards.count()) > 0 && (await cards.count()) < 200, `table=${await cards.count()}`);
await page.getByRole("button", { name: "All", exact: true }).click();

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
await page.getByRole("button", { name: "JOIN FREE", exact: true }).click();
await page.getByLabel("Display name").fill("Aurora Full QA");
await page.getByLabel("Email").fill(`aurora-${suffix}@example.invalid`);
await page.getByLabel("Password").fill(`Aurora-${suffix}-Strong!`);
await page.getByRole("button", { name: "CREATE ACCOUNT", exact: true }).click();
await page.getByText("DEMO CREDITS", { exact: true }).waitFor();
check("registration + starting balance", (await page.locator(".balance b").textContent()) === "5000", await page.locator(".balance b").textContent());
await page.getByRole("button", { name: /COLLECT DAILY 250/ }).click();
check("daily reward", await page.getByRole("button", { name: /DAILY REWARD COLLECTED/ }).isDisabled());
await page.getByRole("button", { name: "Close", exact: true }).click();

const firstHeart = page.getByRole("button", { name: /^Add .* to favorites$/ }).first();
const favoritedTitle = (await firstHeart.getAttribute("aria-label")).replace(/^Add /, "").replace(/ to favorites$/, "");
await firstHeart.click();
await page.getByRole("button", { name: "Favorites", exact: true }).click();
check("favorite persistence/filter", await page.getByRole("button", { name: `Play ${favoritedTitle}` }).count() === 1, favoritedTitle);
await page.getByRole("button", { name: "All", exact: true }).click();

for (const title of ["Nova Classic Slots", "Skyline Crash", "Prism Plinko", "European Roulette", "Keno Plus"]) {
  await page.getByLabel("Search games").fill(title);
  await page.getByRole("button", { name: `Play ${title}`, exact: true }).click();
  const frame = page.locator("iframe");
  await frame.waitFor({ state: "visible" });
  const handle = await frame.elementHandle();
  let child;
  for (let attempt = 0; attempt < 20 && !child; attempt++) {
    const candidate = await handle.contentFrame();
    if (candidate?.url().startsWith(gamesOrigin)) child = candidate;
    else await page.waitForTimeout(250);
  }
  check(`${title} iframe origin`, Boolean(child), `${await frame.getAttribute("src")} | frames=${page.frames().map(f => f.url()).join(",")}`);
  if (title === "Keno Plus") await child.locator("#grid button").first().click();
  const playButton = child?.locator("button#play, button#spin").first();
  await playButton.waitFor({ state: "visible" });
  await playButton.evaluate(button => new Promise((resolve, reject) => {
    if (!button.disabled) return resolve();
    const observer = new MutationObserver(() => { if (!button.disabled) { observer.disconnect(); resolve(); } });
    observer.observe(button, { attributes: true, attributeFilter: ["disabled"] });
    setTimeout(() => { observer.disconnect(); reject(new Error("control remained disabled")); }, 5000);
  }));
  check(`${title} controls enabled`, await playButton.isEnabled(), child?.url());
  await playButton.click();
  await page.waitForTimeout(title.includes("Crash") ? 800 : 1800);
  if (title.includes("Crash")) {
    const cashout = child.locator("#cashout");
    if (await cashout.isEnabled()) await cashout.click();
  }
  await page.waitForTimeout(500);
  await page.locator(".demoHead > button").last().click();
  await page.getByLabel("Search games").fill("");
}

await page.getByRole("button", { name: "Recent", exact: true }).click();
check("recently played populated", await cards.count() >= 5, `recent=${await cards.count()}`);
await page.getByRole("button", { name: "All", exact: true }).click();

await page.getByRole("button", { name: "Help", exact: true }).click();
check("help/fairness dialog", await page.getByRole("heading", { name: "Straight answers" }).isVisible());
await page.getByLabel("Session reminder interval").selectOption("15");
check("reminder setting persisted", await page.evaluate(() => localStorage.getItem("arcade_session_reminder_minutes")) === "15");
await page.getByRole("button", { name: "Close help" }).click();
check("social proof periods", await page.getByRole("button", { name: "Today" }).count() === 1 && await page.getByRole("button", { name: "7 days" }).count() === 1);

await page.getByRole("button", { name: "PROFILE", exact: true }).click();
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForTimeout(500);
check("logout switches to login", await page.getByRole("heading", { name: "Sign in" }).isVisible(), (await page.locator(".accountCard").textContent())?.slice(0, 300));
await page.getByRole("button", { name: "Close", exact: true }).click();

const a11y = await page.evaluate(() => ({
  duplicateIds: [...document.querySelectorAll("[id]")].map(x => x.id).filter((id, i, a) => a.indexOf(id) !== i),
  imagesMissingAlt: document.querySelectorAll("img:not([alt])").length,
  buttonsMissingName: [...document.querySelectorAll("button")].filter(b => !(b.innerText.trim() || b.getAttribute("aria-label"))).length,
}));
check("accessibility basics", !a11y.duplicateIds.length && !a11y.imagesMissingAlt && !a11y.buttonsMissingName, JSON.stringify(a11y));

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
check("mobile no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 2);
await page.getByRole("button", { name: "Open navigation" }).click();
check("mobile navigation", await page.locator(".mobileNav").isVisible());
check("mobile bottom navigation", await page.locator(".bottomNav").isVisible());

check("zero browser runtime errors", report.errors.length === 0, report.errors.slice(0, 10).join("\n"));
report.finishedAt = new Date().toISOString();
report.passed = true;
await fs.mkdir(new URL("../output/playwright/", import.meta.url), { recursive: true });
await fs.writeFile(new URL("../output/playwright/aurora-full-report.json", import.meta.url), JSON.stringify(report, null, 2));
await api.dispose();
await browser.close();
console.log(`Aurora full QA PASS: ${report.checks.length} assertions, ${paths.length} self-hosted URLs, zero runtime errors.`);
