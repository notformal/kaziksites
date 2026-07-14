export function config(env = process.env) {
  return {
    port: Number(env.PORT || 8787),
    databaseUrl: env.DATABASE_URL || 'postgres://casino:casino@localhost:5432/casino',
    databaseSsl: env.DATABASE_SSL === 'true',
    allowedOrigins: new Set((env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://127.0.0.1:4178').split(',').map(x => x.trim()).filter(Boolean)),
    sessionTtlMs: Number(env.SESSION_TTL_HOURS || 168) * 3600_000,
    trustProxy: env.TRUST_PROXY === 'true' ? 1 : false,
    analyticsAdminKey: env.ANALYTICS_ADMIN_KEY || '',
    socialAliasSecret: env.SESSION_SECRET || '',
    globalRateLimit: Math.max(60, Math.min(10_000, Number(env.GLOBAL_RATE_LIMIT || 300)))
  };
}
