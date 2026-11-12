"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Avatar, Badge, PageHeader, Button } from "@/components/ui";
import { inr, timeAgo, dateISO } from "@/lib/utils";
import { STAGES } from "@/lib/types";

export default function Dashboard() {
  const { db, toggleTask } = useStore();
  const [now] = useState(() => Date.now());
  const today = dateISO(0);
  const open = db.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const won = db.deals.filter((d) => d.stage === "won");
  const lost = db.deals.filter((d) => d.stage === "lost");
  const pipeVal = open.reduce((a, d) => a + d.value, 0);
  const wonVal = won.reduce((a, d) => a + d.value, 0);
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const waiting = db.contacts.filter((c) => db.messages.filter((m) => m.contactId === c.id).at(-1)?.dir === "in");
  const due = db.tasks.filter((t) => !t.done && t.due <= today).sort((a, b) => a.due.localeCompare(b.due));
  const cold = db.contacts.filter((c) => c.status === "lead" && now - new Date(c.lastContactAt).getTime() > 86400000 * 2);
  const stats = [
    { label: "Open pipeline", value: inr(pipeVal), sub: `${open.length} active deals`, href: "/pipeline" },
    { label: "Won revenue", value: inr(wonVal), sub: `${won.length} deals closed`, href: "/reports" },
    { label: "Win rate", value: winRate + "%", sub: `${won.length} won · ${lost.length} lost`, href: "/reports" },
    { label: "Awaiting your reply", value: String(waiting.length), sub: "customers on WhatsApp", href: "/inbox" },
  ];
  const max = Math.max(1, ...STAGES.slice(0, 4).map((s) => db.deals.filter((d) => d.stage === s.id).length));

  return (
    <>
      <PageHeader title={`Good day, ${db.team[0].name.split(" ")[0]} 👋`} sub={`Here's what needs attention at ${db.settings.businessName} today.`}
        actions={<Link href="/inbox"><Button>Open WhatsApp inbox</Button></Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}><Card className="p-4 transition hover:border-brand"><div className="text-xs font-medium text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</div><div className="mt-0.5 text-xs text-muted">{s.sub}</div></Card></Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Waiting for your reply</h2><Link href="/inbox" className="text-xs text-brand">View all</Link></div>
          {waiting.length === 0 && <p className="py-6 text-center text-sm text-muted">Inbox zero 🎉</p>}
          <ul className="divide-y divide-line">
            {waiting.slice(0, 5).map((c) => {
              const last = db.messages.filter((m) => m.contactId === c.id).at(-1)!;
              return (
                <li key={c.id}><Link href={`/inbox?c=${c.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <Avatar name={c.name} /><div className="min-w-0 flex-1"><div className="text-sm font-medium">{c.name}</div><div className="truncate text-xs text-muted">{last.text}</div></div>
                  <span className="text-xs text-muted">{timeAgo(last.at)}</span></Link></li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Today&apos;s follow-ups</h2><Link href="/tasks" className="text-xs text-brand">View all</Link></div>
          {due.length === 0 && <p className="py-6 text-center text-sm text-muted">All caught up ✅</p>}
          <ul className="space-y-2">
            {due.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 accent-[var(--brand)]" onChange={() => toggleTask(t.id)} aria-label="Mark done" />
                <div><div>{t.title}</div>{t.due < today && <Badge color="#ef4444">Overdue</Badge>}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Pipeline snapshot</h2>
          <div className="space-y-3">
            {STAGES.slice(0, 4).map((s) => {
              const ds = db.deals.filter((d) => d.stage === s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <div className="w-28 shrink-0 text-muted">{s.label}</div>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-brand-soft"><div className="h-full rounded" style={{ width: `${(ds.length / max) * 100}%`, background: s.color }} /></div>
                  <div className="w-24 text-right text-xs"><b>{ds.length}</b> · {inr(ds.reduce((a, d) => a + d.value, 0))}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Going cold 🧊</h2>
          <p className="mb-2 text-xs text-muted">Leads with no message in 2+ days</p>
          <ul className="space-y-2">
            {cold.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-2"><Avatar name={c.name} size={28} /><Link href={`/contacts/${c.id}`} className="flex-1 text-sm hover:underline">{c.name}</Link><span className="text-xs text-muted">{timeAgo(c.lastContactAt)}</span></li>
            ))}
            {cold.length === 0 && <li className="text-sm text-muted">No cold leads.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
