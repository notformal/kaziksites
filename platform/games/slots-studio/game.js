import { ArcadeBridge } from "./sdk.js";
const $ = (id) => document.getElementById(id),
  params = new URLSearchParams(location.search);
const titleId = params.get("title");
const idOk = (id) =>
  /^slot-original-(?:00[1-9]|0[1-9]\d|1[01]\d|12[0-7])$/.test(id || "");
let manifest,
  sdk,
  busy = false,
  bonusState = null,
  cells = [];
function fail(message) {
  $("app").hidden = true;
  $("error").hidden = false;
  $("error").textContent = message;
  throw new Error(message);
}
function valid(m) {
  return (
    m &&
    m.schemaVersion === 1 &&
    m.id === titleId &&
    typeof m.title === "string" &&
    m.reels === 5 &&
    m.rows === 3 &&
    m.lines > 0 &&
    ["low", "medium", "high"].includes(m.volatility) &&
    Array.isArray(m.symbols) &&
    m.symbols.length >= 6 &&
    Array.isArray(m.betOptions) &&
    m.betOptions.every(Number.isSafeInteger) &&
    m.mathProfile?.version
  );
}
function pick() {
  const weights = manifest.mathProfile.weights,
    total = manifest.symbols.reduce((n, s) => n + (weights[s.id] || 1), 0);
  let point = Math.random() * total;
  return (
    manifest.symbols.find((s) => (point -= weights[s.id] || 1) <= 0) ||
    manifest.symbols.at(-1)
  );
}
function paintCell(node, symbol) {
  node.dataset.symbol = symbol.id;
  node.textContent = symbol.label;
  node.style.setProperty("--symbol", symbol.color);
}
function randomize() {
  cells.forEach((cell) => paintCell(cell, pick()));
}
function reveal(outcome) {
  cells.forEach((c) => c.classList.remove("win"));
  if (!outcome?.grid || outcome.grid.length !== 15) {
    randomize();
    return;
  }
  outcome.grid.forEach((id, index) => {
    const symbol = manifest.symbols.find((item) => item.id === id);
    if (symbol) paintCell(cells[index], symbol);
  });
  const paylines = [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]];
  for (const win of outcome.winningLines || []) {
    (paylines[win.line - 1] || []).slice(0, win.count).forEach((row, col) =>
      cells[col * 3 + row]?.classList.add("win"),
    );
  }
}
function applyManifest() {
  document.title = manifest.title;
  $("title").textContent = manifest.title;
  for (const [name, value] of Object.entries(manifest.theme))
    document.documentElement.style.setProperty(
      `--${name === "background" ? "bg" : name}`,
      value,
    );
  $("volatility").textContent =
    `VOLATILITY · ${manifest.volatility.toUpperCase()}`;
  const bonus = manifest.mathProfile.bonus;
  $("bonus").textContent =
    `BONUS AWARD ${bonus.type.replace("-", " ").toUpperCase()} · ${bonus.triggerCount}× ${bonus.triggerSymbol}`;
  $("math").textContent =
    `MATH ${manifest.mathProfile.version} · ${manifest.lines} LINES`;
  $("bet").replaceChildren(
    ...manifest.betOptions.map((value) =>
      Object.assign(document.createElement("option"), {
        value,
        textContent: `${value} CREDITS`,
      }),
    ),
  );
  const reels = $("reels");
  for (let col = 0; col < manifest.reels; col++) {
    const reel = document.createElement("div");
    reel.className = "reel";
    for (let row = 0; row < manifest.rows; row++) {
      const cell = document.createElement("div");
      cell.className = "symbol";
      cell.setAttribute("aria-hidden", "true");
      cells.push(cell);
      reel.append(cell);
    }
    reels.append(reel);
  }
  $("paytable").replaceChildren(
    ...manifest.symbols.map((symbol) => {
      const row = document.createElement("div"),
        name = document.createElement("span"),
        value = document.createElement("b");
      row.className = "payrow";
      name.textContent = `${symbol.label} ${symbol.id}`;
      value.textContent = (manifest.paytable[symbol.id] || [])
        .slice(2)
        .join(" / ");
      row.append(name, value);
      return row;
    }),
  );
  randomize();
}
async function spin() {
  if (busy) return;
  const activeBonus = bonusState?.status === "active" && bonusState.remaining > 0;
  const amount = Number($("bet").value);
  if (!Number.isSafeInteger(amount) || amount < 1) return;
  busy = true;
  $("spin").disabled = true;
  $("status").textContent = "Ставка подтверждается сервером…";
  $("reels").classList.add("spinning");
  const roundId = `${titleId}_${crypto.randomUUID().replaceAll("-", "")}`;
  const approved = activeBonus ? { type: "BET_APPROVED" } : await sdk.bet(amount, roundId);
  if (approved?.type !== "BET_APPROVED") {
    $("reels").classList.remove("spinning");
    $("status").textContent =
      approved?.payload?.reason === "insufficient_funds"
        ? "Недостаточно кредитов"
        : "Ставка отклонена";
    busy = false;
    $("spin").disabled = false;
    return;
  }
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      randomize();
      now - start < 950 ? requestAnimationFrame(tick) : resolve();
    };
    requestAnimationFrame(tick);
  });
  $("status").textContent = "Сервер рассчитывает результат…";
  const settled = activeBonus
    ? await sdk.bonusSpin(bonusState.sessionId, roundId)
    : await sdk.settle(roundId);
  $("reels").classList.remove("spinning");
  if (["ROUND_SETTLED", "BONUS_SETTLED"].includes(settled?.type)) {
    const p = settled.payload;
    bonusState = p.bonusState || null;
    reveal(p.outcome);
    const result = p.win
      ? `Выигрыш ${Number(p.win).toLocaleString()} CREDITS · ${Number(p.multiplier).toFixed(2)}×`
      : "Раунд завершён без выигрыша";
    $("status").textContent = p.outcome?.bonus
      ? `${p.outcome.bonus.type.replace("-", " ").toUpperCase()} BONUS · ${result}`
      : result;
  } else $("status").textContent = "Не удалось рассчитать раунд";
  busy = false;
  $("spin").disabled = false;
  $("bet").disabled = bonusState?.status === "active";
  $("spin").textContent = bonusState?.status === "active"
    ? `${bonusState.type === "respin" ? "RESPIN" : "FREE SPIN"} (${bonusState.remaining})`
    : "SPIN";
}
async function boot() {
  if (!idOk(titleId)) fail("Неизвестный или некорректный идентификатор игры.");
  const response = await fetch(`./titles/${encodeURIComponent(titleId)}.json`, {
    cache: "no-store",
  });
  if (!response.ok) fail("Игра не найдена.");
  manifest = await response.json();
  if (!valid(manifest)) fail("Манифест игры повреждён.");
  applyManifest();
  sdk = new ArcadeBridge(titleId);
  addEventListener("arcade:balance", (event) => {
    $("balance").textContent = Number(event.detail.balance).toLocaleString();
    if (event.detail.bonusState) {
      bonusState = event.detail.bonusState;
      $("bet").disabled = true;
      $("spin").textContent = `${bonusState.type === "respin" ? "RESPIN" : "FREE SPIN"} (${bonusState.remaining})`;
    }
    $("spin").disabled = busy;
    $("status").textContent = busy ? $("status").textContent : "Готово к игре";
  });
  $("spin").onclick = spin;
  $("app").setAttribute("aria-busy", "false");
  sdk.start();
}
boot().catch((error) => {
  if (!$("error").hidden) return;
  fail(`Ошибка загрузки: ${error.message}`);
});
