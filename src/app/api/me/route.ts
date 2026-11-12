import { db } from "@/server/db";
import { currentUser, json } from "@/server/auth";
import { COLLECTIONS } from "@/server/collections";
import { PLANS } from "@/server/plans";
import { workspaceVersion } from "@/server/version";

export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const d = await db();
  const [rows, ws, team, version] = await Promise.all([
    d.query("SELECT collection, data FROM records WHERE workspace_id=$1 ORDER BY updated_at", [me.workspaceId]),
    d.query("SELECT settings FROM workspaces WHERE id=$1", [me.workspaceId]),
    d.query("SELECT id, name, email, role, created_at FROM users WHERE workspace_id=$1 ORDER BY created_at", [me.workspaceId]),
    workspaceVersion(me.workspaceId),
  ]);
  const data: Record<string, unknown[]> = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  for (const r of rows) (data[r.collection as string] ??= []).push(r.data);
  return json({
    user: me, data, settings: { ...(ws[0]?.settings as object ?? {}), plan: me.plan },
    team: team.map((t) => ({ id: t.id, name: t.name, email: t.email, role: t.role })),
    limits: PLANS[me.plan],
    version,
  });
}
