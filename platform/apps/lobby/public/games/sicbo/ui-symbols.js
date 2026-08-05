// Библиотека игровых символов. Каждый символ — чистая функция, которая рисует
// SVG в цветах переданной палитры: один и тот же «крон» в Royale выйдет золотым,
// а в Aurora — неоновым. Никаких сторонних иконок и растровых ассетов.

const VIEWBOX = 120;

/** Общая подложка символа: скруглённый ромб + мягкое свечение. */
function plate(palette, inner, options = {}) {
  const { shape = "rounded" } = options;
  const body =
    shape === "circle"
      ? `<circle cx="60" cy="60" r="52" fill="url(#plate)" stroke="${palette.line}" stroke-width="2"/>`
      : `<rect x="8" y="8" width="104" height="104" rx="26" fill="url(#plate)" stroke="${palette.line}" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}">
<defs>
<linearGradient id="plate" x1="0" y1="0" x2="0.4" y2="1">
<stop offset="0" stop-color="${palette.surface2}"/><stop offset="1" stop-color="${palette.surface}"/>
</linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.4" r="0.6">
<stop offset="0" stop-color="${palette.primary}" stop-opacity="0.5"/>
<stop offset="1" stop-color="${palette.primary}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="accent" x1="0" y1="0" x2="0.6" y2="1">
<stop offset="0" stop-color="${palette.primary}"/><stop offset="1" stop-color="${palette.secondary}"/>
</linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0.5" y2="1">
<stop offset="0" stop-color="#fff3c4"/><stop offset="0.5" stop-color="${palette.gold}"/><stop offset="1" stop-color="#a8712a"/>
</linearGradient>
</defs>
${body}
<circle cx="60" cy="52" r="46" fill="url(#glow)"/>
${inner}
</svg>
`;
}

const pips = {
  1: [[60, 60]],
  2: [[42, 42], [78, 78]],
  3: [[42, 42], [60, 60], [78, 78]],
  4: [[42, 42], [78, 42], [42, 78], [78, 78]],
  5: [[42, 42], [78, 42], [60, 60], [42, 78], [78, 78]],
  6: [[42, 38], [78, 38], [42, 60], [78, 60], [42, 82], [78, 82]],
};

export const SYMBOL_LIBRARY = {
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((n) => [
      `die-${n}`,
      (p) =>
        plate(
          p,
          `<rect x="26" y="26" width="68" height="68" rx="16" fill="${p.text}" opacity="0.94"/>` +
            pips[n].map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7.5" fill="${p.base}"/>`).join(""),
        ),
    ]),
  ),

  rocket: (p) =>
    plate(
      p,
      `<path d="M60 22c14 12 20 28 20 44l-8 14H48l-8-14c0-16 6-32 20-44Z" fill="url(#accent)"/>
       <circle cx="60" cy="52" r="9" fill="${p.base}"/>
       <path d="M40 66 28 82l16-4Zm40 0 12 16-16-4Z" fill="${p.secondary}"/>
       <path d="M52 80h16l-8 20Z" fill="${p.gold}"/>`,
    ),

  flame: (p) =>
    plate(
      p,
      `<path d="M60 20c16 16 26 30 26 46a26 26 0 1 1-52 0c0-10 6-18 12-24 2 8 6 12 10 14-2-14 0-26 4-36Z" fill="url(#accent)"/>
       <path d="M60 52c8 8 12 14 12 22a12 12 0 1 1-24 0c0-8 6-16 12-22Z" fill="${p.gold}"/>`,
    ),

  gem: (p) =>
    plate(
      p,
      `<path d="M60 24 92 48 60 98 28 48Z" fill="url(#accent)"/>
       <path d="M60 24 76 48H44Zm-32 24h64L60 98Z" fill="${p.text}" opacity="0.16"/>
       <path d="M44 48h32L60 98Z" fill="${p.primary}" opacity="0.5"/>`,
    ),

  crown: (p) =>
    plate(
      p,
      `<path d="M26 82 32 40l18 16 10-24 10 24 18-16 6 42Z" fill="url(#gold)"/>
       <rect x="26" y="82" width="68" height="12" rx="4" fill="url(#gold)"/>
       <circle cx="60" cy="60" r="6" fill="${p.base}" opacity="0.35"/>`,
    ),

  star: (p) =>
    plate(
      p,
      `<path d="m60 22 11 27 29 2-22 19 7 28-25-15-25 15 7-28-22-19 29-2Z" fill="url(#gold)"/>`,
    ),

  "star-burst": (p) =>
    plate(
      p,
      `<path d="m60 18 8 26 26-8-18 24 18 24-26-8-8 26-8-26-26 8 18-24-18-24 26 8Z" fill="url(#accent)"/>
       <circle cx="60" cy="60" r="10" fill="${p.gold}"/>`,
    ),

  bolt: (p) => plate(p, `<path d="M66 20 34 66h20l-8 34 32-48H58Z" fill="url(#gold)"/>`),

  moon: (p) =>
    plate(
      p,
      `<path d="M74 24a38 38 0 1 0 0 72 30 30 0 0 1 0-72Z" fill="url(#accent)"/>
       <circle cx="82" cy="44" r="4" fill="${p.text}" opacity="0.5"/>
       <circle cx="88" cy="70" r="3" fill="${p.text}" opacity="0.35"/>`,
    ),

  spark: (p) =>
    plate(
      p,
      `<path d="M60 24c4 18 14 28 32 36-18 8-28 18-32 36-4-18-14-28-32-36 18-8 28-18 32-36Z" fill="url(#accent)"/>`,
    ),

  bell: (p) =>
    plate(
      p,
      `<path d="M60 24a22 22 0 0 1 22 22v20l8 12H30l8-12V46a22 22 0 0 1 22-22Z" fill="url(#gold)"/>
       <circle cx="60" cy="90" r="8" fill="${p.gold}"/>`,
    ),

  seven: (p) =>
    plate(
      p,
      `<path d="M34 30h52L58 96H40l26-52H34Z" fill="url(#gold)"/>`,
    ),

  diamond: (p) => plate(p, `<path d="M60 22 96 60 60 98 24 60Z" fill="url(#accent)"/>`),

  spade: (p) =>
    plate(
      p,
      `<path d="M60 22c14 16 30 24 30 40a18 18 0 0 1-30 13 18 18 0 0 1-30-13c0-16 16-24 30-40Z" fill="${p.text}"/>
       <path d="M54 78h12l6 20H48Z" fill="${p.text}"/>`,
    ),

  "card-back": (p) =>
    plate(
      p,
      `<rect x="26" y="20" width="68" height="80" rx="10" fill="url(#accent)"/>
       <rect x="34" y="28" width="52" height="64" rx="6" fill="none" stroke="${p.base}" stroke-width="2" opacity="0.6"/>
       <path d="M60 36 78 60 60 84 42 60Z" fill="${p.base}" opacity="0.45"/>`,
    ),

  chip: (p) =>
    plate(
      p,
      `<circle cx="60" cy="60" r="34" fill="url(#accent)"/>
       <circle cx="60" cy="60" r="22" fill="${p.base}" opacity="0.55"/>
       ${Array.from({ length: 8 }, (_, i) => {
         const angle = (Math.PI * 2 * i) / 8;
         const x1 = 60 + Math.cos(angle) * 26, y1 = 60 + Math.sin(angle) * 26;
         const x2 = 60 + Math.cos(angle) * 34, y2 = 60 + Math.sin(angle) * 34;
         return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.text}" stroke-width="6"/>`;
       }).join("")}`,
      { shape: "circle" },
    ),

  ball: (p) =>
    plate(
      p,
      `<circle cx="60" cy="60" r="30" fill="url(#accent)"/>
       <circle cx="50" cy="48" r="10" fill="${p.text}" opacity="0.45"/>`,
      { shape: "circle" },
    ),

  "ball-number": (p) =>
    plate(
      p,
      `<circle cx="60" cy="60" r="32" fill="url(#accent)"/>
       <circle cx="60" cy="60" r="20" fill="${p.base}" opacity="0.5"/>
       <circle cx="50" cy="46" r="8" fill="${p.text}" opacity="0.4"/>`,
      { shape: "circle" },
    ),

  peg: (p) =>
    plate(p, `<circle cx="60" cy="60" r="16" fill="${p.text}"/><circle cx="56" cy="55" r="5" fill="${p.primary}"/>`, {
      shape: "circle",
    }),

  bucket: (p) =>
    plate(
      p,
      `<path d="M30 40h60l-8 56H38Z" fill="url(#accent)"/>
       <rect x="30" y="34" width="60" height="10" rx="4" fill="${p.gold}"/>`,
    ),

  mine: (p) =>
    plate(
      p,
      `<circle cx="60" cy="62" r="26" fill="${p.base}" stroke="${p.secondary}" stroke-width="4"/>
       ${Array.from({ length: 8 }, (_, i) => {
         const angle = (Math.PI * 2 * i) / 8;
         return `<line x1="${(60 + Math.cos(angle) * 26).toFixed(1)}" y1="${(62 + Math.sin(angle) * 26).toFixed(1)}" x2="${(60 + Math.cos(angle) * 38).toFixed(1)}" y2="${(62 + Math.sin(angle) * 38).toFixed(1)}" stroke="${p.secondary}" stroke-width="5" stroke-linecap="round"/>`;
       }).join("")}
       <circle cx="52" cy="54" r="6" fill="${p.text}" opacity="0.4"/>`,
    ),

  // Закрытая плитка — нейтральная: акцентный градиент читался как «вскрыто».
  tile: (p) =>
    plate(
      p,
      `<rect x="26" y="26" width="68" height="68" rx="14" fill="${p.surface2}" stroke="${p.line}" stroke-width="2"/>
       <rect x="38" y="38" width="44" height="44" rx="9" fill="none" stroke="${p.primary}" stroke-width="1.6" opacity="0.35"/>
       <circle cx="60" cy="60" r="5" fill="${p.primary}" opacity="0.4"/>`,
    ),

  "arrow-up": (p) => plate(p, `<path d="M60 24 92 62H72v34H48V62H28Z" fill="url(#accent)"/>`),
  "arrow-down": (p) => plate(p, `<path d="M60 96 28 58h20V24h24v34h20Z" fill="url(#accent)"/>`),

  "wheel-segment": (p) =>
    plate(
      p,
      `${Array.from({ length: 10 }, (_, i) => {
        const a1 = (Math.PI * 2 * i) / 10, a2 = (Math.PI * 2 * (i + 1)) / 10;
        const color = i % 2 ? p.primary : p.secondary;
        return `<path d="M60 60 L${(60 + Math.cos(a1) * 40).toFixed(1)} ${(60 + Math.sin(a1) * 40).toFixed(1)} A40 40 0 0 1 ${(60 + Math.cos(a2) * 40).toFixed(1)} ${(60 + Math.sin(a2) * 40).toFixed(1)} Z" fill="${color}" opacity="${i % 2 ? 0.9 : 0.55}"/>`;
      }).join("")}
      <circle cx="60" cy="60" r="10" fill="${p.gold}"/>`,
      { shape: "circle" },
    ),

  pointer: (p) => plate(p, `<path d="M60 24 76 62H44Z" fill="${p.gold}"/><rect x="54" y="60" width="12" height="36" rx="4" fill="${p.text}"/>`),

  bowl: (p) =>
    plate(
      p,
      `<path d="M26 52h68a34 34 0 0 1-68 0Z" fill="url(#accent)"/>
       <ellipse cx="60" cy="52" rx="34" ry="10" fill="${p.text}" opacity="0.25"/>`,
    ),

  shoe: (p) =>
    plate(
      p,
      `<path d="M28 42h56l8 54H32Z" fill="url(#accent)"/>
       <rect x="38" y="30" width="36" height="16" rx="5" fill="${p.gold}"/>`,
    ),

  graph: (p) =>
    plate(
      p,
      `<path d="M26 92 46 68l16 12 32-42" fill="none" stroke="url(#accent)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
       <circle cx="94" cy="38" r="8" fill="${p.gold}"/>`,
    ),

  "grid-cell": (p) => plate(p, `<rect x="32" y="32" width="56" height="56" rx="10" fill="none" stroke="url(#accent)" stroke-width="6"/>`),

  /* --- Набор для слот-титулов slots-studio (природная и космическая линейки) --- */

  sun: (p) =>
    plate(
      p,
      `${Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 12;
        return `<line x1="${(60 + Math.cos(a) * 30).toFixed(1)}" y1="${(60 + Math.sin(a) * 30).toFixed(1)}" x2="${(60 + Math.cos(a) * 44).toFixed(1)}" y2="${(60 + Math.sin(a) * 44).toFixed(1)}" stroke="url(#gold)" stroke-width="7" stroke-linecap="round"/>`;
      }).join("")}
       <circle cx="60" cy="60" r="22" fill="url(#gold)"/>
       <circle cx="53" cy="52" r="7" fill="#fff6d8" opacity="0.7"/>`,
    ),

  wave: (p) =>
    plate(
      p,
      `<path d="M22 52c10-12 22-12 32 0s22 12 32 0" fill="none" stroke="url(#accent)" stroke-width="9" stroke-linecap="round"/>
       <path d="M22 72c10-12 22-12 32 0s22 12 32 0" fill="none" stroke="url(#accent)" stroke-width="9" stroke-linecap="round" opacity="0.7"/>
       <circle cx="86" cy="40" r="6" fill="${p.gold}"/>`,
    ),

  leaf: (p) =>
    plate(
      p,
      `<path d="M60 24c26 10 34 34 28 60-26 6-50-2-56-28 6-16 14-26 28-32Z" fill="url(#accent)"/>
       <path d="M42 78c14-14 26-26 34-42" fill="none" stroke="${p.base}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`,
    ),

  pearl: (p) =>
    plate(
      p,
      `<path d="M24 66c8 18 28 26 36 26s28-8 36-26c-10 6-24 10-36 10s-26-4-36-10Z" fill="url(#accent)"/>
       <circle cx="60" cy="52" r="20" fill="${p.text}"/>
       <circle cx="53" cy="45" r="7" fill="#ffffff" opacity="0.8"/>
       <circle cx="60" cy="52" r="20" fill="url(#glow)" opacity="0.5"/>`,
    ),

  kite: (p) =>
    plate(
      p,
      `<path d="M60 20 88 56 60 84 32 56Z" fill="url(#accent)"/>
       <path d="M60 20v64M32 56h56" stroke="${p.base}" stroke-width="3" opacity="0.5"/>
       <path d="M60 84c-4 8 4 10 0 18" fill="none" stroke="${p.gold}" stroke-width="4" stroke-linecap="round"/>
       <circle cx="60" cy="102" r="4" fill="${p.gold}"/>`,
    ),

  bloom: (p) =>
    plate(
      p,
      `${Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 6;
        return `<ellipse cx="${(60 + Math.cos(a) * 22).toFixed(1)}" cy="${(58 + Math.sin(a) * 22).toFixed(1)}" rx="15" ry="10" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${(60 + Math.cos(a) * 22).toFixed(1)} ${(58 + Math.sin(a) * 22).toFixed(1)})" fill="url(#accent)" opacity="0.9"/>`;
      }).join("")}
       <circle cx="60" cy="58" r="12" fill="url(#gold)"/>`,
    ),

  planet: (p) =>
    plate(
      p,
      `<circle cx="60" cy="58" r="24" fill="url(#accent)"/>
       <circle cx="52" cy="50" r="7" fill="${p.text}" opacity="0.35"/>
       <ellipse cx="60" cy="60" rx="42" ry="12" fill="none" stroke="url(#gold)" stroke-width="5" transform="rotate(-18 60 60)"/>`,
    ),

  orbit: (p) =>
    plate(
      p,
      `<circle cx="60" cy="60" r="34" fill="none" stroke="${p.line}" stroke-width="2.5"/>
       <circle cx="60" cy="60" r="20" fill="none" stroke="url(#accent)" stroke-width="3.5"/>
       <circle cx="60" cy="60" r="9" fill="url(#gold)"/>
       <circle cx="94" cy="60" r="7" fill="url(#accent)"/>
       <circle cx="46" cy="43" r="5" fill="${p.text}" opacity="0.8"/>`,
    ),

  nova: (p) =>
    plate(
      p,
      `<path d="m60 16 9 30 31 3-24 19 8 32-24-17-24 17 8-32-24-19 31-3Z" fill="url(#accent)"/>
       <path d="m60 34 5 17 18 2-14 11 5 18-14-10-14 10 5-18-14-11 18-2Z" fill="${p.gold}"/>
       <circle cx="60" cy="60" r="6" fill="#fff6d8"/>`,
    ),

  signal: (p) =>
    plate(
      p,
      `<circle cx="60" cy="74" r="9" fill="url(#gold)"/>
       <path d="M42 60a25 25 0 0 1 36 0" fill="none" stroke="url(#accent)" stroke-width="7" stroke-linecap="round"/>
       <path d="M30 46a42 42 0 0 1 60 0" fill="none" stroke="url(#accent)" stroke-width="7" stroke-linecap="round" opacity="0.6"/>
       <path d="M20 33a58 58 0 0 1 80 0" fill="none" stroke="url(#accent)" stroke-width="7" stroke-linecap="round" opacity="0.3"/>`,
    ),

  dust: (p) =>
    plate(
      p,
      `<path d="M52 30c3 12 8 17 20 20-12 3-17 8-20 20-3-12-8-17-20-20 12-3 17-8 20-20Z" fill="url(#accent)"/>
       <path d="M80 58c2 8 5 11 13 13-8 2-11 5-13 13-2-8-5-11-13-13 8-2 11-5 13-13Z" fill="${p.gold}"/>
       <circle cx="44" cy="82" r="5" fill="${p.text}" opacity="0.7"/>
       <circle cx="88" cy="34" r="4" fill="${p.text}" opacity="0.5"/>`,
    ),

  // Wild и Bonus — фирменные плашки: рамка-лента + крупная литера.
  wild: (p) =>
    plate(
      p,
      `<rect x="20" y="34" width="80" height="52" rx="12" fill="url(#gold)"/>
       <rect x="26" y="40" width="68" height="40" rx="8" fill="${p.base}" opacity="0.85"/>
       ${Array.from({ length: 8 }, (_, i) => {
         const a = (Math.PI * 2 * i) / 8 + 0.4;
         return `<line x1="${(60 + Math.cos(a) * 46).toFixed(1)}" y1="${(60 + Math.sin(a) * 34).toFixed(1)}" x2="${(60 + Math.cos(a) * 54).toFixed(1)}" y2="${(60 + Math.sin(a) * 42).toFixed(1)}" stroke="${p.gold}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`;
       }).join("")}
       <text x="60" y="72" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" font-weight="900" fill="url(#gold)">W</text>`,
    ),

  bonus: (p) =>
    plate(
      p,
      `<path d="m60 18 10 26 28 2-21 18 7 28-24-15-24 15 7-28-21-18 28-2Z" fill="url(#accent)"/>
       <circle cx="60" cy="62" r="17" fill="${p.base}" opacity="0.85"/>
       <text x="60" y="72" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="28" font-weight="900" fill="url(#gold)">B</text>`,
    ),
};

/** Список доступных символов — используется генератором и тестами. */
export const SYMBOL_NAMES = Object.keys(SYMBOL_LIBRARY);

/** Рисует символ в палитре темы. Неизвестное имя даёт нейтральную подложку. */
export function renderSymbol(name, palette) {
  const draw = SYMBOL_LIBRARY[name];
  return draw ? draw(palette) : plate(palette, "");
}
