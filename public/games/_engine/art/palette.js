/**
 * ═══════════════════════════════════════════════════════════
 * COLOUR SYSTEM
 *
 * Every symbol, frame and glow in the engine derives its colours from a small
 * number of ramps built here. Games declare a theme by naming hues, never by
 * pasting hex codes into a draw call — which is what keeps a re-skin a
 * one-line change and keeps sibling symbols visually related.
 * ═══════════════════════════════════════════════════════════
 */

/** Clamp helper. */
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * HSL → packed 0xRRGGBB, the form PIXI wants.
 * @param {number} h hue in degrees
 * @param {number} s saturation 0..1
 * @param {number} l lightness 0..1
 */
export function hsl(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s);
  const lit = clamp(l);
  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lit - c / 2;
  const seg = Math.floor(hue / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg];
  return (
    (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255)
  );
}

/** Linear blend between two packed colours. */
export function mix(a, b, t) {
  const k = clamp(t);
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * k) << 16) |
    (Math.round(ag + (bg - ag) * k) << 8) |
    Math.round(ab + (bb - ab) * k)
  );
}

/**
 * Build a five-stop ramp around a hue.
 *
 * The stops are named for their role in a symbol rather than for their
 * lightness, so a draw call reads as intent (`ramp.rim`) rather than as a
 * number nobody can later justify.
 */
export function ramp(hue, { saturation = 0.68, lightness = 0.52, spread = 0.22 } = {}) {
  return {
    hue,
    /** Deepest tone — drop shadows and the underside of a bevel. */
    shadow: hsl(hue - 8, saturation * 0.9, clamp(lightness - spread * 1.6)),
    /** The symbol's body colour. */
    base: hsl(hue, saturation, lightness),
    /** Lit face of a bevel. */
    light: hsl(hue + 6, saturation * 0.92, clamp(lightness + spread)),
    /** Specular highlight — small, bright, slightly desaturated. */
    highlight: hsl(hue + 12, saturation * 0.55, clamp(lightness + spread * 1.9)),
    /** Outline / metal rim. */
    rim: hsl(hue - 14, saturation * 0.75, clamp(lightness - spread * 0.7)),
  };
}

/** Named hues so themes read as language, not as magic numbers. */
export const HUES = Object.freeze({
  gold: 44,
  amber: 32,
  ember: 14,
  crimson: 352,
  rose: 336,
  magenta: 310,
  violet: 274,
  indigo: 248,
  azure: 212,
  cyan: 188,
  teal: 168,
  emerald: 146,
  lime: 96,
  sand: 38,
  bone: 46,
  slate: 220,
});

/**
 * Metal ramps are reused across every theme — a gold rim should look like the
 * same gold whichever game it is in.
 */
export const METALS = Object.freeze({
  gold: ramp(HUES.gold, { saturation: 0.82, lightness: 0.54, spread: 0.24 }),
  silver: ramp(HUES.slate, { saturation: 0.12, lightness: 0.66, spread: 0.2 }),
  bronze: ramp(HUES.amber, { saturation: 0.55, lightness: 0.42, spread: 0.2 }),
});

/**
 * A theme: the board's colours plus the accents shared by every symbol frame.
 * @param {object} spec
 */
export function buildTheme(spec) {
  const {
    backgroundHue = HUES.indigo,
    backgroundLightness = 0.08,
    panelLightness = 0.14,
    accentHue = HUES.gold,
    secondaryHue = HUES.cyan,
    metal = 'gold',
  } = spec;

  return Object.freeze({
    background: hsl(backgroundHue, 0.55, backgroundLightness),
    backgroundDeep: hsl(backgroundHue - 6, 0.6, backgroundLightness * 0.55),
    panel: hsl(backgroundHue, 0.42, panelLightness),
    panelLight: hsl(backgroundHue, 0.36, panelLightness * 1.55),
    cell: hsl(backgroundHue + 4, 0.38, panelLightness * 0.82),
    accent: ramp(accentHue, { saturation: 0.85, lightness: 0.56 }),
    secondary: ramp(secondaryHue, { saturation: 0.72, lightness: 0.55 }),
    metal: METALS[metal] || METALS.gold,
    text: 0xf4f6ff,
    textDim: 0x9aa3bd,
    win: hsl(HUES.lime, 0.72, 0.55),
    danger: hsl(HUES.crimson, 0.72, 0.56),
  });
}

export default { hsl, mix, ramp, HUES, METALS, buildTheme };
