"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { cn, inr } from "@/lib/utils";

const PLANS = [
  { id: "Free", monthly: 0, feat: ["100 contacts", "1 user", "Shared inbox, pipeline, follow-ups", "Quick replies"] },
  { id: "Starter", monthly: 499, feat: ["2,000 contacts", "3 users", "Broadcasts", "CSV import / export"] },
  { id: "Growth", monthly: 1499, feat: ["50,000 contacts", "10 users", "Broadcasts", "Priority support"] },
] as const;

interface Pay { id: string; plan: string; period: string; amount: number; status: string; payment_id: string | null; created_at: string }
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: { error: { description: string } }) => void) => void } } }

export default function Billing() {
  const { db, user, limits, refresh } = useStore();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [pays, setPays] = useState<Pay[]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const load = () => fetch("/api/billing/order").then((r) => r.json()).then((j) => { setPays(j.payments ?? []); setConfigured(j.configured); });
  useEffect(() => { load(); }, []);

  const isOwner = user?.role === "Owner";
  const price = (m: number) => (period === "yearly" ? m * 10 : m);

  async function buy(plan: string) {
    setMsg(null); setBusy(plan);
    try {
      const r = await fetch("/api/billing/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, period }) });
      const o = await r.json();
      if (!r.ok) { setMsg({ ok: false, t: o.error }); return; }
      if (!window.Razorpay) { setMsg({ ok: false, t: "Payment window failed to load. Check your connection and retry." }); return; }
      const rz = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: "INR", name: o.name, description: o.description, order_id: o.orderId, prefill: o.prefill,
        theme: { color: "#128c4a" },
        handler: async (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: res.razorpay_order_id, paymentId: res.razorpay_payment_id, signature: res.razorpay_signature }) });
          const j = await v.json();
          setMsg(v.ok ? { ok: true, t: `Payment received — you're now on ${plan}. Thank you!` } : { ok: false, t: j.error + " If you were charged, contact support with payment ID " + res.razorpay_payment_id });
          refresh(); load();
          setTimeout(() => window.location.reload(), 1500);
        },
      });
      rz.on("payment.failed", (e) => setMsg({ ok: false, t: "Payment failed: " + e.error.description }));
      rz.open();
    } finally { setBusy(""); }
  }

  const exp = user?.planExpiresAt ? new Date(user.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
  const used = { contacts: db.contacts.length, users: db.team.length };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <PageHeader title="Plan & billing" sub="Simple pricing for the whole team" />
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted">Current plan</div>
            <div className="flex items-center gap-2 text-2xl font-semibold">{user?.plan}{user?.pilot && <Badge color="#8b5cf6">Pilot · free</Badge>}</div>
            <div className="text-sm text-muted">{user?.pilot ? "You're one of our first pilot customers — full access, free while we learn from you." : exp ? `Active until ${exp}` : "Free forever"}</div>
          </div>
          <div className="grid min-w-64 gap-3 text-sm">
            {([["Contacts", used.contacts, limits.contacts], ["Users", used.users, limits.users]] as const).map(([l, u, m]) => (
              <div key={l}><div className="mb-1 flex justify-between"><span>{l}</span><span className="text-muted">{u.toLocaleString("en-IN")} / {m.toLocaleString("en-IN")}</span></div>
                <div className="h-2 overflow-hidden rounded bg-brand-soft"><div className={cn("h-full rounded", u / m > 0.9 ? "bg-red-500" : "bg-brand")} style={{ width: `${Math.min(100, (u / m) * 100)}%` }} /></div></div>
            ))}
          </div>
        </div>
      </Card>

      {msg && <div role="alert" className={cn("mb-4 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-brand-soft text-brand" : "bg-red-500/10 text-red-600")}>{msg.t}</div>}
      {!configured && <div className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-sm">Online payments aren&apos;t enabled on this deployment yet (Razorpay keys missing).</div>}
      {!isOwner && <div className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm">Only the workspace owner can change the plan.</div>}

      <div className="mb-4 inline-flex gap-1 rounded-lg bg-brand-soft p-1 text-sm">
        {(["monthly", "yearly"] as const).map((p) => <button key={p} onClick={() => setPeriod(p)} className={cn("rounded-md px-4 py-1.5 font-medium capitalize", period === p ? "bg-card shadow-sm" : "text-muted")}>{p}{p === "yearly" && " · 2 months free"}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = user?.plan === p.id;
          return (
            <Card key={p.id} className={cn("flex flex-col p-5", current && "border-2 border-brand")}>
              <div className="flex items-center justify-between"><div className="font-semibold">{p.id}</div>{current && <Badge>Current</Badge>}</div>
              <div className="mt-2"><span className="text-3xl font-bold">{inr(price(p.monthly))}</span><span className="text-sm text-muted"> / {period === "yearly" ? "year" : "month"}</span></div>
              <ul className="my-4 flex-1 space-y-1.5 text-sm">{p.feat.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              {p.id === "Free" ? <Button variant="outline" disabled>{current ? "Your plan" : "Free tier"}</Button> :
                <Button disabled={!isOwner || !configured || busy === p.id} onClick={() => buy(p.id)}>{busy === p.id ? "Opening…" : current ? "Renew / extend" : `Upgrade to ${p.id}`}</Button>}
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Payments are processed securely by Razorpay (UPI, cards, netbanking, wallets). Prices in INR, GST extra where applicable. Plans are prepaid; renew any time to extend.</p>

      <Card className="mt-6 overflow-x-auto p-4">
        <h2 className="mb-2 font-semibold">Payment history</h2>
        {pays.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : (
          <table className="w-full text-sm"><thead className="text-left text-xs text-muted"><tr><th className="py-1">Date</th><th>Plan</th><th>Period</th><th>Amount</th><th>Status</th><th>Payment ID</th></tr></thead>
            <tbody>{pays.map((p) => <tr key={p.id} className="border-t border-line"><td className="py-2">{new Date(p.created_at).toLocaleDateString("en-IN")}</td><td>{p.plan}</td><td className="capitalize">{p.period}</td><td>{inr(p.amount / 100)}</td><td><Badge color={p.status === "paid" ? "#16a34a" : "#94a3b8"}>{p.status}</Badge></td><td className="font-mono text-xs">{p.payment_id ?? "—"}</td></tr>)}</tbody></table>
        )}
      </Card>
    </>
  );
}
