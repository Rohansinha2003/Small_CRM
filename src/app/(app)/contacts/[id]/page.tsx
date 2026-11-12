"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Modal, Empty } from "@/components/ui";
import { ContactForm, DealForm, TaskForm } from "@/components/quick-add";
import { STAGES } from "@/lib/types";
import { clock, dayLabel, inr, timeAgo, waLink } from "@/lib/utils";

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { db, deleteContact, toggleTask } = useStore();
  const [modal, setModal] = useState<null | "edit" | "deal" | "task" | "del">(null);
  const c = db.contacts.find((x) => x.id === id);
  if (!c) return <Empty text="Contact not found." />;
  const msgs = db.messages.filter((m) => m.contactId === id);
  const deals = db.deals.filter((d) => d.contactId === id);
  const tasks = db.tasks.filter((t) => t.contactId === id);
  const owner = db.team.find((t) => t.id === c.owner);
  const ltv = deals.filter((d) => d.stage === "won").reduce((a, d) => a + d.value, 0);

  // unified timeline: messages, deals, tasks
  const timeline = [
    ...msgs.map((m) => ({ at: m.at, kind: m.dir === "in" ? "💬 Customer" : "📤 You", text: m.text })),
    ...deals.map((d) => ({ at: d.createdAt, kind: "💼 Deal created", text: `${d.title} — ${inr(d.value)}` })),
    { at: c.createdAt, kind: "✨ Added", text: `Source: ${c.source}` },
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return (
    <>
      <Link href="/contacts" className="mb-3 inline-block text-sm text-muted hover:text-foreground">← Contacts</Link>
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={c.name} size={60} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{c.name}</h1>
          <div className="text-sm text-muted">{c.company && `${c.company} · `}{c.phone}{c.email && ` · ${c.email}`}</div>
          <div className="mt-2 flex flex-wrap gap-1"><Badge className="capitalize">{c.status}</Badge>{c.tags.map((t) => <Badge key={t} color="#64748b">{t}</Badge>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/inbox?c=${c.id}`}><Button>Open chat</Button></Link>
          <a href={waLink(c.phone)} target="_blank" rel="noreferrer"><Button variant="outline">↗ WhatsApp</Button></a>
          <Button variant="outline" onClick={() => setModal("edit")}>Edit</Button>
          <Button variant="danger" onClick={() => setModal("del")}>Delete</Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="p-4 text-sm">
            <h2 className="mb-2 font-semibold">Details</h2>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-muted">Owner</dt><dd>{owner?.name}</dd>
              <dt className="text-muted">Source</dt><dd>{c.source}</dd>
              <dt className="text-muted">Customer since</dt><dd>{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
              <dt className="text-muted">Last contact</dt><dd>{timeAgo(c.lastContactAt)}</dd>
              <dt className="text-muted">Lifetime value</dt><dd className="font-semibold">{inr(ltv)}</dd>
            </dl>
            {c.notes && <><h3 className="mb-1 mt-4 text-xs font-medium text-muted">Notes</h3><p className="rounded-lg bg-brand-soft p-2.5">{c.notes}</p></>}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Deals</h2><Button size="sm" variant="outline" onClick={() => setModal("deal")}>+ Add</Button></div>
            {deals.length === 0 && <p className="text-sm text-muted">No deals yet.</p>}
            {deals.map((d) => { const s = STAGES.find((x) => x.id === d.stage)!; return (
              <div key={d.id} className="flex items-center justify-between border-t border-line py-2 text-sm first:border-0"><div><div className="font-medium">{d.title}</div><Badge color={s.color}>{s.label}</Badge></div><div className="font-semibold">{inr(d.value)}</div></div>
            ); })}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Follow-ups</h2><Button size="sm" variant="outline" onClick={() => setModal("task")}>+ Add</Button></div>
            {tasks.length === 0 && <p className="text-sm text-muted">Nothing scheduled.</p>}
            {tasks.map((t) => (
              <label key={t.id} className="flex items-start gap-2 border-t border-line py-2 text-sm first:border-0">
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="mt-1 accent-[var(--brand)]" />
                <span className={t.done ? "text-muted line-through" : ""}>{t.title}<span className="block text-xs text-muted">Due {t.due}</span></span>
              </label>
            ))}
          </Card>
        </div>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Activity timeline</h2>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                <div className="flex items-center gap-2 text-xs text-muted"><b className="text-foreground">{t.kind}</b>{dayLabel(t.at)}, {clock(t.at)}</div>
                <div className="text-sm">{t.text}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Edit contact" wide><ContactForm initial={c} onDone={() => setModal(null)} /></Modal>
      <Modal open={modal === "deal"} onClose={() => setModal(null)} title="New deal"><DealForm contactId={c.id} onDone={() => setModal(null)} /></Modal>
      <Modal open={modal === "task"} onClose={() => setModal(null)} title="New follow-up"><TaskForm contactId={c.id} onDone={() => setModal(null)} /></Modal>
      <Modal open={modal === "del"} onClose={() => setModal(null)} title="Delete contact?">
        <p className="mb-4 text-sm text-muted">This removes {c.name} along with their messages, deals and follow-ups. This can&apos;t be undone.</p>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button className="!bg-red-600" onClick={() => { deleteContact(c.id); router.push("/contacts"); }}>Delete</Button></div>
      </Modal>
    </>
  );
}
