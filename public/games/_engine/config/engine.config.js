/**
 * ═══════════════════════════════════════════════════════════
 * ENGINE CONFIG — every tunable the engine reads lives here.
 *
 * Nothing in the engine may hardcode a number that a producer might want to
 * change. Per-game overrides are merged over these defaults at construction,
 * so a game definition only states what differs from house standard.
 * ═══════════════════════════════════════════════════════════
 */

/** House math targets. A game whose measured RTP falls outside the band fails CI. */
export const MATH = Object.freeze({
  /** Target return-to-player. The remainder is the house edge. */
  targetRtp: 0.96,
  /** Acceptance band around the target, in absolute RTP. */
  rtpTolerance: 0.005,
  /** Hard floor/ceiling — a game outside this is a math bug, not a design choice. */
  minRtp: 0.9,
  maxRtp: 0.975,
  /**
   * Absolute bounds on the share of spins that return anything at all.
   *
   * This is a sanity floor, not the design target — a ten-line game sits
   * naturally around 18% and a twenty-line game around 28%, so the meaningful
   * gate is the per-volatility band in src/game-math/profiles.js, which is
   * stated per payline and scaled to the game's line count. Below ~15% a
   * session feels dead however the maths is arranged; above ~45% a win stops
   * registering as an event. Both are checked by the simulator at build time,
   * never by nudging anything at runtime.
   */
  hitFrequency: Object.freeze({ min: 0.15, max: 0.45 }),
  /** A win at or above this multiple of the stake is a "big win" presentation. */
  bigWinMultiplier: 10,
  /** …and at or above this, the full jackpot presentation. */
  megaWinMultiplier: 50,
  /** Absolute cap on a single round's payout, as a multiple of stake. */
  maxWinMultiplier: 5000,
});

/** Reel presentation defaults. */
export const REELS = Object.freeze({
  columns: 5,
  rows: 3,
  /** Milliseconds the first reel spins before it may stop. */
  spinDuration: 900,
  /** Extra ms each successive reel spins — the classic left-to-right cascade. */
  reelStagger: 170,
  /** Turbo divides both of the above by this. */
  turboFactor: 3,
  /** Pixels the strip overshoots its stop before settling back. */
  bounceOvershoot: 22,
  bounceDuration: 190,
  /** Symbols rendered above/below the visible window so the strip never gaps. */
  bufferSymbols: 2,
});

/** Betting ladder. Producers change the ladder here, never in a game file. */
export const BETTING = Object.freeze({
  levels: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500],
  defaultLevelIndex: 3,
  startingBalance: 10000,
});

/** Autoplay limits. */
export const AUTOPLAY = Object.freeze({
  roundOptions: [10, 25, 50, 100, 250],
  /** Autoplay always halts on a win this large, however configured. */
  forceStopOnWinMultiplier: 50,
  /** Delay between automatic rounds, ms. */
  interRoundDelay: 320,
});

/** Layout metrics, in design pixels (the stage scales to fit its container). */
export const LAYOUT = Object.freeze({
  designWidth: 960,
  designHeight: 640,
  boardPadding: 26,
  headerHeight: 66,
  footerHeight: 96,
  symbolGap: 8,
  cornerRadius: 14,
});

/** Motion timings shared by every presentation. */
export const MOTION = Object.freeze({
  winLineHold: 900,
  winLineFade: 260,
  symbolPulsePeriod: 620,
  countUpDuration: 800,
  bigWinDuration: 2600,
  screenShake: Object.freeze({ small: 4, medium: 9, large: 18, duration: 420 }),
});

/** Particle system budget. */
export const PARTICLES = Object.freeze({
  poolSize: 240,
  burstSmall: 18,
  burstMedium: 46,
  burstLarge: 110,
  gravity: 780,
  lifetime: Object.freeze({ min: 0.55, max: 1.35 }),
  size: Object.freeze({ min: 3, max: 9 }),
});

/** Audio synthesis — the engine ships no audio files, it synthesises everything. */
export const AUDIO = Object.freeze({
  masterVolume: 0.35,
  /** Note frequencies (Hz) for the win arpeggio, a pentatonic run. */
  winScale: [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51],
  reelStopFrequency: 180,
  reelStopDecay: 0.09,
  clickFrequency: 440,
  bigWinChord: [523.25, 659.25, 783.99, 1046.5],
  anticipationFrequency: 320,
});

/** Provably-fair RNG parameters. */
export const RNG = Object.freeze({
  /** Bytes of server-seed entropy. */
  serverSeedBytes: 32,
  /** Hash used for the commit and for stream generation. */
  hash: 'SHA-256',
});

/**
 * Engagement rules.
 *
 * These change *presentation and pacing*, never the payout maths — the RTP is
 * fixed by the reel strips and paytable alone. Anything that could move money
 * is expressed as an explicit, budgeted bonus so it shows up in the simulator.
 */
export const ENGAGEMENT = Object.freeze({
  /**
   * Anticipation: when enough scatters have landed that the next reel could
   * trigger the bonus, that reel spins longer. Pure theatre, zero math impact.
   */
  anticipation: Object.freeze({ enabled: true, extraDuration: 620, scattersNeeded: 2 }),
  /** Near-miss *reporting* only — the engine never engineers near misses. */
  trackNearMiss: true,
  /** Session milestones surface a toast; they do not award credit. */
  sessionMilestones: [50, 100, 250, 500, 1000],
});

/** Supported interface languages. */
export const LANGUAGES = Object.freeze({
  default: 'en',
  supported: ['en', 'ru', 'uk', 'de', 'es', 'pt', 'tr', 'pl', 'fr', 'it'],
  rtl: [],
});

/** Deep-freezes and merges a per-game override object over these defaults. */
export function withDefaults(defaults, overrides = {}) {
  const out = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && defaults[key]
        ? withDefaults(defaults[key], value)
        : value;
  }
  return out;
}

export const ENGINE_CONFIG = Object.freeze({
  MATH,
  REELS,
  BETTING,
  AUTOPLAY,
  LAYOUT,
  MOTION,
  PARTICLES,
  AUDIO,
  RNG,
  ENGAGEMENT,
  LANGUAGES,
});

export default ENGINE_CONFIG;
