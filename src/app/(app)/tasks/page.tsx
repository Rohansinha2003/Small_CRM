"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Avatar, Button, Card, Modal, PageHeader, Empty } from "@/components/ui";
import { TaskForm } from "@/components/quick-add";
import { dateISO, waLink, fill } from "@/lib/utils";

export default function Tasks() {
  const { db, toggleTask, deleteTask } = useStore();
  const [add, setAdd] = useState(false);
  const [tab, setTab] = useState<"open" | "done">("open");
  const today = dateISO(0);
  const list = db.tasks.filter((t) => (tab === "done") === t.done).sort((a, b) => a.due.localeCompare(b.due));
  const groups = tab === "done" ? [["Completed", list]] as const : ([
    ["Overdue", list.filter((t) => t.due < today)], ["Today", list.filter((t) => t.due === today)], ["Upcoming", list.filter((t) => t.due > today)],
  ] as const);

  return (
    <>
      <PageHeader title="Follow-ups" sub="Never let a lead go cold again" actions={<Button onClick={() => setAdd(true)}>+ New follow-up</Button>} />
      <div className="mb-4 inline-flex gap-1 rounded-lg bg-brand-soft p-1 text-sm">
        {(["open", "done"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 font-medium capitalize ${tab === t ? "bg-card shadow-sm" : "text-muted"}`}>{t}</button>)}
      </div>
      {list.length === 0 && <Empty text={tab === "open" ? "You're all caught up 🎉" : "Nothing completed yet."} />}
      {groups.map(([label, items]) => items.length > 0 && (
        <section key={label} className="mb-5">
          <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${label === "Overdue" ? "text-red-500" : "text-muted"}`}>{label} · {items.length}</h2>
          <Card className="divide-y divide-line">
            {items.map((t) => {
              const c = db.contacts.find((x) => x.id === t.contactId);
              const who = db.team.find((x) => x.id === t.assignee);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="h-4 w-4 accent-[var(--brand)]" aria-label="Done" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${t.done ? "text-muted line-through" : "font-medium"}`}>{t.title}</div>
                    <div className="text-xs text-muted">{c && <Link href={`/contacts/${c.id}`} className="hover:underline">{c.name} · </Link>}Due {t.due}</div>
                  </div>
                  {who && <Avatar name={who.name} color={who.color} size={24} />}
                  {c && !t.done && <a href={waLink(c.phone, fill("Hi {{name}}, following up on our conversation. ", c.name))} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">↗ Nudge</Button></a>}
                  <button className="text-muted hover:text-red-600" aria-label="Delete" onClick={() => deleteTask(t.id)}>✕</button>
                </div>
              );
            })}
          </Card>
        </section>
      ))}
      <Modal open={add} onClose={() => setAdd(false)} title="New follow-up"><TaskForm onDone={() => setAdd(false)} /></Modal>
    </>
  );
}
