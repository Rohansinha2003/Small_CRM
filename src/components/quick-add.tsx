"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, Input, Field, Select, Textarea } from "./ui";
import { useStore } from "@/lib/store";
import { Status } from "@/lib/types";

export function ContactForm({ onDone, initial }: { onDone: (id?: string) => void; initial?: { id: string; name: string; phone: string; company?: string; email?: string; tags: string[]; status: Status; source: string; notes: string; owner: string } }) {
  const { db, addContact, updateContact } = useStore();
  const [f, setF] = useState({
    name: initial?.name ?? "", phone: initial?.phone ?? "+91", company: initial?.company ?? "", email: initial?.email ?? "",
    tags: initial?.tags.join(", ") ?? "", status: (initial?.status ?? "lead") as Status, source: initial?.source ?? "WhatsApp",
    notes: initial?.notes ?? "", owner: initial?.owner ?? db.team[0].id,
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim() && f.phone.replace(/\D/g, "").length >= 8;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    if (initial) { updateContact(initial.id, data); onDone(initial.id); } else onDone(addContact(data));
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><Input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
        <Field label="WhatsApp number *"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" /></Field>
        <Field label="Company"><Input value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set("status", e.target.value)}><option value="lead">Lead</option><option value="customer">Customer</option><option value="inactive">Inactive</option></Select></Field>
        <Field label="Source"><Select value={f.source} onChange={(e) => set("source", e.target.value)}>{["WhatsApp", "WhatsApp link", "Instagram", "Facebook ad", "Referral", "Walk-in", "Website form", "CSV import"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Owner"><Select value={f.owner} onChange={(e) => set("owner", e.target.value)}>{db.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Tags (comma separated)"><Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="VIP, Wholesale" /></Field>
      </div>
      <Field label="Notes"><Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="ghost" onClick={() => onDone()}>Cancel</Button><Button type="submit" disabled={!valid}>{initial ? "Save changes" : "Add contact"}</Button></div>
    </form>
  );
}

export function DealForm({ onDone, contactId }: { onDone: () => void; contactId?: string }) {
  const { db, addDeal } = useStore();
  const [f, setF] = useState({ contactId: contactId ?? db.contacts[0]?.id ?? "", title: "", value: "" });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addDeal({ contactId: f.contactId, title: f.title, value: Number(f.value) || 0, stage: "new" }); onDone(); }}>
      <Field label="Contact"><Select value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}>{db.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Deal title *"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus placeholder="e.g. 50 pcs wholesale order" /></Field>
      <Field label="Value (₹)"><Input type="number" min="0" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" disabled={!f.title.trim() || !f.contactId}>Create deal</Button></div>
    </form>
  );
}

export function TaskForm({ onDone, contactId }: { onDone: () => void; contactId?: string }) {
  const { db, addTask } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ contactId: contactId ?? "", title: "", due: today, assignee: db.team[0].id });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addTask({ ...f, contactId: f.contactId || undefined }); onDone(); }}>
      <Field label="Follow-up *"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus placeholder="e.g. Send quote on WhatsApp" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        <Field label="Assign to"><Select value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })}>{db.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      </div>
      <Field label="Contact (optional)"><Select value={f.contactId} onChange={(e) => setF({ ...f, contactId: e.target.value })}><option value="">— None —</option>{db.contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onDone}>Cancel</Button><Button type="submit" disabled={!f.title.trim()}>Add follow-up</Button></div>
    </form>
  );
}

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"contact" | "deal" | "task">("contact");
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} title="Quick add" wide={tab === "contact"}>
      <div className="mb-4 flex gap-1 rounded-lg bg-brand-soft p-1 text-sm">
        {(["contact", "deal", "task"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1.5 font-medium capitalize ${tab === t ? "bg-card shadow-sm" : "text-muted"}`}>{t === "task" ? "follow-up" : t}</button>
        ))}
      </div>
      {tab === "contact" && <ContactForm onDone={(id) => { onClose(); if (id) router.push(`/contacts/${id}`); }} />}
      {tab === "deal" && <DealForm onDone={onClose} />}
      {tab === "task" && <TaskForm onDone={onClose} />}
    </Modal>
  );
}
