/**
 * Per-brand production site assets: SEO/social head tags, crawler files,
 * web app manifest, icon and Open Graph image.
 *
 * Single source of truth for brand identity is `src/themes.js`.
 * Absolute URLs (canonical, og:url, sitemap) are only emitted when SITE_URL is
 * provided at build time — we never invent a domain.
 */
import { deflateSync } from "node:zlib";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&amp;family=Manrope:wght@600;700;800&amp;family=Playfair+Display:wght@700&amp;display=swap";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/** Marketing description for a brand, used for <meta description>/OG/Twitter. */
export const brandDescription = (theme) => `${theme.hero} ${theme.copy}`;

/* ------------------------------------------------------------------ *
 * PNG encoding (no third-party deps): 8-bit RGB, single IDAT.
 * ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
};
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
};

/**
 * Open Graph image: diagonal brand gradient over the product's dark base.
 * Placeholder-grade by design — replace with a designed 1200x630 asset that
 * carries the wordmark when brand artwork is available.
 */
export function ogImagePng(theme, width = 1200, height = 630) {
  const base = [7, 9, 16];
  const a = hexToRgb(theme.accent);
  const b = hexToRgb(theme.accent2);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const t = Math.min(1, (x / width) * 0.65 + (y / height) * 0.35);
      // Radial-ish falloff keeps the corners dark like the site background.
      const dx = x / width - 0.28,
        dy = y / height - 0.3;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.9);
      const mix = 0.18 + glow * 0.62;
      for (let c = 0; c < 3; c++) {
        const accent = a[c] + (b[c] - a[c]) * t;
        raw[o++] = Math.round(base[c] + (accent - base[c]) * mix);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Scalable brand icon (modern browsers prefer SVG favicons). */
export const iconSvg = (theme) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${esc(theme.name)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent2}"/>
</linearGradient></defs>
<rect width="64" height="64" rx="14" fill="#070910"/>
<rect x="3" y="3" width="58" height="58" rx="12" fill="none" stroke="url(#g)" stroke-width="2.5"/>
<path d="M24 20v24l19-12z" fill="url(#g)"/>
</svg>`;

export const webmanifest = (brand, theme) =>
  JSON.stringify(
    {
      name: `${theme.name} — Social Casino`,
      short_name: theme.name,
      description: brandDescription(theme),
      id: `/?brand=${brand}`,
      start_url: "./",
      scope: "./",
      display: "standalone",
      orientation: "any",
      background_color: "#070910",
      theme_color: theme.accent,
      categories: ["games", "entertainment"],
      icons: [
        { src: "./icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "./favicon.ico", sizes: "48x48", type: "image/x-icon" },
      ],
    },
    null,
    2,
  );

export const robotsTxt = (siteUrl) =>
  ["User-agent: *", "Allow: /", "", "# Third-party game bundles are not content pages", "Disallow: /games/", ...(siteUrl ? ["", `Sitemap: ${siteUrl}/sitemap.xml`] : []), ""].join("\n");

export const sitemapXml = (siteUrl, lastmod = new Date().toISOString().slice(0, 10)) => {
  const pages = [
    { loc: `${siteUrl}/`, priority: "1.0", freq: "weekly" },
    { loc: `${siteUrl}/legal.html`, priority: "0.3", freq: "yearly" },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${p.loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`;
};

/** SEO + social + PWA head tags injected into the built index.html. */
export function headTags({ brand, theme, siteUrl }) {
  const title = `${theme.name} — Social Casino`;
  const desc = brandDescription(theme);
  const ogImage = siteUrl ? `${siteUrl}/og-image.png` : "./og-image.png";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: theme.name,
    description: desc,
    inLanguage: "en",
    ...(siteUrl ? { url: `${siteUrl}/` } : {}),
    publisher: { "@type": "Organization", name: theme.name, ...(siteUrl ? { url: `${siteUrl}/` } : {}) },
  };
  return [
    `<meta name="robots" content="index,follow"/>`,
    `<meta name="author" content="${esc(theme.name)}"/>`,
    siteUrl ? `<link rel="canonical" href="${siteUrl}/"/>` : "",
    // Fonts: preconnect + non-blocking link (moved out of a CSS @import chain).
    `<link rel="preconnect" href="https://fonts.googleapis.com"/>`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>`,
    `<link rel="stylesheet" href="${FONT_HREF}"/>`,
    // Icons / PWA
    `<link rel="icon" type="image/svg+xml" href="./icon.svg"/>`,
    `<link rel="apple-touch-icon" href="./icon.svg"/>`,
    `<link rel="manifest" href="./site.webmanifest"/>`,
    // Open Graph
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="${esc(theme.name)}"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(desc)}"/>`,
    `<meta property="og:image" content="${esc(ogImage)}"/>`,
    `<meta property="og:image:width" content="1200"/>`,
    `<meta property="og:image:height" content="630"/>`,
    `<meta property="og:image:alt" content="${esc(theme.name)} — ${esc(theme.tag)}"/>`,
    `<meta property="og:locale" content="en_US"/>`,
    siteUrl ? `<meta property="og:url" content="${siteUrl}/"/>` : "",
    // Twitter
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(desc)}"/>`,
    `<meta name="twitter:image" content="${esc(ogImage)}"/>`,
    // Structured data
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join("\n");
}
