// Придирчивый живой аудит трёх премиум-слотов (games/slots-premium).
// Не «подтверждаем успех», а ищем дефекты: реальные спины через лобби,
// сверка баланса с сервером, отрисовка арта в ячейках, каскад, подсветка
// выигрыша, локализация en/ru, адаптив 390×844 и ноль ошибок в консоли.
//
//   node scripts/qa/premium-slots-audit.mjs [--base http://127.0.0.1:4183] [--spins 12]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { ENGINES as ENGINE_DEFS } from "../../games/slots-premium/engines.generated.js";

/** Оракул подсветки: те же правила, что и в matchesOn() клиента. */
function expectedHits(def, grid) {
  const pays = (s, c) => Boolean(def.paytable[s]?.[c]);
  const out = [];
  if (def.mode === "ways") {
    for (const symbol of Object.keys(def.paytable)) {
      let run = 0;
      for (let col = 0; col < def.cols; col++) {
        let n = 0;
        for (let row = 0; row < def.rows; row++) {
          const id = grid[col][row];
          if (id === symbol || id === def.wild) n++;
        }
        if (!n) break;
        run++;
      }
      if (run >= 3 && pays(symbol, run)) out.push({ symbol, count: run });
    }
  } else {
    for (const [i, line] of def.paylines.entries()) {
      const ids = line.map((row, col) => grid[col][row]);
      const base = ids.find((id) => id !== def.wild && id !== def.scatter);
      if (base === undefined) continue;
      let count = 0;
      for (let col = 0; col < def.cols; col++) {
        if (ids[col] !== base && ids[col] !== def.wild) break;
        count++;
      }
      if (pays(base, count)) out.push({ line: i + 1, symbol: base, count });
    }
  }
  return out;
}

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const BASE = args.base || "http://127.0.0.1:4183";
const SHOTS = args.shots || process.env.QA_SHOTS || ".";
const SPINS = Number(args.spins || 12);
const T = Number(args.timeout || 40000);
mkdirSync(SHOTS, { recursive: true });

const ENGINES = [
  { slug: "classic-lines", title: "Royal Lines", cols: 5, rows: 3, cells: 15, betUnits: 10, cascade: false },
  { slug: "ways-243", title: "Gem Ways 243", cols: 5, rows: 3, cells: 15, betUnits: 1, cascade: false },
  { slug: "cascade-ways", title: "Tumble Peaks", cols: 5, rows: 5, cells: 25, betUnits: 1, cascade: true },
];

const problems = [];
const shotsTaken = [];
const bad = (slug, msg) => { problems.push(`[${slug}] ${msg}`); console.log(`  !! ${slug}: ${msg}`); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(`console: ${m.text()} @ ${m.location()?.url || "?"}`);
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => {
  const url = r.url();
  if (url.includes("/games/slots-premium/")) consoleErrors.push(`requestfailed: ${url} ${r.failure()?.errorText}`);
});

// Живой лог расчётов: то, что сервер реально прислал за раунд.
const settles = [];
page.on("response", async (res) => {
  if (!res.url().includes("/wallet/settle")) return;
  try {
    const body = await res.json();
    const def = ENGINE_DEFS[body.gameId];
    const grids = body.outcome?.grids || [];
    settles.push({
      status: res.status(),
      gameId: body.gameId,
      win: body.win,
      multiplier: body.multiplier,
      rawWin: body.outcome?.win,
      grids: grids.length,
      gridDims: grids[0] ? `${grids[0].length}x${grids[0][0].length}` : "?",
      scatters: body.outcome?.scatters ?? 0,
      freeSpins: body.outcome?.freeSpins ? body.outcome.freeSpins.played : 0,
      hits: def && grids[0] ? expectedHits(def, grids[0]).length : -1,
    });
  } catch { /* не JSON — игнор */ }
});

await page.addInitScript(() => {
  localStorage.setItem("casino_locale", "ru");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});

const creds = {
  email: `qa-audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
  password: "QaRunner!2026",
  displayName: "QA Audit",
};
await page.goto(BASE, { waitUntil: "domcontentloaded" });
const reg = await page.evaluate(async (body) => {
  const r = await fetch("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include", body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}, creds);
if (reg.status !== 201) { console.error("Регистрация не удалась", JSON.stringify(reg)); await browser.close(); process.exit(1); }
await page.evaluate(() => sessionStorage.setItem("casino_authenticated", "1"));
console.log(`Игрок зарегистрирован: ${creds.email}`);

const serverBalance = async () =>
  Number((await page.evaluate(async () => (await fetch("/api/wallet/balance", { credentials: "include" })).json())).balance);

const shot = async (name) => {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path }).catch(() => {});
  shotsTaken.push(path);
};

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
  if (!(await card.count())) throw new Error(`карточка ${slug} не найдена в каталоге`);
  await card.first().click();
  const frame = page.frameLocator(".secureGame iframe");
  await frame.locator("#spin").waitFor({ state: "visible", timeout: T });
  await frame.locator("#balance").waitFor({ state: "visible", timeout: T });
  return frame;
}

/* ---------------- основной прогон ---------------- */
const summary = [];
for (const eng of ENGINES) {
  console.log(`\n=== ${eng.slug} ===`);
  const rec = { slug: eng.slug, spins: 0, wins: 0, cascadeRounds: 0, freeSpinRounds: 0, highlightSeen: false, cascadeAnimSeen: false, ladderSeen: false, badgeText: "" };
  const before = await serverBalance();
  const settleMark = settles.length;
  let frame;
  try {
    frame = await openGame(eng.slug);
  } catch (e) { bad(eng.slug, e.message); continue; }

  const src = await page.locator(".secureGame iframe").getAttribute("src");
  if (!src.includes(`engine=${eng.slug}`)) bad(eng.slug, `в src iframe нет engine=${eng.slug}: ${src}`);

  const title = (await frame.locator("#title").textContent())?.trim();
  if (title !== eng.title) bad(eng.slug, `заголовок «${title}», ожидался «${eng.title}»`);

  // Сетка: количество ячеек + реальный арт в каждой (не заглушка, не пусто).
  const gridInfo = await frame.locator("#reels").evaluate((host) => {
    const cells = [...host.querySelectorAll(".symbol")];
    const reels = [...host.querySelectorAll(".reel")];
    return {
      total: cells.length,
      reels: reels.length,
      rowsPerReel: reels.map((r) => r.querySelectorAll(".symbol").length),
      withSymbolAttr: cells.filter((c) => c.dataset.symbol).length,
      withArt: cells.filter((c) => (getComputedStyle(c).backgroundImage || "").includes("data:image/svg+xml")).length,
      withText: cells.filter((c) => c.textContent.trim().length).length,
      sizes: cells.slice(0, 3).map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
    };
  });
  if (gridInfo.total !== eng.cells) bad(eng.slug, `ячеек ${gridInfo.total}, ожидалось ${eng.cells}`);
  if (gridInfo.reels !== eng.cols) bad(eng.slug, `барабанов ${gridInfo.reels}, ожидалось ${eng.cols}`);
  if (gridInfo.rowsPerReel.some((n) => n !== eng.rows)) bad(eng.slug, `рядов на барабан ${gridInfo.rowsPerReel.join(",")}, ожидалось ${eng.rows}`);
  if (gridInfo.withArt !== eng.cells) bad(eng.slug, `арт отрисован лишь в ${gridInfo.withArt}/${eng.cells} ячейках`);
  if (gridInfo.withText) bad(eng.slug, `${gridInfo.withText} ячеек содержат текст (заглушки?)`);
  if (gridInfo.sizes.some(([w, h]) => w < 20 || h < 20)) bad(eng.slug, `ячейки схлопнулись: ${JSON.stringify(gridInfo.sizes)}`);
  console.log(`  сетка ${gridInfo.reels}×${gridInfo.rowsPerReel[0]}, арт в ${gridInfo.withArt}/${gridInfo.total}, размер ${JSON.stringify(gridInfo.sizes[0])}`);

  const totalBetText = (await frame.locator("#totalBet").textContent())?.trim();
  const betOpts = await frame.locator("#bet").evaluate((s) => [...s.options].map((o) => Number(o.value)));
  const minTotal = Math.min(...betOpts) * ENGINE_DEFS[eng.slug].betUnits;
  console.log(`  ставка: ${totalBetText} · опции ${betOpts.join(",")} · минимальная общая ${minTotal}`);
  // Ниже 10 кредитов округление floor() съедает дробные выплаты и заявленный
  // в шапке RTP становится неправдой — таких ставок в списке быть не должно.
  if (minTotal < 10) bad(eng.slug, `минимальная общая ставка ${minTotal} кредитов — на ней заявленный RTP недостижим`);

  await shot(`${eng.slug}-desktop-idle`);

  for (let i = 0; i < SPINS; i++) {
    await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
    const settleBefore = settles.length;
    await frame.locator("#spin").click();
    rec.spins++;
    const deadline = Date.now() + T;
    let sawHighlight = false, sawPop = false, sawLadder = false, sawBadge = "", sawFs = false, sawChips = 0;
    while (Date.now() < deadline) {
      const state = await frame.locator("#app").evaluate((root) => ({
        win: root.querySelectorAll(".symbol.win").length,
        pop: root.querySelectorAll(".symbol.pop").length,
        overlay: root.querySelectorAll(".overlay__path").length,
        chips: root.querySelectorAll("#hits .chip").length,
        ladder: root.querySelectorAll('.ladder__step[data-active="true"]').length,
        badge: root.querySelector("#cascadeBadge:not([hidden])")?.textContent || "",
        fs: root.querySelector("#freeSpins:not([hidden])") ? 1 : 0,
        idle: root.querySelector("#spin")?.disabled === false,
      }));
      if (state.win || state.overlay) sawHighlight = true;
      if (state.chips > sawChips) sawChips = state.chips;
      if (state.pop) sawPop = true;
      if (state.ladder) sawLadder = true;
      if (state.badge) sawBadge = state.badge.trim();
      if (state.fs) sawFs = true;
      if (state.pop && !rec.cascadeAnimSeen) { rec.cascadeAnimSeen = true; await shot(`${eng.slug}-cascade-moment`); }
      if (state.win && !rec.highlightSeen) { rec.highlightSeen = true; await shot(`${eng.slug}-win-highlight`); }
      if (state.idle) break;
      await page.waitForTimeout(70);
    }
    if (sawFs) rec.freeSpinRounds++;
    const last = settles[settles.length - 1];
    const resultText = ((await frame.locator("#result").textContent()) || "").trim();
    if (settles.length > settleBefore && last) {
      if (last.win > 0) rec.wins++;
      if (last.grids > 1) rec.cascadeRounds++;
      if (last.grids > 1 && !sawPop) bad(eng.slug, `сервер прислал ${last.grids} сеток (каскад), но анимации .symbol.pop не было`);
      // Оракул: если в первой сетке есть оплачиваемая комбинация, клиент ОБЯЗАН её подсветить.
      if (last.hits > 0 && !sawHighlight)
        bad(eng.slug, `в сетке ${last.hits} оплачиваемых комбинаций, но подсветки не было`);
      if (last.hits === 0 && sawHighlight && last.grids === 1)
        bad(eng.slug, `подсветка есть, а оплачиваемых комбинаций в сетке нет`);
      // Витрина обещает выигрыш, а сервер платит ноль кредитов — противоречие для игрока.
      if (last.hits > 0 && last.win === 0)
        rec.phantom = (rec.phantom || 0) + 1;
      if (last.win > 0 && !/[0-9]/.test(resultText))
        bad(eng.slug, `сервер начислил ${last.win}, а строка итога «${resultText}»`);
      if (last.gridDims !== `${eng.cols}x${eng.rows}`) bad(eng.slug, `сервер прислал сетку ${last.gridDims}, клиент рисует ${eng.cols}x${eng.rows}`);
      rec.rounds = rec.rounds || [];
      rec.rounds.push({ win: last.win, mult: last.multiplier, rawWin: last.rawWin, hits: last.hits, grids: last.grids, fs: last.freeSpins, result: resultText, highlight: sawHighlight, chips: sawChips });
    }
    if (sawLadder) rec.ladderSeen = true;
    if (sawBadge) rec.badgeText = sawBadge;
  }

  const after = await serverBalance();
  if (after === before) bad(eng.slug, `баланс на сервере не изменился: ${before} → ${after}`);
  const mine = settles.slice(settleMark);
  if (mine.length !== rec.spins) bad(eng.slug, `спинов ${rec.spins}, ответов сервера ${mine.length}`);
  if (mine.some((s) => s.gameId !== eng.slug)) bad(eng.slug, `сервер считал другой игрой: ${[...new Set(mine.map((s) => s.gameId))].join(",")}`);
  // Выигрыш только по скаттерам линий не рисует — сверяемся с оракулом совпадений.
  if (!rec.highlightSeen && mine.some((s) => s.hits > 0)) bad(eng.slug, "ни разу не показана подсветка, хотя оплачиваемые комбинации выпадали");

  await shot(`${eng.slug}-desktop-after`);

  console.log(`  спинов ${rec.spins}, выигрышных ${rec.wins}, каскадных раундов ${rec.cascadeRounds}, фриспин-раундов ${rec.freeSpinRounds}`);
  console.log(`  подсветка: ${rec.highlightSeen}, каскад-анимация: ${rec.cascadeAnimSeen}, лестница: ${rec.ladderSeen} ${rec.badgeText}`);
  console.log(`  баланс ${before} → ${after}`);
  if (rec.phantom) console.log(`  РАУНДОВ «подсветили, но не заплатили»: ${rec.phantom}/${rec.spins}`);
  for (const r of rec.rounds || [])
    console.log(`    win=${r.win} mult=${r.mult} rawWin=${r.rawWin} hits=${r.hits} grids=${r.grids} fs=${r.fs} chips=${r.chips} hl=${r.highlight} итог=«${r.result}»`);
  summary.push({ ...rec, before, after, settles: mine });
}

/* ---------------- каскад: догоняем гарантированно ---------------- */
const cascadeRec = summary.find((s) => s.slug === "cascade-ways");
if (cascadeRec && !cascadeRec.cascadeAnimSeen) {
  console.log("\n=== догоняем каскад (до 40 доп. спинов) ===");
  const frame = await openGame("cascade-ways");
  for (let i = 0; i < 40; i++) {
    await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
    const mark = settles.length;
    await frame.locator("#spin").click();
    const deadline = Date.now() + T;
    let sawPop = false, sawLadder = false, badge = "";
    while (Date.now() < deadline) {
      const s = await frame.locator("#app").evaluate((r) => ({
        pop: r.querySelectorAll(".symbol.pop").length,
        ladder: r.querySelectorAll('.ladder__step[data-active="true"]').length,
        badge: r.querySelector("#cascadeBadge:not([hidden])")?.textContent || "",
        idle: r.querySelector("#spin")?.disabled === false,
      }));
      if (s.pop && !sawPop) { sawPop = true; await shot("cascade-ways-cascade-moment"); }
      if (s.ladder) sawLadder = true;
      if (s.badge) badge = s.badge.trim();
      if (s.idle) break;
      await page.waitForTimeout(60);
    }
    const last = settles[settles.length - 1];
    if (settles.length > mark && last?.grids > 1) {
      console.log(`  каскад: сеток ${last.grids}, pop=${sawPop}, ladder=${sawLadder}, badge=«${badge}»`);
      cascadeRec.cascadeAnimSeen = sawPop;
      cascadeRec.ladderSeen = sawLadder;
      cascadeRec.badgeText = badge;
      if (!sawPop) bad("cascade-ways", `сервер прислал ${last.grids} сеток, а анимации каскада не было`);
      if (!sawLadder) bad("cascade-ways", "ступень лестницы множителей не подсветилась во время каскада");
      if (!badge) bad("cascade-ways", "бейдж множителя ступени не показан во время каскада");
      break;
    }
  }
  if (!cascadeRec.cascadeAnimSeen) bad("cascade-ways", "за 40+ спинов ни одного каскада — механика не подтверждена");
}

/* ---------------- локализация ---------------- */
// Локаль проверяется отдельным прогоном: здесь addInitScript жёстко ставит ru
// на каждую навигацию, поэтому переключить язык в этом же контексте нельзя.
// См. scripts/qa/premium-slots-i18n.mjs (свой контекст на каждую локаль).
console.log("\n=== локализация: см. scripts/qa/premium-slots-i18n.mjs ===");

/* ---------------- невалидный движок ---------------- */
console.log("\n=== защита ?engine= ===");
for (const q of ["", "?engine=nope", "?engine=../slots-studio", "?title=classic-lines"]) {
  const probe = await context.newPage();
  const errs = [];
  probe.on("pageerror", (e) => errs.push(e.message));
  await probe.goto(`${BASE}/games/slots-premium/index.html${q}`, { waitUntil: "domcontentloaded" });
  await probe.waitForTimeout(400);
  const state = await probe.evaluate(() => ({
    appHidden: document.getElementById("app").hidden,
    error: document.getElementById("error").hidden ? null : document.getElementById("error").textContent.trim(),
    reels: document.querySelectorAll("#reels .symbol").length,
  }));
  console.log(`  «${q || "(без параметров)"}» → app скрыт: ${state.appHidden}, ошибка: ${state.error ? "есть" : "нет"}, ячеек ${state.reels}`);
  if (q === "?title=classic-lines") {
    if (state.reels !== 15) bad("engine", `?title= как синоним не сработал: ячеек ${state.reels}`);
  } else if (!state.appHidden || !state.error) {
    bad("engine", `невалидный «${q}» не показал экран ошибки (app скрыт: ${state.appHidden})`);
  }
  await probe.close();
}

/* ---------------- адаптив 390×844 ---------------- */
console.log("\n=== адаптив 390×844 ===");
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
mpage.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`mobile console: ${m.text()}`); });
mpage.on("pageerror", (e) => consoleErrors.push(`mobile pageerror: ${e.message}`));
await mpage.addInitScript(() => {
  localStorage.setItem("casino_locale", "ru");
  localStorage.setItem("casino_onboarding_v1", "done");
  localStorage.setItem("casino_analytics_consent", "denied");
});
await mpage.goto(BASE, { waitUntil: "domcontentloaded" });
await mpage.evaluate(async (body) => {
  await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include", body: JSON.stringify({ email: body.email, password: body.password }),
  });
  sessionStorage.setItem("casino_authenticated", "1");
}, creds);

for (const eng of ENGINES) {
  await mpage.goto(BASE, { waitUntil: "domcontentloaded" });
  await mpage.locator(".grid .game").first().waitFor({ timeout: T });
  const card = mpage.locator(`[data-game-slug="${eng.slug}"] .gameMain`);
  for (let i = 0; i < 16 && !(await card.count()); i++) {
    const more = mpage.locator("button.load");
    if (!(await more.count())) break;
    await more.click();
    await mpage.waitForTimeout(140);
  }
  if (!(await card.count())) { bad(eng.slug, "мобильный: карточка не найдена"); continue; }
  await card.first().click();
  const frame = mpage.frameLocator(".secureGame iframe");
  await frame.locator("#spin").waitFor({ state: "visible", timeout: T });
  await mpage.waitForTimeout(500);

  const outer = await mpage.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  const inner = await frame.locator("#app").evaluate(() => {
    const d = document.documentElement;
    const spin = document.getElementById("spin");
    const rect = spin.getBoundingClientRect();
    const cell = document.querySelector(".symbol")?.getBoundingClientRect();
    const machine = document.getElementById("machine")?.getBoundingClientRect();
    const wide = [...document.querySelectorAll("body *")]
      .filter((n) => n.getBoundingClientRect().right > d.clientWidth + 2)
      .map((n) => `${n.tagName}.${n.className}`);
    return {
      scroll: d.scrollWidth, client: d.clientWidth,
      spin: { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top), visible: rect.width > 0 && rect.height > 0, inView: rect.bottom <= innerHeight && rect.top >= 0 },
      cell: cell ? [Math.round(cell.width), Math.round(cell.height)] : null,
      machine: machine ? [Math.round(machine.width), Math.round(machine.height)] : null,
      overflowing: [...new Set(wide)].slice(0, 6),
      docHeight: d.scrollHeight,
      innerHeight,
    };
  });
  const outerOverflow = outer.scroll - outer.client;
  const innerOverflow = inner.scroll - inner.client;
  if (outerOverflow > 2) bad(eng.slug, `мобильный: горизонтальное переполнение лобби ${outerOverflow}px`);
  if (innerOverflow > 2) bad(eng.slug, `мобильный: горизонтальное переполнение игры ${innerOverflow}px (${inner.overflowing.join(", ")})`);
  if (!inner.spin.visible) bad(eng.slug, "мобильный: кнопка спина не отрисована");
  if (inner.spin.h < 36) bad(eng.slug, `мобильный: кнопка спина ${inner.spin.h}px по высоте — меньше тач-минимума`);
  if (inner.cell && (inner.cell[0] < 24 || inner.cell[1] < 24)) bad(eng.slug, `мобильный: ячейка ${inner.cell.join("×")} — сетка нечитаема`);
  console.log(`  ${eng.slug}: лобби ${outer.scroll}/${outer.client}, игра ${inner.scroll}/${inner.client}, ячейка ${inner.cell?.join("×")}, машина ${inner.machine?.join("×")}, кнопка ${inner.spin.w}×${inner.spin.h}`);
  await mpage.screenshot({ path: `${SHOTS}/${eng.slug}-mobile.png`, fullPage: false }).catch(() => {});
  shotsTaken.push(`${SHOTS}/${eng.slug}-mobile.png`);

  // Кнопка должна не только рисоваться, но и запускать раунд с телефона.
  await frame.locator("#spin:not([disabled])").waitFor({ timeout: T });
  const mb = await mpage.evaluate(async () => Number((await (await fetch("/api/wallet/balance", { credentials: "include" })).json()).balance));
  await frame.locator("#spin").click();
  const dl = Date.now() + T;
  let idle = false;
  while (Date.now() < dl) {
    idle = await frame.locator("#spin").evaluate((b) => b.disabled === false);
    if (idle) break;
    await mpage.waitForTimeout(120);
  }
  const ma = await mpage.evaluate(async () => Number((await (await fetch("/api/wallet/balance", { credentials: "include" })).json()).balance));
  if (ma === mb) bad(eng.slug, "мобильный: спин не изменил баланс на сервере");
  else console.log(`    мобильный спин: ${mb} → ${ma}`);
}
await mobile.close();

await browser.close();

console.log("\n================ ИТОГ ================");
for (const s of summary) {
  console.log(`${s.slug}: спинов ${s.spins}, выигрышей ${s.wins}, каскадов ${s.cascadeRounds}, фриспин-панелей ${s.freeSpinRounds}, подсветка ${s.highlightSeen}, баланс ${s.before}→${s.after}`);
}
console.log(`\nОшибок консоли/страницы: ${consoleErrors.length}`);
consoleErrors.slice(0, 20).forEach((e) => console.log(`  ${e}`));
console.log(`\nДефектов: ${problems.length}`);
problems.forEach((p) => console.log(`  ${p}`));
console.log(`\nСкриншотов: ${shotsTaken.length}`);
process.exit(problems.length || consoleErrors.length ? 1 : 0);
