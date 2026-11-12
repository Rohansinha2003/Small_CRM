export type PlanId = "Free" | "Starter" | "Growth";
export interface PlanDef { id: PlanId; monthly: number; contacts: number; users: number; broadcasts: boolean; records: number; blurb: string[] }
export const PLANS: Record<PlanId, PlanDef> = {
  Free: { id: "Free", monthly: 0, contacts: 100, users: 1, broadcasts: false, records: 5_000, blurb: ["100 contacts", "1 user", "Shared inbox, pipeline, follow-ups"] },
  Starter: { id: "Starter", monthly: 499, contacts: 2000, users: 3, broadcasts: true, records: 60_000, blurb: ["2,000 contacts", "3 users", "Broadcasts", "CSV import/export"] },
  Growth: { id: "Growth", monthly: 1499, contacts: 50000, users: 10, broadcasts: true, records: 500_000, blurb: ["Unlimited* contacts", "10 users", "Broadcasts", "Priority support"] },
};
export const PERIODS = { monthly: { months: 1, label: "1 month", mult: 1 }, yearly: { months: 12, label: "12 months", mult: 10 } } as const; // yearly = 2 months free
export type Period = keyof typeof PERIODS;
export const priceInr = (plan: PlanId, period: Period) => PLANS[plan].monthly * PERIODS[period].mult;
export const PILOT_SLOTS = () => Number(process.env.PILOT_SLOTS ?? 5);

/** The plan a workspace is actually entitled to right now. */
export function effectivePlan(plan: string, expires: Date | string | null, pilot: boolean): PlanId {
  if (plan !== "Starter" && plan !== "Growth") return "Free";
  if (pilot || !expires || new Date(expires) > new Date()) return plan as PlanId;
  return "Free";
}
