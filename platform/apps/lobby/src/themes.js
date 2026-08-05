// Тема бренда = визуальная часть (имя, акценты, layout) из platform/config/games.config.json,
// инжектируемого сборкой как __BRAND_REGISTRY__. Все тексты бренда живут в locales.js
// под ключами brand.<id>.* — здесь нет ни одной переводимой строки.
const registry =
  typeof __BRAND_REGISTRY__ !== "undefined"
    ? __BRAND_REGISTRY__
    : [{ id: "aurora", name: "Aurora Play", accent: "#c7ff3d", accent2: "#31d7f2", layout: "signal-control-room" }];

export const BRAND_LIST = registry;
export const DEFAULT_BRAND = registry[0].id;

export const themes = Object.fromEntries(
  registry.map((brand) => [
    brand.id,
    {
      id: brand.id,
      name: brand.name,
      accent: brand.accent,
      accent2: brand.accent2,
      layout: brand.layout,
    },
  ]),
);

/** Активный бренд: фиксирован сборкой, иначе ?brand= в URL, иначе первый в реестре. */
export function resolveBrand(search = typeof location === "undefined" ? "" : location.search) {
  const fromBuild = import.meta.env.VITE_BRAND;
  const fromQuery = new URLSearchParams(search).get("brand");
  const candidate = fromBuild || fromQuery || DEFAULT_BRAND;
  return themes[candidate] ? candidate : DEFAULT_BRAND;
}
