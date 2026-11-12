import { db } from "@/server/db";
import { json } from "@/server/auth";
import { PILOT_SLOTS } from "@/server/plans";

export async function GET() {
  const used = Number((await (await db()).query("SELECT count(*)::int AS n FROM workspaces WHERE pilot"))[0].n);
  const total = PILOT_SLOTS();
  return json({ total, left: Math.max(0, total - used) });
}
