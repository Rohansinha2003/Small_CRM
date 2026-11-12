import "server-only";

type Row = Record<string, unknown>;
interface Driver { query(sql: string, params?: unknown[]): Promise<Row[]>; tx<T>(fn: (q: Driver["query"]) => Promise<T>): Promise<T> }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY, name text NOT NULL, settings jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, email text NOT NULL UNIQUE, name text NOT NULL, role text NOT NULL DEFAULT 'Owner', password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key text PRIMARY KEY, count int NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS records (workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, collection text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (workspace_id, collection, id));
CREATE INDEX IF NOT EXISTS records_ws_idx ON records (workspace_id, collection);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'Free';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS pilot boolean NOT NULL DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS tokens (token_hash text PRIMARY KEY, kind text NOT NULL, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_id text REFERENCES users(id) ON DELETE CASCADE, role text, created_by text, expires_at timestamptz NOT NULL, used_at timestamptz);
CREATE TABLE IF NOT EXISTS payments (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, plan text NOT NULL, period text NOT NULL, amount int NOT NULL, status text NOT NULL DEFAULT 'created', payment_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz);
CREATE TABLE IF NOT EXISTS audit_log (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_name text NOT NULL, action text NOT NULL, detail text NOT NULL DEFAULT '', at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS audit_ws_idx ON audit_log (workspace_id, at DESC);
`;

let driverP: Promise<Driver> | null = null;

async function make(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true } });
    const run = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: Row[] }> }) => async (sql: string, p?: unknown[]) => (await c.query(sql, p)).rows;
    return {
      query: run(pool),
      async tx(fn) {
        const c = await pool.connect();
        try { await c.query("BEGIN"); const r = await fn(run(c)); await c.query("COMMIT"); return r; }
        catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
      },
    };
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB)
    throw new Error("DATABASE_URL is not set. Provision a Postgres database and set DATABASE_URL.");
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite");
  await pg.waitReady;
  const run = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }) => async (sql: string, p?: unknown[]) => (await c.query(sql, p)).rows as Row[];
  return {
    query: run(pg),
    tx: (fn) => pg.transaction((t) => fn(run(t))),
  };
}

export function db(): Promise<Driver> {
  driverP ??= make().then(async (d) => {
    // Serialise schema creation: several serverless instances may cold-start at once.
    await d.tx(async (q) => {
      await q("SELECT pg_advisory_xact_lock(424242)");
      for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await q(stmt);
    });
    return d;
  }).catch((e) => { driverP = null; throw e; });
  return driverP;
}

/** Housekeeping: drop expired sessions/tokens/limiter rows. Called by the daily cron. */
export async function cleanup() {
  const d = await db();
  const a = await d.query("DELETE FROM sessions WHERE expires_at < now() RETURNING 1");
  const b = await d.query("DELETE FROM tokens WHERE expires_at < now() - interval '7 days' OR used_at < now() - interval '7 days' RETURNING 1");
  const c = await d.query("DELETE FROM login_attempts WHERE window_start < now() - interval '1 day' RETURNING 1");
  return { sessions: a.length, tokens: b.length, attempts: c.length };
}
