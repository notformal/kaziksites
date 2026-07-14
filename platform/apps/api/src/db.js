import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const migrationsDir = new URL('../migrations/', import.meta.url);

export async function migrate(db) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await fs.readdir(migrationsDir)).filter(x => x.endsWith('.sql')).sort();
  for (const name of files) {
    const done = await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
    if (done.rowCount) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(await fs.readFile(new URL(name, migrationsDir), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}

export async function createDb(connectionString, options = {}) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const db = new Pool({ connectionString, max: options.max ?? 20, ssl: options.ssl ? { rejectUnauthorized: true } : undefined });
  await db.query('SELECT 1');
  await migrate(db);
  return db;
}

export async function transaction(db, work) {
  const client = await db.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
