import path from 'node:path';

export function config(env = process.env) {
  return {
    port: Number(env.PORT || 8787),
    databasePath: path.resolve(env.DATABASE_PATH || './data/casino.sqlite'),
    allowedOrigins: new Set((env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://127.0.0.1:4178').split(',').map(x => x.trim()).filter(Boolean)),
    sessionTtlMs: Number(env.SESSION_TTL_HOURS || 168) * 3600_000,
    trustProxy: env.TRUST_PROXY === 'true'
  };
}
