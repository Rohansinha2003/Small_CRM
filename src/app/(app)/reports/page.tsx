"use client";
import { useStore } from "@/lib/store";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { inr } from "@/lib/utils";

export default function Reports() {
  const { db } = useStore();
  const won = db.deals.filter((d) => d.stage === "won");
  const lost = db.deals.filter((d) => d.stage === "lost");
  const open = db.deals.filter((d) => !["won", "lost"].includes(d.stage));
  const rev = won.reduce((a, d) => a + d.value, 0);
  const avg = won.length ? rev / won.length : 0;

  const sources = Object.entries(db.contacts.reduce<Record<string, number>>((a, c) => ({ ...a, [c.source]: (a[c.source] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const maxSrc = sources[0]?.[1] ?? 1;

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const perDay = days.map((d) => {
    const k = d.toDateString();
    const ms = db.messages.filter((m) => new Date(m.at).toDateString() === k);
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), inb: ms.filter((m) => m.dir === "in").length, out: ms.filter((m) => m.dir === "out").length };
  });
  const maxDay = Math.max(1, ...perDay.map((d) => d.inb + d.out));

  const resp = db.team.map((t) => ({ t, sent: db.messages.filter((m) => m.by === t.id).length, deals: won.filter((d) => db.contacts.find((c) => c.id === d.contactId)?.owner === t.id) }));

  return (
    <>
      <PageHeader title="Reports" sub="Simple numbers that actually help you decide" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Revenue won", inr(rev)], ["Avg. deal size", inr(avg)], ["Open pipeline", inr(open.reduce((a, d) => a + d.value, 0))], ["Total contacts", String(db.contacts.length)]].map(([l, v]) => (
          <Card key={l} className="p-4"><div className="text-xs font-medium text-muted">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 font-semibold">WhatsApp messages · last 7 days</h2>
          <div className="flex h-40 items-end gap-3">
            {perDay.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t bg-brand-soft/60" title={`${d.inb} received · ${d.out} sent`}>
                  <div style={{ height: `${(d.out / maxDay) * 100}%` }} className="bg-brand" />
                  <div style={{ height: `${(d.inb / maxDay) * 100}%` }} className="bg-sky-400" />
                </div>
                <span className="text-[11px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />Sent</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />Received</span></div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-semibold">Where customers come from</h2>
          <div className="space-y-2.5">
            {sources.map(([s, n]) => (
              <div key={s} className="flex items-center gap-3 text-sm"><div className="w-28 text-muted">{s}</div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-brand-soft"><div className="h-full rounded bg-brand" style={{ width: `${(n / maxSrc) * 100}%` }} /></div><div className="w-6 text-right font-medium">{n}</div></div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Deal outcomes</h2>
          <div className="flex items-center gap-6">
            <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(var(--brand) ${won.length / Math.max(1, won.length + lost.length) * 360}deg, #ef4444 0)` }}>
              <div className="grid h-20 w-20 place-items-center rounded-full bg-card text-lg font-semibold">{Math.round(won.length / Math.max(1, won.length + lost.length) * 100)}%</div>
            </div>
            <div className="space-y-1 text-sm"><div><i className="mr-2 inline-block h-2 w-2 rounded-full bg-brand" />{won.length} won · {inr(rev)}</div><div><i className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />{lost.length} lost · {inr(lost.reduce((a, d) => a + d.value, 0))}</div></div>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Team activity</h2>
          {resp.map(({ t, sent, deals }) => (
            <div key={t.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-0">
              <Avatar name={t.name} color={t.color} /><div className="flex-1"><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-muted">{t.role}</div></div>
              <div className="text-right text-xs text-muted"><b className="text-foreground">{sent}</b> messages<br /><b className="text-foreground">{inr(deals.reduce((a, d) => a + d.value, 0))}</b> won</div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
