import { db } from "@/server/db";
import { audit, burnTime, claimToken, clientIp, createSession, findToken, hashPassword, json, newId, rateLimited, sameOrigin } from "@/server/auth";
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "@/server/defaults";
import { PLANS, PILOT_SLOTS } from "@/server/plans";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  if (await rateLimited("signup:" + (await clientIp()), Number(process.env.SIGNUP_RATE_MAX ?? 10), 3600)) return json({ error: "Too many attempts. Try again later." }, 429);
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim().slice(0, 80);
  const business = String(b?.business ?? "").trim().slice(0, 80);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const inviteToken = b?.invite ? String(b.invite) : "";
  if (!name) return json({ error: "Your name is required." }, 400);
  if (!inviteToken && !business) return json({ error: "Business name is required." }, 400);
  if (!EMAIL.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (password.length < 8 || password.length > 200) return json({ error: "Password must be at least 8 characters." }, 400);

  const d = await db();
  const exists = { error: "An account with this email already exists. Try signing in." };
  if ((await d.query("SELECT 1 FROM users WHERE email=$1", [email])).length) { burnTime(password); return json(exists, 409); }

  const userId = newId();
  let wsId = newId();
  let role = "Owner";
  let wsName = business;

  if (inviteToken) {
    const inv = await findToken(inviteToken, "invite");
    if (!inv) return json({ error: "This invite link is invalid or has expired." }, 400);
    wsId = inv.workspaceId; role = inv.role ?? "Agent";
    const ws = (await d.query("SELECT name, plan, plan_expires_at, pilot FROM workspaces WHERE id=$1 AND NOT suspended", [wsId]))[0];
    if (!ws) return json({ error: "This workspace is unavailable." }, 400);
    wsName = ws.name as string;
  }

  try {
    await d.tx(async (q) => {
      if (inviteToken) {
        if (!(await claimToken(inviteToken, "invite", q))) throw Object.assign(new Error("This invite link is invalid or has expired."), { invalid: true });
        await q("SELECT pg_advisory_xact_lock(hashtext($1))", ["seats:" + wsId]); // no seat-limit race
        const { effectivePlan } = await import("@/server/plans");
        const ws = (await q("SELECT plan, plan_expires_at, pilot FROM workspaces WHERE id=$1", [wsId]))[0];
        const plan = effectivePlan(ws.plan as string, ws.plan_expires_at as string | null, ws.pilot as boolean);
        const n = Number((await q("SELECT count(*)::int AS n FROM users WHERE workspace_id=$1", [wsId]))[0].n);
        if (n >= PLANS[plan].users) throw Object.assign(new Error(`The ${plan} plan allows ${PLANS[plan].users} user(s). Ask the owner to upgrade.`), { limit: true });
        await q("INSERT INTO users (id, workspace_id, email, name, role, password_hash) VALUES ($1,$2,$3,$4,$5,$6)", [userId, wsId, email, name, role, hashPassword(password)]);
      } else {
        await q("SELECT pg_advisory_xact_lock(7001)");
        const n = Number((await q("SELECT count(*)::int AS n FROM workspaces WHERE pilot"))[0].n);
        const pilot = n < PILOT_SLOTS();
        await q("INSERT INTO workspaces (id, name, settings, plan, pilot) VALUES ($1,$2,$3,$4,$5)", [wsId, business, JSON.stringify(DEFAULT_SETTINGS(business)), pilot ? "Growth" : "Free", pilot]);
        await q("INSERT INTO users (id, workspace_id, email, name, role, password_hash) VALUES ($1,$2,$3,$4,'Owner',$5)", [userId, wsId, email, name, hashPassword(password)]);
        for (const t of DEFAULT_TEMPLATES) await q("INSERT INTO records (workspace_id, collection, id, data) VALUES ($1,'templates',$2,$3)", [wsId, t.id, JSON.stringify(t)]);
      }
    });
  } catch (e) {
    if ((e as { invalid?: boolean }).invalid) return json({ error: (e as Error).message }, 400);
    if ((e as { limit?: boolean }).limit) return json({ error: (e as Error).message }, 402);
    if ((e as { code?: string }).code === "23505" || /unique|duplicate/i.test(String((e as Error).message))) return json(exists, 409);
    throw e;
  }
  if (inviteToken) { await audit(wsId, name, "Joined the team", `${email} as ${role}`); }
  else await audit(wsId, name, "Workspace created", wsName);
  await createSession(userId);
  return json({ ok: true }, 201);
}
