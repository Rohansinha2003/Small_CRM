import { db } from "@/server/db";
import { canAdmin, currentUser, json } from "@/server/auth";

export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (!canAdmin(me)) return json({ error: "Forbidden" }, 403);
  return json({ entries: await (await db()).query("SELECT id, user_name, action, detail, at FROM audit_log WHERE workspace_id=$1 ORDER BY at DESC LIMIT 200", [me.workspaceId]) });
}
