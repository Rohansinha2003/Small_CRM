import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { audit, newId } from "./auth";
import { PERIODS, PLANS, priceInr, type Period, type PlanId } from "./plans";

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";
export const billingConfigured = () => !!(keyId() && keySecret());
const apiBase = () => process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com"; // overridable for tests

function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
export const verifyCheckoutSignature = (orderId: string, paymentId: string, sig: string) =>
  !!keySecret() && safeEq(hmac(keySecret(), `${orderId}|${paymentId}`), sig);
export const verifyWebhookSignature = (raw: string, sig: string) => {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET;
  return !!s && safeEq(hmac(s, raw), sig);
};

/** Creates a Razorpay order and records it (amount is decided here on the server, never by the client). */
export async function createOrder(workspaceId: string, plan: PlanId, period: Period) {
  if (plan === "Free") throw new Error("Free plan needs no payment");
  const amountInr = priceInr(plan, period);
  const amount = amountInr * 100; // paise
  let orderId: string;
  {
    const r = await fetch(`${apiBase()}/v1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64") },
      body: JSON.stringify({ amount, currency: "INR", receipt: `ws_${workspaceId}_${Date.now()}`.slice(0, 40), notes: { workspaceId, plan, period } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) throw new Error(j?.error?.description ?? "Razorpay order creation failed");
    orderId = j.id;
  }
  await (await db()).query("INSERT INTO payments (id, workspace_id, plan, period, amount) VALUES ($1,$2,$3,$4,$5)", [orderId, workspaceId, plan, period, amount]);
  return { orderId, amount, keyId: keyId() };
}

/** Marks an order paid and extends the plan. Idempotent: safe if both the browser verify and the webhook arrive. */
export async function fulfil(orderId: string, paymentId: string, paidAmount?: number) {
  const d = await db();
  return d.tx(async (q) => {
    const o = (await q("SELECT workspace_id, plan, period, amount, status FROM payments WHERE id=$1 FOR UPDATE", [orderId]))[0];
    if (!o) return { ok: false as const, reason: "unknown order" };
    if (paidAmount !== undefined && paidAmount !== Number(o.amount)) return { ok: false as const, reason: "amount mismatch" };
    if (o.status === "paid") return { ok: true as const, already: true };
    if ((await q("SELECT 1 FROM payments WHERE payment_id=$1 AND id<>$2", [paymentId, orderId])).length) return { ok: false as const, reason: "payment already used for another order" };
    const months = PERIODS[o.period as Period].months;
    await q("UPDATE payments SET status='paid', payment_id=$2, paid_at=now() WHERE id=$1", [orderId, paymentId]);
    const w = (await q("SELECT plan, plan_expires_at FROM workspaces WHERE id=$1", [o.workspace_id]))[0];
    // Renewing the same plan stacks on the remaining time; switching plan starts from now.
    const base = w.plan === o.plan && w.plan_expires_at && new Date(w.plan_expires_at as string) > new Date() ? new Date(w.plan_expires_at as string) : new Date();
    base.setMonth(base.getMonth() + months);
    await q("UPDATE workspaces SET plan=$2, plan_expires_at=$3, pilot=false WHERE id=$1", [o.workspace_id, o.plan, base.toISOString()]);
    await q("INSERT INTO audit_log (id, workspace_id, user_name, action, detail) VALUES ($1,$2,'Billing','Payment received',$3)",
      [newId(), o.workspace_id, `${o.plan} (${PERIODS[o.period as Period].label}) ₹${Number(o.amount) / 100} · ${paymentId}`]);
    return { ok: true as const, already: false };
  });
}
export { PLANS, audit };
