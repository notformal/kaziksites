// Загрузчик единого конфига платформы. Импортируется build-скриптами, vite-конфигом
// лобби и QA-скриптами, чтобы список брендов и игровых бандлов жил в одном месте.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const configUrl = new URL("./games.config.json", import.meta.url);

/** Корень монорепо platform/ — все относительные пути в конфиге считаются от него. */
export const PLATFORM_ROOT = path.resolve(
  path.dirname(fileURLToPath(configUrl)),
  "..",
);

/** @type {{brands:Array<{id:string,name:string,color:string,themeColor:string,tagline:string}>,staticGamesDir:string,gameBundles:Array<{slug:string,workspace:string,dir:string}>,staticGameSlugs:string[]}} */
export const platformConfig = JSON.parse(readFileSync(configUrl, "utf8"));

export const BRANDS = platformConfig.brands;
export const LOCAL_PREVIEW = platformConfig.localPreview;
export const BRAND_IDS = BRANDS.map((brand) => brand.id);
export const GAME_BUNDLES = platformConfig.gameBundles;
export const STATIC_GAME_SLUGS = platformConfig.staticGameSlugs;

/** Бренд по id, либо null для нейтральной (небрендированной) сборки. */
export function brandById(id) {
  return BRANDS.find((brand) => brand.id === id) ?? null;
}

/** Абсолютный путь внутри platform/ по относительному пути из конфига. */
export function resolveFromRoot(...segments) {
  return path.resolve(PLATFORM_ROOT, ...segments);
}
