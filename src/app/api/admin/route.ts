import { db } from "@/server/db";
import { audit, currentUser, json, sameOrigin } from "@/server/auth";
import { PLANS, effectivePlan, PILOT_SLOTS } from "@/server/plans";

async function guard() {
  const me = await currentUser();
  return me?.isPlatformAdmin ? me : null;
}

export async function GET() {
  if (!(await guard())) return json({ error: "Forbidden" }, 403);
  const d = await db();
  const ws = await d.query(`
    SELECT w.id, w.name, w.plan, w.plan_expires_at, w.pilot, w.suspended, w.created_at,
      (SELECT email FROM users WHERE workspace_id=w.id AND role='Owner' LIMIT 1) AS owner_email,
      (SELECT count(*)::int FROM users WHERE workspace_id=w.id) AS users,
      (SELECT count(*)::int FROM records WHERE workspace_id=w.id AND collection='contacts') AS contacts,
      (SELECT count(*)::int FROM records WHERE workspace_id=w.id AND collection='deals') AS deals,
      (SELECT COALESCE(max(at), w.created_at) FROM audit_log WHERE workspace_id=w.id) AS last_active
    FROM workspaces w ORDER BY w.created_at DESC LIMIT 500`);
  const pays = await d.query("SELECT p.id, p.workspace_id, w.name AS workspace, p.plan, p.period, p.amount, p.status, p.payment_id, p.created_at, p.paid_at FROM payments p JOIN workspaces w ON w.id=p.workspace_id ORDER BY p.created_at DESC LIMIT 100");
  const revenue = pays.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount), 0) / 100;
  const paying = ws.filter((w) => !w.pilot && effectivePlan(w.plan as string, w.plan_expires_at as string, w.pilot as boolean) !== "Free").length;
  const mrr = ws.filter((w) => !w.pilot).reduce((a, w) => { const p = effectivePlan(w.plan as string, w.plan_expires_at as string, false); return a + PLANS[p].monthly; }, 0);
  return json({
    workspaces: ws.map((w) => ({ ...w, effective: effectivePlan(w.plan as string, w.plan_expires_at as string, w.pilot as boolean) })),
    payments: pays,
    stats: { workspaces: ws.length, users: ws.reduce((a, w) => a + Number(w.users), 0), paying, pilots: ws.filter((w) => w.pilot).length, pilotSlots: PILOT_SLOTS(), revenue, mrr },
  });
}

/** POST {workspaceId, action: grant|revoke|suspend|unsuspend|pilot|unpilot|delete, plan?, months?} */
export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const me = await guard();
  if (!me) return json({ error: "Forbidden" }, 403);
  const b = await req.json().catch(() => null);
  const id = String(b?.workspaceId ?? "");
  const d = await db();
  const w = (await d.query("SELECT id, name FROM workspaces WHERE id=$1", [id]))[0];
  if (!w) return json({ error: "Workspace not found" }, 404);
  const note = async (a: string, detail = "") => audit(id, `Platform admin (${me.email})`, a, detail);
  switch (b.action) {
    case "grant": {
      const plan = b.plan === "Starter" || b.plan === "Growth" ? b.plan : null;
      const months = Math.min(Math.max(Number(b.months) || 1, 1), 36);
      if (!plan) return json({ error: "Invalid plan" }, 400);
      await d.query("UPDATE workspaces SET plan=$2, plan_expires_at=now() + ($3 || ' months')::interval, pilot=false WHERE id=$1", [id, plan, String(months)]);
      await note("Plan granted", `${plan} for ${months} month(s)`); break;
    }
    case "revoke": await d.query("UPDATE workspaces SET plan='Free', plan_expires_at=NULL, pilot=false WHERE id=$1", [id]); await note("Plan revoked → Free"); break;
    case "pilot": await d.query("UPDATE workspaces SET plan='Growth', plan_expires_at=NULL, pilot=true WHERE id=$1", [id]); await note("Marked as pilot (free Growth access)"); break;
    case "unpilot": await d.query("UPDATE workspaces SET plan='Free', plan_expires_at=NULL, pilot=false WHERE id=$1 AND pilot", [id]); await note("Pilot ended → Free"); break;
    case "suspend": await d.query("UPDATE workspaces SET suspended=true WHERE id=$1", [id]); await d.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE workspace_id=$1)", [id]); await note("Workspace suspended"); break;
    case "unsuspend": await d.query("UPDATE workspaces SET suspended=false WHERE id=$1", [id]); await note("Workspace reinstated"); break;
    case "delete": if (b.confirm !== w.name) return json({ error: "Type the workspace name to confirm deletion." }, 400); await d.query("DELETE FROM workspaces WHERE id=$1", [id]); break;
    default: return json({ error: "Unknown action" }, 400);
  }
  return json({ ok: true });
}
