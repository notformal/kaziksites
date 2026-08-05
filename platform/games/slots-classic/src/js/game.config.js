// Конфигурация Nova Classic Slots. Барабаны рисуются по множителю, который вернул
// сервер, поэтому таблица ниже — единственное место, где живёт связь
// «серверный множитель → видимая комбинация». Меняется только здесь.
export const REELS = 5;
export const ROWS = 3;
/** Индекс ряда, по которому идёт выигрышная линия (центральная). */
export const PAYLINE_ROW = 1;

export const SYMBOLS = ["gem", "crown", "star", "bolt", "moon", "seven"];

/**
 * Серверные множители slots-classic: multipliersMilli [0, 1500, 2500, 10000, 50000].
 * Каждому соответствует читаемая комбинация на центральной линии.
 */
export const PAY_TABLE = [
  { multiplier: 1.5, symbol: "moon", count: 3 },
  { multiplier: 2.5, symbol: "star", count: 4 },
  { multiplier: 10, symbol: "crown", count: 5 },
  { multiplier: 50, symbol: "seven", count: 5 },
];

/** Ставка: границы и шаг поля ввода. */
export const BET = { min: 1, max: 100000, step: 10, default: 100 };

/** Максимальный выигрыш, который показываем в шапке (в ставках). */
export const MAX_WIN_MULTIPLIER = Math.max(...PAY_TABLE.map((row) => row.multiplier));

/** Длительность подсветки выигрышной линии, мс. */
export const WIN_HIGHLIGHT_MS = 1600;

/** Строки, специфичные для этой игры (общие термины — в game-sdk/i18n.js). */
export const GAME_STRINGS = {
  en: { title: "Nova Classic Slots", line: "Payline", noWin: "No win this spin" },
  ru: { title: "Nova Classic Slots", line: "Линия выплат", noWin: "В этом спине без выигрыша" },
  uk: { title: "Nova Classic Slots", line: "Лінія виплат", noWin: "У цьому спіні без виграшу" },
  es: { title: "Nova Classic Slots", line: "Línea de pago", noWin: "Sin premio en este giro" },
  de: { title: "Nova Classic Slots", line: "Gewinnlinie", noWin: "Kein Gewinn in diesem Spin" },
  fr: { title: "Nova Classic Slots", line: "Ligne de paiement", noWin: "Pas de gain sur ce tour" },
  pt: { title: "Nova Classic Slots", line: "Linha de pagamento", noWin: "Sem prêmio neste giro" },
};
