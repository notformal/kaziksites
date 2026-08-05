import { describe, expect, it } from 'vitest';
import {
  GAMES,
  CATEGORIES,
  VIRTUAL_CATEGORIES,
  STUDIOS,
  games,
  categories,
  getGameStats,
  getGamesByCategory,
  searchGames,
  getGameById,
} from './catalog';

describe('catalog source data', () => {
  it('has no duplicate ids', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });

  it('every game uses a declared category', () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    expect(GAMES.every((g) => known.has(g.category))).toBe(true);
  });

  it('every game uses a declared studio', () => {
    expect(GAMES.every((g) => Boolean(STUDIOS[g.studio]))).toBe(true);
  });

  it('every game carries the metadata the lobby renders', () => {
    expect(GAMES.every((g) => g.id && g.name && g.glyph && g.description)).toBe(true);
  });

  it('does not attribute in-house titles to third-party providers', () => {
    const outsideBrands = ['playson', 'evolution', 'netent', 'pragmatic', 'spribe'];
    const studioNames = Object.values(STUDIOS).map((s) => s.name.toLowerCase());
    expect(studioNames.some((n) => outsideBrands.some((b) => n.includes(b)))).toBe(false);
  });
});

describe('derived lobby view', () => {
  it('exposes one card per game', () => {
    expect(games).toHaveLength(GAMES.length);
  });

  it('cards carry every field the storefront reads', () => {
    for (const c of games) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.icon).toBeTruthy();
      expect(typeof c.hue).toBe('number');
      expect(c.studio).toBeTruthy();
      expect(c.rating).toBeGreaterThan(0);
      expect(c.rating).toBeLessThanOrEqual(5);
      expect(c.url).toMatch(/^\/games\/.+\/index\.html$/);
      expect(c.license).toBeTruthy();
    }
  });

  it('every card category is a selectable filter chip', () => {
    expect(games.every((g) => categories.includes(g.category))).toBe(true);
  });

  it('filter chips start with the virtual filters', () => {
    expect(categories.slice(0, VIRTUAL_CATEGORIES.length)).toEqual([...VIRTUAL_CATEGORIES]);
  });
});

describe('lookups', () => {
  it('stats are consistent with the catalog', () => {
    const stats = getGameStats();
    expect(stats.total).toBe(GAMES.length);
    expect(Object.values(stats.byCategory).reduce((a, b) => a + b, 0)).toBe(GAMES.length);
  });

  it('category filter returns only that category', () => {
    for (const c of CATEGORIES) {
      expect(getGamesByCategory(c.id).every((g) => g.category === c.id)).toBe(true);
    }
    expect(getGamesByCategory('all')).toHaveLength(GAMES.length);
  });

  it('lookup by id round-trips', () => {
    expect(getGameById(GAMES[0].id)).toBe(GAMES[0]);
    expect(getGameById('does-not-exist')).toBeUndefined();
  });

  it('search matches on name', () => {
    expect(searchGames(GAMES[0].name.slice(0, 4)).length).toBeGreaterThan(0);
    expect(searchGames('')).toHaveLength(GAMES.length);
  });
});

describe('cover art', () => {
  it('every declared cover exists on disk', async () => {
    const { existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const missing = games
      .filter((g) => g.cover)
      .map((g) => ({ id: g.id, path: resolve(process.cwd(), 'public', g.cover.replace(/^\//, '')) }))
      .filter((g) => !existsSync(g.path))
      .map((g) => g.id);
    expect(missing, 'run `npm run build:covers`').toEqual([]);
  });


  it('every generated cover is declared in the catalog', async () => {
    const { readdirSync, existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const dir = resolve(process.cwd(), 'public/games');
    const onDisk = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(resolve(dir, d.name, 'cover.png')))
      .map((d) => d.name)
      .sort();
    const declared = games.filter((g) => g.cover).map((g) => g.id).sort();
    expect(declared).toEqual(onDisk);
  });

  it('no game falls back to an emoji tile', () => {
    const uncovered = games.filter((g) => !g.cover).map((g) => g.id);
    expect(uncovered, 'run `npm run build:covers`').toEqual([]);
  });

  it('games without a cover still have a glyph to fall back to', () => {
    expect(games.filter((g) => !g.cover).every((g) => Boolean(g.icon))).toBe(true);
  });
});
