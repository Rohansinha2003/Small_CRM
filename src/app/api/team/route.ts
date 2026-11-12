import { db } from "@/server/db";
import { audit, canAdmin, currentUser, json, makeToken, newId, sameOrigin } from "@/server/auth";
import { PLANS } from "@/server/plans";

export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const d = await db();
  const members = await d.query("SELECT id, name, email, role, created_at FROM users WHERE workspace_id=$1 ORDER BY created_at", [me.workspaceId]);
  const invites = canAdmin(me) ? await d.query("SELECT substr(token_hash,1,12) AS id, role, expires_at FROM tokens WHERE workspace_id=$1 AND kind='invite' AND used_at IS NULL AND expires_at>now() ORDER BY expires_at", [me.workspaceId]) : [];
  return json({ members, invites, seats: PLANS[me.plan].users });
}

/** POST {action:'invite',role} | {action:'reset',userId} | {action:'revoke',id} | {action:'role',userId,role} | {action:'remove',userId} */
export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (!canAdmin(me)) return json({ error: "Only an owner or admin can manage the team." }, 403);
  const b = await req.json().catch(() => null);
  const d = await db();
  const target = async (id: unknown) => (await d.query("SELECT id, name, role FROM users WHERE id=$1 AND workspace_id=$2", [String(id), me.workspaceId]))[0];

  switch (b?.action) {
    case "invite": {
      const role = b.role === "Admin" || b.role === "Agent" ? b.role : "Agent";
      if (role === "Admin" && me.role !== "Owner") return json({ error: "Only the owner can invite admins." }, 403);
      const used = Number((await d.query("SELECT (SELECT count(*) FROM users WHERE workspace_id=$1) + (SELECT count(*) FROM tokens WHERE workspace_id=$1 AND kind='invite' AND used_at IS NULL AND expires_at>now()) AS n", [me.workspaceId]))[0].n);
      if (used >= PLANS[me.plan].users) return json({ error: `Your ${me.plan} plan includes ${PLANS[me.plan].users} user(s). Upgrade to add teammates.` }, 402);
      const token = await makeToken("invite", me.workspaceId, { role, createdBy: me.id, hours: 24 * 7 });
      await audit(me.workspaceId, me.name, "Created invite link", role);
      return json({ link: `/invite/${token}` });
    }
    case "revoke": {
      await d.query("DELETE FROM tokens WHERE workspace_id=$1 AND kind='invite' AND substr(token_hash,1,12)=$2", [me.workspaceId, String(b.id)]);
      return json({ ok: true });
    }
    case "reset": {
      const t = await target(b.userId);
      if (!t) return json({ error: "User not found" }, 404);
      if (t.role === "Owner" && me.role !== "Owner") return json({ error: "Only the owner can reset the owner's password." }, 403);
      const token = await makeToken("reset", me.workspaceId, { userId: t.id as string, createdBy: me.id, hours: 2 });
      await audit(me.workspaceId, me.name, "Created password reset link", t.name as string);
      return json({ link: `/reset/${token}` });
    }
    case "role": {
      if (me.role !== "Owner") return json({ error: "Only the owner can change roles." }, 403);
      const t = await target(b.userId);
      if (!t || t.role === "Owner" || (b.role !== "Admin" && b.role !== "Agent")) return json({ error: "Invalid request" }, 400);
      await d.query("UPDATE users SET role=$2 WHERE id=$1", [t.id, b.role]);
      await audit(me.workspaceId, me.name, "Changed role", `${t.name} → ${b.role}`);
      return json({ ok: true });
    }
    case "remove": {
      const t = await target(b.userId);
      if (!t || t.role === "Owner" || t.id === me.id) return json({ error: "That user can't be removed." }, 400);
      if (t.role === "Admin" && me.role !== "Owner") return json({ error: "Only the owner can remove admins." }, 403);
      await d.query("DELETE FROM users WHERE id=$1", [t.id]);
      await audit(me.workspaceId, me.name, "Removed team member", t.name as string);
      return json({ ok: true });
    }
    case "delete_workspace": {
      if (me.role !== "Owner") return json({ error: "Only the owner can delete the workspace." }, 403);
      if (String(b.confirm ?? "") !== me.workspaceName) return json({ error: "Type the workspace name exactly to confirm." }, 400);
      await d.query("DELETE FROM workspaces WHERE id=$1", [me.workspaceId]); // cascades to users, sessions, records, payments, logs
      return json({ ok: true });
    }
    default: return json({ error: "Unknown action" }, 400);
  }
  void newId;
}
