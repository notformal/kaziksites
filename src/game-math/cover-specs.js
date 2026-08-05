/**
 * ═══════════════════════════════════════════════════════════
 * COVER-ONLY ART SPECS
 *
 * Cover art for the casino titles that are *not* driven by the slot engine —
 * the table games, the instant games and the legacy fruit slot. Those games
 * ship their own self-contained implementations and so have no `math.json` for
 * the cover builder to read a symbol cast from.
 *
 * They still need real cover art: a lobby where half the tiles are drawn art
 * and half are emoji does not read as one product. These entries describe the
 * same thing a manifest would — a palette and a small cast of symbols — using
 * the same procedural art vocabulary, so the tiles come out of the same
 * pipeline and look like siblings.
 * ═══════════════════════════════════════════════════════════
 */

import { HUES } from '../../public/games/_engine/art/palette.js';

const art = (family, params, hue, glyph) => ({
  family,
  params,
  hue,
  ...(glyph ? { glyph } : {}),
});

export const COVER_SPECS = [
  {
    id: 'blackjack-pro',
    title: 'Blackjack Pro',
    theme: {
      backgroundHue: HUES.emerald,
      backgroundLightness: 0.07,
      accentHue: HUES.gold,
      secondaryHue: HUES.bone,
      metal: 'gold',
    },
    hero: art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.bone, 'A'),
    supporting: [
      art('coin', { emblem: 8 }, HUES.gold),
      art('gem', { sides: 4, squash: 1.3 }, HUES.crimson),
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.slate, 'K'),
      art('sigil', { rays: 6, inner: 0.44 }, HUES.emerald),
    ],
  },
  {
    id: 'baccarat-pro',
    title: 'Baccarat Pro',
    theme: {
      backgroundHue: HUES.indigo,
      backgroundLightness: 0.07,
      accentHue: HUES.gold,
      secondaryHue: HUES.crimson,
      metal: 'gold',
    },
    hero: art('crown', { points: 4 }, HUES.gold),
    supporting: [
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.crimson, 'Q'),
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.slate, 'J'),
      art('gem', { sides: 6 }, HUES.violet),
      art('coin', { emblem: 6 }, HUES.amber),
    ],
  },
  {
    id: 'roulette-royale',
    title: 'Roulette Royale',
    theme: {
      backgroundHue: HUES.emerald,
      backgroundLightness: 0.065,
      accentHue: HUES.crimson,
      secondaryHue: HUES.gold,
      metal: 'gold',
    },
    hero: art('instrument', { arms: 12, hub: 0.22 }, HUES.crimson),
    supporting: [
      art('coin', { emblem: 10 }, HUES.gold),
      art('orb', { rings: 0, tilt: 0 }, HUES.bone),
      art('gem', { sides: 6 }, HUES.emerald),
      art('sigil', { rays: 8, inner: 0.4 }, HUES.amber),
    ],
  },
  {
    id: 'crash-pro',
    title: 'Crash Pro',
    theme: {
      backgroundHue: HUES.azure,
      backgroundLightness: 0.07,
      accentHue: HUES.lime,
      secondaryHue: HUES.magenta,
      metal: 'silver',
    },
    hero: art('bolt', {}, HUES.lime),
    supporting: [
      art('sigil', { rays: 10, inner: 0.3 }, HUES.cyan),
      art('orb', { rings: 2, tilt: -0.3 }, HUES.magenta),
      art('gem', { sides: 5, squash: 1.25 }, HUES.azure),
      art('coin', { emblem: 12 }, HUES.slate),
    ],
  },
  {
    id: 'plinko-master',
    title: 'Plinko Master',
    theme: {
      backgroundHue: HUES.violet,
      backgroundLightness: 0.07,
      accentHue: HUES.cyan,
      secondaryHue: HUES.lime,
      metal: 'silver',
    },
    hero: art('gem', { sides: 3, squash: 1.35 }, HUES.cyan),
    supporting: [
      art('orb', { rings: 0, tilt: 0 }, HUES.lime),
      art('orb', { rings: 0, tilt: 0 }, HUES.magenta),
      art('orb', { rings: 0, tilt: 0 }, HUES.amber),
      art('orb', { rings: 0, tilt: 0 }, HUES.azure),
    ],
  },
  {
    id: 'lightning-dice',
    title: 'Lightning Dice',
    theme: {
      backgroundHue: HUES.indigo,
      backgroundLightness: 0.07,
      accentHue: HUES.amber,
      secondaryHue: HUES.cyan,
      metal: 'silver',
    },
    hero: art('bolt', {}, HUES.amber),
    supporting: [
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.bone, '5'),
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.slate, '3'),
      art('rank', { sides: 4, rotation: Math.PI / 4 }, HUES.bone, '6'),
      art('sigil', { rays: 12, inner: 0.28 }, HUES.cyan),
    ],
  },
  {
    id: 'fruit-shop',
    title: 'Fruit Market',
    theme: {
      backgroundHue: HUES.teal,
      backgroundLightness: 0.07,
      accentHue: HUES.crimson,
      secondaryHue: HUES.lime,
      metal: 'bronze',
    },
    hero: art('flora', { lobes: 2, stem: true }, HUES.crimson),
    supporting: [
      art('flora', { lobes: 6, stem: true }, HUES.violet),
      art('gem', { sides: 8 }, HUES.gold),
      art('flora', { lobes: 1, stem: true }, HUES.lime),
      art('vessel', { neck: 0.48, belly: 0.82, handles: false }, HUES.amber),
    ],
  },
];

export const COVER_SPEC_IDS = Object.freeze(COVER_SPECS.map((s) => s.id));

export default COVER_SPECS;
