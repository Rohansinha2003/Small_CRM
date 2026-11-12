"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar, Button, Badge, Card, Modal } from "@/components/ui";
import { clock, cn, dayLabel, fill, timeAgo, waLink } from "@/lib/utils";
import { DealForm, TaskForm } from "@/components/quick-add";

export default function InboxPage() { return <Suspense><Inbox /></Suspense>; }

function Inbox() {
  const { db, sendMessage, simulateIncoming } = useStore();
  const sp = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | "mine">("all");
  const [text, setText] = useState("");
  const [showTpl, setShowTpl] = useState(false);
  const [modal, setModal] = useState<null | "deal" | "task">(null);
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => db.contacts.map((c) => {
    const msgs = db.messages.filter((m) => m.contactId === c.id);
    return { c, msgs, last: msgs.at(-1) };
  }).filter((t) => t.last).sort((a, b) => +new Date(b.last!.at) - +new Date(a.last!.at)), [db]);

  const shown = threads.filter((t) => filter === "all" || (filter === "unread" ? t.last!.dir === "in" : t.c.owner === db.team[0].id));
  const activeId = sp.get("c") ?? shown[0]?.c.id;
  const active = threads.find((t) => t.c.id === activeId);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [active?.msgs.length, activeId]);

  const send = () => {
    if (!active || !text.trim()) return;
    sendMessage(active.c.id, text.trim()); setText("");
  };
  const openWA = () => active && window.open(waLink(active.c.phone, text), "_blank");

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-61px)] md:-mx-8">
      <div className={cn("w-full shrink-0 flex-col border-r border-line bg-card md:flex md:w-80", sp.get("c") ? "hidden" : "flex")}>
        <div className="border-b border-line p-3">
          <h1 className="mb-2 text-lg font-semibold">Inbox</h1>
          <div className="flex gap-1 text-xs">
            {(["all", "unread", "mine"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 font-medium capitalize", filter === f ? "bg-brand text-white" : "bg-brand-soft text-muted")}>{f === "unread" ? "Needs reply" : f === "mine" ? "Assigned to me" : "All"}</button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {shown.map(({ c, last }) => (
            <li key={c.id}>
              <button onClick={() => router.push(`/inbox?c=${c.id}`)} className={cn("flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left hover:bg-brand-soft/60", c.id === activeId && "bg-brand-soft")}>
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between"><span className="truncate text-sm font-semibold">{c.name}</span><span className="text-[11px] text-muted">{timeAgo(last!.at)}</span></div>
                  <div className="flex items-center gap-1 text-xs text-muted">{last!.dir === "out" && <span className="text-sky-500">✓✓</span>}<span className="truncate">{last!.text}</span>{last!.dir === "in" && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-brand" />}</div>
                </div>
              </button>
            </li>
          ))}
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted">No conversations.</p>}
        </ul>
      </div>

      <div className={cn("min-w-0 flex-1 flex-col", sp.get("c") ? "flex" : "hidden md:flex")}>
        {active ? (<>
          <div className="flex items-center gap-3 border-b border-line bg-card px-4 py-2.5">
            <button className="md:hidden" onClick={() => router.push("/inbox")} aria-label="Back">←</button>
            <Avatar name={active.c.name} />
            <div className="min-w-0 flex-1"><Link href={`/contacts/${active.c.id}`} className="block truncate text-sm font-semibold hover:underline">{active.c.name}</Link><div className="text-xs text-muted">{active.c.phone}</div></div>
            <Button size="sm" variant="outline" onClick={() => setModal("deal")}>+ Deal</Button>
            <Button size="sm" variant="outline" onClick={() => setModal("task")}>+ Follow-up</Button>
            {db.settings.sample && <Button size="sm" variant="ghost" title="Demo: simulate a customer reply" onClick={() => simulateIncoming(active.c.id)}>⚡ Simulate reply</Button>}
          </div>
          <div className="chat-bg flex-1 overflow-y-auto px-4 py-4">
            {active.msgs.map((m, i) => {
              const showDay = i === 0 || dayLabel(m.at) !== dayLabel(active.msgs[i - 1].at);
              const who = m.by ? db.team.find((t) => t.id === m.by)?.name.split(" ")[0] : null;
              return (
                <div key={m.id}>
                  {showDay && <div className="my-3 text-center"><span className="rounded-md bg-card px-2.5 py-1 text-[11px] text-muted shadow-sm">{dayLabel(m.at)}</span></div>}
                  <div className={cn("mb-1.5 flex", m.dir === "out" ? "justify-end" : "justify-start")}>
                    <div className={cn("pop max-w-[78%] rounded-lg px-3 py-1.5 text-sm shadow-sm", m.dir === "out" ? "bubble-out rounded-tr-none" : "rounded-tl-none bg-card")}>
                      {m.text}
                      <div className="mt-0.5 flex justify-end gap-1 text-[10px] text-muted">{who && <span>{who} ·</span>}{clock(m.at)}{m.dir === "out" && <span className={m.status === "read" ? "text-sky-500" : ""}>{m.status === "sent" ? "✓" : "✓✓"}</span>}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="relative border-t border-line bg-card p-3">
            {showTpl && (
              <Card className="pop absolute bottom-16 left-3 right-3 max-h-64 overflow-y-auto p-2 shadow-xl sm:right-auto sm:w-96">
                {db.templates.map((t) => (
                  <button key={t.id} className="block w-full rounded-lg p-2 text-left hover:bg-brand-soft" onClick={() => { setText(fill(t.body, active.c.name, db.settings.businessName)); setShowTpl(false); }}>
                    <div className="flex items-center gap-2 text-sm font-medium">{t.name}<Badge>{t.category}</Badge></div>
                    <div className="line-clamp-2 text-xs text-muted">{t.body}</div>
                  </button>
                ))}
              </Card>
            )}
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => setShowTpl(!showTpl)} aria-label="Templates">⚡ Templates</Button>
              <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="max-h-32 min-h-[38px] flex-1 resize-none rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40" />
              <Button onClick={send} disabled={!text.trim()}>Send</Button>
              <Button variant="outline" onClick={openWA} title="Open this chat in WhatsApp">↗ WhatsApp</Button>
            </div>
          </div>
        </>) : <div className="grid flex-1 place-items-center text-sm text-muted">Select a conversation</div>}
      </div>

      {active && <>
        <Modal open={modal === "deal"} onClose={() => setModal(null)} title="New deal"><DealForm contactId={active.c.id} onDone={() => setModal(null)} /></Modal>
        <Modal open={modal === "task"} onClose={() => setModal(null)} title="New follow-up"><TaskForm contactId={active.c.id} onDone={() => setModal(null)} /></Modal>
      </>}
    </div>
  );
}
