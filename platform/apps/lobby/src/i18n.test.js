import { describe, expect, it } from "vitest";
import { translate } from "./i18n";
import { DEFAULT_LOCALE, LOCALES, messages } from "./locales";

const base = Object.keys(messages[DEFAULT_LOCALE]);

describe("i18n catalog", () => {
  it("every declared locale has a message block", () => {
    for (const code of Object.keys(LOCALES)) expect(messages[code], `messages.${code}`).toBeTruthy();
  });

  it("every locale defines EXACTLY the English key set (no missing, no extra)", () => {
    for (const code of Object.keys(messages)) {
      const keys = Object.keys(messages[code]).sort();
      expect(keys, `locale ${code} keys`).toEqual([...base].sort());
    }
  });

  it("no locale leaves a value blank", () => {
    for (const [code, dict] of Object.entries(messages))
      for (const [key, val] of Object.entries(dict)) expect(val, `${code}.${key}`).toBeTruthy();
  });

  it("preserves every {placeholder} across all translations", () => {
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
    for (const key of base) {
      const want = ph(messages[DEFAULT_LOCALE][key]);
      for (const code of Object.keys(messages))
        expect(ph(messages[code][key]), `${code}.${key} placeholders`).toEqual(want);
    }
  });
});

describe("translate()", () => {
  it("substitutes named placeholders", () => {
    expect(translate("en", "trust.playableGames", { count: 211 })).toBe("211 playable games");
    expect(translate("ru", "live.won", { name: "Player #1A2B", amount: "500", game: "Dice" })).toBe(
      "Player #1A2B выиграл 500 в Dice",
    );
  });

  it("falls back to English for an unknown locale, then to the raw key", () => {
    expect(translate("zz", "nav.games")).toBe("Games");
    expect(translate("en", "no.such.key")).toBe("no.such.key");
  });

  it("leaves an unknown placeholder untouched rather than throwing", () => {
    expect(translate("en", "live.won", { name: "A" })).toContain("{amount}");
  });
});
