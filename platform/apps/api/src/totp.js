// RFC 6238 TOTP (SHA-1, 6 digits, 30s period) + RFC 4648 base32, dependency-free.
import { createHmac, randomBytes } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New base32 secret (default 20 bytes = 160 bits, the RFC-recommended SHA-1 size). */
export const generateSecret = (bytes = 20) => base32Encode(randomBytes(bytes));

function hotp(secretBase32, counter, digits = 6) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter (safe for JS integer range).
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export const totp = (secretBase32, timeMs, { period = 30, digits = 6 } = {}) =>
  hotp(secretBase32, Math.floor(timeMs / 1000 / period), digits);

/** Verify a code within ±`window` periods to tolerate clock skew. */
export function verifyTotp(secretBase32, code, timeMs, { period = 30, digits = 6, window = 1 } = {}) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(timeMs / 1000 / period);
  for (let w = -window; w <= window; w++) {
    if (hotp(secretBase32, counter + w, digits) === code) return true;
  }
  return false;
}

export const otpauthUri = (secretBase32, { label, issuer }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
