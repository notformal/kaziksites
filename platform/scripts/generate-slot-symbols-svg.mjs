// GPU-independent slot symbol-set generator: renders crisp, transparent PNG icons
// from procedural SVG via Playwright (same approach as the cover-art pipeline).
// This is the reliable asset base; the ComfyUI script is the photoreal upgrade.
// Output: assets/slot-symbols/<theme>/<symbolId>.png (512×512, transparent).
//
//   node scripts/generate-slot-symbols-svg.mjs                 # default theme, all symbols
//   node scripts/generate-slot-symbols-svg.mjs royal-gems crown ruby
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const S = 512, C = S / 2;

// A faceted brilliant-cut gem, parameterised by colour ramp.
function gem({ light, base, dark, edge }) {
  const outline = `M175,105 L337,105 L440,205 L256,440 L72,205 Z`;
  const facets = [
    "M72,205 L175,105", "M440,205 L337,105", "M175,105 L337,105", "M72,205 L440,205",
    "M72,205 L256,440", "M440,205 L256,440",
    "M175,105 L256,205", "M337,105 L256,205", "M72,205 L256,205", "M440,205 L256,205", "M256,205 L256,440",
  ].map((d) => `<path d="${d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>`).join("");
  return `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${light}"/><stop offset="0.5" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <radialGradient id="hl" cx="0.4" cy="0.3" r="0.5"><stop offset="0" stop-color="rgba(255,255,255,.85)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient>
    </defs>
    <path d="${outline}" fill="url(#g)" stroke="${edge}" stroke-width="6" stroke-linejoin="round"/>
    ${facets}
    <polygon points="175,105 337,105 256,205" fill="url(#hl)"/>`;
}

// A jewelled crown.
function crown() {
  return `
    <defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE79A"/><stop offset="0.5" stop-color="#F4C430"/><stop offset="1" stop-color="#B8860B"/></linearGradient></defs>
    <path d="M96,360 L110,180 L200,270 L256,150 L312,270 L402,180 L416,360 Z" fill="url(#gold)" stroke="#8a5a00" stroke-width="8" stroke-linejoin="round"/>
    <rect x="96" y="360" width="320" height="46" rx="10" fill="url(#gold)" stroke="#8a5a00" stroke-width="8"/>
    <circle cx="110" cy="176" r="17" fill="#ff5b7f" stroke="#8a5a00" stroke-width="5"/>
    <circle cx="256" cy="146" r="19" fill="#5bd1ff" stroke="#8a5a00" stroke-width="5"/>
    <circle cx="402" cy="176" r="17" fill="#7bff9a" stroke="#8a5a00" stroke-width="5"/>
    <circle cx="180" cy="383" r="12" fill="#ff5b7f"/><circle cx="256" cy="383" r="12" fill="#5bd1ff"/><circle cx="332" cy="383" r="12" fill="#7bff9a"/>`;
}

// A radiant WILD starburst.
function wild() {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2, r1 = i % 2 ? 120 : 210, x = C + Math.cos(a) * r1, y = C + Math.sin(a) * r1;
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(" ");
  return `
    <defs><radialGradient id="wg" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF3B0"/><stop offset="0.6" stop-color="#FF8C00"/><stop offset="1" stop-color="#C2410C"/></radialGradient></defs>
    <polygon points="${rays}" fill="url(#wg)" stroke="#7c2d12" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="${C}" cy="${C}" r="96" fill="#7c2d12"/>
    <text x="${C}" y="${C + 16}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="52" fill="#FFE79A">WILD</text>`;
}

// A gold scatter star with sparkles.
function scatter() {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 80 : 200, x = C + Math.cos(a) * r, y = C + Math.sin(a) * r;
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(" ");
  return `
    <defs><radialGradient id="sg" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#FFF7C2"/><stop offset="0.6" stop-color="#FFC83D"/><stop offset="1" stop-color="#E08A00"/></radialGradient></defs>
    <polygon points="${pts}" fill="url(#sg)" stroke="#a86400" stroke-width="7" stroke-linejoin="round"/>
    <circle cx="120" cy="120" r="10" fill="#fff"/><circle cx="410" cy="150" r="8" fill="#fff"/><circle cx="150" cy="400" r="7" fill="#fff"/>`;
}

const GEMS = {
  ten: { light: "#BEEBFF", base: "#5FB6E0", dark: "#2A6E93", edge: "#1c4a63" },
  jack: { light: "#CFFBD6", base: "#59C878", dark: "#2A7D45", edge: "#1c5230" },
  queen: { light: "#EAD3FB", base: "#B073E0", dark: "#6A3E96", edge: "#472763" },
  king: { light: "#CFDDFF", base: "#5A78E0", dark: "#2E4593", edge: "#1f2f63" },
  ace: { light: "#C8FBDF", base: "#2ECC71", dark: "#188049", edge: "#0f5230" },
  ruby: { light: "#FFD0D8", base: "#E4445B", dark: "#93202F", edge: "#63151f" },
};
const THEMES = {
  "royal-gems": {
    ...Object.fromEntries(Object.entries(GEMS).map(([k, v]) => [k, () => gem(v)])),
    crown, wild, scatter,
  },
};

const svgDoc = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${inner}</svg>`;

const [themeArg, ...only] = process.argv.slice(2);
const theme = themeArg && THEMES[themeArg] ? themeArg : "royal-gems";
const map = THEMES[theme];
const symbols = (only.length ? only : Object.keys(map)).filter((s) => map[s] || (console.warn(`unknown symbol: ${s}`), false));
const outDir = fileURLToPath(new URL(`../assets/slot-symbols/${theme}/`, import.meta.url));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: S, height: S } });
for (const sym of symbols) {
  await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${svgDoc(map[sym]())}`);
  await page.locator("svg").screenshot({ path: `${outDir}${sym}.png`, omitBackground: true });
  console.log(`✓ ${theme}/${sym}.png`);
}
await browser.close();
console.log(`\nDone. ${symbols.length} transparent symbol(s) -> assets/slot-symbols/${theme}/`);
