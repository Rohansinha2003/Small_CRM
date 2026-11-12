import { db } from "@/server/db";
import { currentUser, json, sameOrigin } from "@/server/auth";
import { fulfil, verifyCheckoutSignature } from "@/server/razorpay";

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const b = await req.json().catch(() => null);
  const orderId = String(b?.orderId ?? ""), paymentId = String(b?.paymentId ?? ""), signature = String(b?.signature ?? "");
  if (!orderId || !paymentId || !signature) return json({ error: "Missing payment details" }, 400);
  // The order must belong to the caller's workspace.
  const own = await (await db()).query("SELECT 1 FROM payments WHERE id=$1 AND workspace_id=$2", [orderId, me.workspaceId]);
  if (!own.length) return json({ error: "Unknown order" }, 404);
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) return json({ error: "Payment signature could not be verified." }, 400);
  const r = await fulfil(orderId, paymentId);
  return r.ok ? json({ ok: true }) : json({ error: r.reason }, 400);
}
