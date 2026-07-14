import express from 'express';
import helmet from 'helmet';
import { hashPassword, verifyPassword, newToken, tokenHash, rateLimiter } from './security.js';

const emailOk = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
const gameOk = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(v);
const publicUser = u => ({ id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at });

export function createApp({ db, config, now = () => Date.now() }) {
  const app = express();
  app.disable('x-powered-by'); app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') return origin && config.allowedOrigins.has(origin) ? res.sendStatus(204) : res.sendStatus(403);
    next();
  });
  app.use(express.json({ limit: '16kb' })); app.use(rateLimiter());
  const auth = (req, res, next) => {
    const m = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/);
    if (!m) return res.status(401).json({ error: 'unauthorized' });
    const row = db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(m[1]), now());
    if (!row) return res.status(401).json({ error: 'unauthorized' }); req.user = row; req.token = m[1]; next();
  };
  app.get('/health', (_q, r) => r.json({ ok: true }));
  app.post('/api/auth/register', rateLimiter({ limit: 10 }), async (req, res, next) => { try {
    const { email, password, displayName } = req.body || {};
    if (!emailOk(email) || typeof password !== 'string' || password.length < 10 || password.length > 128 || typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 40) return res.status(400).json({ error: 'invalid_input' });
    const hash = await hashPassword(password); let info;
    try { info = db.prepare('INSERT INTO users(email,display_name,password_hash) VALUES(?,?,?)').run(email.trim().toLowerCase(), displayName.trim(), hash); } catch (e) { if (e.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'email_exists' }); throw e; }
    db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key) VALUES(?,?,?,?)').run(info.lastInsertRowid, 1000, 'welcome', 'welcome');
    const token = newToken(), expiresAt = now()+config.sessionTtlMs;
    db.prepare('INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)').run(info.lastInsertRowid, tokenHash(token), expiresAt, now());
    res.status(201).json({ token, expiresAt: new Date(expiresAt).toISOString(), user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid)) });
  } catch(e) { next(e); }});
  app.post('/api/auth/login', rateLimiter({ limit: 10 }), async (req, res, next) => { try {
    const user = emailOk(req.body?.email) && db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email.trim().toLowerCase());
    if (!user || typeof req.body?.password !== 'string' || !(await verifyPassword(req.body.password, user.password_hash))) return res.status(401).json({ error: 'invalid_credentials' });
    const token = newToken(); db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
    db.prepare('INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)').run(user.id, tokenHash(token), now()+config.sessionTtlMs, now());
    res.json({ token, expiresAt: new Date(now()+config.sessionTtlMs).toISOString(), user: publicUser(user) });
  } catch(e) { next(e); }});
  app.post('/api/auth/logout', auth, (req, res) => { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(req.token)); res.sendStatus(204); });
  app.get('/api/profile', auth, (req, res) => res.json({ user: publicUser(req.user) }));
  app.put('/api/profile', auth, (req, res) => { const n=req.body?.displayName; if(typeof n!=='string'||n.trim().length<2||n.trim().length>40)return res.status(400).json({error:'invalid_input'}); db.prepare('UPDATE users SET display_name=? WHERE id=?').run(n.trim(),req.user.id); res.json({user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id))}); });
  app.get('/api/favorites', auth, (req,res)=>res.json({games:db.prepare('SELECT game_id AS gameId,created_at AS createdAt FROM favorites WHERE user_id=? ORDER BY created_at DESC').all(req.user.id)}));
  app.put('/api/favorites/:gameId', auth, (req,res)=>{if(!gameOk(req.params.gameId))return res.status(400).json({error:'invalid_game'});db.prepare('INSERT OR IGNORE INTO favorites(user_id,game_id) VALUES(?,?)').run(req.user.id,req.params.gameId);res.sendStatus(204);});
  app.delete('/api/favorites/:gameId', auth, (req,res)=>{db.prepare('DELETE FROM favorites WHERE user_id=? AND game_id=?').run(req.user.id,req.params.gameId);res.sendStatus(204);});
  app.post('/api/recents/:gameId', auth, (req,res)=>{if(!gameOk(req.params.gameId))return res.status(400).json({error:'invalid_game'});db.prepare("INSERT INTO recents(user_id,game_id) VALUES(?,?) ON CONFLICT(user_id,game_id) DO UPDATE SET played_at=datetime('now'),play_count=play_count+1").run(req.user.id,req.params.gameId);res.sendStatus(204);});
  app.get('/api/recents', auth, (req,res)=>res.json({games:db.prepare('SELECT game_id AS gameId,played_at AS playedAt,play_count AS playCount FROM recents WHERE user_id=? ORDER BY played_at DESC LIMIT 50').all(req.user.id)}));
  const wallet = uid => ({ balance: db.prepare('SELECT COALESCE(SUM(amount),0) balance FROM wallet_ledger WHERE user_id=?').get(uid).balance, ledger: db.prepare('SELECT id,amount,kind,idempotency_key AS idempotencyKey,metadata,created_at AS createdAt FROM wallet_ledger WHERE user_id=? ORDER BY id DESC LIMIT 100').all(uid) });
  app.get('/api/wallet', auth, (req,res)=>res.json(wallet(req.user.id)));
  app.post('/api/wallet/daily-reward', auth, (req,res)=>{const day=new Date(now()).toISOString().slice(0,10), key=`daily:${day}`;let claimed=true;try{db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key) VALUES(?,?,?,?)').run(req.user.id,250,'daily_reward',key);}catch(e){if(e.code?.startsWith('SQLITE_CONSTRAINT'))claimed=false;else throw e;}res.json({claimed,reward:claimed?250:0,...wallet(req.user.id)});});
  app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'internal_error' }); });
  return app;
}
