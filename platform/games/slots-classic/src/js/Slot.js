import Reel from "./Reel.js";
import Symbol from "./Symbol.js";
import { PAYLINE_ROW, REELS, ROWS, SYMBOLS, WIN_HIGHLIGHT_MS } from "./game.config.js";

/**
 * Барабаны Nova Classic Slots.
 *
 * Клиент НЕ решает исход: ставка уходит на сервер, сервер возвращает множитель,
 * и только после этого строится сетка, которая этот множитель показывает.
 * Раньше символы выбирались случайно в браузере и не имели отношения к выплате.
 */
export default class Slot {
  constructor(domElement, config = {}) {
    Symbol.preload();

    this.config = config;
    this.container = domElement;
    this.busy = false;
    this.currentSymbols = blankGrid();

    this.reels = Array.from(this.container.getElementsByClassName("reel")).map(
      (reelContainer, idx) => new Reel(reelContainer, idx, this.currentSymbols[idx]),
    );
    this.spinButton = document.getElementById("spin");
    this.autoPlayCheckbox = document.getElementById("autoplay");
    if (config.inverted) this.container.classList.add("inverted");
  }

  async spin() {
    if (this.busy) return;
    this.busy = true;
    this.spinButton.disabled = true;
    this.container.classList.remove("win");

    try {
      const approved = this.config.requestBet ? await this.config.requestBet() : { roundId: null };
      if (!approved) return;

      const settled = this.config.requestSettlement
        ? await this.config.requestSettlement(approved.roundId)
        : null;

      const multiplier = Number(settled?.multiplier || 0);
      const grid = gridForMultiplier(multiplier, this.config.payTable || [], approved.roundId || "");
      this.currentSymbols = grid;

      await Promise.all(
        this.reels.map((reel) => {
          reel.renderSymbols(grid[reel.idx]);
          return reel.spin();
        }),
      );

      this.config.onRoundSettled?.(settled);
      if (multiplier > 0) {
        this.container.classList.add("win");
        setTimeout(() => this.container.classList.remove("win"), WIN_HIGHLIGHT_MS);
      }
    } finally {
      this.busy = false;
      this.spinButton.disabled = false;
    }

    if (this.autoPlayCheckbox?.checked) setTimeout(() => this.spin(), 600);
  }
}

const blankGrid = () =>
  Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => SYMBOLS[0]));

/** Детерминированный поток чисел из строки — визуал раунда воспроизводим. */
function seededStream(seed) {
  let state = 2166136261;
  for (const char of String(seed)) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/**
 * Строит сетку под серверный множитель: выигрышные символы ложатся на
 * центральную линию, остальные ячейки заполняются так, чтобы не образовать
 * вторую (не оплаченную сервером) комбинацию на той же линии.
 */
export function gridForMultiplier(multiplier, payTable, seed) {
  const random = seededStream(seed);
  const pick = (exclude = []) => {
    const pool = SYMBOLS.filter((s) => !exclude.includes(s));
    return pool[Math.floor(random() * pool.length)] || SYMBOLS[0];
  };

  const grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pick()));

  const row = payTable.find((entry) => Math.abs(entry.multiplier - multiplier) < 1e-9);
  if (!row) {
    // Проигрыш: гарантируем, что первые два барабана линии различаются.
    grid[0][PAYLINE_ROW] = pick();
    grid[1][PAYLINE_ROW] = pick([grid[0][PAYLINE_ROW]]);
    return grid;
  }

  for (let reel = 0; reel < REELS; reel++) {
    grid[reel][PAYLINE_ROW] = reel < row.count ? row.symbol : pick([row.symbol]);
  }
  return grid;
}
