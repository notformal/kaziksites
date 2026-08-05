// Живой прогон трёх премиум-слотов (games/slots-premium) в реальном лобби —
// по образцу scripts/qa/all-games.mjs, но с проверкой того, что делает именно
// этот клиент: движок пришёл из каталога, сетка нужного размера отрисована,
// ставка списалась сервером, а фирменные механики (подсветка линий/путей,
// каскад, фриспины) действительно появляются на экране.
//
//   node scripts/qa/premium-slots.mjs [--base http://127.0.0.1:4183] [--spins 60]
//   QA_SHOTS=<dir> — куда складывать скриншоты-доказательства.
//
// Про фриспины. Их запускают 3+ скаттера, и это редкий случайный случай:
// Монте-Карло на 200k спинов по живым матпрофилям даёт 2.19% у classic-lines,
// 1.47% у ways-243 и 2.81% у cascade-ways за спин. Прежний порог в 30 спинов
// давал шанс увидеть их 48/36/57%, то есть весь прогон был зелёным лишь в
// ~10% случаев — гейт падал на исправном коде. Поэтому фриспины переведены в
// наблюдения (видели — записали), а обязательными остались детерминированные
// механики: линии, пути, каскад и лестница множителей.
import { chromium } from "playwright";
import { BRANDS, LOCAL_PREVIEW } from "../../config/index.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((chunk) => chunk.trim().split(/\s+/)).map(([key, value]) => [key, value ?? "true"]),
);
const brand = args.brand || BRANDS[0].id;
const BASE = args.base || `http://${LOCAL_PREVIEW.host}:${LOCAL_PREVIEW.brandPorts[brand]}`;
const SHOTS = process.env.QA_SHOTS || args.shots || null;
const MAX_SPINS = Number(args.spins || 60);
const ROUND_TIMEOUT_MS = Number(args.timeout || 30000);

// Что и где ищем: cells — размер поля профиля, features — механики, которые
// ОБЯЗАНЫ появиться за прогон, optional — редкие случайные (см. шапку файла):
// их отсутствие не валит гейт, но появление фиксируется в отчёте.
const OPTIONAL_FEATURES = { freeSpins: "#freeSpins:not([hidden])" };
const ENGINES = [
  {
    slug: "classic-lines",
    cells: 15,
    features: { lines: ".overlay__path" },
  },
  {
    slug: "ways-243",
    cells: 15,
    features: { ways: ".overlay__path" },
  },
  {
    slug: "cascade-ways",
    cells: 25,
    features: { cascade: ".symbol.pop", ladder: '.ladder__step[data-active="true"]' },
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.addInitScript(() => {
  localStorage.setItem("casino_locale", "en");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});

const credentials = {
  email: `qa-premium-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
  password: "QaRunner!2026",
  displayName: "QA Premium",
};

await page.goto(BASE, { waitUntil: "domcontentloaded" });
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
  console.error("Регистрация не удалась:", JSON.stringify(registration));
  await browser.close();
  process.exit(1);
}
await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));

const readBalance = async () =>
  Number(
    (
      await page.evaluate(async () =>
        (await fetch("/api/wallet/balance", { credentials: "include" })).json(),
      )
    ).balance,
  );

const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }).catch(() => {});
};

/** Открывает карточку игры в каталоге, долистывая страницы при необходимости. */
async function openGame(slug) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor({ timeout: ROUND_TIMEOUT_MS });
  const card = page.locator(`[data-game-slug="${slug}"] .gameMain`);
  for (let i = 0; i < 14 && !(await card.count()); i++) {
    const more = page.locator("button.load");
    if (!(await more.count())) break;
    await more.click();
    await page.waitForTimeout(150);
  }
  if (!(await card.count())) throw new Error("карточка игры не найдена в каталоге");
  await card.first().click();
}

const results = [];
for (const target of ENGINES) {
  const record = { slug: target.slug, ok: false, note: "", seen: [] };
  try {
    const before = await readBalance();
    await openGame(target.slug);

    const frame = page.frameLocator(".secureGame iframe");
    await frame.locator("#spin").waitFor({ state: "visible", timeout: ROUND_TIMEOUT_MS });
    await frame.locator("#balance").waitFor({ state: "visible", timeout: ROUND_TIMEOUT_MS });

    // Движок обязан прийти из каталога отдельным параметром — бандл общий.
    const src = await page.locator(".secureGame iframe").getAttribute("src");
    if (!src.includes(`engine=${target.slug}`)) throw new Error(`в src нет engine=: ${src}`);

    const title = (await frame.locator("#title").textContent())?.trim();
    const grid = await frame.locator("#reels .symbol").count();
    if (grid !== target.cells) throw new Error(`ячеек ${grid}, ожидалось ${target.cells}`);
    const totalBet = (await frame.locator("#totalBet").textContent())?.trim();
    await shot(`${target.slug}-idle`);

    const pending = new Map(Object.entries(target.features));
    const optional = new Map(Object.entries(OPTIONAL_FEATURES));
    let after = before;
    let spins = 0;
    for (; spins < MAX_SPINS && pending.size; spins++) {
      await frame.locator("#spin:not([disabled])").waitFor({ timeout: ROUND_TIMEOUT_MS });
      await frame.locator("#spin").click();
      // Пока крутится раунд — ловим фирменные состояния и снимаем доказательства.
      const deadline = Date.now() + ROUND_TIMEOUT_MS;
      while (Date.now() < deadline) {
        for (const [name, selector] of [...pending, ...optional]) {
          if (await frame.locator(selector).count()) {
            pending.delete(name);
            optional.delete(name);
            record.seen.push(name);
            await shot(`${target.slug}-${name}`);
          }
        }
        if (await frame.locator("#spin:not([disabled])").count()) break;
        await page.waitForTimeout(90);
      }
      if (after === before) after = await readBalance();
    }
    record.missedOptional = [...optional.keys()];
    if (after === before) throw new Error("баланс не изменился — ставка не дошла до сервера");

    const painted = await frame.locator("#reels .symbol[data-symbol]").count();
    if (painted !== target.cells) throw new Error(`сетка не отрисована: ${painted}/${target.cells}`);
    const result = ((await frame.locator("#result").textContent()) || "").trim();
    if (pending.size) throw new Error(`не показаны механики за ${spins} спинов: ${[...pending.keys()].join(", ")}`);

    record.ok = true;
    const missed = record.missedOptional?.length
      ? ` · не выпало за прогон (случайное): ${record.missedOptional.join(", ")}`
      : "";
    record.note = `«${title}» · ${totalBet} · ${before} → ${after} · спинов ${spins} · механики: ${record.seen.join(", ")}${missed} · итог: ${result || "—"}`;
  } catch (error) {
    record.note = error.message;
    await shot(`${target.slug}-FAIL`);
  }
  results.push(record);
  console.log(`${record.ok ? "PASS" : "FAIL"} ${record.slug} — ${record.note}`);
}

await browser.close();
if (consoleErrors.length) {
  console.log(`\nОшибок в консоли: ${consoleErrors.length}`);
  consoleErrors.slice(0, 12).forEach((e) => console.log(`  ${e}`));
}
const failed = results.filter((r) => !r.ok);
console.log(`\nДвижков проверено: ${results.length}, успешно: ${results.length - failed.length}`);
if (failed.length || consoleErrors.length) process.exit(1);
