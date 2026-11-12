import { db } from "@/server/db";
import { currentUser, json, sameOrigin } from "@/server/auth";
import { billingConfigured, createOrder } from "@/server/razorpay";
import { PLANS, PERIODS, type Period, type PlanId } from "@/server/plans";

export async function GET() {
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  const pays = await (await db()).query("SELECT id, plan, period, amount, status, payment_id, created_at, paid_at FROM payments WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50", [me.workspaceId]);
  return json({ configured: billingConfigured(), payments: pays, plan: me.plan, planExpiresAt: me.planExpiresAt, pilot: me.pilot });
}

export async function POST(req: Request) {
  if (!(await sameOrigin(req))) return json({ error: "Bad origin" }, 403);
  const me = await currentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (me.role !== "Owner") return json({ error: "Only the workspace owner can manage billing." }, 403);
  if (!billingConfigured()) return json({ error: "Online payments aren't enabled yet. Please contact support to upgrade." }, 503);
  const b = await req.json().catch(() => null);
  const plan = String(b?.plan) as PlanId, period = String(b?.period) as Period;
  if (!Object.hasOwn(PLANS, plan) || plan === "Free" || !Object.hasOwn(PERIODS, period)) return json({ error: "Invalid plan" }, 400);
  try {
    const o = await createOrder(me.workspaceId, plan, period);
    return json({ ...o, name: "ChatDesk", description: `${plan} plan · ${PERIODS[period].label}`, prefill: { name: me.name, email: me.email } });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
