import { describe, expect, it } from "vitest";
import { games, categories } from "./catalog";

// Портфель — только казино: 19 серверных оригиналов (16 базовых + 3 премиум-слота
// на движке slotEngine) + 127 слот-титулов студии.
const CORE_CASINO = 19;
const SLOT_TITLES = 127;
const PREMIUM_ENGINES = ["classic-lines", "ways-243", "cascade-ways"];

describe("catalog", () => {
  it("contains only casino games, all unique and server-authoritative", () => {
    expect(games).toHaveLength(CORE_CASINO + SLOT_TITLES);
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
    expect(games.every((g) => g.serverGame === true)).toBe(true);
    // Аркадных категорий и iframe-игр с url в казино-портфеле быть не должно.
    expect(games.some((g) => g.category === "Arcade" || g.url)).toBe(false);
  });
  it("publishes 127 registered original slot titles", () => {
    expect(games.filter((game) => game.engineSlug === "slots-studio")).toHaveLength(SLOT_TITLES);
  });
  it("publishes the three premium slotEngine games on one shared bundle", () => {
    const premium = games.filter((game) => game.engineSlug === "slots-premium");
    // slug = id профиля на сервере (его хост шлёт в /api/wallet/bet),
    // engineId уходит в iframe как ?engine= и выбирает математику в бандле.
    expect(premium.map((game) => game.slug)).toEqual(PREMIUM_ENGINES);
    expect(premium.map((game) => game.engineId)).toEqual(PREMIUM_ENGINES);
    expect(premium.map((game) => game.title)).toEqual([
      "Royal Lines",
      "Gem Ways 243",
      "Tumble Peaks",
    ]);
    expect(premium.every((game) => game.category === "Slots")).toBe(true);
    expect(premium.every((game) => game.serverGame === true)).toBe(true);
  });
  it("keeps engineId out of single-engine bundles", () => {
    expect(
      games.filter((game) => game.engineId && game.engineSlug !== "slots-premium"),
    ).toHaveLength(0);
  });
  it("uses only known categories", () => {
    expect(games.every((g) => categories.includes(g.category))).toBe(true);
  });
  it("has complete display metadata", () => {
    expect(games.every((g) => g.title && g.studio && g.icon && g.rating)).toBe(true);
  });
});
