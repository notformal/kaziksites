/**
 * ═══════════════════════════════════════════════════════════
 * PROCEDURAL SYMBOL ART
 *
 * Every symbol in every game is drawn here from vector geometry — there are no
 * emoji, no sprite sheets and no licensed artwork anywhere in the pipeline.
 *
 * A symbol is described by a *family* (the silhouette language: faceted gem,
 * regalia, vessel, beast, and so on) plus parameters and a colour ramp. Two
 * games can share a family and still look nothing alike, because facet counts,
 * proportions, ornament and palette all vary — which is how nineteen themes get
 * distinct art without nineteen hand-drawn asset sets.
 *
 * Everything draws into a normalised box centred on the origin, so the caller
 * decides the pixel size and the same description works at any resolution.
 * ═══════════════════════════════════════════════════════════
 */

import { mix } from './palette.js';

/** Geometry constants — proportions the families share so symbols sit together. */
export const ART = Object.freeze({
  /** Fraction of the box a symbol's silhouette occupies. */
  inset: 0.82,
  /** Bevel thickness as a fraction of the radius. */
  bevel: 0.16,
  /** Outline weight as a fraction of the radius. */
  strokeWeight: 0.055,
  /** Specular highlight size as a fraction of the radius. */
  highlight: 0.3,
  shadowOffset: 0.06,
  shadowAlpha: 0.34,
});

// ═══════════════════════════════════════════════════════════
// GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════

/** Vertices of a regular polygon, optionally squashed and rotated. */
function polygon(radius, sides, { rotation = -Math.PI / 2, squash = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, Math.sin(a) * radius * squash);
  }
  return pts;
}

/** Vertices of a star, alternating outer and inner radius. */
function starPoints(radius, points, innerRatio, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : radius * innerRatio;
    const a = rotation + (i / (points * 2)) * Math.PI * 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
}

/** Scale a flat [x,y,...] point list about the origin. */
function scalePoints(pts, k) {
  return pts.map((v) => v * k);
}

/** Soft radial shadow beneath the silhouette, so symbols lift off the cell. */
function dropShadow(g, radius, palette) {
  g.ellipse(0, radius * ART.shadowOffset * 2.2, radius * 0.86, radius * 0.9);
  g.fill({ color: palette.shadow, alpha: ART.shadowAlpha });
}

/** Specular dot — always upper-left, so every symbol shares one light source. */
function specular(g, radius, palette, scale = 1) {
  g.ellipse(-radius * 0.3, -radius * 0.38, radius * ART.highlight * 0.55 * scale, radius * ART.highlight * 0.38 * scale);
  g.fill({ color: palette.highlight, alpha: 0.55 });
}

/** Outline in the ramp's rim tone. */
function outline(g, radius, palette, weightScale = 1) {
  g.stroke({ width: radius * ART.strokeWeight * weightScale, color: palette.rim, alpha: 0.95 });
}

// ═══════════════════════════════════════════════════════════
// FAMILIES
//
// Each receives (graphics, radius, params, palette, theme).
// ═══════════════════════════════════════════════════════════

const FAMILIES = {
  /** Faceted crystal — the workhorse for gem, crystal and diamond themes. */
  gem(g, R, p, c) {
    const sides = p.sides ?? 6;
    const squash = p.squash ?? 1.05;
    const body = polygon(R, sides, { squash });
    dropShadow(g, R, c);

    g.poly(body);
    g.fill({ color: c.base });
    outline(g, R, c);

    // Facets: alternate light and dark wedges from the centre to each edge.
    for (let i = 0; i < sides; i++) {
      const a0 = -Math.PI / 2 + (i / sides) * Math.PI * 2;
      const a1 = -Math.PI / 2 + ((i + 1) / sides) * Math.PI * 2;
      g.moveTo(0, -R * 0.12);
      g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R * squash);
      g.lineTo(Math.cos(a1) * R, Math.sin(a1) * R * squash);
      g.closePath();
      g.fill({ color: i % 2 ? c.light : c.shadow, alpha: 0.42 });
    }

    // Table facet across the crown of the stone.
    g.poly(scalePoints(polygon(R * 0.44, sides, { squash }), 1));
    g.fill({ color: c.light, alpha: 0.55 });
    specular(g, R, c);
  },

  /** Regalia — crowns, tiaras, diadems. */
  crown(g, R, p, c, theme) {
    const points = p.points ?? 3;
    dropShadow(g, R, c);

    const baseY = R * 0.52;
    const topY = -R * 0.62;
    const halfW = R * 0.86;
    const path = [-halfW, baseY];
    const step = (halfW * 2) / points;
    for (let i = 0; i < points; i++) {
      const x0 = -halfW + i * step;
      path.push(x0 + step * 0.5, topY, x0 + step, baseY * 0.34);
    }
    path.push(halfW, baseY);
    g.poly(path);
    g.fill({ color: c.base });
    outline(g, R, c);

    // Band with a lit upper edge.
    g.roundRect(-halfW, baseY * 0.72, halfW * 2, R * 0.34, R * 0.1);
    g.fill({ color: c.rim });
    g.roundRect(-halfW, baseY * 0.72, halfW * 2, R * 0.12, R * 0.06);
    g.fill({ color: c.light, alpha: 0.6 });

    // A jewel on every spire.
    const jewel = theme?.secondary ?? c;
    for (let i = 0; i < points; i++) {
      const x = -halfW + step * (i + 0.5);
      g.circle(x, topY + R * 0.18, R * 0.13);
      g.fill({ color: jewel.base });
      g.circle(x - R * 0.04, topY + R * 0.14, R * 0.05);
      g.fill({ color: jewel.highlight, alpha: 0.8 });
    }
    specular(g, R, c, 0.8);
  },

  /** Spheres, planets, pearls — anything with a halo or ring system. */
  orb(g, R, p, c, theme) {
    const rings = p.rings ?? 1;
    const tilt = p.tilt ?? -0.32;
    dropShadow(g, R, c);

    const body = R * 0.66;
    g.circle(0, 0, body);
    g.fill({ color: c.base });
    outline(g, R, c);

    // Terminator shading: a crescent of the darker tone on the lower right.
    g.circle(body * 0.24, body * 0.22, body * 0.92);
    g.fill({ color: c.shadow, alpha: 0.34 });
    g.circle(-body * 0.16, -body * 0.18, body * 0.72);
    g.fill({ color: c.light, alpha: 0.3 });

    const ringColor = theme?.metal ?? c;
    for (let i = 0; i < rings; i++) {
      const rx = body * (1.32 + i * 0.22);
      const ry = rx * 0.3;
      g.ellipse(0, 0, rx, ry);
      g.stroke({ width: R * 0.075, color: ringColor.base, alpha: 0.9 });
      g.ellipse(0, -ry * 0.16, rx, ry);
      g.stroke({ width: R * 0.03, color: ringColor.highlight, alpha: 0.7 });
    }
    specular(g, R, c);
    if (tilt) g.rotation = tilt;
  },

  /** Radiant sigils — stars, sunbursts, runic seals. */
  sigil(g, R, p, c, theme) {
    const rays = p.rays ?? 8;
    const inner = p.inner ?? 0.42;
    dropShadow(g, R, c);

    // Long rays behind, short rays in front — gives depth without a bitmap.
    g.poly(starPoints(R, rays, inner * 0.7, -Math.PI / 2 + Math.PI / rays));
    g.fill({ color: c.shadow, alpha: 0.75 });
    g.poly(starPoints(R * 0.94, rays, inner));
    g.fill({ color: c.base });
    outline(g, R, c);

    const core = theme?.accent ?? c;
    g.circle(0, 0, R * 0.28);
    g.fill({ color: core.light });
    g.circle(0, 0, R * 0.28);
    g.stroke({ width: R * 0.05, color: core.rim, alpha: 0.9 });
    g.circle(-R * 0.08, -R * 0.09, R * 0.1);
    g.fill({ color: core.highlight, alpha: 0.85 });
  },

  /** Urns, chalices, lanterns, potion bottles. */
  vessel(g, R, p, c, theme) {
    const neck = p.neck ?? 0.3;
    const belly = p.belly ?? 0.78;
    const handles = p.handles ?? true;
    dropShadow(g, R, c);

    const topY = -R * 0.76;
    const neckW = R * neck;
    const bellyW = R * belly;

    g.moveTo(-neckW, topY);
    g.lineTo(neckW, topY);
    g.quadraticCurveTo(neckW * 1.2, -R * 0.34, bellyW, R * 0.02);
    g.quadraticCurveTo(bellyW * 0.96, R * 0.66, R * 0.34, R * 0.74);
    g.lineTo(-R * 0.34, R * 0.74);
    g.quadraticCurveTo(-bellyW * 0.96, R * 0.66, -bellyW, R * 0.02);
    g.quadraticCurveTo(-neckW * 1.2, -R * 0.34, -neckW, topY);
    g.closePath();
    g.fill({ color: c.base });
    outline(g, R, c);

    // Vertical sheen down the left of the belly.
    g.ellipse(-bellyW * 0.4, R * 0.1, bellyW * 0.2, R * 0.42);
    g.fill({ color: c.light, alpha: 0.4 });

    if (handles) {
      for (const side of [-1, 1]) {
        g.moveTo(side * bellyW * 0.82, -R * 0.18);
        g.quadraticCurveTo(side * bellyW * 1.42, R * 0.04, side * bellyW * 0.78, R * 0.34);
        g.stroke({ width: R * 0.12, color: c.rim, alpha: 0.95 });
      }
    }

    // Collar and foot in the theme metal.
    const metal = theme?.metal ?? c;
    g.roundRect(-neckW * 1.35, topY - R * 0.1, neckW * 2.7, R * 0.18, R * 0.05);
    g.fill({ color: metal.base });
    g.roundRect(-R * 0.42, R * 0.7, R * 0.84, R * 0.16, R * 0.05);
    g.fill({ color: metal.base });
    specular(g, R, c, 0.7);
  },

  /**
   * Stylised creature heads in three-quarter profile — dragons, camels,
   * longhorns, sphinxes.
   *
   * Drawn as a heraldic silhouette rather than an illustration: at reel size a
   * symbol has roughly 90×90 pixels to read in, so the shape has to carry the
   * identity. Horns are solid swept wedges, the muzzle is a distinct mass from
   * the skull, and the eye sits on the accent ramp because it is the first
   * thing the eye finds at a thumbnail scale.
   */
  beast(g, R, p, c, theme) {
    const horns = p.horns ?? 2;
    const snout = p.snout ?? 0.72;
    const jaw = p.jaw ?? 0.5;
    dropShadow(g, R, c);

    // ── Horns, behind the skull, swept back and up ──
    for (let i = 0; i < horns; i++) {
      const dir = horns === 1 ? 0 : i === 0 ? -1 : 1;
      const rootX = R * (0.02 + dir * 0.34);
      const rootY = -R * 0.46;
      const tipX = rootX + dir * R * 0.52 - R * 0.24;
      const tipY = -R * (0.98 + Math.abs(dir) * 0.06);
      g.moveTo(rootX - R * 0.16, rootY);
      g.quadraticCurveTo(rootX + dir * R * 0.18, -R * 0.86, tipX, tipY);
      g.quadraticCurveTo(rootX + dir * R * 0.34, -R * 0.72, rootX + R * 0.16, rootY - R * 0.04);
      g.closePath();
      g.fill({ color: c.rim });
      g.moveTo(rootX - R * 0.1, rootY - R * 0.04);
      g.quadraticCurveTo(rootX + dir * R * 0.16, -R * 0.84, tipX + R * 0.06, tipY + R * 0.06);
      g.stroke({ width: R * 0.045, color: c.shadow, alpha: 0.6 });
    }

    // ── Skull: broad at the brow, narrowing into the cheek ──
    g.moveTo(-R * 0.66, -R * 0.14);
    g.quadraticCurveTo(-R * 0.52, -R * 0.72, R * 0.06, -R * 0.66);
    g.quadraticCurveTo(R * 0.48, -R * 0.6, R * 0.5, -R * 0.16);
    g.quadraticCurveTo(R * 0.44, R * jaw * 0.6, R * 0.04, R * jaw * 0.92);
    g.quadraticCurveTo(-R * 0.46, R * jaw * 0.8, -R * 0.66, -R * 0.14);
    g.closePath();
    g.fill({ color: c.base });
    outline(g, R, c);

    // ── Muzzle: its own mass, pushed forward and down ──
    g.moveTo(R * 0.3, -R * 0.28);
    g.quadraticCurveTo(R * snout * 1.18, -R * 0.24, R * snout * 1.2, R * 0.06);
    g.quadraticCurveTo(R * snout * 1.16, R * 0.36, R * 0.3, R * 0.34);
    g.quadraticCurveTo(R * 0.16, R * 0.04, R * 0.3, -R * 0.28);
    g.closePath();
    g.fill({ color: c.light });
    g.stroke({ width: R * ART.strokeWeight, color: c.rim, alpha: 0.95 });

    // Mouth line separating upper jaw from lower.
    g.moveTo(R * 0.3, R * 0.1);
    g.quadraticCurveTo(R * snout * 0.86, R * 0.14, R * snout * 1.16, R * 0.06);
    g.stroke({ width: R * 0.05, color: c.shadow, alpha: 0.85 });

    // Nostril.
    g.ellipse(R * snout * 0.98, -R * 0.06, R * 0.075, R * 0.055);
    g.fill({ color: c.shadow, alpha: 0.9 });

    // ── Brow ridge catching the light ──
    g.moveTo(-R * 0.5, -R * 0.2);
    g.quadraticCurveTo(-R * 0.34, -R * 0.6, R * 0.12, -R * 0.54);
    g.quadraticCurveTo(-R * 0.16, -R * 0.34, -R * 0.5, -R * 0.2);
    g.closePath();
    g.fill({ color: c.highlight, alpha: 0.42 });

    // ── Cheek plates — a few angular scales give the silhouette texture ──
    for (let i = 0; i < 3; i++) {
      g.moveTo(-R * 0.44 + i * R * 0.15, R * 0.12 + i * R * 0.04);
      g.lineTo(-R * 0.3 + i * R * 0.15, R * 0.04 + i * R * 0.04);
      g.lineTo(-R * 0.3 + i * R * 0.15, R * 0.3 + i * R * 0.04);
      g.closePath();
      g.fill({ color: c.shadow, alpha: 0.3 });
    }

    // ── Eye: almond, angled, on the accent ramp ──
    const eye = theme?.accent ?? c;
    g.moveTo(-R * 0.06, -R * 0.3);
    g.quadraticCurveTo(R * 0.14, -R * 0.44, R * 0.28, -R * 0.24);
    g.quadraticCurveTo(R * 0.12, -R * 0.12, -R * 0.06, -R * 0.3);
    g.closePath();
    g.fill({ color: eye.light });
    g.stroke({ width: R * 0.035, color: c.shadow, alpha: 0.9 });
    // Slit pupil — reads as reptilian rather than cartoonish.
    g.ellipse(R * 0.11, -R * 0.28, R * 0.032, R * 0.085);
    g.fill({ color: 0x0a0a12 });
    g.circle(R * 0.05, -R * 0.33, R * 0.028);
    g.fill({ color: 0xffffff, alpha: 0.85 });
  },

  /** Instruments and hardware — compasses, keys, anchors, wheels. */
  instrument(g, R, p, c, theme) {
    const arms = p.arms ?? 4;
    const hub = p.hub ?? 0.24;
    const teeth = p.teeth ?? 0;
    dropShadow(g, R, c);

    // Outer ring.
    g.circle(0, 0, R * 0.88);
    g.stroke({ width: R * 0.16, color: c.base });
    g.circle(0, 0, R * 0.88);
    g.stroke({ width: R * 0.05, color: c.light, alpha: 0.6 });

    // Spokes / compass points.
    for (let i = 0; i < arms; i++) {
      const a = -Math.PI / 2 + (i / arms) * Math.PI * 2;
      const w = R * 0.11;
      g.poly([
        Math.cos(a) * R * 0.84,
        Math.sin(a) * R * 0.84,
        Math.cos(a + Math.PI / 2) * w,
        Math.sin(a + Math.PI / 2) * w,
        Math.cos(a - Math.PI / 2) * w,
        Math.sin(a - Math.PI / 2) * w,
      ]);
      g.fill({ color: i % 2 ? c.rim : c.light });
    }

    if (teeth) {
      for (let i = 0; i < teeth; i++) {
        g.rect(R * 0.2 + i * R * 0.22, R * 0.62, R * 0.13, R * 0.3);
        g.fill({ color: c.rim });
      }
    }

    const core = theme?.accent ?? c;
    g.circle(0, 0, R * hub);
    g.fill({ color: core.base });
    g.circle(0, 0, R * hub);
    g.stroke({ width: R * 0.04, color: core.rim });
    specular(g, R, c, 0.6);
  },

  /** Botanicals — clover, lotus, fruit clusters, wheat. */
  flora(g, R, p, c, theme) {
    const lobes = p.lobes ?? 4;
    const stem = p.stem ?? true;
    dropShadow(g, R, c);

    if (stem) {
      g.moveTo(0, R * 0.2);
      g.quadraticCurveTo(R * 0.16, R * 0.6, R * 0.04, R * 0.92);
      g.stroke({ width: R * 0.1, color: theme?.secondary?.rim ?? c.rim });
    }

    const lobeR = R * (lobes <= 3 ? 0.46 : 0.4);
    const orbit = R * 0.44;
    for (let i = 0; i < lobes; i++) {
      const a = -Math.PI / 2 + (i / lobes) * Math.PI * 2;
      const x = Math.cos(a) * orbit;
      const y = Math.sin(a) * orbit;
      g.circle(x, y, lobeR);
      g.fill({ color: c.base });
      g.circle(x, y, lobeR);
      g.stroke({ width: R * 0.045, color: c.rim, alpha: 0.9 });
      g.ellipse(x - lobeR * 0.28, y - lobeR * 0.32, lobeR * 0.3, lobeR * 0.2);
      g.fill({ color: c.highlight, alpha: 0.55 });
    }

    const core = theme?.accent ?? c;
    g.circle(0, 0, R * 0.17);
    g.fill({ color: core.base });
  },

  /** Coins, medallions, tokens. */
  coin(g, R, p, c, theme) {
    const emblem = p.emblem ?? 5;
    dropShadow(g, R, c);

    g.circle(0, 0, R * 0.84);
    g.fill({ color: c.rim });
    g.circle(0, 0, R * 0.72);
    g.fill({ color: c.base });
    g.circle(0, 0, R * 0.72);
    g.stroke({ width: R * 0.045, color: c.light, alpha: 0.7 });

    // Milled edge.
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.rect(Math.cos(a) * R * 0.78 - R * 0.02, Math.sin(a) * R * 0.78 - R * 0.02, R * 0.04, R * 0.04);
      g.fill({ color: c.shadow, alpha: 0.4 });
    }

    const mark = theme?.accent ?? c;
    g.poly(starPoints(R * 0.42, emblem, 0.45));
    g.fill({ color: mark.base });
    g.poly(starPoints(R * 0.42, emblem, 0.45));
    g.stroke({ width: R * 0.035, color: mark.rim, alpha: 0.9 });
    specular(g, R, c, 0.9);
  },

  /** Tomes and scrolls. */
  tome(g, R, p, c, theme) {
    dropShadow(g, R, c);
    const w = R * 0.78;
    const h = R * 0.86;

    // Back cover offset for depth.
    g.roundRect(-w * 0.92, -h * 0.9, w * 1.9, h * 1.85, R * 0.1);
    g.fill({ color: c.shadow });
    g.roundRect(-w, -h, w * 1.9, h * 1.85, R * 0.1);
    g.fill({ color: c.base });
    outline(g, R, c);

    // Pages.
    g.roundRect(w * 0.66, -h * 0.86, R * 0.2, h * 1.72, R * 0.04);
    g.fill({ color: 0xf3ead6 });
    for (let i = 0; i < 5; i++) {
      g.rect(w * 0.68, -h * 0.7 + i * h * 0.32, R * 0.16, R * 0.03);
      g.fill({ color: c.shadow, alpha: 0.35 });
    }

    // Spine and clasp in theme metal.
    const metal = theme?.metal ?? c;
    g.roundRect(-w, -h, R * 0.2, h * 1.85, R * 0.05);
    g.fill({ color: metal.base });
    if (p.clasp !== false) {
      g.roundRect(w * 0.5, -R * 0.14, R * 0.36, R * 0.28, R * 0.06);
      g.fill({ color: metal.base });
      g.roundRect(w * 0.5, -R * 0.14, R * 0.36, R * 0.1, R * 0.04);
      g.fill({ color: metal.highlight, alpha: 0.7 });
    }

    // Cover emblem.
    const mark = theme?.accent ?? c;
    g.poly(starPoints(R * 0.3, p.emblem ?? 6, 0.4));
    g.fill({ color: mark.base, alpha: 0.95 });
  },

  /** Ordnance — bombs, kegs, dynamite. */
  ordnance(g, R, p, c, theme) {
    dropShadow(g, R, c);
    g.circle(0, R * 0.12, R * 0.68);
    g.fill({ color: c.base });
    g.circle(0, R * 0.12, R * 0.68);
    g.stroke({ width: R * 0.05, color: c.rim });
    g.circle(-R * 0.2, -R * 0.1, R * 0.24);
    g.fill({ color: c.light, alpha: 0.42 });

    // Fuse cap and cord.
    g.roundRect(-R * 0.16, -R * 0.66, R * 0.32, R * 0.26, R * 0.06);
    g.fill({ color: c.rim });
    g.moveTo(R * 0.04, -R * 0.64);
    g.quadraticCurveTo(R * 0.46, -R * 0.9, R * 0.34, -R * 1.06);
    g.stroke({ width: R * 0.08, color: theme?.metal?.rim ?? c.shadow });

    // Spark.
    const spark = theme?.accent ?? c;
    g.poly(starPoints(R * 0.24, 6, 0.34, 0).map((v, i) => (i % 2 ? v - R * 1.06 : v + R * 0.34)));
    g.fill({ color: spark.light });
    specular(g, R, c, 0.8);
  },

  /** Lightning bolts and energy motifs. */
  bolt(g, R, p, c, theme) {
    dropShadow(g, R, c);
    const path = [
      R * 0.18, -R * 0.94,
      -R * 0.5, R * 0.12,
      -R * 0.08, R * 0.12,
      -R * 0.3, R * 0.96,
      R * 0.54, -R * 0.16,
      R * 0.08, -R * 0.16,
      R * 0.46, -R * 0.94,
    ];
    g.poly(path);
    g.fill({ color: c.base });
    g.poly(path);
    g.stroke({ width: R * 0.07, color: c.rim });
    g.poly(scalePoints(path, 0.62));
    g.fill({ color: c.highlight, alpha: 0.55 });

    const glow = theme?.accent ?? c;
    g.poly(path);
    g.stroke({ width: R * 0.02, color: glow.highlight, alpha: 0.8 });
  },

  /**
   * Card ranks. Low-tier symbols in nearly every slot are A/K/Q/J/10, and the
   * cheapest way to make them feel part of *this* game rather than stock filler
   * is to seat them in a themed plate — so that is what this family draws. The
   * letterform itself is layered on by the caller as text.
   */
  rank(g, R, p, c, theme) {
    const sides = p.sides ?? 6;
    dropShadow(g, R, c);

    g.poly(polygon(R * 0.92, sides, { rotation: p.rotation ?? -Math.PI / 2 }));
    g.fill({ color: c.shadow });
    g.poly(polygon(R * 0.8, sides, { rotation: p.rotation ?? -Math.PI / 2 }));
    g.fill({ color: c.base });
    g.poly(polygon(R * 0.8, sides, { rotation: p.rotation ?? -Math.PI / 2 }));
    g.stroke({ width: R * 0.05, color: theme?.metal?.base ?? c.rim, alpha: 0.9 });
    g.poly(polygon(R * 0.62, sides, { rotation: p.rotation ?? -Math.PI / 2 }));
    g.fill({ color: c.light, alpha: 0.28 });
  },
};

export const FAMILY_NAMES = Object.freeze(Object.keys(FAMILIES));

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Draw a symbol into an existing Graphics object.
 *
 * @param {import('../../../vendor/pixi.mjs').Graphics} g
 * @param {{family:string, params?:object, ramp:object}} spec
 * @param {number} size  box size in pixels
 * @param {object} theme built theme, for shared metal/accent tones
 */
export function drawSymbol(g, spec, size, theme) {
  const draw = FAMILIES[spec.family];
  if (!draw) throw new Error(`Unknown symbol family "${spec.family}"`);
  const radius = (size / 2) * ART.inset;
  draw(g, radius, spec.params || {}, spec.ramp, theme);
  return g;
}

/**
 * Backing plate every symbol sits on — a subtle bevelled tile that unifies the
 * grid and gives win animations something to pulse.
 */
export function drawSymbolPlate(g, size, theme, { active = false } = {}) {
  const r = size / 2;
  const radius = size * 0.16;
  g.roundRect(-r, -r, size, size, radius);
  g.fill({ color: theme.cell, alpha: active ? 0.95 : 0.72 });
  g.roundRect(-r, -r, size, size, radius);
  g.stroke({
    width: active ? size * 0.028 : size * 0.014,
    color: active ? theme.accent.light : theme.panelLight,
    alpha: active ? 1 : 0.55,
  });
  // Inner bevel: a second rounded outline just inside the border, brighter at
  // the top. An inset stroke reads as a lit edge; a filled bar floating near
  // the top edge reads as a stray rectangle, which is what this replaced.
  g.roundRect(-r + size * 0.045, -r + size * 0.045, size * 0.91, size * 0.91, radius * 0.8);
  g.stroke({ width: size * 0.012, color: mix(theme.cell, 0xffffff, 0.22), alpha: 0.35 });
  return g;
}

export default { ART, FAMILIES, FAMILY_NAMES, drawSymbol, drawSymbolPlate };
