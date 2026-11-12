"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Card, Modal, PageHeader } from "@/components/ui";
import { DealForm } from "@/components/quick-add";
import { STAGES, Stage } from "@/lib/types";
import { inr, timeAgo } from "@/lib/utils";

export default function Pipeline() {
  const { db, moveDeal, deleteDeal } = useStore();
  const [add, setAdd] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const total = db.deals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((a, d) => a + d.value, 0);

  return (
    <>
      <PageHeader title="Sales pipeline" sub={`${inr(total)} open · drag cards between stages`} actions={<Button onClick={() => setAdd(true)}>+ New deal</Button>} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {STAGES.map((s) => {
          const ds = db.deals.filter((d) => d.stage === s.id);
          return (
            <div key={s.id} className="w-72 shrink-0"
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }} onDragLeave={() => setOver(null)}
              onDrop={() => { if (drag) moveDeal(drag, s.id); setDrag(null); setOver(null); }}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}<span className="text-xs font-normal text-muted">{ds.length}</span></div>
                <span className="text-xs text-muted">{inr(ds.reduce((a, d) => a + d.value, 0))}</span>
              </div>
              <div className={`min-h-40 space-y-2 rounded-xl p-2 transition ${over === s.id ? "bg-brand-soft ring-2 ring-brand/40" : "bg-brand-soft/40"}`}>
                {ds.map((d) => {
                  const c = db.contacts.find((x) => x.id === d.contactId);
                  return (
                    <Card key={d.id} draggable onDragStart={() => setDrag(d.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                      className="cursor-grab p-3 text-sm active:cursor-grabbing">
                      <div className="font-medium">{d.title}</div>
                      <Link href={`/contacts/${d.contactId}`} className="text-xs text-muted hover:underline">{c?.name}</Link>
                      <div className="mt-2 flex items-center justify-between"><span className="font-semibold">{inr(d.value)}</span><span className="text-[11px] text-muted">{timeAgo(d.createdAt)}</span></div>
                      <div className="mt-2 flex items-center gap-1">
                        <select aria-label="Move to stage" value={d.stage} onChange={(e) => moveDeal(d.id, e.target.value as Stage)} className="flex-1 rounded border border-line bg-card px-1 py-1 text-xs">
                          {STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                        </select>
                        <button className="px-1 text-xs text-muted hover:text-red-600" aria-label="Delete deal" onClick={() => confirm("Delete this deal?") && deleteDeal(d.id)}>🗑</button>
                      </div>
                    </Card>
                  );
                })}
                {ds.length === 0 && <div className="py-6 text-center text-xs text-muted">Drop deals here</div>}
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={add} onClose={() => setAdd(false)} title="New deal"><DealForm onDone={() => setAdd(false)} /></Modal>
    </>
  );
}
