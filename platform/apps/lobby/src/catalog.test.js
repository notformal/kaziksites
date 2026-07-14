import { describe, expect, it } from "vitest";
import { games, categories } from "./catalog";
describe("catalog", () => {
  it("contains 200 unique playable games", () => {
    expect(games).toHaveLength(200);
    expect(new Set(games.map((g) => g.id)).size).toBe(200);
  });
  it("publishes 127 registered original slot titles", () => {
    expect(games.filter((game) => game.engineSlug === "slots-studio")).toHaveLength(127);
  });
  it("uses only known categories", () => {
    expect(games.every((g) => categories.includes(g.category))).toBe(true);
  });
  it("has complete display metadata", () => {
    expect(games.every((g) => g.title && g.studio && g.icon && g.rating)).toBe(
      true,
    );
  });
});
