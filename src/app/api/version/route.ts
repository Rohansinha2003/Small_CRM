import { currentUser, json } from "@/server/auth";
import { workspaceVersion } from "@/server/version";

/** Polled by the client instead of re-downloading the whole workspace. */
export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  return json({ v: await workspaceVersion(me.workspaceId) });
}
