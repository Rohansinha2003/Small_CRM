import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { effectivePlan, type PlanId } from "./plans";

export const COOKIE = "chatdesk_session";
const SESSION_DAYS = 30;
export const newId = () => randomBytes(9).toString("base64url");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 64, { N: 16384, r: 8, p: 1 });
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
// A dummy hash so unknown-email logins take the same time as wrong-password ones.
const DUMMY = hashPassword("dummy-password-for-timing");
export const burnTime = (pw: string) => verifyPassword(pw, DUMMY);

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** CSRF defence for cookie-authenticated writes: require a same-origin Origin header. */
export async function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const q = (await db()).query;
  await q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2, now() + ($3 || ' days')::interval)", [sha(token), userId, String(SESSION_DAYS)]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}
export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await (await db()).query("DELETE FROM sessions WHERE token_hash=$1", [sha(t)]);
  jar.delete(COOKIE);
}
export interface Me {
  id: string; name: string; email: string; role: "Owner" | "Admin" | "Agent"; workspaceId: string; workspaceName: string;
  plan: PlanId; planExpiresAt: string | null; pilot: boolean; isPlatformAdmin: boolean;
}
export const platformAdmins = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
export async function currentUser(): Promise<Me | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const rows = await (await db()).query(
    `SELECT u.id, u.name, u.email, u.role, u.workspace_id, w.name AS workspace_name, w.plan, w.plan_expires_at, w.pilot, w.suspended
     FROM sessions s JOIN users u ON u.id=s.user_id JOIN workspaces w ON w.id=u.workspace_id
     WHERE s.token_hash=$1 AND s.expires_at > now()`, [sha(t)]);
  const r = rows[0];
  if (!r || r.suspended) return null;
  const exp = r.plan_expires_at ? new Date(r.plan_expires_at as string).toISOString() : null;
  return {
    id: r.id as string, name: r.name as string, email: r.email as string, role: r.role as Me["role"],
    workspaceId: r.workspace_id as string, workspaceName: r.workspace_name as string,
    plan: effectivePlan(r.plan as string, exp, r.pilot as boolean), planExpiresAt: exp, pilot: r.pilot as boolean,
    isPlatformAdmin: platformAdmins().includes((r.email as string).toLowerCase()),
  };
}
export const canAdmin = (me: Me) => me.role === "Owner" || me.role === "Admin";

export async function audit(workspaceId: string, userName: string, action: string, detail = "") {
  await (await db()).query("INSERT INTO audit_log (id, workspace_id, user_name, action, detail) VALUES ($1,$2,$3,$4,$5)", [newId(), workspaceId, userName, action, detail.slice(0, 500)]);
}
/** One-time link tokens (invites, password resets). Only the hash is stored. */
export async function makeToken(kind: "invite" | "reset", workspaceId: string, opts: { userId?: string; role?: string; createdBy?: string; hours: number }) {
  const token = randomBytes(24).toString("base64url");
  await (await db()).query("INSERT INTO tokens (token_hash, kind, workspace_id, user_id, role, created_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' hours')::interval)",
    [sha(token), kind, workspaceId, opts.userId ?? null, opts.role ?? null, opts.createdBy ?? null, String(opts.hours)]);
  return token;
}
export async function findToken(token: string, kind: "invite" | "reset") {
  const r = (await (await db()).query("SELECT workspace_id, user_id, role FROM tokens WHERE token_hash=$1 AND kind=$2 AND used_at IS NULL AND expires_at > now()", [sha(token), kind]))[0];
  return r ? { workspaceId: r.workspace_id as string, userId: r.user_id as string | null, role: r.role as string | null } : null;
}
/** Atomically claims a one-time token: succeeds for exactly one caller. Pass a transaction's query fn to tie it to that tx. */
export async function claimToken(token: string, kind: "invite" | "reset", q?: (sql: string, p?: unknown[]) => Promise<Record<string, unknown>[]>) {
  const run = q ?? (await db()).query;
  const r = (await run("UPDATE tokens SET used_at=now() WHERE token_hash=$1 AND kind=$2 AND used_at IS NULL AND expires_at > now() RETURNING workspace_id, user_id, role", [sha(token), kind]))[0];
  return r ? { workspaceId: r.workspace_id as string, userId: r.user_id as string | null, role: r.role as string | null } : null;
}
export const burnToken = async (token: string) => { await (await db()).query("UPDATE tokens SET used_at=now() WHERE token_hash=$1", [sha(token)]); };

/** Fixed-window limiter stored in the DB so it holds across serverless instances. */
export async function rateLimited(key: string, max = 8, windowSec = 600) {
  const q = (await db()).query;
  const rows = await q(
    `INSERT INTO login_attempts (key, count, window_start) VALUES ($1,1,now())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN login_attempts.window_start < now() - ($2 || ' seconds')::interval THEN 1 ELSE login_attempts.count + 1 END,
       window_start = CASE WHEN login_attempts.window_start < now() - ($2 || ' seconds')::interval THEN now() ELSE login_attempts.window_start END
     RETURNING count`, [key, String(windowSec)]);
  return Number(rows[0].count) > max;
}
export async function clearLimit(key: string) { await (await db()).query("DELETE FROM login_attempts WHERE key=$1", [key]); }
/** Client IP. Uses headers set by the platform (Vercel overwrites these; a client can't spoof them there). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}
