import crypto from 'node:crypto';

const b64 = b => Buffer.from(b).toString('base64url');
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384 }, (e, k) => e ? reject(e) : resolve(k)));
  return `scrypt$16384$${b64(salt)}$${b64(derived)}`;
}
export async function verifyPassword(password, encoded) {
  const [name, n, salt, expected] = encoded.split('$');
  if (name !== 'scrypt' || !salt || !expected) return false;
  const actual = await new Promise((resolve, reject) => crypto.scrypt(password, Buffer.from(salt, 'base64url'), 64, { N: Number(n) }, (e, k) => e ? reject(e) : resolve(k)));
  return crypto.timingSafeEqual(actual, Buffer.from(expected, 'base64url'));
}
export const newToken = () => b64(crypto.randomBytes(32));
export const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');

export function rateLimiter({ windowMs = 60_000, limit = 300 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = req.ip;
    const item = hits.get(key);
    if (!item || item.reset <= now) hits.set(key, { count: 1, reset: now + windowMs });
    else if (++item.count > limit) return res.status(429).json({ error: 'too_many_requests' });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    next();
  };
}
