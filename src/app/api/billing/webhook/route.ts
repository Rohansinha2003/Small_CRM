import { json } from "@/server/auth";
import { fulfil, verifyWebhookSignature } from "@/server/razorpay";

/** Razorpay → us. Backup path in case the customer closes the tab after paying. No cookies; authenticated by HMAC. */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return json({ error: "Bad signature" }, 400);
  let evt: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };
  try { evt = JSON.parse(raw); } catch { return json({ error: "Bad JSON" }, 400); }
  const p = evt.payload?.payment?.entity;
  if ((evt.event === "payment.captured" || evt.event === "order.paid") && p?.id && p.order_id) {
    const r = await fulfil(p.order_id, p.id, p.amount);
    if (!r.ok && r.reason !== "unknown order") return json({ error: r.reason }, 400);
  }
  return json({ ok: true });
}
