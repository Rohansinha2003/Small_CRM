"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { fill, timeAgo } from "@/lib/utils";

export default function Broadcasts() {
  const { db, sendBroadcast } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState("all");
  const tags = useMemo(() => [...new Set(db.contacts.flatMap((c) => c.tags))].sort(), [db.contacts]);

  const audience = db.contacts.filter((c) => aud === "all" ? true : aud.startsWith("status:") ? c.status === aud.slice(7) : c.tags.includes(aud.slice(4)));
  const label = aud === "all" ? "All contacts" : aud.startsWith("status:") ? `Status: ${aud.slice(7)}` : `Tag: ${aud.slice(4)}`;
  const sample = audience[0] ?? db.contacts[0];
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const send = () => {
    sendBroadcast({ name, body, audience: label }, audience.map((c) => c.id));
    setOpen(false); setName(""); setBody("");
  };

  return (
    <>
      <PageHeader title="Broadcasts" sub="Send an offer or reminder to a segment — each person gets a personal 1-to-1 message"
        actions={<Button onClick={() => setOpen(true)}>+ New broadcast</Button>} />
      <div className="space-y-3">
        {db.broadcasts.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><div className="font-semibold">{b.name}</div><div className="text-xs text-muted">{b.audience} · {b.recipients} recipients · {timeAgo(b.at)}</div></div>
              <Badge>Sent</Badge>
            </div>
            <p className="mt-2 rounded-lg bg-brand-soft p-2.5 text-sm">{b.body}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[["Delivered", b.delivered], ["Read", b.read], ["Replied", b.replied]].map(([l, v]) => (
                <div key={l as string}><div className="text-xl font-semibold">{pct(v as number, b.recipients)}%</div><div className="text-xs text-muted">{l} · {v}</div></div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New broadcast" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <Field label="Campaign name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend sale" /></Field>
            <Field label="Audience">
              <Select value={aud} onChange={(e) => setAud(e.target.value)}>
                <option value="all">All contacts</option>
                <optgroup label="By status"><option value="status:lead">Leads</option><option value="status:customer">Customers</option><option value="status:inactive">Inactive</option></optgroup>
                <optgroup label="By tag">{tags.map((t) => <option key={t} value={"tag:" + t}>{t}</option>)}</optgroup>
              </Select>
            </Field>
            <Field label="Message (use {{name}})">
              <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{name}}, …" />
            </Field>
            <div className="flex flex-wrap gap-1">{db.templates.map((t) => <button key={t.id} onClick={() => setBody(t.body)} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand">{t.name}</button>)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Preview</div>
            <div className="chat-bg rounded-xl p-4"><div className="bubble-out ml-auto max-w-[90%] whitespace-pre-wrap rounded-lg rounded-tr-none px-3 py-2 text-sm shadow-sm">{body ? fill(body, sample?.name ?? "Customer", db.settings.businessName) : <span className="text-muted">Your message appears here</span>}</div></div>
            <div className="mt-3 rounded-lg bg-brand-soft p-3 text-sm"><b>{audience.length}</b> recipient{audience.length === 1 ? "" : "s"} will receive this.</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name.trim() || !body.trim() || audience.length === 0} onClick={send}>Send to {audience.length}</Button></div>
      </Modal>
    </>
  );
}
