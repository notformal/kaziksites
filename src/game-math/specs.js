/**
 * ═══════════════════════════════════════════════════════════
 * SLOT GAME SPECIFICATIONS — design intent, one entry per title.
 *
 * A spec says what a game *is*: its palette, its symbol cast, how volatile it
 * should feel and what RTP it must return. It says nothing about reel strips or
 * final pay values — `npm run build:math` derives those, calibrates them and
 * writes a frozen `math.json` next to the game. The browser never calibrates;
 * it loads a fixed, verified model, exactly as a certified slot would.
 *
 * Symbol art is procedural (see public/games/_engine/art/symbol-art.js): a
 * family plus parameters plus a hue. No emoji, no sprite sheets, no licensed
 * artwork — each cast is assembled to be unmistakably this game's.
 * ═══════════════════════════════════════════════════════════
 */

import { HUES } from '../../public/games/_engine/art/palette.js';

/**
 * Terse symbol constructor.
 *
 * @param {string} id
 * @param {string} tier     premium | high | mid | low
 * @param {string} name     English display name (paytable)
 * @param {string} family   art family
 * @param {object} params   art family parameters
 * @param {number} hue      base hue for this symbol's ramp
 * @param {string} [glyph]  letterform drawn over the plate (card ranks)
 */
const sym = (id, tier, name, family, params, hue, glyph) => ({
  id,
  tier,
  name,
  art: { family, params, hue, ...(glyph ? { glyph } : {}) },
});

/** The four card ranks every slot uses for its low tier, themed per game. */
const ranks = (family, params, hues) =>
  [
    ['ace', 'A'],
    ['king', 'K'],
    ['queen', 'Q'],
    ['jack', 'J'],
  ].map(([id, glyph], i) => sym(id, 'low', glyph, family, params, hues[i], glyph));

export const SPECS = [
  // ─────────────────────────────────────────────────────────
  {
    id: 'cosmic-queen',
    tuning: { premiumTaper: 0.09, tierScale: { premium: 0.85, mid: 1.1 }, scatterScale: 0.9 },
    title: 'Cosmic Queen',
    volatility: 'very-high',
    paylines: 15,
    targetRtp: 0.962,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'expandingWild',
    theme: {
      backgroundHue: HUES.indigo,
      backgroundLightness: 0.07,
      accentHue: HUES.magenta,
      secondaryHue: HUES.cyan,
      metal: 'silver',
    },
    symbols: [
      sym('diadem', 'premium', 'Star Diadem', 'crown', { points: 3 }, HUES.magenta),
      sym('nebula', 'premium', 'Nebula Core', 'gem', { sides: 8, squash: 1.02 }, HUES.violet),
      sym('ringworld', 'high', 'Ringworld', 'orb', { rings: 2, tilt: -0.28 }, HUES.azure),
      sym('comet', 'high', 'Comet', 'bolt', {}, HUES.cyan),
      sym('pulsar', 'mid', 'Pulsar', 'sigil', { rays: 8, inner: 0.4 }, HUES.rose),
      sym('lunar', 'mid', 'Lunar Mark', 'coin', { emblem: 5 }, HUES.slate),
      ...ranks('rank', { sides: 6 }, [HUES.violet, HUES.azure, HUES.magenta, HUES.indigo]),
    ],
    wild: sym('wild', 'premium', 'Cosmic Wild', 'sigil', { rays: 12, inner: 0.32 }, HUES.magenta),
    scatter: sym('scatter', 'mid', 'Wormhole', 'orb', { rings: 3, tilt: 0 }, HUES.teal),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'dragons-fortune',
    tuning: { premiumTaper: 0.05, tierScale: { high: 1.15, low: 0.95 }, freeSpinMultiplier: 4 },
    title: "Dragon's Fortune",
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.961,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'multiplierTrail',
    theme: {
      backgroundHue: HUES.crimson,
      backgroundLightness: 0.08,
      accentHue: HUES.gold,
      secondaryHue: HUES.ember,
      metal: 'gold',
    },
    symbols: [
      sym('dragon', 'premium', 'Jade Dragon', 'beast', { horns: 2, snout: 0.78, jaw: 0.52 }, HUES.emerald),
      sym('ingot', 'premium', 'Gold Ingot', 'coin', { emblem: 8 }, HUES.gold),
      sym('lantern', 'high', 'Sky Lantern', 'vessel', { neck: 0.26, belly: 0.74 }, HUES.ember),
      sym('koi', 'high', 'Koi Scale', 'gem', { sides: 7, squash: 1.12 }, HUES.amber),
      sym('fan', 'mid', 'Silk Fan', 'instrument', { arms: 6, hub: 0.2 }, HUES.crimson),
      sym('lotus', 'mid', 'Lotus', 'flora', { lobes: 6, stem: false }, HUES.rose),
      ...ranks('rank', { sides: 8 }, [HUES.crimson, HUES.ember, HUES.amber, HUES.gold]),
    ],
    wild: sym('wild', 'premium', 'Dragon Pearl', 'orb', { rings: 1, tilt: 0 }, HUES.gold),
    scatter: sym('scatter', 'mid', 'Temple Gong', 'coin', { emblem: 12 }, HUES.emerald),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'pharaohs-treasure',
    tuning: { premiumTaper: 0.07, tierScale: { premium: 1.1, mid: 0.9 }, wildScale: 1.15 },
    title: "Pharaoh's Treasure",
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'expandingSymbol',
    theme: {
      backgroundHue: HUES.teal,
      backgroundLightness: 0.075,
      accentHue: HUES.gold,
      secondaryHue: HUES.azure,
      metal: 'gold',
    },
    symbols: [
      sym('mask', 'premium', 'Burial Mask', 'beast', { horns: 2, snout: 0.6, jaw: 0.44 }, HUES.gold),
      sym('scarab', 'premium', 'Scarab', 'gem', { sides: 6, squash: 1.22 }, HUES.teal),
      sym('ankh', 'high', 'Ankh', 'instrument', { arms: 4, hub: 0.22 }, HUES.amber),
      sym('canopic', 'high', 'Canopic Jar', 'vessel', { neck: 0.32, belly: 0.8 }, HUES.sand),
      sym('eye', 'mid', 'Eye Sigil', 'sigil', { rays: 6, inner: 0.46 }, HUES.azure),
      sym('papyrus', 'mid', 'Lotus Bloom', 'flora', { lobes: 5 }, HUES.emerald),
      ...ranks('rank', { sides: 4, rotation: 0 }, [HUES.sand, HUES.amber, HUES.teal, HUES.azure]),
    ],
    wild: sym('wild', 'premium', 'Pyramid', 'gem', { sides: 3, squash: 1.1 }, HUES.gold),
    scatter: sym('scatter', 'mid', 'Sun Disc', 'coin', { emblem: 16 }, HUES.ember),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'slots-royal',
    tuning: { premiumTaper: 0.04, tierScale: { mid: 1.2, low: 1.05 }, wildScale: 0.85, freeSpinMultiplier: 2 },
    title: 'Slots Royal',
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'allButFirst',
    feature: 'progressiveJackpot',
    theme: {
      backgroundHue: HUES.crimson,
      backgroundLightness: 0.07,
      accentHue: HUES.gold,
      secondaryHue: HUES.violet,
      metal: 'gold',
    },
    symbols: [
      sym('crown', 'premium', 'Royal Crown', 'crown', { points: 5 }, HUES.gold),
      sym('signet', 'premium', 'Signet Gem', 'gem', { sides: 8 }, HUES.violet),
      sym('bell', 'high', 'Court Bell', 'vessel', { neck: 0.5, belly: 0.82, handles: false }, HUES.amber),
      sym('horseshoe', 'high', 'Horseshoe', 'instrument', { arms: 3, hub: 0.18 }, HUES.slate),
      sym('cherry', 'mid', 'Cherries', 'flora', { lobes: 2 }, HUES.crimson),
      sym('sovereign', 'mid', 'Sovereign', 'coin', { emblem: 6 }, HUES.gold),
      ...ranks('rank', { sides: 6 }, [HUES.crimson, HUES.violet, HUES.gold, HUES.amber]),
    ],
    wild: sym('wild', 'premium', 'Joker Star', 'sigil', { rays: 5, inner: 0.38 }, HUES.rose),
    scatter: sym('scatter', 'mid', 'Lucky Star', 'sigil', { rays: 10, inner: 0.44 }, HUES.lime),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'book-of-gold',
    tuning: { premiumTaper: 0.1, tierScale: { premium: 0.8, low: 1.1 }, wildScale: 0.6, scatterScale: 0.85 },
    title: 'Book of Gold',
    volatility: 'very-high',
    paylines: 10,
    targetRtp: 0.96,
    scatterAward: 'generous',
    wildPlacement: 'everywhere',
    feature: 'expandingSymbol',
    theme: {
      backgroundHue: HUES.emerald,
      backgroundLightness: 0.07,
      accentHue: HUES.gold,
      secondaryHue: HUES.ember,
      metal: 'gold',
    },
    symbols: [
      sym('idol', 'premium', 'Stone Idol', 'beast', { horns: 2, snout: 0.66 }, HUES.sand),
      sym('chalice', 'premium', 'Golden Chalice', 'vessel', { neck: 0.42, belly: 0.76 }, HUES.gold),
      sym('emerald', 'high', 'Emerald', 'gem', { sides: 5, squash: 1.14 }, HUES.emerald),
      sym('medallion', 'high', 'Medallion', 'coin', { emblem: 7 }, HUES.amber),
      sym('seal', 'mid', 'Wax Seal', 'sigil', { rays: 7, inner: 0.5 }, HUES.crimson),
      sym('fern', 'mid', 'Jungle Fern', 'flora', { lobes: 5 }, HUES.lime),
      ...ranks('rank', { sides: 6 }, [HUES.emerald, HUES.gold, HUES.ember, HUES.sand]),
    ],
    wild: sym('wild', 'premium', 'Book of Gold', 'tome', { emblem: 8 }, HUES.gold),
    scatter: sym('scatter', 'mid', 'Ancient Seal', 'sigil', { rays: 9, inner: 0.36 }, HUES.ember),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'gold-caravan',
    tuning: { premiumTaper: 0.05, tierScale: { high: 1.25, mid: 1.15, low: 0.9 }, wildScale: 1.3 },
    title: 'Gold Caravan',
    volatility: 'high',
    paylines: 10,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'pickAndWin',
    theme: {
      backgroundHue: HUES.azure,
      backgroundLightness: 0.075,
      accentHue: HUES.sand,
      secondaryHue: HUES.amber,
      metal: 'bronze',
    },
    symbols: [
      sym('camel', 'premium', 'Caravan Camel', 'beast', { horns: 0, snout: 0.92, jaw: 0.56 }, HUES.sand),
      sym('lamp', 'premium', 'Brass Lamp', 'vessel', { neck: 0.2, belly: 0.88 }, HUES.gold),
      sym('turquoise', 'high', 'Turquoise', 'gem', { sides: 6, squash: 0.94 }, HUES.cyan),
      sym('dinar', 'high', 'Silver Dinar', 'coin', { emblem: 9 }, HUES.slate),
      sym('astrolabe', 'mid', 'Astrolabe', 'instrument', { arms: 8, hub: 0.26 }, HUES.bronze ?? HUES.amber),
      sym('palm', 'mid', 'Date Palm', 'flora', { lobes: 5 }, HUES.emerald),
      ...ranks('rank', { sides: 8 }, [HUES.sand, HUES.azure, HUES.amber, HUES.cyan]),
    ],
    wild: sym('wild', 'premium', 'Caravan Seal', 'coin', { emblem: 7 }, HUES.amber),
    scatter: sym('scatter', 'mid', 'Sphinx', 'beast', { horns: 2, snout: 0.58 }, HUES.violet),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'magic-crystal',
    tuning: { premiumTaper: 0.03, tierScale: { mid: 1.25, low: 0.95 }, wildScale: 1.2 },
    title: 'Magic Crystal',
    volatility: 'medium',
    paylines: 10,
    targetRtp: 0.962,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'wheelBonus',
    theme: {
      backgroundHue: HUES.violet,
      backgroundLightness: 0.08,
      accentHue: HUES.cyan,
      secondaryHue: HUES.magenta,
      metal: 'silver',
    },
    symbols: [
      sym('shard', 'premium', 'Arcane Shard', 'gem', { sides: 5, squash: 1.32 }, HUES.cyan),
      sym('philtre', 'premium', 'Philtre', 'vessel', { neck: 0.22, belly: 0.7 }, HUES.magenta),
      sym('rune', 'high', 'Bound Rune', 'sigil', { rays: 6, inner: 0.5 }, HUES.azure),
      sym('scrying', 'high', 'Scrying Orb', 'orb', { rings: 1, tilt: 0 }, HUES.violet),
      sym('talisman', 'mid', 'Talisman', 'coin', { emblem: 6 }, HUES.slate),
      sym('nightbloom', 'mid', 'Nightbloom', 'flora', { lobes: 6 }, HUES.rose),
      ...ranks('rank', { sides: 3, rotation: -Math.PI / 2 }, [HUES.violet, HUES.cyan, HUES.magenta, HUES.indigo]),
    ],
    wild: sym('wild', 'premium', 'Prism', 'gem', { sides: 4, squash: 1.18 }, HUES.lime),
    scatter: sym('scatter', 'mid', 'Arcane Seal', 'sigil', { rays: 12, inner: 0.3 }, HUES.gold),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'hot-navigator',
    tuning: { premiumTaper: 0.08, tierScale: { premium: 0.95, high: 1.1 }, scatterScale: 1.1, freeSpinMultiplier: 2 },
    title: 'Hot Navigator',
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'directionBonus',
    theme: {
      backgroundHue: HUES.azure,
      backgroundLightness: 0.07,
      accentHue: HUES.amber,
      secondaryHue: HUES.teal,
      metal: 'bronze',
    },
    symbols: [
      sym('compass', 'premium', 'Brass Compass', 'instrument', { arms: 8, hub: 0.28 }, HUES.amber),
      sym('anchor', 'premium', 'Anchor', 'instrument', { arms: 3, hub: 0.2, teeth: 2 }, HUES.slate),
      sym('helm', 'high', "Ship's Helm", 'instrument', { arms: 6, hub: 0.24 }, HUES.sand),
      sym('beacon', 'high', 'Storm Lantern', 'vessel', { neck: 0.34, belly: 0.72 }, HUES.gold),
      sym('coral', 'mid', 'Coral', 'flora', { lobes: 5 }, HUES.rose),
      sym('doubloon', 'mid', 'Doubloon', 'coin', { emblem: 8 }, HUES.gold),
      ...ranks('rank', { sides: 6 }, [HUES.azure, HUES.teal, HUES.cyan, HUES.indigo]),
    ],
    wild: sym('wild', 'premium', 'Sextant', 'instrument', { arms: 5, hub: 0.3 }, HUES.lime),
    scatter: sym('scatter', 'mid', 'Maelstrom', 'orb', { rings: 2, tilt: 0 }, HUES.crimson),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'diamond-rush',
    tuning: { premiumTaper: 0.06, tierScale: { premium: 1.15, high: 0.9, low: 1.08 }, wildScale: 1.1 },
    title: 'Diamond Rush',
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'multiplierLadder',
    theme: {
      backgroundHue: HUES.slate,
      backgroundLightness: 0.07,
      accentHue: HUES.cyan,
      secondaryHue: HUES.magenta,
      metal: 'silver',
    },
    symbols: [
      sym('diamond', 'premium', 'Diamond', 'gem', { sides: 4, squash: 1.16 }, HUES.cyan),
      sym('ruby', 'premium', 'Ruby', 'gem', { sides: 6, squash: 1.06 }, HUES.crimson),
      sym('emerald', 'high', 'Emerald', 'gem', { sides: 5, squash: 1.2 }, HUES.emerald),
      sym('sapphire', 'high', 'Sapphire', 'gem', { sides: 7, squash: 0.98 }, HUES.azure),
      sym('bullion', 'mid', 'Bullion', 'coin', { emblem: 6 }, HUES.gold),
      sym('facet', 'mid', 'Facet Mark', 'sigil', { rays: 6, inner: 0.48 }, HUES.violet),
      ...ranks('rank', { sides: 4 }, [HUES.slate, HUES.cyan, HUES.magenta, HUES.azure]),
    ],
    wild: sym('wild', 'premium', 'Prism Star', 'sigil', { rays: 8, inner: 0.34 }, HUES.lime),
    scatter: sym('scatter', 'mid', 'Vault Token', 'coin', { emblem: 10 }, HUES.amber),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'wild-west-gold',
    tuning: { premiumTaper: 0.07, tierScale: { high: 1.2, mid: 0.85 }, scatterScale: 0.95, freeSpinMultiplier: 5 },
    title: 'Wild West Gold',
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.962,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'multiplierWild',
    theme: {
      backgroundHue: HUES.amber,
      backgroundLightness: 0.065,
      accentHue: HUES.ember,
      secondaryHue: HUES.sand,
      metal: 'bronze',
    },
    symbols: [
      sym('longhorn', 'premium', 'Longhorn', 'beast', { horns: 2, snout: 0.84, jaw: 0.6 }, HUES.sand),
      sym('star', 'premium', "Marshal's Star", 'sigil', { rays: 5, inner: 0.44 }, HUES.gold),
      sym('horseshoe', 'high', 'Horseshoe', 'instrument', { arms: 3, hub: 0.2 }, HUES.slate),
      sym('whiskey', 'high', 'Whiskey', 'vessel', { neck: 0.3, belly: 0.66, handles: false }, HUES.amber),
      sym('eagle', 'mid', 'Eagle Dollar', 'coin', { emblem: 5 }, HUES.bone),
      sym('cactus', 'mid', 'Cactus', 'flora', { lobes: 3 }, HUES.emerald),
      ...ranks('rank', { sides: 6 }, [HUES.amber, HUES.ember, HUES.sand, HUES.crimson]),
    ],
    wild: sym('wild', 'premium', 'Gold Nugget', 'gem', { sides: 7, squash: 1.1 }, HUES.gold),
    scatter: sym('scatter', 'mid', 'Dynamite', 'ordnance', {}, HUES.crimson),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'lucky-streak',
    tuning: { premiumTaper: 0.05, tierScale: { mid: 1.3, low: 0.92 }, wildScale: 1.25 },
    title: 'Lucky Streak',
    volatility: 'high',
    paylines: 15,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'streakMeter',
    theme: {
      backgroundHue: HUES.emerald,
      backgroundLightness: 0.075,
      accentHue: HUES.lime,
      secondaryHue: HUES.gold,
      metal: 'gold',
    },
    symbols: [
      sym('clover', 'premium', 'Four-Leaf Clover', 'flora', { lobes: 4 }, HUES.lime),
      sym('cauldron', 'premium', 'Pot of Gold', 'vessel', { neck: 0.58, belly: 0.9 }, HUES.gold),
      sym('horseshoe', 'high', 'Horseshoe', 'instrument', { arms: 3, hub: 0.18 }, HUES.slate),
      sym('peridot', 'high', 'Peridot', 'gem', { sides: 6, squash: 1.08 }, HUES.emerald),
      sym('sovereign', 'mid', 'Sovereign', 'coin', { emblem: 6 }, HUES.amber),
      sym('handbell', 'mid', 'Hand Bell', 'vessel', { neck: 0.46, belly: 0.8, handles: false }, HUES.bone),
      ...ranks('rank', { sides: 5 }, [HUES.emerald, HUES.lime, HUES.gold, HUES.teal]),
    ],
    wild: sym('wild', 'premium', 'Rainbow Star', 'sigil', { rays: 7, inner: 0.36 }, HUES.magenta),
    scatter: sym('scatter', 'mid', 'Lucky Seven', 'coin', { emblem: 7 }, HUES.crimson),
  },

  // ─────────────────────────────────────────────────────────
  {
    id: 'super-line-fruit-bomb',
    tuning: { premiumTaper: 0.09, tierScale: { premium: 0.9, mid: 1.12 }, wildScale: 0.95, freeSpinMultiplier: 4 },
    title: 'Super Line: Fruit Bomb',
    volatility: 'high',
    paylines: 20,
    targetRtp: 0.96,
    scatterAward: 'standard',
    wildPlacement: 'middleThree',
    feature: 'bombWild',
    theme: {
      backgroundHue: HUES.violet,
      backgroundLightness: 0.07,
      accentHue: HUES.lime,
      secondaryHue: HUES.ember,
      metal: 'silver',
    },
    symbols: [
      sym('melon', 'premium', 'Melon', 'flora', { lobes: 1, stem: true }, HUES.lime),
      sym('grape', 'premium', 'Grapes', 'flora', { lobes: 6, stem: true }, HUES.violet),
      sym('cherry', 'high', 'Cherries', 'flora', { lobes: 2, stem: true }, HUES.crimson),
      sym('citrus', 'high', 'Citrus', 'gem', { sides: 8, squash: 1.0 }, HUES.gold),
      sym('bell', 'mid', 'Bell', 'vessel', { neck: 0.48, belly: 0.82, handles: false }, HUES.amber),
      sym('token', 'mid', 'Bar Token', 'coin', { emblem: 4 }, HUES.slate),
      ...ranks('rank', { sides: 6 }, [HUES.violet, HUES.rose, HUES.azure, HUES.magenta]),
    ],
    wild: sym('wild', 'premium', 'Fruit Bomb', 'ordnance', {}, HUES.ember),
    scatter: sym('scatter', 'mid', 'Super Star', 'sigil', { rays: 10, inner: 0.4 }, HUES.cyan),
  },
];

export const SPEC_BY_ID = Object.freeze(Object.fromEntries(SPECS.map((s) => [s.id, s])));

export default SPECS;
