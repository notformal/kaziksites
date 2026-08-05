/**
 * ═══════════════════════════════════════════════════════════
 * LIVE GAME COVER GENERATOR
 *
 * Generates simple gradient PNG covers for live casino games
 * that don't have engine-driven cover art.
 *
 * Uses only built-in Node.js modules (zlib, fs).
 * ═══════════════════════════════════════════════════════════
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');

// ─── Color palettes per provider ──────────────────────────
const PALETTES = {
  evolution: {
    bg1: '#1a0a2e', bg2: '#16213e', accent: '#e94560', gold: '#ffd700',
  },
  pragmatic: {
    bg1: '#0f0c29', bg2: '#302b63', accent: '#00d2ff', gold: '#f9d423',
  },
  ezugi: {
    bg1: '#1a1a2e', bg2: '#16213e', accent: '#00f5d4', gold: '#fee440',
  },
  vivo: {
    bg1: '#2d1b69', bg2: '#11002c', accent: '#ff0099', gold: '#ffd700',
  },
  endorphina: {
    bg1: '#0d0d0d', bg2: '#1a1a2e', accent: '#ff6348', gold: '#ffd700',
  },
  betby: {
    bg1: '#0b3d0b', bg2: '#1a1a2e', accent: '#00ff88', gold: '#ffd700',
  },
  pragmatic: {
    bg1: '#0f0c29', bg2: '#302b63', accent: '#00d2ff', gold: '#f9d423',
  },
};

// Generic fallback palette for catch-all entries
const GENERIC_PALETTE = {
  bg1: '#1a0a2e', bg2: '#16213e', accent: '#e94560', gold: '#ffd700',
};

// ─── Game to provider mapping ──────────────────────────────
// Note: 'pragmatic-live' is a catch-all Pragmatic entry.
const GAME_PROVIDER_MAP = {
  // Evolution
  'lightning-blackjack': 'evolution',
  'mega-roulette': 'evolution',
  'speed-baccarat': 'evolution',
  'crazy-time': 'evolution',
  'monopoly-live': 'evolution',
  'dream-catcher': 'evolution',
  'lightning-roulette': 'evolution',
  'infinite-blackjack': 'evolution',
  'auto-roulette': 'evolution',
  'casino-holdem': 'evolution',
  'three-card-poker': 'evolution',
  'power-blackjack': 'evolution',
  // Pragmatic
  'pragmatic-lightning-baccarat': 'pragmatic',
  'pragmatic-speed-roulette': 'pragmatic',
  'pragmatic-auto-roulette': 'pragmatic',
  'pragmatic-blackjack-vip': 'pragmatic',
  'pragmatic-standard-blackjack': 'pragmatic',
  'pragmatic-super-sic-bo': 'pragmatic',
  'pragmatic-lucky-6-baccarat': 'pragmatic',
  'pragmatic-dragon-tiger-pro': 'pragmatic',
  'pragmatic-cash-or-crash': 'pragmatic',
  'pragmatic-wheel-fortune': 'pragmatic',
  // Ezugi
  'ezugi-lightning-sic-bo': 'ezugi',
  'ezugi-speed-baccarat': 'ezugi',
  'ezugi-asian-blackjack': 'ezugi',
  'ezugi-auto-roulette': 'ezugi',
  'ezugi-super-and-bachet': 'ezugi',
  'ezugi-casino-stud-poker': 'ezugi',
  'ezugi-no-commission-baccarat': 'ezugi',
  'ezugi-fast-play-roulette': 'ezugi',
  // Vivo
  'vivo-blackjack': 'vivo',
  'vivo-roulette': 'vivo',
  'vivo-baccarat': 'vivo',
  'vivo-casino-poker': 'vivo',
  'vivo-sic-bo': 'vivo',
  // Endorphina live games (endorphina-lightning-dice is a separate live game from instant lightning-dice)
  'endorphina-live-poker': 'endorphina',
  'endorphina-lightning-dice': 'endorphina',
  'endorphina-speed-roulette': 'endorphina',
  'endorphina-baccarat-gold': 'endorphina',
  'endorphina-blackjack-vip': 'endorphina',
  // Catch-all / generic live entries
  'pragmatic-live': 'pragmatic',
  'betby-sports': 'betby',
};

// ─── CRC32 lookup table ────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  CRC_TABLE[i] = crc;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG builder ───────────────────────────────────────────
function buildPNG(width, height, rgbPixels) {
  // rgbPixels: Uint8Array of RGB triples (width*height*3 bytes)

  function makeChunk(type, payload) {
    const len = payload.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4);
    payload.copy(buf, 8);
    buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), payload])), 8 + len);
    return buf;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — rows with filter byte 0 (None)
  const rowSize = width * 3 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 3;
      const di = y * rowSize + x * 3 + 1;
      raw[di]     = rgbPixels[si];
      raw[di + 1] = rgbPixels[si + 1];
      raw[di + 2] = rgbPixels[si + 2];
    }
  }

  const compressed = deflateSync(raw, 9); // max compression

  // IEND
  const iend = Buffer.alloc(0);

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', iend)]);
}

// ─── Gradient cover generator ──────────────────────────────
function generateCover(width, height, palette) {
  const pixels = new Uint8Array(width * height * 3);

  const r1 = parseInt(palette.bg1.slice(1, 3), 16);
  const g1 = parseInt(palette.bg1.slice(3, 5), 16);
  const b1 = parseInt(palette.bg1.slice(5, 7), 16);

  const r2 = parseInt(palette.bg2.slice(1, 3), 16);
  const g2 = parseInt(palette.bg2.slice(3, 5), 16);
  const b2 = parseInt(palette.bg2.slice(5, 7), 16);

  const ra = parseInt(palette.accent.slice(1, 3), 16);
  const ga = parseInt(palette.accent.slice(3, 5), 16);
  const ba = parseInt(palette.accent.slice(5, 7), 16);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.SQRT1_2;
      const t = dist / maxDist;

      let r = r2 + (r1 - r2) * t;
      let g = g2 + (g1 - g2) * t;
      let b = b2 + (b1 - b2) * t;

      // Accent glow in center
      const glow = Math.max(0, 1 - t * 2);
      r += (ra - r) * glow * 0.35;
      g += (ga - g) * glow * 0.35;
      b += (ba - b) * glow * 0.35;

      // Subtle diagonal pattern
      const pattern = Math.sin((nx + ny) * 20) * 4;
      r += pattern;
      g += pattern;
      b += pattern;

      const idx = (y * width + x) * 3;
      pixels[idx]     = Math.max(0, Math.min(255, r));
      pixels[idx + 1] = Math.max(0, Math.min(255, g));
      pixels[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }

  return pixels;
}

// ─── Main ──────────────────────────────────────────────────
const games = Object.keys(GAME_PROVIDER_MAP);
let success = 0;
let failed = 0;

for (const gameId of games) {
  const provider = GAME_PROVIDER_MAP[gameId];
  const palette = PALETTES[provider];

  if (!palette) {
    console.error(`✗ ${gameId}: no palette for provider ${provider}`);
    failed++;
    continue;
  }

  const outDir = resolve(PUBLIC, 'games', gameId);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  try {
    const pixels = generateCover(480, 360, palette);
    const png = buildPNG(480, 360, pixels);
    writeFileSync(resolve(outDir, 'cover.png'), png);
    console.log(`✓ ${gameId}/cover.png  (${provider})`);
    success++;
  } catch (err) {
    console.error(`✗ ${gameId}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${success} cover(s) written, ${failed} failed.`);
if (failed > 0) process.exit(1);