import { db } from "@/server/db";
import { billingConfigured } from "@/server/razorpay";

/** Uptime probe. Reveals only booleans, never secrets. */
export async function GET() {
  const checks: Record<string, boolean> = { database: false, billing: billingConfigured(), webhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET, adminConfigured: !!process.env.ADMIN_EMAILS };
  try { await (await db()).query("SELECT 1"); checks.database = true; } catch {}
  const ok = checks.database;
  return Response.json({ ok, checks, time: new Date().toISOString() }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
