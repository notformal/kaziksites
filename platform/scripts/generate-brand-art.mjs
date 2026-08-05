// Генерирует фирменные hero-постеры для брендов. Раньше в hero подставлялся
// скриншот игры с её же интерфейсом — в вёрстке торчали обрезанные надписи
// «PROVABLY FAIR», «BONUS AWARD». Постеры ниже — собственная векторная графика:
// SVG, без текста, чёткая на любом экране, параметры целиком в ART_PRESETS.
//
//   node scripts/generate-brand-art.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BRANDS, resolveFromRoot } from "../config/index.mjs";

const OUT_DIR = resolveFromRoot("apps/lobby/public/brand");
const SIZE = { width: 1200, height: 900 };

/** Художественные пресеты брендов: палитра + мотив. */
const ART_PRESETS = {
  aurora: {
    background: ["#04121a", "#07253a", "#031017"],
    accents: ["#c7ff3d", "#31d7f2", "#7af0ff"],
    motif: "signal",
    grain: 0.05,
  },
  ember: {
    background: ["#170406", "#3a0a0d", "#0d0203"],
    accents: ["#ff5a1f", "#ff3d8d", "#ffc46b"],
    motif: "heat",
    grain: 0.07,
  },
  royale: {
    background: ["#123528", "#1d5340", "#0a1c15"],
    accents: ["#f0cf8e", "#d9b871", "#fff6e2"],
    motif: "deco",
    grain: 0.04,
  },
};

/** Детерминированный поток чисел — постер одинаков при каждой сборке. */
function stream(seed) {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/** Aurora — «сигнал»: слоистые волны и вертикальная развёртка. */
function signalMotif(rand, accents) {
  const { width: w, height: h } = SIZE;
  let out = "";
  for (let layer = 0; layer < 7; layer++) {
    const y = h * (0.28 + layer * 0.085);
    const amp = 26 + rand() * 70;
    const points = Array.from({ length: 13 }, (_, i) => {
      const x = (w / 12) * i;
      const offset = Math.sin(i * 0.9 + layer) * amp + (rand() - 0.5) * 18;
      return `${x.toFixed(1)},${(y + offset).toFixed(1)}`;
    }).join(" ");
    out += `<polyline points="${points}" fill="none" stroke="${accents[layer % accents.length]}" stroke-width="${(1.6 + rand() * 2.4).toFixed(2)}" opacity="${(0.16 + rand() * 0.4).toFixed(2)}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    out += `<rect x="${x.toFixed(1)}" y="0" width="1" height="${h}" fill="${accents[1]}" opacity="${(0.03 + rand() * 0.07).toFixed(3)}"/>`;
  }
  const cx = w * 0.68, cy = h * 0.42;
  for (let ring = 0; ring < 5; ring++) {
    out += `<circle cx="${cx}" cy="${cy}" r="${90 + ring * 62}" fill="none" stroke="${accents[0]}" stroke-width="1.2" opacity="${(0.3 - ring * 0.05).toFixed(2)}"/>`;
  }
  return out;
}

/** Ember — «жар»: восходящие полосы и искры. */
function heatMotif(rand, accents) {
  const { width: w, height: h } = SIZE;
  let out = "";
  for (let i = 0; i < 22; i++) {
    const x = (w / 22) * i + rand() * 12;
    const height = h * (0.25 + rand() * 0.7);
    out += `<rect x="${x.toFixed(1)}" y="${(h - height).toFixed(1)}" width="${(14 + rand() * 26).toFixed(1)}" height="${height.toFixed(1)}" fill="${accents[i % accents.length]}" opacity="${(0.05 + rand() * 0.16).toFixed(3)}"/>`;
  }
  for (let i = 0; i < 90; i++) {
    const x = rand() * w, y = h * (0.15 + rand() * 0.85), r = 1 + rand() * 3.4;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${accents[2]}" opacity="${(0.15 + rand() * 0.6).toFixed(2)}"/>`;
  }
  out += `<path d="M0,${h} Q${w * 0.3},${h * 0.55} ${w * 0.55},${h * 0.72} T${w},${h * 0.5} L${w},${h} Z" fill="${accents[0]}" opacity="0.16"/>`;
  return out;
}

/** Royale — ар-деко: симметричные дуги и лучи. */
function decoMotif(rand, accents) {
  const { width: w, height: h } = SIZE;
  const cx = w / 2, cy = h * 0.52;
  let out = "";
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24;
    const inner = 70, outer = 300 + rand() * 190;
    out += `<line x1="${(cx + Math.cos(angle) * inner).toFixed(1)}" y1="${(cy + Math.sin(angle) * inner).toFixed(1)}" x2="${(cx + Math.cos(angle) * outer).toFixed(1)}" y2="${(cy + Math.sin(angle) * outer).toFixed(1)}" stroke="${accents[i % accents.length]}" stroke-width="${(0.8 + rand() * 1.8).toFixed(2)}" opacity="${(0.26 + rand() * 0.42).toFixed(2)}"/>`;
  }
  for (let ring = 0; ring < 6; ring++) {
    const r = 90 + ring * 58;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accents[0]}" stroke-width="${ring % 2 ? 0.9 : 2.1}" opacity="${(0.62 - ring * 0.07).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const size = 42 + i * 34;
    out += `<rect x="${(cx - size / 2).toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" width="${size}" height="${size}" transform="rotate(45 ${cx} ${cy})" fill="none" stroke="${accents[1]}" stroke-width="1.1" opacity="${(0.5 - i * 0.06).toFixed(2)}"/>`;
  }
  return out;
}

const MOTIFS = { signal: signalMotif, heat: heatMotif, deco: decoMotif };

function poster(brandId) {
  const preset = ART_PRESETS[brandId];
  const rand = stream(`${brandId}-hero-poster`);
  const { width: w, height: h } = SIZE;
  const motif = MOTIFS[preset.motif](rand, preset.accents);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${preset.background[0]}"/>
    <stop offset="0.55" stop-color="${preset.background[1]}"/>
    <stop offset="1" stop-color="${preset.background[2]}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.62" cy="0.36" r="0.7">
    <stop offset="0" stop-color="${preset.accents[0]}" stop-opacity="0.42"/>
    <stop offset="1" stop-color="${preset.accents[0]}" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="0.7" fill="#ffffff" opacity="${preset.grain}"/>
    <circle cx="4" cy="4" r="0.6" fill="#000000" opacity="${(preset.grain * 1.6).toFixed(3)}"/>
  </pattern>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<rect width="${w}" height="${h}" fill="url(#glow)" filter="url(#soft)"/>
${motif}
<rect width="${w}" height="${h}" fill="url(#grain)"/>
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });
for (const brand of BRANDS) {
  const file = path.join(OUT_DIR, `hero-${brand.id}.svg`);
  await writeFile(file, poster(brand.id));
  console.log(`Постер бренда: ${path.relative(process.cwd(), file)}`);
}
console.log(`Готово: ${BRANDS.length} постера.`);
