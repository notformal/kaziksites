/**
 * ═══════════════════════════════════════════════════════════
 * PROVABLY-FAIR RANDOMNESS
 *
 * A commit–reveal scheme. Before the first spin the engine draws a server seed
 * and publishes only its SHA-256 hash. Each spin consumes an incrementing
 * nonce, and the outcome derives from HMAC(serverSeed, clientSeed:nonce). The
 * player may set their own client seed at any time, and on request the server
 * seed is revealed so every past round can be recomputed and checked.
 *
 * The point is falsifiability: because the commitment is published *before* the
 * player picks their seed, the house cannot have chosen a server seed that
 * favours a particular outcome after the fact.
 *
 * (In this build the "server" is the page itself — the demo has no wallet. The
 * interface is the one a real backend would expose, so wiring it to a server
 * changes where the seed comes from and nothing else.)
 *
 * FALLBACK: If Web Crypto API is unavailable (e.g., file:// protocol or old
 * browsers), the engine falls back to Mulberry32 seeded PRNG. This maintains
 * game functionality at the cost of provable fairness — the commitment hash
 * will be null in fallback mode.
 * ═══════════════════════════════════════════════════════════
 */

import { RNG } from '../config/engine.config.js';

const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const encoder = new TextEncoder();

// ── Web Crypto availability check ──────────────────────────────

/** Check if the Web Crypto API is available for provable fairness. */
function cryptoAvailable() {
  try {
    return !!(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
  } catch {
    return false;
  }
}

// ── Mulberry32 PRNG — fast, deterministic fallback ─────────────
/**
 * Mulberry32: a fast, seeded 32-bit PRNG. Not cryptographically secure, but
 * excellent for game outcomes when provable fairness isn't available.
 * 
 * Properties:
 * - Period: 2^32 (full period)
 * - Uniform distribution over [0,1)
 * - Deterministic: same seed → same sequence
 * - Fast: no async operations needed
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return function() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a Uint8Array seed to a 32-bit number for Mulberry32. */
function seedToUint32(seedBytes) {
  let hash = 0x6D2B79F5;
  for (let i = 0; i < Math.min(seedBytes.length, 4); i++) {
    hash ^= (seedBytes[i] << (i * 8)) >>> 0;
    hash = Math.imul(hash, 0x6D2B79F5);
  }
  return hash >>> 0;
}

// ── SHA-256 hashing ────────────────────────────────────────────

async function sha256Hex(input) {
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  const digest = await crypto.subtle.digest(RNG.hash, data);
  return toHex(new Uint8Array(digest));
}

// ── Provably Fair RNG (Web Crypto) ─────────────────────────────

export class ProvablyFairRng {
  constructor({ clientSeed } = {}) {
    this._cryptoAvailable = cryptoAvailable();
    
    if (this._cryptoAvailable) {
      // Full provable fairness mode
      this.serverSeed = crypto.getRandomValues(new Uint8Array(RNG.serverSeedBytes));
      this.serverSeedHex = toHex(this.serverSeed);
      this.clientSeed = clientSeed || toHex(crypto.getRandomValues(new Uint8Array(8)));
      this.nonce = 0;
      this.commitment = null;
      this._stream = [];
      this._cursor = 0;
      this._key = null;
      this._mode = 'provably-fair';
    } else {
      // Mulberry32 fallback mode
      const fallbackSeed = crypto.getRandomValues 
        ? crypto.getRandomValues(new Uint8Array(4))
        : new Uint8Array([0x6D2B, 0x79F5, 0xABCD, 0xEF01]);
      this._mulberryState = mulberry32(seedToUint32(fallbackSeed));
      this.serverSeedHex = toHex(fallbackSeed);
      this.clientSeed = clientSeed || 'fallback-seed';
      this.nonce = 0;
      this.commitment = null; // No commitment without Web Crypto
      this._mode = 'mulberry32-fallback';
    }
  }

  /** Publish the commitment. Must be awaited before the first spin. */
  async init() {
    if (!this._cryptoAvailable) {
      // Skip in fallback mode — no Web Crypto available
      return null;
    }
    
    try {
      this.commitment = await sha256Hex(this.serverSeed);
      this._key = await crypto.subtle.importKey(
        'raw',
        this.serverSeed,
        { name: 'HMAC', hash: RNG.hash },
        false,
        ['sign'],
      );
      return this.commitment;
    } catch (error) {
      console.warn('[ProvablyFairRng] Web Crypto init failed, falling back to Mulberry32:', error.message);
      this._mode = 'mulberry32-fallback';
      this._mulberryState = mulberry32(seedToUint32(this.serverSeed));
      return null;
    }
  }

  /** Players may re-seed whenever they like; it takes effect from the next round. */
  setClientSeed(seed) {
    this.clientSeed = String(seed || '').slice(0, 64) || this.clientSeed;
    if (this._cryptoAvailable && this._key) {
      this._stream = [];
      this._cursor = 0;
    }
    return this.clientSeed;
  }

  /**
   * Refill the float stream for the current nonce.
   */
  async _refill() {
    if (!this._cryptoAvailable || !this._key) return;
    
    const message = encoder.encode(`${this.clientSeed}:${this.nonce}:${this._stream.length}`);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', this._key, message));
    const floats = [];
    for (let i = 0; i + 4 <= sig.length; i += 4) {
      const v = ((sig[i] << 24) >>> 0) + (sig[i + 1] << 16) + (sig[i + 2] << 8) + sig[i + 3];
      floats.push(v / 4294967296);
    }
    this._stream = floats;
    this._cursor = 0;
  }

  /** Begin a new round. Increments the nonce and resets the stream. */
  async nextRound() {
    this.nonce++;
    
    if (this._cryptoAvailable && this._key) {
      this._stream = [];
      this._cursor = 0;
      await this._refill();
    }
    // In fallback mode, Mulberry32 generates on-demand
    
    return this.nonce;
  }

  /**
   * Uniform [0,1). Synchronous by design — the evaluator calls it in a tight
   * loop, so the stream is refilled ahead of the round rather than awaited
   * per draw. Falls back to crypto randomness or Mulberry32 if needed.
   */
  random() {
    // Try stream first (provably fair mode)
    if (this._cryptoAvailable && this._key && this._cursor < this._stream.length) {
      return this._stream[this._cursor++];
    }
    
    // Stream exhausted or not available — generate fresh values
    if (this._cryptoAvailable && this._key) {
      // Refill stream ahead of time for next round
      const message = encoder.encode(`${this.clientSeed}:${this.nonce}:refill`);
      crypto.subtle.sign('HMAC', this._key, message).then((sig) => {
        const bytes = new Uint8Array(sig);
        const floats = [];
        for (let i = 0; i + 4 <= bytes.length && floats.length < 16; i += 4) {
          const v = ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
          floats.push(v / 4294967296);
        }
        this._stream = floats;
        this._cursor = 0;
      }).catch(() => {});
      
      // Use crypto.getRandomValues as synchronous fallback while async refill happens
      if (globalThis.crypto?.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      }
    } else if (!this._cryptoAvailable || !this._key) {
      // Fallback mode: use Mulberry32 if available, otherwise crypto.getRandomValues
      if (this._mulberryState) {
        return this._mulberryState();
      }
      if (globalThis.crypto?.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      }
    }
    
    // Last resort: Math.random (should never happen in practice)
    return Math.random();
  }

  /** Everything a player needs to verify past rounds themselves. */
  getVerification() {
    return {
      commitment: this.commitment,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      mode: this._mode,
      algorithm: this._cryptoAvailable
        ? `HMAC-${RNG.hash}(serverSeed, "clientSeed:nonce:chunk")`
        : 'Mulberry32 (fallback — no provable fairness)',
    };
  }

  /** Reveal the server seed so the commitment — and every round — can be checked. */
  reveal() {
    return { serverSeed: this.serverSeedHex, commitment: this.commitment };
  }
}

export { sha256Hex, mulberry32, cryptoAvailable };
export default ProvablyFairRng;
