import { db } from "@/server/db";
import { audit, canAdmin, currentUser, json } from "@/server/auth";

export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (!canAdmin(me)) return json({ error: "Only an owner or admin can export workspace data." }, 403);
  const d = await db();
  const rows = await d.query("SELECT collection, data FROM records WHERE workspace_id=$1", [me.workspaceId]);
  const out: Record<string, unknown[]> = {};
  for (const r of rows) (out[r.collection as string] ??= []).push(r.data);
  await audit(me.workspaceId, me.name, "Exported all data");
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), workspace: me.workspaceName, ...out }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="chatdesk-export.json"`, "Cache-Control": "no-store" },
  });
}
