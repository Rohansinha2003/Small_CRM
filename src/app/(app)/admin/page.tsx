"use client";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, Empty, Input, Modal, PageHeader, Select } from "@/components/ui";
import { inr, timeAgo } from "@/lib/utils";

interface W { id: string; name: string; owner_email: string; plan: string; effective: string; plan_expires_at: string | null; pilot: boolean; suspended: boolean; users: number; contacts: number; deals: number; created_at: string; last_active: string }
interface P { id: string; workspace: string; plan: string; period: string; amount: number; status: string; payment_id: string | null; created_at: string }
interface Stats { workspaces: number; users: number; paying: number; pilots: number; pilotSlots: number; revenue: number; mrr: number }

export default function Admin() {
  const { user } = useStore();
  const [data, setData] = useState<{ workspaces: W[]; payments: P[]; stats: Stats } | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<W | null>(null);
  const [plan, setPlan] = useState("Starter");
  const [months, setMonths] = useState("1");
  const [confirmName, setConfirmName] = useState("");
  const [err, setErr] = useState("");

  const isAdmin = !!user?.isPlatformAdmin;
  const load = useCallback(async () => {
    if (!isAdmin) return;
    const r = await fetch("/api/admin");
    if (r.ok) setData(await r.json());
  }, [isAdmin]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  if (!user?.isPlatformAdmin) return <Empty text="You don't have access to the platform admin console." />;
  if (!data) return <Empty text="Loading…" />;
  const s = data.stats;

  const act = async (action: string, extra: object = {}) => {
    if (!sel) return; setErr("");
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: sel.id, action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Failed"); return; }
    setSel(null); setConfirmName(""); load();
  };
  const list = data.workspaces.filter((w) => (w.name + w.owner_email).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Platform admin" sub="All workspaces, plans and payments across ChatDesk" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[["Workspaces", s.workspaces], ["Users", s.users], ["Paying", s.paying], ["Pilots", `${s.pilots} / ${s.pilotSlots}`], ["MRR (est.)", inr(s.mrr)], ["Collected", inr(s.revenue)]].map(([l, v]) => (
          <Card key={l as string} className="p-4"><div className="text-xs text-muted">{l}</div><div className="mt-1 text-xl font-semibold">{v}</div></Card>
        ))}
      </div>
      <div className="mb-3 mt-5"><Input className="max-w-xs" placeholder="Search workspace or owner email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-brand-soft/50 text-left text-xs text-muted"><tr>{["Workspace", "Owner", "Plan", "Users", "Contacts", "Deals", "Created", "Active"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((w) => (
              <tr key={w.id} className="cursor-pointer hover:bg-brand-soft/40" onClick={() => { setSel(w); setErr(""); }}>
                <td className="px-3 py-2 font-medium">{w.name} {w.suspended && <Badge color="#ef4444">Suspended</Badge>}</td>
                <td className="px-3 py-2 text-muted">{w.owner_email}</td>
                <td className="px-3 py-2"><Badge color={w.pilot ? "#8b5cf6" : w.effective === "Free" ? "#94a3b8" : "#16a34a"}>{w.pilot ? "Pilot" : w.effective}</Badge>{w.plan_expires_at && !w.pilot && <div className="text-[11px] text-muted">till {new Date(w.plan_expires_at).toLocaleDateString("en-IN")}</div>}</td>
                <td className="px-3 py-2">{w.users}</td><td className="px-3 py-2">{w.contacts}</td><td className="px-3 py-2">{w.deals}</td>
                <td className="px-3 py-2 text-muted">{new Date(w.created_at).toLocaleDateString("en-IN")}</td><td className="px-3 py-2 text-muted">{timeAgo(w.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty text="No workspaces." />}
      </Card>

      <Card className="mt-5 overflow-x-auto p-4">
        <h2 className="mb-2 font-semibold">Recent payments</h2>
        {data.payments.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
          <table className="w-full text-sm"><tbody>{data.payments.map((p) => (
            <tr key={p.id} className="border-t border-line first:border-0"><td className="py-2">{new Date(p.created_at).toLocaleDateString("en-IN")}</td><td>{p.workspace}</td><td>{p.plan} · {p.period}</td><td>{inr(p.amount / 100)}</td><td><Badge color={p.status === "paid" ? "#16a34a" : "#94a3b8"}>{p.status}</Badge></td><td className="font-mono text-xs text-muted">{p.payment_id}</td></tr>
          ))}</tbody></table>
        )}
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ""} wide>
        {sel && <div className="space-y-4 text-sm">
          <div className="text-muted">{sel.owner_email} · {sel.users} user(s) · {sel.contacts} contacts · currently <b>{sel.pilot ? "Pilot (free Growth)" : sel.effective}</b></div>
          {err && <div role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-red-600">{err}</div>}
          <div className="rounded-xl border border-line p-3">
            <div className="mb-2 font-medium">Grant a paid plan (comp / manual payment)</div>
            <div className="flex flex-wrap gap-2">
              <Select className="w-32" value={plan} onChange={(e) => setPlan(e.target.value)}><option>Starter</option><option>Growth</option></Select>
              <Input className="w-24" type="number" min="1" max="36" value={months} onChange={(e) => setMonths(e.target.value)} /><span className="self-center text-muted">months</span>
              <Button onClick={() => act("grant", { plan, months: Number(months) })}>Grant</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => act("pilot")}>Make pilot (free Growth)</Button>
            <Button variant="outline" onClick={() => act("revoke")}>Revoke → Free</Button>
            {sel.suspended ? <Button variant="outline" onClick={() => act("unsuspend")}>Reinstate</Button> : <Button variant="danger" onClick={() => confirm("Suspend this workspace and sign everyone out?") && act("suspend")}>Suspend</Button>}
          </div>
          <div className="rounded-xl border border-red-500/30 p-3">
            <div className="mb-2 font-medium text-red-600">Delete workspace permanently</div>
            <div className="flex gap-2"><Input placeholder={`Type "${sel.name}" to confirm`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} /><Button variant="danger" disabled={confirmName !== sel.name} onClick={() => act("delete", { confirm: confirmName })}>Delete</Button></div>
          </div>
        </div>}
      </Modal>
    </>
  );
}
