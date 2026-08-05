// Глубокая проверка премиум-слотов на КРУПНОЙ ставке: там, где округление до
// целого кредита не съедает выплату, витрина обязана сходиться с сервером —
// счётчик выигрыша, строка итога, отметки в таблице выплат, панель фриспинов,
// баланс в HUD. Плюс поведение оверлея при ресайзе.
//
//   node scripts/qa/premium-slots-deep.mjs [--base ...] [--spins 24]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const BASE = args.base || "http://127.0.0.1:4183";
const SHOTS = args.shots || process.env.QA_SHOTS || ".";
const SPINS = Number(args.spins || 24);
const T = 60000;
mkdirSync(SHOTS, { recursive: true });

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
  try {
    const b = await res.json();
    settles.push({ gameId: b.gameId, win: b.win, multiplier: b.multiplier, balance: b.balance, outcome: b.outcome });
  } catch { /* ignore */ }
});

await page.addInitScript(() => {
  localStorage.setItem("casino_locale", "en");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});
const creds = {
  email: `qa-deep-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
  password: "QaRunner!2026", displayName: "QA Deep",
};
await page.goto(BASE, { waitUntil: "domcontentloaded" });
const reg = await page.evaluate(async (b) => (await fetch("/api/auth/register", {
  method: "POST", headers: { "Content-Type": "application/json" },
  credentials: "include", body: JSON.stringify(b),
})).status, creds);
if (reg !== 201) { console.error("Регистрация не удалась", reg); await browser.close(); process.exit(1); }
await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));

async function openGame(slug) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor({ timeout: T });
  const card = page.locator(`[data-game-slug="${slug}"] .gameMain`);
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
  return frame;
}

for (const slug of ["classic-lines", "ways-243", "cascade-ways"]) {
  console.log(`\n=== ${slug} (крупная ставка) ===`);
  const frame = await openGame(slug);
  // Самая крупная ставка, которая не разорит стартовый баланс за прогон.
  const opts = await frame.locator("#bet").evaluate((s) => [...s.options].map((o) => Number(o.value)));
  const target = slug === "classic-lines" ? 10 : 100;
  await frame.locator("#bet").selectOption(String(opts.includes(target) ? target : opts.at(-1)));
  await page.waitForTimeout(120);
  const totalBetText = (await frame.locator("#totalBet").textContent()).trim();
  console.log(`  опции ставки: ${opts.join(",")} · выбрано: ${totalBetText}`);

  let paidRounds = 0, fsSeen = false;
  for (let i = 0; i < SPINS; i++) {
    const mark = settles.length;
    await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
    await frame.locator("#spin").click();
    let fsPanel = null;
    const dl = Date.now() + T;
    while (Date.now() < dl) {
      const s = await frame.locator("#app").evaluate((r) => {
        const fs = r.querySelector("#freeSpins:not([hidden])");
        return {
          idle: r.querySelector("#spin")?.disabled === false,
          fs: fs ? {
            title: r.querySelector("#freeSpinsTitle").textContent.trim(),
            round: r.querySelector("#freeSpinsRound").textContent.trim(),
            chips: [...r.querySelectorAll(".fsChip")].map((c) => c.textContent.trim()),
            total: r.querySelector("#freeSpinsTotal").textContent.trim(),
          } : null,
        };
      });
      if (s.fs) fsPanel = s.fs;
      if (s.idle) break;
      await page.waitForTimeout(60);
    }
    if (settles.length === mark) { bad(`${slug}: спин ${i + 1} не дал ответа сервера`); continue; }
    await page.waitForTimeout(1300); // роллап счётчика ~900 мс — читаем УСТОЯВШИЕСЯ значения
    const last = settles.at(-1);
    const view = await frame.locator("#app").evaluate((r) => ({
      win: r.querySelector("#win").textContent.trim(),
      balance: r.querySelector("#balance").textContent.trim(),
      result: r.querySelector("#result").textContent.trim(),
      hitRows: [...r.querySelectorAll('.paytable__row[data-hit="true"]')].map((n) => n.dataset.symbol),
      winCells: r.querySelectorAll(".symbol.win").length,
      chips: [...r.querySelectorAll("#hits .chip")].map((c) => c.textContent.trim()),
    }));
    if (last.win > 0) {
      paidRounds++;
      const digits = (s) => String(s).replace(/[^0-9]/g, "");
      if (Number(digits(view.win)) !== last.win) bad(`${slug}: HUD «Win» показывает «${view.win}», сервер начислил ${last.win}`);
      if (!digits(view.result).includes(String(last.win))) bad(`${slug}: строка итога «${view.result}» без суммы ${last.win}`);
      console.log(`  win=${last.win} mult=${last.multiplier} HUD=«${view.win}» итог=«${view.result}» подсвечено ячеек ${view.winCells} чипы=[${view.chips.join(" | ")}] payHit=[${view.hitRows.join(",")}]`);
    }
    const hudBalance = Number(view.balance.replace(/[^0-9]/g, ""));
    if (Number.isFinite(hudBalance) && Math.abs(hudBalance - last.balance) > 0) {
      bad(`${slug}: баланс в HUD ${hudBalance} ≠ баланс сервера ${last.balance}`);
    }
    if (fsPanel && !fsSeen) {
      fsSeen = true;
      const fs = last.outcome?.freeSpins;
      console.log(`  ФРИСПИНЫ: «${fsPanel.title}» / «${fsPanel.round}» / total «${fsPanel.total}» / чипов ${fsPanel.chips.length} (сервер: played=${fs?.played}, win=${fs?.win?.toFixed?.(4)})`);
      if (fs && fsPanel.chips.length !== fs.played) bad(`${slug}: фишек фриспинов ${fsPanel.chips.length}, сервер отыграл ${fs.played}`);
      if (fs && !fsPanel.title.includes(String(fs.played))) bad(`${slug}: заголовок фриспинов «${fsPanel.title}» без количества ${fs.played}`);
      await page.screenshot({ path: `${SHOTS}/${slug}-freespins.png` }).catch(() => {});
    }
    if (paidRounds >= 3 && fsSeen) break;
  }
  if (!paidRounds) console.log(`  (за ${SPINS} спинов оплаченных раундов не выпало)`);

  // Оверлей после ресайза: линии обязаны либо перерисоваться, либо исчезнуть
  // вместе с подсветкой — «подсветка без линии» это визуальный рассинхрон.
  const before = await frame.locator("#app").evaluate((r) => ({
    paths: r.querySelectorAll(".overlay__path").length,
    win: r.querySelectorAll(".symbol.win").length,
  }));
  if (before.paths) {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.waitForTimeout(400);
    const after = await frame.locator("#app").evaluate((r) => ({
      paths: r.querySelectorAll(".overlay__path").length,
      win: r.querySelectorAll(".symbol.win").length,
    }));
    console.log(`  ресайз: линий ${before.paths}→${after.paths}, подсвеченных ячеек ${before.win}→${after.win}`);
    if (after.paths === 0 && after.win > 0) bad(`${slug}: после ресайза линии выигрыша пропали, а подсветка ячеек осталась (${after.win})`);
    if (after.paths !== before.paths) bad(`${slug}: после ресайза линий ${after.paths} вместо ${before.paths}`);
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
}

await browser.close();
console.log(`\nОшибок консоли: ${consoleErrors.length}`);
consoleErrors.slice(0, 10).forEach((e) => console.log(`  ${e}`));
console.log(`Дефектов: ${problems.length}`);
problems.forEach((p) => console.log(`  ${p}`));
process.exit(problems.length ? 1 : 0);
