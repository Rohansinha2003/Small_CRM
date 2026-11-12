import { db } from "@/server/db";
import { audit, canAdmin, currentUser, json, sameOrigin } from "@/server/auth";
import { COLLECTIONS, LIMITS, WRITABLE_SETTINGS } from "@/server/collections";
import { PLANS } from "@/server/plans";

type Body = {
  upserts?: Record<string, unknown[]>;
  deletes?: Record<string, string[]>;
  settings?: Record<string, unknown>;
};
const okId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;
class Reject extends Error { constructor(public status: number, m: string) { super(m); } }

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const plan = PLANS[me.plan];

  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) return json({ error: "Payload too large" }, 413);
  let body: Body;
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ups: [string, string, string][] = [];
  const dels: [string, string][] = [];
  for (const [col, items] of Object.entries(body.upserts ?? {})) {
    if (!(COLLECTIONS as readonly string[]).includes(col) || !Array.isArray(items)) return json({ error: `Unknown collection ${col}` }, 400);
    if (col === "broadcasts" && items.length && !plan.broadcasts) return json({ error: "Broadcasts are available on the Starter plan and above. Upgrade to send broadcasts." }, 402);
    for (const it of items) {
      if (!it || typeof it !== "object" || !okId((it as { id?: unknown }).id)) return json({ error: "Invalid record" }, 400);
      const s = JSON.stringify(it);
      if (s.length > LIMITS.itemBytes) return json({ error: "Record too large" }, 413);
      ups.push([col, (it as { id: string }).id, s]);
    }
  }
  for (const [col, ids] of Object.entries(body.deletes ?? {})) {
    if (!(COLLECTIONS as readonly string[]).includes(col) || !Array.isArray(ids)) return json({ error: `Unknown collection ${col}` }, 400);
    for (const id of ids) if (okId(id)) dels.push([col, id]);
  }
  if (ups.length + dels.length > LIMITS.items) return json({ error: "Too many changes in one request" }, 413);

  const patch: Record<string, unknown> = {};
  for (const k of WRITABLE_SETTINGS) if (body.settings && k in body.settings) patch[k] = body.settings[k];
  if (typeof patch.businessName === "string") patch.businessName = patch.businessName.slice(0, 80);
  if (typeof patch.autoReplyText === "string") patch.autoReplyText = patch.autoReplyText.slice(0, 1000);
  if (typeof patch.whatsappNumber === "string") patch.whatsappNumber = patch.whatsappNumber.slice(0, 32);

  // Role rules: agents work with data but can't delete core records or change workspace settings.
  if (!canAdmin(me)) {
    if (Object.keys(patch).length) return json({ error: "Only an owner or admin can change workspace settings." }, 403);
    if (dels.some(([c]) => ["contacts", "deals", "templates", "broadcasts"].includes(c))) return json({ error: "Only an owner or admin can delete contacts, deals or templates." }, 403);
  }

  const d = await db();
  try {
    await d.tx(async (q) => {
      // Serialise writers per workspace so limit checks can't be raced by parallel requests.
      if (ups.length) await q("SELECT pg_advisory_xact_lock(hashtext($1))", ["sync:" + me.workspaceId]);
      const before = ups.some(([c]) => c === "contacts")
        ? Number((await q("SELECT count(*)::int AS n FROM records WHERE workspace_id=$1 AND collection='contacts'", [me.workspaceId]))[0].n) : 0;
      const totalBefore = ups.length ? Number((await q("SELECT count(*)::int AS n FROM records WHERE workspace_id=$1", [me.workspaceId]))[0].n) : 0;
      // workspace_id always comes from the session, never from the request.
      for (const [col, id] of dels) await q("DELETE FROM records WHERE workspace_id=$1 AND collection=$2 AND id=$3", [me.workspaceId, col, id]);
      for (const [col, id, data] of ups)
        await q(`INSERT INTO records (workspace_id, collection, id, data) VALUES ($1,$2,$3,$4)
                 ON CONFLICT (workspace_id, collection, id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`, [me.workspaceId, col, id, data]);
      if (ups.some(([c]) => c === "contacts")) {
        const after = Number((await q("SELECT count(*)::int AS n FROM records WHERE workspace_id=$1 AND collection='contacts'", [me.workspaceId]))[0].n);
        if (after > before && after > plan.contacts) throw new Reject(402, `Contact limit reached: the ${me.plan} plan allows ${plan.contacts.toLocaleString("en-IN")} contacts. Upgrade to add more.`);
      }
      if (ups.length) {
        const totalAfter = Number((await q("SELECT count(*)::int AS n FROM records WHERE workspace_id=$1", [me.workspaceId]))[0].n);
        if (totalAfter > totalBefore && totalAfter > plan.records) throw new Reject(402, `Storage limit reached: the ${me.plan} plan stores up to ${plan.records.toLocaleString("en-IN")} items (contacts, messages, deals, tasks). Delete old data or upgrade.`);
      }
      if (Object.keys(patch).length) {
        await q("UPDATE workspaces SET settings = settings || $2::jsonb WHERE id=$1", [me.workspaceId, JSON.stringify(patch)]);
        if (typeof patch.businessName === "string" && patch.businessName.trim()) await q("UPDATE workspaces SET name=$2 WHERE id=$1", [me.workspaceId, patch.businessName]);
      }
    });
  } catch (e) {
    if (e instanceof Reject) return json({ error: e.message }, e.status);
    throw e;
  }

  // Audit trail for destructive / sensitive actions.
  const delCounts = dels.reduce<Record<string, number>>((a, [c]) => ({ ...a, [c]: (a[c] ?? 0) + 1 }), {});
  for (const [c, n] of Object.entries(delCounts)) if (c !== "messages") await audit(me.workspaceId, me.name, `Deleted ${n} ${c}`);
  for (const [c, , data] of ups) if (c === "broadcasts") { try { const b = JSON.parse(data); await audit(me.workspaceId, me.name, "Sent broadcast", `${b.name} → ${b.recipients} recipients`); } catch {} }
  if (Object.keys(patch).length) await audit(me.workspaceId, me.name, "Changed settings", Object.keys(patch).join(", "));
  return json({ ok: true });
}
