"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import type { Template } from "@/lib/types";

const CATS: Template["category"][] = ["Greeting", "Follow-up", "Offer", "Payment", "Support"];

export default function Templates() {
  const { db, saveTemplate, deleteTemplate } = useStore();
  const [edit, setEdit] = useState<Partial<Template> | null>(null);
  return (
    <>
      <PageHeader title="Quick replies" sub="Save the messages you type every day. One tap in the inbox."
        actions={<Button onClick={() => setEdit({ category: "Greeting", name: "", body: "" })}>+ New template</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {db.templates.map((t) => (
          <Card key={t.id} className="flex flex-col p-4">
            <div className="mb-2 flex items-center justify-between"><div className="font-semibold">{t.name}</div><Badge>{t.category}</Badge></div>
            <p className="flex-1 text-sm text-muted">{t.body}</p>
            <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(t)}>Edit</Button><Button size="sm" variant="danger" onClick={() => deleteTemplate(t.id)}>Delete</Button></div>
          </Card>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit template" : "New template"}>
        {edit && <div className="space-y-3">
          <Field label="Name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
          <Field label="Category"><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Template["category"] })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Message — placeholders: {{name}}, {{business}}"><Textarea rows={5} value={edit.body ?? ""} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button disabled={!edit.name?.trim() || !edit.body?.trim()} onClick={() => { saveTemplate(edit as Template); setEdit(null); }}>Save</Button></div>
        </div>}
      </Modal>
    </>
  );
}
