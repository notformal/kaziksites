import { CasinoBridge } from "./sdk.js";
import { createGameI18n } from "./i18n.js";
import { celebrate } from "./ui-fx.js";
import { initAudio, audio } from "./ui-audio.js";
import { renderSymbol } from "./ui-symbols.js";

// Настройки движка слотов — все «ощущения» правятся здесь, а не по коду:
// длительность вращения, темп остановки барабанов, порог крупного выигрыша.
const CONFIG = {
  spinMs: 950, // фаза вращения барабанов до запроса результата у сервера
  reelStopGapMs: 110, // пауза между остановками соседних барабанов
  bigWinMultiplier: 10, // множитель, с которого включаются bigWin-звук и дождь монет
  betStepOptions: 1, // шаг степпера по списку ставок манифеста (в позициях)
};

// Строки именно этого движка (общие ключи — в i18n.js). Английский — источник
// правды; в ru/uk кириллица записана \u-эскейпами: сборочная проверка запрещает
// кириллицу вне комментариев, читаемый текст — в комментарии справа.
const GAME_STRINGS = {
  en: {
    sound: "Sound",
    tagline: "Originals · provably fair",
    loading: "Loading…",
    connecting: "Connecting to the platform…",
    ready: "Ready to play",
    betPending: "Confirming bet with the server…",
    settling: "Server is settling the result…",
    volatilityLabel: "Volatility",
    volLow: "Low",
    volMedium: "Medium",
    volHigh: "High",
    bonusAward: "Bonus",
    bonusFreeSpins: "Free spins",
    bonusRespin: "Respin",
    freeSpinBtn: "Free spin ({count})",
    respinBtn: "Respin ({count})",
    mathLabel: "Math",
    linesCount: "{count} lines",
    reelsLabel: "Slot reels",
    errUnknownTitle: "Unknown or invalid game id.",
    errNotFound: "Game not found.",
    errBadManifest: "Game manifest is corrupted.",
    errLoad: "Loading error: {message}",
  },
  ru: {
    sound: "\u0417\u0432\u0443\u043a", // «Звук»
    tagline: "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u044b · \u0434\u043e\u043a\u0430\u0437\u0443\u0435\u043c\u043e \u0447\u0435\u0441\u0442\u043d\u043e", // «Оригиналы · доказуемо честно»
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430…", // «Загрузка…»
    connecting: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 \u043a \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435…", // «Подключение к платформе…»
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e \u043a \u0438\u0433\u0440\u0435", // «Готово к игре»
    betPending: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044f \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c…", // «Ставка подтверждается сервером…»
    settling: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442…", // «Сервер рассчитывает результат…»
    volatilityLabel: "\u0412\u043e\u043b\u0430\u0442\u0438\u043b\u044c\u043d\u043e\u0441\u0442\u044c", // «Волатильность»
    volLow: "\u041d\u0438\u0437\u043a\u0430\u044f", // «Низкая»
    volMedium: "\u0421\u0440\u0435\u0434\u043d\u044f\u044f", // «Средняя»
    volHigh: "\u0412\u044b\u0441\u043e\u043a\u0430\u044f", // «Высокая»
    bonusAward: "\u0411\u043e\u043d\u0443\u0441", // «Бонус»
    bonusFreeSpins: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d\u044b", // «Фриспины»
    bonusRespin: "\u0420\u0435\u0441\u043f\u0438\u043d", // «Респин»
    freeSpinBtn: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d ({count})", // «Фриспин ({count})»
    respinBtn: "\u0420\u0435\u0441\u043f\u0438\u043d ({count})", // «Респин ({count})»
    mathLabel: "\u041c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430", // «Математика»
    linesCount: "{count} \u043b\u0438\u043d\u0438\u0439", // «{count} линий»
    reelsLabel: "\u0411\u0430\u0440\u0430\u0431\u0430\u043d\u044b \u0441\u043b\u043e\u0442\u0430", // «Барабаны слота»
    errUnknownTitle: "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0438\u043b\u0438 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u0438\u0433\u0440\u044b.", // «Неизвестный или некорректный идентификатор игры.»
    errNotFound: "\u0418\u0433\u0440\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.", // «Игра не найдена.»
    errBadManifest: "\u041c\u0430\u043d\u0438\u0444\u0435\u0441\u0442 \u0438\u0433\u0440\u044b \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0451\u043d.", // «Манифест игры повреждён.»
    errLoad: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438: {message}", // «Ошибка загрузки: {message}»
  },
  uk: {
    sound: "\u0417\u0432\u0443\u043a", // «Звук»
    tagline: "\u041e\u0440\u0438\u0433\u0456\u043d\u0430\u043b\u0438 · \u0434\u043e\u043a\u0430\u0437\u043e\u0432\u043e \u0447\u0435\u0441\u043d\u043e", // «Оригінали · доказово чесно»
    loading: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f…", // «Завантаження…»
    connecting: "\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f \u0434\u043e \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0438…", // «Підключення до платформи…»
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e \u0434\u043e \u0433\u0440\u0438", // «Готово до гри»
    betPending: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0454\u0442\u044c\u0441\u044f \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c…", // «Ставка підтверджується сервером…»
    settling: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0440\u043e\u0437\u0440\u0430\u0445\u043e\u0432\u0443\u0454 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442…", // «Сервер розраховує результат…»
    volatilityLabel: "\u0412\u043e\u043b\u0430\u0442\u0438\u043b\u044c\u043d\u0456\u0441\u0442\u044c", // «Волатильність»
    volLow: "\u041d\u0438\u0437\u044c\u043a\u0430", // «Низька»
    volMedium: "\u0421\u0435\u0440\u0435\u0434\u043d\u044f", // «Середня»
    volHigh: "\u0412\u0438\u0441\u043e\u043a\u0430", // «Висока»
    bonusAward: "\u0411\u043e\u043d\u0443\u0441", // «Бонус»
    bonusFreeSpins: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d\u0438", // «Фріспіни»
    bonusRespin: "\u0420\u0435\u0441\u043f\u0456\u043d", // «Респін»
    freeSpinBtn: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d ({count})", // «Фріспін ({count})»
    respinBtn: "\u0420\u0435\u0441\u043f\u0456\u043d ({count})", // «Респін ({count})»
    mathLabel: "\u041c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430", // «Математика»
    linesCount: "{count} \u043b\u0456\u043d\u0456\u0439", // «{count} ліній»
    reelsLabel: "\u0411\u0430\u0440\u0430\u0431\u0430\u043d\u0438 \u0441\u043b\u043e\u0442\u0430", // «Барабани слота»
    errUnknownTitle: "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0438\u0439 \u0430\u0431\u043e \u043d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u0456\u0434\u0435\u043d\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u043e\u0440 \u0433\u0440\u0438.", // «Невідомий або некоректний ідентифікатор гри.»
    errNotFound: "\u0413\u0440\u0443 \u043d\u0435 \u0437\u043d\u0430\u0439\u0434\u0435\u043d\u043e.", // «Гру не знайдено.»
    errBadManifest: "\u041c\u0430\u043d\u0456\u0444\u0435\u0441\u0442 \u0433\u0440\u0438 \u043f\u043e\u0448\u043a\u043e\u0434\u0436\u0435\u043d\u043e.", // «Маніфест гри пошкоджено.»
    errLoad: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: {message}", // «Помилка завантаження: {message}»
  },
  es: {
    sound: "Sonido",
    tagline: "Originales · demostrablemente justo",
    loading: "Cargando…",
    connecting: "Conectando con la plataforma…",
    ready: "Listo para jugar",
    betPending: "El servidor confirma la apuesta…",
    settling: "El servidor calcula el resultado…",
    volatilityLabel: "Volatilidad",
    volLow: "Baja",
    volMedium: "Media",
    volHigh: "Alta",
    bonusAward: "Bono",
    bonusFreeSpins: "Giros gratis",
    bonusRespin: "Regiro",
    freeSpinBtn: "Giro gratis ({count})",
    respinBtn: "Regiro ({count})",
    mathLabel: "Matemática",
    linesCount: "{count} líneas",
    reelsLabel: "Rodillos de la tragamonedas",
    errUnknownTitle: "Identificador de juego desconocido o no válido.",
    errNotFound: "Juego no encontrado.",
    errBadManifest: "El manifiesto del juego está dañado.",
    errLoad: "Error de carga: {message}",
  },
  de: {
    sound: "Ton",
    tagline: "Originals · nachweislich fair",
    loading: "Wird geladen…",
    connecting: "Verbindung zur Plattform…",
    ready: "Bereit zum Spielen",
    betPending: "Server bestätigt den Einsatz…",
    settling: "Server berechnet das Ergebnis…",
    volatilityLabel: "Volatilität",
    volLow: "Niedrig",
    volMedium: "Mittel",
    volHigh: "Hoch",
    bonusAward: "Bonus",
    bonusFreeSpins: "Freispiele",
    bonusRespin: "Respin",
    freeSpinBtn: "Freispiel ({count})",
    respinBtn: "Respin ({count})",
    mathLabel: "Mathematik",
    linesCount: "{count} Linien",
    reelsLabel: "Walzen des Spielautomaten",
    errUnknownTitle: "Unbekannte oder ungültige Spiel-ID.",
    errNotFound: "Spiel nicht gefunden.",
    errBadManifest: "Spielmanifest ist beschädigt.",
    errLoad: "Ladefehler: {message}",
  },
  fr: {
    sound: "Son",
    tagline: "Originaux · équité prouvable",
    loading: "Chargement…",
    connecting: "Connexion à la plateforme…",
    ready: "Prêt à jouer",
    betPending: "Le serveur confirme la mise…",
    settling: "Le serveur calcule le résultat…",
    volatilityLabel: "Volatilité",
    volLow: "Faible",
    volMedium: "Moyenne",
    volHigh: "Élevée",
    bonusAward: "Bonus",
    bonusFreeSpins: "Tours gratuits",
    bonusRespin: "Respin",
    freeSpinBtn: "Tour gratuit ({count})",
    respinBtn: "Respin ({count})",
    mathLabel: "Mathématique",
    linesCount: "{count} lignes",
    reelsLabel: "Rouleaux de la machine",
    errUnknownTitle: "Identifiant de jeu inconnu ou invalide.",
    errNotFound: "Jeu introuvable.",
    errBadManifest: "Le manifeste du jeu est corrompu.",
    errLoad: "Erreur de chargement : {message}",
  },
  pt: {
    sound: "Som",
    tagline: "Originais · comprovadamente justo",
    loading: "Carregando…",
    connecting: "Conectando à plataforma…",
    ready: "Pronto para jogar",
    betPending: "O servidor confirma a aposta…",
    settling: "O servidor calcula o resultado…",
    volatilityLabel: "Volatilidade",
    volLow: "Baixa",
    volMedium: "Média",
    volHigh: "Alta",
    bonusAward: "Bônus",
    bonusFreeSpins: "Giros grátis",
    bonusRespin: "Respin",
    freeSpinBtn: "Giro grátis ({count})",
    respinBtn: "Respin ({count})",
    mathLabel: "Matemática",
    linesCount: "{count} linhas",
    reelsLabel: "Rolos do caça-níqueis",
    errUnknownTitle: "ID de jogo desconhecido ou inválido.",
    errNotFound: "Jogo não encontrado.",
    errBadManifest: "O manifesto do jogo está corrompido.",
    errLoad: "Erro de carregamento: {message}",
  },
};

const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const params = new URLSearchParams(location.search);
const titleId = params.get("title");
const idOk = (id) =>
  /^slot-original-(?:00[1-9]|0[1-9]\d|1[01]\d|12[0-7])$/.test(id || "");

// Манифестная тема титула ложится поверх общей палитры: каркас у всех игр
// общий, а --c-* подхватывают и HUD, и кнопки, и производные слои токенов.
const THEME_VARS = {
  accent: "--c-primary",
  background: "--c-base",
  panel: "--c-surface",
  text: "--c-text",
};
const VOLATILITY_KEYS = { low: "volLow", medium: "volMedium", high: "volHigh" };

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

/* --- Прорисованный арт символов ---------------------------------------- */
// Каждый символ титула рисуется векторной библиотекой ui-symbols в палитре
// манифеста и кешируется как data-URI. Ячейка получает картинку через
// background-image (CSS-переменная) — без innerHTML, как требует контракт
// рендерера, и без единого файла-ассета на диске.
const symbolArt = new Map();

/** Линейное смешение hex-цветов для производных оттенков палитры арта. */
function mixHex(a, b, amount) {
  const parse = (value) => {
    const clean = value.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = parse(a), [br, bg, bb] = parse(b);
  const channel = (x, y) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/** Палитра арта из манифестной темы титула (4 цвета → полный набор). */
function artPalette(theme) {
  return {
    base: theme.background,
    surface: theme.panel,
    surface2: mixHex(theme.panel, theme.accent, 0.14),
    line: mixHex(theme.panel, theme.accent, 0.32),
    primary: theme.accent,
    secondary: mixHex(theme.accent, theme.text, 0.45),
    gold: "#ffd15c",
    text: theme.text,
  };
}

function buildSymbolArt() {
  symbolArt.clear();
  const palette = artPalette(manifest.theme);
  for (const symbol of manifest.symbols) {
    const svg = renderSymbol(symbol.id, palette);
    symbolArt.set(symbol.id, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
}

function paintCell(node, symbol) {
  node.dataset.symbol = symbol.id;
  node.style.setProperty("--symbol-art", symbolArt.get(symbol.id) || "none");
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

/** Подпись типа бонуса — из словаря, а не из сырого id манифеста. */
const bonusTypeLabel = (type) =>
  ({
    "free-spins": t("bonusFreeSpins"),
    multiplier: t("multiplier"),
    respin: t("bonusRespin"),
  })[type] || type;

/** Текст главной кнопки: обычный спин или счётчик бонусных вращений. */
function updateSpinButton() {
  $("spin").textContent =
    bonusState?.status === "active"
      ? t(bonusState.type === "respin" ? "respinBtn" : "freeSpinBtn", {
          count: bonusState.remaining,
        })
      : t("spin");
}

function applyManifest() {
  document.title = manifest.title;
  $("title").textContent = manifest.title;
  for (const [name, value] of Object.entries(manifest.theme))
    if (THEME_VARS[name])
      document.documentElement.style.setProperty(THEME_VARS[name], value);
  buildSymbolArt();
  $("volatility").textContent =
    `${t("volatilityLabel")} · ${t(VOLATILITY_KEYS[manifest.volatility])}`;
  const bonus = manifest.mathProfile.bonus;
  $("bonus").textContent =
    `${t("bonusAward")} ${bonusTypeLabel(bonus.type)} · ${bonus.triggerCount}× ${bonus.triggerSymbol}`;
  $("math").textContent =
    `${t("mathLabel")} ${manifest.mathProfile.version} · ${t("linesCount", { count: manifest.lines })}`;
  $("bet").replaceChildren(
    ...manifest.betOptions.map((value) =>
      Object.assign(document.createElement("option"), {
        value,
        textContent: `${money(value)} ${t("credits")}`,
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
        icon = document.createElement("i"),
        value = document.createElement("b");
      row.className = "paytable__row";
      icon.className = "paytable__icon";
      icon.style.setProperty("--symbol-art", symbolArt.get(symbol.id) || "none");
      name.textContent = symbol.label.replace(/^\S+\s/, "");
      value.textContent = (manifest.paytable[symbol.id] || [])
        .slice(2)
        .join(" / ");
      name.prepend(icon);
      row.append(name, value);
      return row;
    }),
  );
  randomize();
}

/** Ступенчатая остановка: барабаны «встают» слева направо, каждый со щелчком. */
function stopReels() {
  const reels = [...$("reels").children];
  return new Promise((resolve) => {
    reels.forEach((reel, index) => {
      setTimeout(() => {
        reel.classList.add("stopped");
        play("reelStop");
        if (index === reels.length - 1) {
          $("reels").classList.remove("spinning");
          resolve();
        }
      }, CONFIG.reelStopGapMs * (index + 1));
    });
  });
}

async function spin() {
  if (busy) return;
  const activeBonus = bonusState?.status === "active" && bonusState.remaining > 0;
  const amount = Number($("bet").value);
  if (!Number.isSafeInteger(amount) || amount < 1) return;
  busy = true;
  $("spin").disabled = true;
  $("spin").dataset.idle = "false";
  $("status").textContent = t("betPending");
  $("status").dataset.state = "";
  $("result").textContent = "";
  $("result").dataset.state = "";
  $("win").textContent = "0";
  for (const reel of $("reels").children) reel.classList.remove("stopped");
  $("reels").classList.add("spinning");
  play("bet");
  const roundId = `${titleId}_${crypto.randomUUID().replaceAll("-", "")}`;
  const approved = activeBonus ? { type: "BET_APPROVED" } : await sdk.bet(amount, roundId);
  if (approved?.type !== "BET_APPROVED") {
    $("reels").classList.remove("spinning");
    $("status").textContent =
      approved?.payload?.reason === "insufficient_funds"
        ? t("insufficient")
        : t("betRejected");
    $("status").dataset.state = "lose";
    play("error");
    busy = false;
    $("spin").disabled = false;
    $("spin").dataset.idle = "true";
    return;
  }
  // Фаза вращения: сетка мерцает случайными символами до запроса результата.
  play("spin");
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      randomize();
      now - start < CONFIG.spinMs ? requestAnimationFrame(tick) : resolve();
    };
    requestAnimationFrame(tick);
  });
  $("status").textContent = t("settling");
  const settled = activeBonus
    ? await sdk.bonusSpin(bonusState.sessionId, roundId)
    : await sdk.settle(roundId);
  if (["ROUND_SETTLED", "BONUS_SETTLED"].includes(settled?.type)) {
    const p = settled.payload;
    bonusState = p.bonusState || null;
    reveal(p.outcome);
    await stopReels();
    const win = Number(p.win || 0);
    const multiplier = Number(p.multiplier || 0);
    const result = win
      ? `${t("youWon", { amount: money(win) })} · ${multiplier.toFixed(2)}×`
      : t("loss");
    $("result").textContent = p.outcome?.bonus
      ? `${bonusTypeLabel(p.outcome.bonus.type)} · ${result}`
      : result;
    // Проигрыш в слоте не наказываем вспышкой — нейтральный итог раунда.
    $("result").dataset.state = win > 0 ? "win" : "";
    $("status").textContent = t("ready");
    if (win > 0) {
      play(multiplier >= CONFIG.bigWinMultiplier ? "bigWin" : "win");
      celebrate({ element: $("win"), from: 0, to: win, multiplier, locale: t.locale });
    }
  } else {
    $("reels").classList.remove("spinning");
    $("status").textContent = t("settleError");
    $("status").dataset.state = "lose";
    play("error");
  }
  busy = false;
  $("spin").disabled = false;
  $("spin").dataset.idle = "true";
  $("bet").disabled = bonusState?.status === "active";
  updateSpinButton();
}

// Степпер ставки: листает дискретные ставки манифеста, края зажаты.
const stepBet = (delta) => {
  const bet = $("bet");
  if (bet.disabled || !bet.options.length) return;
  bet.selectedIndex = Math.min(
    bet.options.length - 1,
    Math.max(0, bet.selectedIndex + delta),
  );
  play("tick");
};
$("betUp").onclick = () => stepBet(CONFIG.betStepOptions);
$("betDown").onclick = () => stepBet(-CONFIG.betStepOptions);

$("sound").onclick = (event) => {
  const muted = audio.toggle();
  event.currentTarget.setAttribute("aria-pressed", String(!muted));
  event.currentTarget.textContent = muted ? "♪̶" : "♪";
  if (!muted) play("click");
};

async function boot() {
  if (!idOk(titleId)) fail(t("errUnknownTitle"));
  const response = await fetch(`./titles/${encodeURIComponent(titleId)}.json`, {
    cache: "no-store",
  });
  if (!response.ok) fail(t("errNotFound"));
  manifest = await response.json();
  if (!valid(manifest)) fail(t("errBadManifest"));
  applyManifest();
  sdk = new CasinoBridge(titleId);
  addEventListener("casino:balance", (event) => {
    $("balance").textContent = money(event.detail.balance);
    if (event.detail.bonusState) {
      bonusState = event.detail.bonusState;
      $("bet").disabled = true;
      updateSpinButton();
    }
    $("spin").disabled = busy;
    $("spin").dataset.idle = String(!busy);
    if (!busy) {
      $("status").textContent = t("ready");
      $("status").dataset.state = "";
    }
  });
  $("spin").onclick = spin;
  $("app").setAttribute("aria-busy", "false");
  sdk.start();
}
boot().catch((error) => {
  if (!$("error").hidden) return;
  fail(t("errLoad", { message: error.message }));
});
