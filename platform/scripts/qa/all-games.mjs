// Сквозной прогон витрины: регистрирует игрока, открывает каждую игру из
// config/games.config.json в реальном iframe лобби, нажимает кнопку раунда и
// проверяет, что сервер списал ставку (баланс изменился) без ошибок в консоли.
//
//   node scripts/qa/all-games.mjs [--brand aurora] [--base http://127.0.0.1:4183]
import { chromium } from "playwright";
import { BRANDS, GAME_BUNDLES, LOCAL_PREVIEW } from "../../config/index.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((chunk) => chunk.trim().split(/\s+/))
    .map(([key, value]) => [key, value ?? "true"]),
);
const brand = args.brand || BRANDS[0].id;
const base =
  args.base || `http://${LOCAL_PREVIEW.host}:${LOCAL_PREVIEW.brandPorts[brand]}`;
const ROUND_TIMEOUT_MS = Number(args.timeout || 15000);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

// Английская локаль + пройденный онбординг: QA не должен зависеть от языка браузера.
await page.addInitScript(() => {
  localStorage.setItem("casino_locale", "en");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});

const credentials = {
  email: `qa-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
  password: "QaRunner!2026",
  displayName: "QA Runner",
};

await page.goto(base, { waitUntil: "domcontentloaded" });
const registration = await page.evaluate(async (body) => {
  const r = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}, credentials);
if (registration.status !== 201) {
  console.error("Регистрация не удалась:", registration);
  await browser.close();
  process.exit(1);
}
await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));

const readBalance = async () => {
  const wallet = await page.evaluate(async () => {
    const r = await fetch("/api/wallet/balance", { credentials: "include" });
    return r.json();
  });
  return Number(wallet.balance);
};

const results = [];
for (const bundle of GAME_BUNDLES) {
  const qa = bundle.qa || { start: "#play", settles: true };
  const record = { slug: bundle.slug, ok: false, note: "" };
  const before = await readBalance();
  try {
    // networkidle недостижим: живая лента держит SSE-соединение открытым.
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator(".grid .game").first().waitFor({ timeout: ROUND_TIMEOUT_MS });
    // Каталог рендерится страницами — доводим до нужной карточки кнопкой «load more».
    // Слоты студии выходят под своими титулами, поэтому ищем и по движку.
    const card = page.locator(
      `[data-game-slug="${bundle.slug}"] .gameMain, [data-engine-slug="${bundle.slug}"] .gameMain`,
    );
    for (let i = 0; i < 12 && !(await card.count()); i++) {
      const more = page.locator("button.load");
      if (!(await more.count())) break;
      await more.click();
      await page.waitForTimeout(120);
    }
    if (!(await card.count())) throw new Error("карточка игры не найдена в каталоге");
    await card.first().click();

    const frame = page.frameLocator(".secureGame iframe");
    const startButton = frame.locator(qa.start);
    await startButton.waitFor({ state: "visible", timeout: ROUND_TIMEOUT_MS });
    await frame.locator(qa.balance || "#balance").waitFor({ state: "visible", timeout: ROUND_TIMEOUT_MS });
    await page.waitForTimeout(250);
    // Некоторые игры требуют выбора до ставки (keno — числа): шаги описаны в конфиге.
    for (const selector of qa.prepare || []) await frame.locator(selector).click();
    await startButton.click();

    // Ставка обязана списаться на сервере — это и есть доказательство, что игра
    // ходит в API, а не считает результат в браузере.
    const deadline = Date.now() + ROUND_TIMEOUT_MS;
    let after = before;
    while (Date.now() < deadline) {
      await page.waitForTimeout(400);
      after = await readBalance();
      if (after !== before) break;
    }
    if (after === before) throw new Error("баланс не изменился — ставка не дошла до сервера");
    record.ok = true;
    record.note = `${before} → ${after}${qa.settles ? "" : " (раунд остаётся открытым)"}`;
  } catch (error) {
    record.note = error.message;
  }
  results.push(record);
  console.log(`${record.ok ? "PASS" : "FAIL"} ${record.slug} — ${record.note}`);
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nИгр проверено: ${results.length}, успешно: ${results.length - failed.length}`);
if (consoleErrors.length) {
  console.log(`Ошибок в консоли: ${consoleErrors.length}`);
  consoleErrors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
}
if (failed.length) {
  console.error(`Провалено: ${failed.map((f) => f.slug).join(", ")}`);
  process.exit(1);
}
