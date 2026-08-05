import { CasinoBridge } from "./sdk.js";
import { createGameI18n } from "./i18n.js";
import { celebrate, burst } from "./ui-fx.js";
import { initAudio, audio } from "./ui-audio.js";
import { renderSymbol } from "./ui-symbols.js";
import { ENGINES, ENGINE_IDS } from "./engines.generated.js";

/*
 * Флагманский клиент премиум-слотов. Один бандл обслуживает три серверных
 * матпрофиля slotEngine (?engine=classic-lines|ways-243|cascade-ways).
 *
 * Разделение ответственности жёсткое:
 *   • сервер решает ВСЁ — сетки, выигрыш, множитель, скаттеры, фриспины;
 *   • клиент только показывает присланное и подсвечивает совпавшие ячейки.
 * Описание механики берётся из engines.generated.js — слепка серверного
 * apps/api/src/slotLibrary.js, поэтому витрина не может разойтись с расчётом.
 */

// Все «ощущения» игры правятся здесь: темп вращения, каскада и фриспинов.
const CONFIG = {
  spinMs: 900, // фаза вращения барабанов до запроса результата у сервера
  reelStopGapMs: 120, // пауза между остановками соседних барабанов
  churnMs: 60, // как часто мерцают символы во время вращения
  hitHoldMs: 620, // сколько держится подсветка выигрышной комбинации
  cascadeExplodeMs: 420, // взрыв выигрышных символов перед тумблом
  cascadeDropMs: 380, // падение новой сетки сверху
  cascadeBurstCells: 8, // сколько ячеек дают искры (больше — только шум)
  freeSpinIntroMs: 1000, // баннер «N фриспинов»
  freeSpinStepMs: 460, // шаг проигрывания одного фриспина
  freeSpinOutroMs: 900, // пауза перед возвратом к базовой сетке
  bigWinMultiplier: 10, // множитель, с которого играет bigWin и льются монеты
  betStepOptions: 1, // шаг степпера по списку ставок (в позициях)
  minTotalBet: 10, // ниже этой общей ставки обещанная отдача недостижима (см. betOptions)
};

/*
 * Маппинг символов матпрофиля на векторную библиотеку ui-symbols.js.
 * Профиль оперирует карточной иерархией (ten < jack < queen < king < ace <
 * ruby < crown), поэтому арт подобран по возрастанию «веса»: холодная луна и
 * колокол внизу, искра и бриллиант в середине, звезда и самоцвет выше, корона
 * на вершине. Wild и Scatter получают фирменные плашки W и B.
 */
const SYMBOL_ART = {
  ten: "moon",
  jack: "bell",
  queen: "spark",
  king: "diamond",
  ace: "star",
  ruby: "gem",
  crown: "crown",
  wild: "wild",
  scatter: "bonus",
};

/** Ключи локализованных названий символов (см. GAME_STRINGS). */
const SYMBOL_LABEL = {
  ten: "symTen",
  jack: "symJack",
  queen: "symQueen",
  king: "symKing",
  ace: "symAce",
  ruby: "symRuby",
  crown: "symCrown",
  wild: "symWild",
  scatter: "symScatter",
};

// Строки именно этого клиента (общие ключи — в i18n.js). Английский — источник
// правды; в ru/uk кириллица записана \u-эскейпами: сборочная проверка запрещает
// кириллицу вне комментариев, читаемый текст — в комментарии справа.
const GAME_STRINGS = {
  en: {
    sound: "Sound",
    tagline: "Premium originals · provably fair",
    connecting: "Connecting to the platform…",
    ready: "Ready to play",
    betPending: "Confirming bet with the server…",
    settling: "Server is settling the result…",
    reelsLabel: "Slot reels",
    modeLines: "Paylines",
    modeWays: "Ways to win",
    modeCascade: "Cascading ways",
    linesCount: "Lines: {count}",
    waysCount: "Ways: {count}",
    lineBet: "Line bet",
    totalBet: "Total bet",
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "RTP",
    lineHit: "Line {line} · {symbol} ×{count}",
    waysHit: "{symbol} ×{count} · {ways} ways",
    scatterHit: "Scatters: {count}",
    cascadeLabel: "Cascade",
    cascadeStep: "Cascade ×{multiplier}",
    cascadeLadderLabel: "Multiplier ladder",
    freeSpinsLabel: "Free spins",
    freeSpinsAwarded: "Free spins: {count}",
    freeSpinRound: "Free spin {index} of {total}",
    freeSpinsTotal: "Free spins paid {amount}",
    roundMultiplier: "Round multiplier ×{multiplier}",
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "Scatter pays",
    paytableNote: "Payouts are shown in line-bet units",
    symTen: "Ten",
    symJack: "Jack",
    symQueen: "Queen",
    symKing: "King",
    symAce: "Ace",
    symRuby: "Ruby",
    symCrown: "Crown",
    symWild: "Wild",
    symScatter: "Scatter",
    bigWinLabel: "Big win!",
    errUnknownEngine: "Unknown or invalid engine id.",
    errLoad: "Loading error: {message}",
  },
  ru: {
    sound: "\u0417\u0432\u0443\u043a", // «Звук»
    tagline: "\u041f\u0440\u0435\u043c\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u044b · \u0434\u043e\u043a\u0430\u0437\u0443\u0435\u043c\u043e \u0447\u0435\u0441\u0442\u043d\u043e", // «Премиальные оригиналы · доказуемо честно»
    connecting: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435 \u043a \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0435…", // «Подключение к платформе…»
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e \u043a \u0438\u0433\u0440\u0435", // «Готово к игре»
    betPending: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044f \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c…", // «Ставка подтверждается сервером…»
    settling: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442…", // «Сервер рассчитывает результат…»
    reelsLabel: "\u0411\u0430\u0440\u0430\u0431\u0430\u043d\u044b \u0441\u043b\u043e\u0442\u0430", // «Барабаны слота»
    modeLines: "\u041b\u0438\u043d\u0438\u0438 \u0432\u044b\u043f\u043b\u0430\u0442", // «Линии выплат»
    modeWays: "\u0421\u043f\u043e\u0441\u043e\u0431\u044b \u0432\u044b\u0438\u0433\u0440\u0430\u0442\u044c", // «Способы выиграть»
    modeCascade: "\u041a\u0430\u0441\u043a\u0430\u0434\u043d\u044b\u0435 \u0441\u043f\u043e\u0441\u043e\u0431\u044b", // «Каскадные способы»
    linesCount: "\u041b\u0438\u043d\u0438\u0439: {count}", // «Линий: {count}»
    waysCount: "\u0421\u043f\u043e\u0441\u043e\u0431\u043e\u0432: {count}", // «Способов: {count}»
    lineBet: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043d\u0430 \u043b\u0438\u043d\u0438\u044e", // «Ставка на линию»
    totalBet: "\u041e\u0431\u0449\u0430\u044f \u0441\u0442\u0430\u0432\u043a\u0430", // «Общая ставка»
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "\u041e\u0442\u0434\u0430\u0447\u0430", // «Отдача»
    lineHit: "\u041b\u0438\u043d\u0438\u044f {line} · {symbol} ×{count}", // «Линия {line} · {symbol} ×{count}»
    waysHit: "{symbol} ×{count} · \u0441\u043f\u043e\u0441\u043e\u0431\u043e\u0432 {ways}", // «{symbol} ×{count} · способов {ways}»
    scatterHit: "\u0421\u043a\u0430\u0442\u0442\u0435\u0440\u043e\u0432: {count}", // «Скаттеров: {count}»
    cascadeLabel: "\u041a\u0430\u0441\u043a\u0430\u0434", // «Каскад»
    cascadeStep: "\u041a\u0430\u0441\u043a\u0430\u0434 ×{multiplier}", // «Каскад ×{multiplier}»
    cascadeLadderLabel: "\u041b\u0435\u0441\u0442\u043d\u0438\u0446\u0430 \u043c\u043d\u043e\u0436\u0438\u0442\u0435\u043b\u0435\u0439", // «Лестница множителей»
    freeSpinsLabel: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d\u044b", // «Фриспины»
    freeSpinsAwarded: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d\u043e\u0432: {count}", // «Фриспинов: {count}»
    freeSpinRound: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d {index} \u0438\u0437 {total}", // «Фриспин {index} из {total}»
    freeSpinsTotal: "\u0424\u0440\u0438\u0441\u043f\u0438\u043d\u044b \u043f\u0440\u0438\u043d\u0435\u0441\u043b\u0438 {amount}", // «Фриспины принесли {amount}»
    roundMultiplier: "\u041c\u043d\u043e\u0436\u0438\u0442\u0435\u043b\u044c \u0440\u0430\u0443\u043d\u0434\u0430 ×{multiplier}", // «Множитель раунда ×{multiplier}»
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "\u0412\u044b\u043f\u043b\u0430\u0442\u044b \u0437\u0430 \u0441\u043a\u0430\u0442\u0442\u0435\u0440", // «Выплаты за скаттер»
    paytableNote: "\u0412\u044b\u043f\u043b\u0430\u0442\u044b \u0443\u043a\u0430\u0437\u0430\u043d\u044b \u0432 \u0441\u0442\u0430\u0432\u043a\u0430\u0445 \u043d\u0430 \u043b\u0438\u043d\u0438\u044e", // «Выплаты указаны в ставках на линию»
    symTen: "\u0414\u0435\u0441\u044f\u0442\u043a\u0430", // «Десятка»
    symJack: "\u0412\u0430\u043b\u0435\u0442", // «Валет»
    symQueen: "\u0414\u0430\u043c\u0430", // «Дама»
    symKing: "\u041a\u043e\u0440\u043e\u043b\u044c", // «Король»
    symAce: "\u0422\u0443\u0437", // «Туз»
    symRuby: "\u0420\u0443\u0431\u0438\u043d", // «Рубин»
    symCrown: "\u041a\u043e\u0440\u043e\u043d\u0430", // «Корона»
    symWild: "Wild",
    symScatter: "\u0421\u043a\u0430\u0442\u0442\u0435\u0440", // «Скаттер»
    bigWinLabel: "\u041a\u0440\u0443\u043f\u043d\u044b\u0439 \u0432\u044b\u0438\u0433\u0440\u044b\u0448!", // «Крупный выигрыш!»
    errUnknownEngine: "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0438\u043b\u0438 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u0434\u0432\u0438\u0436\u043a\u0430.", // «Неизвестный или некорректный идентификатор движка.»
    errLoad: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438: {message}", // «Ошибка загрузки: {message}»
  },
  uk: {
    sound: "\u0417\u0432\u0443\u043a", // «Звук»
    tagline: "\u041f\u0440\u0435\u043c\u0456\u0430\u043b\u044c\u043d\u0456 \u043e\u0440\u0438\u0433\u0456\u043d\u0430\u043b\u0438 · \u0434\u043e\u043a\u0430\u0437\u043e\u0432\u043e \u0447\u0435\u0441\u043d\u043e", // «Преміальні оригінали · доказово чесно»
    connecting: "\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f \u0434\u043e \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0438…", // «Підключення до платформи…»
    ready: "\u0413\u043e\u0442\u043e\u0432\u043e \u0434\u043e \u0433\u0440\u0438", // «Готово до гри»
    betPending: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0443\u0454\u0442\u044c\u0441\u044f \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c…", // «Ставка підтверджується сервером…»
    settling: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0440\u043e\u0437\u0440\u0430\u0445\u043e\u0432\u0443\u0454 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442…", // «Сервер розраховує результат…»
    reelsLabel: "\u0411\u0430\u0440\u0430\u0431\u0430\u043d\u0438 \u0441\u043b\u043e\u0442\u0430", // «Барабани слота»
    modeLines: "\u041b\u0456\u043d\u0456\u0457 \u0432\u0438\u043f\u043b\u0430\u0442", // «Лінії виплат»
    modeWays: "\u0421\u043f\u043e\u0441\u043e\u0431\u0438 \u0432\u0438\u0433\u0440\u0430\u0442\u0438", // «Способи виграти»
    modeCascade: "\u041a\u0430\u0441\u043a\u0430\u0434\u043d\u0456 \u0441\u043f\u043e\u0441\u043e\u0431\u0438", // «Каскадні способи»
    linesCount: "\u041b\u0456\u043d\u0456\u0439: {count}", // «Ліній: {count}»
    waysCount: "\u0421\u043f\u043e\u0441\u043e\u0431\u0456\u0432: {count}", // «Способів: {count}»
    lineBet: "\u0421\u0442\u0430\u0432\u043a\u0430 \u043d\u0430 \u043b\u0456\u043d\u0456\u044e", // «Ставка на лінію»
    totalBet: "\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u0441\u0442\u0430\u0432\u043a\u0430", // «Загальна ставка»
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "\u0412\u0456\u0434\u0434\u0430\u0447\u0430", // «Віддача»
    lineHit: "\u041b\u0456\u043d\u0456\u044f {line} · {symbol} ×{count}", // «Лінія {line} · {symbol} ×{count}»
    waysHit: "{symbol} ×{count} · \u0441\u043f\u043e\u0441\u043e\u0431\u0456\u0432 {ways}", // «{symbol} ×{count} · способів {ways}»
    scatterHit: "\u0421\u043a\u0430\u0442\u0435\u0440\u0456\u0432: {count}", // «Скатерів: {count}»
    cascadeLabel: "\u041a\u0430\u0441\u043a\u0430\u0434", // «Каскад»
    cascadeStep: "\u041a\u0430\u0441\u043a\u0430\u0434 ×{multiplier}", // «Каскад ×{multiplier}»
    cascadeLadderLabel: "\u0414\u0440\u0430\u0431\u0438\u043d\u0430 \u043c\u043d\u043e\u0436\u043d\u0438\u043a\u0456\u0432", // «Драбина множників»
    freeSpinsLabel: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d\u0438", // «Фріспіни»
    freeSpinsAwarded: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d\u0456\u0432: {count}", // «Фріспінів: {count}»
    freeSpinRound: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d {index} \u0437 {total}", // «Фріспін {index} з {total}»
    freeSpinsTotal: "\u0424\u0440\u0456\u0441\u043f\u0456\u043d\u0438 \u043f\u0440\u0438\u043d\u0435\u0441\u043b\u0438 {amount}", // «Фріспіни принесли {amount}»
    roundMultiplier: "\u041c\u043d\u043e\u0436\u043d\u0438\u043a \u0440\u0430\u0443\u043d\u0434\u0443 ×{multiplier}", // «Множник раунду ×{multiplier}»
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "\u0412\u0438\u043f\u043b\u0430\u0442\u0438 \u0437\u0430 \u0441\u043a\u0430\u0442\u0435\u0440", // «Виплати за скатер»
    paytableNote: "\u0412\u0438\u043f\u043b\u0430\u0442\u0438 \u0432\u043a\u0430\u0437\u0430\u043d\u0456 \u0443 \u0441\u0442\u0430\u0432\u043a\u0430\u0445 \u043d\u0430 \u043b\u0456\u043d\u0456\u044e", // «Виплати вказані у ставках на лінію»
    symTen: "\u0414\u0435\u0441\u044f\u0442\u043a\u0430", // «Десятка»
    symJack: "\u0412\u0430\u043b\u0435\u0442", // «Валет»
    symQueen: "\u0414\u0430\u043c\u0430", // «Дама»
    symKing: "\u041a\u043e\u0440\u043e\u043b\u044c", // «Король»
    symAce: "\u0422\u0443\u0437", // «Туз»
    symRuby: "\u0420\u0443\u0431\u0456\u043d", // «Рубін»
    symCrown: "\u041a\u043e\u0440\u043e\u043d\u0430", // «Корона»
    symWild: "Wild",
    symScatter: "\u0421\u043a\u0430\u0442\u0435\u0440", // «Скатер»
    bigWinLabel: "\u0412\u0435\u043b\u0438\u043a\u0438\u0439 \u0432\u0438\u0433\u0440\u0430\u0448!", // «Великий виграш!»
    errUnknownEngine: "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0438\u0439 \u0430\u0431\u043e \u043d\u0435\u043a\u043e\u0440\u0435\u043a\u0442\u043d\u0438\u0439 \u0456\u0434\u0435\u043d\u0442\u0438\u0444\u0456\u043a\u0430\u0442\u043e\u0440 \u0440\u0443\u0448\u0456\u044f.", // «Невідомий або некоректний ідентифікатор рушія.»
    errLoad: "\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: {message}", // «Помилка завантаження: {message}»
  },
  es: {
    sound: "Sonido",
    tagline: "Originales premium · demostrablemente justo",
    connecting: "Conectando con la plataforma…",
    ready: "Listo para jugar",
    betPending: "El servidor confirma la apuesta…",
    settling: "El servidor calcula el resultado…",
    reelsLabel: "Rodillos de la tragamonedas",
    modeLines: "Líneas de pago",
    modeWays: "Formas de ganar",
    modeCascade: "Formas en cascada",
    linesCount: "Líneas: {count}",
    waysCount: "Formas: {count}",
    lineBet: "Apuesta por línea",
    totalBet: "Apuesta total",
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "RTP",
    lineHit: "Línea {line} · {symbol} ×{count}",
    waysHit: "{symbol} ×{count} · {ways} formas",
    scatterHit: "Scatters: {count}",
    cascadeLabel: "Cascada",
    cascadeStep: "Cascada ×{multiplier}",
    cascadeLadderLabel: "Escalera de multiplicadores",
    freeSpinsLabel: "Giros gratis",
    freeSpinsAwarded: "Giros gratis: {count}",
    freeSpinRound: "Giro gratis {index} de {total}",
    freeSpinsTotal: "Los giros gratis pagaron {amount}",
    roundMultiplier: "Multiplicador de ronda ×{multiplier}",
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "Pagos por scatter",
    paytableNote: "Los pagos se muestran en unidades de apuesta por línea",
    symTen: "Diez",
    symJack: "Jota",
    symQueen: "Reina",
    symKing: "Rey",
    symAce: "As",
    symRuby: "Rubí",
    symCrown: "Corona",
    symWild: "Wild",
    symScatter: "Scatter",
    bigWinLabel: "¡Gran premio!",
    errUnknownEngine: "Identificador de motor desconocido o no válido.",
    errLoad: "Error de carga: {message}",
  },
  de: {
    sound: "Ton",
    tagline: "Premium-Originals · nachweislich fair",
    connecting: "Verbindung zur Plattform…",
    ready: "Bereit zum Spielen",
    betPending: "Server bestätigt den Einsatz…",
    settling: "Server berechnet das Ergebnis…",
    reelsLabel: "Walzen des Spielautomaten",
    modeLines: "Gewinnlinien",
    modeWays: "Gewinnwege",
    modeCascade: "Kaskaden-Gewinnwege",
    linesCount: "Linien: {count}",
    waysCount: "Wege: {count}",
    lineBet: "Linieneinsatz",
    totalBet: "Gesamteinsatz",
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "RTP",
    lineHit: "Linie {line} · {symbol} ×{count}",
    waysHit: "{symbol} ×{count} · {ways} Wege",
    scatterHit: "Scatter: {count}",
    cascadeLabel: "Kaskade",
    cascadeStep: "Kaskade ×{multiplier}",
    cascadeLadderLabel: "Multiplikator-Leiter",
    freeSpinsLabel: "Freispiele",
    freeSpinsAwarded: "Freispiele: {count}",
    freeSpinRound: "Freispiel {index} von {total}",
    freeSpinsTotal: "Freispiele zahlten {amount}",
    roundMultiplier: "Rundenmultiplikator ×{multiplier}",
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "Scatter-Gewinne",
    paytableNote: "Gewinne sind in Einheiten des Linieneinsatzes angegeben",
    symTen: "Zehn",
    symJack: "Bube",
    symQueen: "Dame",
    symKing: "König",
    symAce: "Ass",
    symRuby: "Rubin",
    symCrown: "Krone",
    symWild: "Wild",
    symScatter: "Scatter",
    bigWinLabel: "Großer Gewinn!",
    errUnknownEngine: "Unbekannte oder ungültige Engine-ID.",
    errLoad: "Ladefehler: {message}",
  },
  fr: {
    sound: "Son",
    tagline: "Originaux premium · équité prouvable",
    connecting: "Connexion à la plateforme…",
    ready: "Prêt à jouer",
    betPending: "Le serveur confirme la mise…",
    settling: "Le serveur calcule le résultat…",
    reelsLabel: "Rouleaux de la machine",
    modeLines: "Lignes de paiement",
    modeWays: "Façons de gagner",
    modeCascade: "Façons en cascade",
    linesCount: "Lignes : {count}",
    waysCount: "Façons : {count}",
    lineBet: "Mise par ligne",
    totalBet: "Mise totale",
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "RTP",
    lineHit: "Ligne {line} · {symbol} ×{count}",
    waysHit: "{symbol} ×{count} · {ways} façons",
    scatterHit: "Scatters : {count}",
    cascadeLabel: "Cascade",
    cascadeStep: "Cascade ×{multiplier}",
    cascadeLadderLabel: "Échelle de multiplicateurs",
    freeSpinsLabel: "Tours gratuits",
    freeSpinsAwarded: "Tours gratuits : {count}",
    freeSpinRound: "Tour gratuit {index} sur {total}",
    freeSpinsTotal: "Les tours gratuits ont payé {amount}",
    roundMultiplier: "Multiplicateur de manche ×{multiplier}",
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "Gains scatter",
    paytableNote: "Les gains sont exprimés en unités de mise par ligne",
    symTen: "Dix",
    symJack: "Valet",
    symQueen: "Dame",
    symKing: "Roi",
    symAce: "As",
    symRuby: "Rubis",
    symCrown: "Couronne",
    symWild: "Wild",
    symScatter: "Scatter",
    bigWinLabel: "Gros gain !",
    errUnknownEngine: "Identifiant de moteur inconnu ou invalide.",
    errLoad: "Erreur de chargement : {message}",
  },
  pt: {
    sound: "Som",
    tagline: "Originais premium · comprovadamente justo",
    connecting: "Conectando à plataforma…",
    ready: "Pronto para jogar",
    betPending: "O servidor confirma a aposta…",
    settling: "O servidor calcula o resultado…",
    reelsLabel: "Rolos do caça-níqueis",
    modeLines: "Linhas de pagamento",
    modeWays: "Formas de ganhar",
    modeCascade: "Formas em cascata",
    linesCount: "Linhas: {count}",
    waysCount: "Formas: {count}",
    lineBet: "Aposta por linha",
    totalBet: "Aposta total",
    betFormula: "{units} × {line} = {total}",
    rtpLabel: "RTP",
    lineHit: "Linha {line} · {symbol} ×{count}",
    waysHit: "{symbol} ×{count} · {ways} formas",
    scatterHit: "Scatters: {count}",
    cascadeLabel: "Cascata",
    cascadeStep: "Cascata ×{multiplier}",
    cascadeLadderLabel: "Escada de multiplicadores",
    freeSpinsLabel: "Giros grátis",
    freeSpinsAwarded: "Giros grátis: {count}",
    freeSpinRound: "Giro grátis {index} de {total}",
    freeSpinsTotal: "Os giros grátis pagaram {amount}",
    roundMultiplier: "Multiplicador da rodada ×{multiplier}",
    wildPays: "Wild ×{multiplier}",
    scatterPaysLabel: "Pagamentos de scatter",
    paytableNote: "Os pagamentos são exibidos em unidades de aposta por linha",
    symTen: "Dez",
    symJack: "Valete",
    symQueen: "Dama",
    symKing: "Rei",
    symAce: "Ás",
    symRuby: "Rubi",
    symCrown: "Coroa",
    symWild: "Wild",
    symScatter: "Scatter",
    bigWinLabel: "Grande prêmio!",
    errUnknownEngine: "ID de motor desconhecido ou inválido.",
    errLoad: "Erro de carregamento: {message}",
  },
};

const t = createGameI18n(GAME_STRINGS);
t.apply();
const play = initAudio({ mood: document.documentElement.dataset.mood });

const SVG_NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const params = new URLSearchParams(location.search);

// Движок приходит query-параметром. `title` поддержан как синоним: хост-фрейм
// исторически передаёт им идентификатор титула, и оба пути валидируются
// одинаково — по белому списку из сгенерированного файла.
const engineId = params.get("engine") ?? params.get("title");

let def = null,
  sdk = null,
  busy = false,
  balance = 0,
  cells = [], // cells[col][row]
  shownHits = []; // совпадения текущей сетки — нужны, чтобы пережить ресайз

function fail(message) {
  $("app").hidden = true;
  $("error").hidden = false;
  $("error").textContent = message;
  throw new Error(message);
}

/* --- Векторный арт символов ---------------------------------------------- */
// Символы рисуются ui-symbols.js в палитре сгенерированной темы и кешируются
// как data-URI. Ячейка получает картинку CSS-переменной — без innerHTML.
const symbolArt = new Map();

/**
 * Палитра арта читается из живых токенов: theme.generated.css поверх
 * ui-tokens.css. Ни одного цвета в коде — сменили тему игры, сменился и арт.
 */
function artPalette() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => style.getPropertyValue(name).trim();
  return {
    base: read("--c-base"),
    surface: read("--c-surface"),
    surface2: read("--c-surface-2"),
    line: read("--c-line"),
    primary: read("--c-primary"),
    secondary: read("--c-secondary"),
    gold: read("--c-gold"),
    text: read("--c-text"),
  };
}

function buildSymbolArt() {
  const palette = artPalette();
  symbolArt.clear();
  for (const id of def.symbols) {
    const svg = renderSymbol(SYMBOL_ART[id] || id, palette);
    symbolArt.set(id, `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }
}

const symbolLabel = (id) => t(SYMBOL_LABEL[id] || id);

function paintCell(node, id) {
  node.dataset.symbol = id;
  node.style.setProperty("--symbol-art", symbolArt.get(id) || "none");
}

/** Сетка целиком: outcome.grids[i] приходит в виде grid[col][row]. */
function paintGrid(grid) {
  for (let col = 0; col < def.cols; col++)
    for (let row = 0; row < def.rows; row++) paintCell(cells[col][row], grid[col][row]);
}

/** Декоративное мерцание во время вращения — к результату отношения не имеет. */
function churn() {
  for (const column of cells)
    for (const cell of column)
      paintCell(cell, def.symbols[Math.floor(Math.random() * def.symbols.length)]);
}

/* --- Подсветка совпадений (только визуал) --------------------------------- */
/**
 * Ячейки совпавших комбинаций для подсветки. Здесь НЕ считается ни одна
 * денежная величина: таблица выплат нужна лишь как признак «такая длина
 * оплачивается». Сумма, множитель и сами сетки приходят от сервера.
 */
function matchesOn(grid) {
  const pays = (symbol, count) => Boolean(def.paytable[symbol]?.[count]);
  const found = [];
  if (def.mode === "ways") {
    for (const symbol of Object.keys(def.paytable)) {
      let run = 0,
        ways = 1;
      const matched = [];
      for (let col = 0; col < def.cols; col++) {
        const rows = [];
        for (let row = 0; row < def.rows; row++) {
          const id = grid[col][row];
          if (id === symbol || id === def.wild) rows.push(row);
        }
        if (!rows.length) break;
        ways *= rows.length;
        run++;
        matched.push(...rows.map((row) => [col, row]));
      }
      if (run >= 3 && pays(symbol, run)) found.push({ symbol, count: run, ways, cells: matched });
    }
  } else {
    for (const [index, line] of def.paylines.entries()) {
      const ids = line.map((row, col) => grid[col][row]);
      const base = ids.find((id) => id !== def.wild && id !== def.scatter);
      if (base === undefined) continue;
      let count = 0;
      const matched = [];
      for (let col = 0; col < def.cols; col++) {
        if (ids[col] !== base && ids[col] !== def.wild) break;
        count++;
        matched.push([col, line[col]]);
      }
      if (pays(base, count)) found.push({ line: index + 1, symbol: base, count, cells: matched });
    }
  }
  return found;
}

function clearHighlight() {
  for (const column of cells) for (const cell of column) cell.classList.remove("win", "pop");
  shownHits = [];
  $("overlay").replaceChildren();
  $("hits").replaceChildren();
}

function highlight(hits) {
  for (const hit of hits) for (const [col, row] of hit.cells) cells[col][row].classList.add("win");
}

/** Центр ячейки в координатах сетки барабанов (для SVG-оверлея). */
function cellCenter(col, row, box) {
  const rect = cells[col][row].getBoundingClientRect();
  return [rect.left - box.left + rect.width / 2, rect.top - box.top + rect.height / 2];
}

/**
 * Оверлей поверх сетки: в режиме lines — путь конкретной линии с её номером,
 * в режиме ways — ломаная по средним точкам совпавших ячеек каждой колонки.
 */
function drawOverlay(hits) {
  const svg = $("overlay");
  shownHits = hits;
  svg.replaceChildren();
  const box = $("reels").getBoundingClientRect();
  if (!box.width || !hits.length) return;
  svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  hits.forEach((hit, index) => {
    // В режиме ways колонка может дать несколько совпавших ячеек — путь идёт
    // через их среднюю точку, поэтому одна ломаная описывает всю комбинацию.
    const byColumn = new Map();
    for (const [col, row] of hit.cells) {
      if (!byColumn.has(col)) byColumn.set(col, []);
      byColumn.get(col).push(row);
    }
    const points = [...byColumn.entries()].map(([col, rows]) => {
      const centers = rows.map((row) => cellCenter(col, row, box));
      const x = centers.reduce((sum, p) => sum + p[0], 0) / centers.length;
      const y = centers.reduce((sum, p) => sum + p[1], 0) / centers.length;
      return [x, y];
    });
    const path = document.createElementNS(SVG_NS, "polyline");
    path.setAttribute("points", points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    path.setAttribute("class", "overlay__path");
    path.style.setProperty("--delay", `${index}`);
    svg.append(path);
    if (!hit.line) return;
    // Номер линии — на её левом конце, чтобы читался поверх барабана.
    const [x, y] = points[0];
    const badge = document.createElementNS(SVG_NS, "circle");
    badge.setAttribute("cx", x.toFixed(1));
    badge.setAttribute("cy", y.toFixed(1));
    badge.setAttribute("r", "13");
    badge.setAttribute("class", "overlay__badge");
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", x.toFixed(1));
    label.setAttribute("y", (y + 4).toFixed(1));
    label.setAttribute("class", "overlay__label");
    label.setAttribute("text-anchor", "middle");
    label.textContent = String(hit.line);
    svg.append(badge, label);
  });
}

/** Список совпадений под сценой: что именно сложилось в этой сетке. */
function renderHits(hits, scatters) {
  const host = $("hits");
  host.replaceChildren();
  for (const hit of hits) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.symbol = hit.symbol;
    chip.style.setProperty("--symbol-art", symbolArt.get(hit.symbol) || "none");
    chip.textContent = hit.line
      ? t("lineHit", { line: hit.line, symbol: symbolLabel(hit.symbol), count: hit.count })
      : t("waysHit", { symbol: symbolLabel(hit.symbol), count: hit.count, ways: hit.ways });
    host.append(chip);
  }
  if (def.scatter && scatters >= 3) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.kind = "scatter";
    chip.style.setProperty("--symbol-art", symbolArt.get(def.scatter) || "none");
    chip.textContent = t("scatterHit", { count: scatters });
    host.append(chip);
  }
}

/* --- Каскад --------------------------------------------------------------- */
/** Ступень лестницы множителей для шага каскада (последняя ступень «залипает»). */
const ladderStep = (step) =>
  def.cascadeLadder ? def.cascadeLadder[Math.min(step, def.cascadeLadder.length - 1)] : 1;

function renderLadder(activeStep) {
  if (!def.cascade) return;
  const host = $("ladderSteps");
  host.replaceChildren();
  def.cascadeLadder.forEach((value, index) => {
    const step = document.createElement("b");
    step.className = "ladder__step";
    step.dataset.active = String(index === activeStep);
    step.dataset.passed = String(activeStep >= 0 && index < activeStep);
    step.textContent = `×${value}`;
    host.append(step);
  });
}

/** Взрыв выигрышных символов перед тумблом: искры + звук вскрытия. */
async function explode(hits) {
  const targets = hits.flatMap((hit) => hit.cells);
  for (const [col, row] of targets) cells[col][row].classList.add("pop");
  play("reveal");
  for (const [col, row] of targets.slice(0, CONFIG.cascadeBurstCells))
    burst(cells[col][row], { count: 12, distance: 90, gravity: 40 });
  await wait(CONFIG.cascadeExplodeMs);
}

/**
 * Проигрывает последовательность сеток тумбла. Сервер прислал по сетке на шаг:
 * все, кроме последней, содержат выигрышные символы, последняя — «пустая».
 */
async function playGrids(grids, scatters) {
  for (let step = 0; step < grids.length; step++) {
    paintGrid(grids[step]);
    const hits = matchesOn(grids[step]);
    clearHighlight();
    highlight(hits);
    drawOverlay(hits);
    renderHits(hits, step === 0 ? scatters : 0);
    markPaytable(hits);
    if (def.cascade) {
      renderLadder(step);
      $("cascadeBadge").hidden = !hits.length;
      $("cascadeBadge").textContent = t("cascadeStep", { multiplier: ladderStep(step) });
    }
    if (step === grids.length - 1) break;
    await wait(CONFIG.hitHoldMs);
    await explode(hits);
    $("reels").classList.add("dropping");
    await wait(CONFIG.cascadeDropMs);
    $("reels").classList.remove("dropping");
  }
}

/* --- Фриспины ------------------------------------------------------------- */
/**
 * Серия фриспинов из ответа сервера. Сетки бонусных вращений сервер не
 * присылает, поэтому показываем честную хронику: сколько спинов, что принёс
 * каждый и какой множитель раунда. Значения нормализуются к общей ставке ровно
 * так же, как это делает сервер (win / betUnits) — ни одна сумма не считается.
 */
async function playFreeSpins(freeSpins) {
  const panel = $("freeSpins");
  const asBetMultiple = (units) => (Number(units) / def.betUnits).toFixed(2);
  panel.hidden = false;
  $("freeSpinsTitle").textContent = t("freeSpinsAwarded", { count: freeSpins.played });
  $("freeSpinsRound").textContent = t("roundMultiplier", { multiplier: freeSpins.multiplier });
  $("freeSpinsChips").replaceChildren();
  $("freeSpinsTotal").textContent = "";
  play("bigWin");
  await wait(CONFIG.freeSpinIntroMs);
  const rounds = Array.isArray(freeSpins.rounds) ? freeSpins.rounds : [];
  for (const [index, roundWin] of rounds.entries()) {
    $("freeSpinsRound").textContent = t("freeSpinRound", {
      index: index + 1,
      total: freeSpins.played,
    });
    const chip = document.createElement("b");
    chip.className = "fsChip";
    chip.dataset.win = String(Number(roundWin) > 0);
    chip.textContent = Number(roundWin) > 0 ? `×${asBetMultiple(roundWin)}` : "—";
    $("freeSpinsChips").append(chip);
    play(Number(roundWin) > 0 ? "reveal" : "tick");
    await wait(CONFIG.freeSpinStepMs);
  }
  $("freeSpinsRound").textContent = t("roundMultiplier", { multiplier: freeSpins.multiplier });
  $("freeSpinsTotal").textContent = t("freeSpinsTotal", {
    amount: `×${asBetMultiple(freeSpins.win)}`,
  });
  await wait(CONFIG.freeSpinOutroMs);
  panel.hidden = true;
}

/* --- Статичная витрина профиля ------------------------------------------- */
const modeLabel = () =>
  def.cascade ? t("modeCascade") : def.mode === "ways" ? t("modeWays") : t("modeLines");

const countLabel = () =>
  def.mode === "ways" ? t("waysCount", { count: def.ways }) : t("linesCount", { count: def.paylines.length });

function buildReels() {
  const host = $("reels");
  host.replaceChildren();
  // Габариты поля живут на .machine: от них считаются и пропорция ячейки,
  // и предельная ширина машины, чтобы сетка помещалась по высоте.
  $("machine").style.setProperty("--cols", def.cols);
  $("machine").style.setProperty("--rows", def.rows);
  cells = [];
  for (let col = 0; col < def.cols; col++) {
    const reel = document.createElement("div");
    reel.className = "reel";
    const column = [];
    for (let row = 0; row < def.rows; row++) {
      const cell = document.createElement("div");
      cell.className = "symbol";
      cell.setAttribute("aria-hidden", "true");
      column.push(cell);
      reel.append(cell);
    }
    cells.push(column);
    host.append(reel);
  }
}

function paytableRow(symbol, value) {
  const row = document.createElement("div"),
    name = document.createElement("span"),
    icon = document.createElement("i"),
    amount = document.createElement("b");
  row.className = "paytable__row";
  row.dataset.symbol = symbol;
  icon.className = "paytable__icon";
  icon.style.setProperty("--symbol-art", symbolArt.get(symbol) || "none");
  name.textContent = symbolLabel(symbol);
  name.prepend(icon);
  amount.textContent = value;
  row.append(name, amount);
  return row;
}

function buildPaytable() {
  const host = $("paytable");
  host.replaceChildren();
  for (const symbol of Object.keys(def.paytable))
    host.append(
      paytableRow(
        symbol,
        [3, 4, 5]
          .map((count) => def.paytable[symbol][count])
          .filter((value) => value !== undefined)
          .join(" / "),
      ),
    );
  if (def.wild && def.wildMultiplier > 1)
    host.append(paytableRow(def.wild, t("wildPays", { multiplier: def.wildMultiplier })));
  if (def.scatter && def.scatterPays)
    host.append(
      paytableRow(
        def.scatter,
        [3, 4, 5]
          .map((count) => def.scatterPays[count])
          .filter((value) => value !== undefined)
          .join(" / "),
      ),
    );
}

/** Выигравшие символы помечаются в таблице выплат. */
function markPaytable(hits) {
  const winners = new Set(hits.map((hit) => hit.symbol));
  for (const row of $("paytable").children)
    row.dataset.hit = String(winners.has(row.dataset.symbol));
}

/*
 * Ставки, на которых заявленная в шапке отдача действительно достижима.
 * Сервер начисляет floor(общая ставка × множитель раунда): при мелкой общей
 * ставке дробные выплаты обнуляются, и фактический возврат уезжает от
 * targetRtp. Замер на матпрофилях (200k спинов): ways-243 при общей ставке
 * 1 кредит отдаёт 87.0% вместо 95.5%, cascade-ways — 86.8% вместо 95.5%,
 * с 10 кредитов оба возвращаются к 94.3–95.0%. Поэтому опции, дающие общую
 * ставку меньше CONFIG.minTotalBet, в списке не показываются: игра не вправе
 * предлагать ставку, на которой её же обещание про RTP неверно.
 */
const betOptions = () => {
  const allowed = def.betOptions.filter((value) => def.betUnits * value >= CONFIG.minTotalBet);
  return allowed.length ? allowed : def.betOptions;
};

const lineBet = () => Number($("bet").value) || betOptions()[0];
const totalBet = () => def.betUnits * lineBet();

function refreshBet() {
  $("totalBet").textContent = `${t("totalBet")} · ${t("betFormula", {
    units: def.betUnits,
    line: money(lineBet()),
    total: money(totalBet()),
  })} ${t("credits")}`;
}

function applyEngine() {
  document.title = def.name;
  $("title").textContent = def.name;
  $("mode").textContent = `${modeLabel()} · ${countLabel()}`;
  $("rtp").textContent = `${t("rtpLabel")} ${(def.targetRtp * 100).toFixed(1)}%`;
  $("engineInfo").textContent = def.freeSpins
    ? `${t("freeSpinsLabel")} ${def.freeSpins.count} · ×${def.freeSpins.multiplier}`
    : modeLabel();
  buildSymbolArt();
  buildReels();
  buildPaytable();
  $("bet").replaceChildren(
    ...betOptions().map((value) =>
      Object.assign(document.createElement("option"), {
        value,
        textContent: `${money(value)} ${t("credits")}`,
      }),
    ),
  );
  $("ladder").hidden = !def.cascade;
  if (def.cascade) renderLadder(-1);
  refreshBet();
  churn();
}

/* --- Раунд ---------------------------------------------------------------- */
/** Ступенчатая остановка барабанов слева направо, каждый — со щелчком. */
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

function lock(state) {
  busy = state;
  $("spin").disabled = state;
  $("spin").dataset.idle = String(!state);
  $("bet").disabled = state;
  $("betUp").disabled = state;
  $("betDown").disabled = state;
}

function reject(messageKey) {
  $("reels").classList.remove("spinning");
  $("status").textContent = t(messageKey);
  $("status").dataset.state = "lose";
  play("error");
  lock(false);
}

async function spin() {
  if (busy || !def) return;
  const amount = totalBet();
  if (!Number.isSafeInteger(amount) || amount < 1) return;
  lock(true);
  clearHighlight();
  $("cascadeBadge").hidden = true;
  $("freeSpins").hidden = true;
  if (def.cascade) renderLadder(-1);
  markPaytable([]);
  $("result").textContent = "";
  $("result").dataset.state = "";
  $("win").textContent = "0";
  $("status").textContent = t("betPending");
  $("status").dataset.state = "";
  for (const reel of $("reels").children) reel.classList.remove("stopped");
  $("reels").classList.add("spinning");
  play("bet");

  const roundId = `${def.id}_${crypto.randomUUID().replaceAll("-", "")}`;
  const approved = await sdk.bet(amount, roundId);
  if (approved?.type !== "BET_APPROVED")
    return reject(
      approved?.payload?.reason === "insufficient_funds" ? "insufficient" : "betRejected",
    );

  // Фаза вращения: сетка мерцает случайными символами, пока сервер не ответит.
  play("spin");
  const started = performance.now();
  let lastChurn = 0;
  await new Promise((resolve) => {
    const frame = (now) => {
      if (now - lastChurn > CONFIG.churnMs) {
        churn();
        lastChurn = now;
      }
      now - started < CONFIG.spinMs ? requestAnimationFrame(frame) : resolve();
    };
    requestAnimationFrame(frame);
  });

  $("status").textContent = t("settling");
  const settled = await sdk.settle(roundId);
  if (settled?.type !== "ROUND_SETTLED") return reject("settleError");

  const payload = settled.payload;
  const outcome = payload.outcome || {};
  const grids = Array.isArray(outcome.grids) && outcome.grids.length ? outcome.grids : null;
  if (!grids) return reject("settleError");

  paintGrid(grids[0]);
  await stopReels();
  await playGrids(grids, Number(outcome.scatters || 0));
  if (outcome.freeSpins) await playFreeSpins(outcome.freeSpins);

  // Итог раунда — целиком из ответа сервера: сумма и множитель не пересчитываются.
  const win = Number(payload.win || 0);
  const multiplier = Number(payload.multiplier || 0);
  $("result").textContent = win
    ? `${t("youWon", { amount: money(win) })} · ${multiplier.toFixed(2)}×`
    : t("loss");
  // Проигрыш в слоте не наказываем вспышкой — нейтральный итог раунда.
  $("result").dataset.state = win > 0 ? "win" : "";
  $("status").textContent = t("ready");
  $("status").dataset.state = "";
  if (win > 0) {
    play(multiplier >= CONFIG.bigWinMultiplier ? "bigWin" : "win");
    celebrate({ element: $("win"), from: 0, to: win, multiplier, locale: t.locale });
  }
  lock(false);
}

/* --- Управление ----------------------------------------------------------- */
// Степпер ставки листает дискретные опции профиля, края зажаты.
const stepBet = (delta) => {
  const bet = $("bet");
  if (bet.disabled || !bet.options.length) return;
  bet.selectedIndex = Math.min(bet.options.length - 1, Math.max(0, bet.selectedIndex + delta));
  play("tick");
  refreshBet();
};
$("betUp").onclick = () => stepBet(CONFIG.betStepOptions);
$("betDown").onclick = () => stepBet(-CONFIG.betStepOptions);
$("bet").onchange = refreshBet;

$("sound").onclick = (event) => {
  const muted = audio.toggle();
  event.currentTarget.setAttribute("aria-pressed", String(!muted));
  event.currentTarget.textContent = muted ? "♪̶" : "♪";
  if (!muted) play("click");
};

// Оверлей нарисован в пикселях сетки, поэтому после ресайза его надо
// пересчитать. Стирать нельзя: подсветка ячеек и чипы совпадений остаются, и
// пропавшая линия выигрыша выглядит как сбой.
addEventListener("resize", () => drawOverlay(shownHits));

function boot() {
  if (!engineId || !ENGINE_IDS.includes(engineId)) fail(t("errUnknownEngine"));
  def = ENGINES[engineId];
  applyEngine();
  sdk = new CasinoBridge(def.id);
  addEventListener("casino:balance", (event) => {
    balance = Number(event.detail.balance) || 0;
    $("balance").textContent = money(balance);
    if (!busy) {
      lock(false);
      $("status").textContent = t("ready");
      $("status").dataset.state = "";
    }
  });
  $("spin").onclick = spin;
  $("app").setAttribute("aria-busy", "false");
  sdk.start();
}

try {
  boot();
} catch (error) {
  if ($("error").hidden) fail(t("errLoad", { message: error.message }));
}
