import "server-only";
import { db } from "./db";

/** A cheap fingerprint of everything /api/me returns. Changes whenever records, settings, plan or team change. */
export async function workspaceVersion(workspaceId: string): Promise<string> {
  const r = (await (await db()).query(
    `SELECT
       (SELECT count(*)::text || ':' || COALESCE(max(updated_at)::text, '') FROM records WHERE workspace_id=$1) || '|' ||
       (SELECT md5(settings::text) || plan || COALESCE(plan_expires_at::text, '') || pilot::text FROM workspaces WHERE id=$1) || '|' ||
       (SELECT count(*)::text || COALESCE(string_agg(id || role, ',' ORDER BY id), '') FROM users WHERE workspace_id=$1) AS v`,
    [workspaceId]))[0];
  return String(r?.v ?? "");
}
