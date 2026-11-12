"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";

export default function Settings() {
  const { db, updateSettings, loadSample, wipeAll, user } = useStore();
  const s = db.settings;
  const [saved, setSaved] = useState(false);
  const [biz, setBiz] = useState(s.businessName);
  const [auto, setAuto] = useState(s.autoReplyText);
  const save = () => { updateSettings({ businessName: biz, autoReplyText: auto }); setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-4xl gap-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">WhatsApp connection</h2><p className="text-sm text-muted">Direct WhatsApp Business API sync is rolling out. Until then, chats open in WhatsApp via one-tap links and you log messages here.</p></div>
            <Badge color={s.connected ? "#16a34a" : "#94a3b8"}>{s.connected ? "● Connected" : "Not connected"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Input className="max-w-xs" value={s.whatsappNumber} placeholder="+91 98765 43210" onChange={(e) => updateSettings({ whatsappNumber: e.target.value })} />
            <Button variant={s.connected ? "outline" : "primary"} onClick={() => updateSettings({ connected: !s.connected })}>{s.connected ? "Mark as not connected" : "Mark as connected"}</Button>
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Business profile & auto-reply</h2>
          <Field label="Business name"><Input value={biz} onChange={(e) => setBiz(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.autoReply} onChange={(e) => updateSettings({ autoReply: e.target.checked })} className="accent-[var(--brand)]" />Send an instant auto-reply to new messages</label>
          <Field label="Auto-reply message"><Textarea rows={3} value={auto} onChange={(e) => setAuto(e.target.value)} /></Field>
          <div className="flex items-center gap-3"><Button onClick={save}>Save changes</Button>{saved && <span className="text-sm text-brand">✓ Saved</span>}</div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Team</h2>
          {db.team.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-0"><Avatar name={t.name} color={t.color} /><div className="flex-1 text-sm font-medium">{t.name}</div><Badge>{t.role}</Badge></div>
          ))}
          <p className="mt-2 text-xs text-muted">Signed in as {user?.email}. Manage members, invites and activity under <a className="text-brand underline" href="/team">Team &amp; admin</a>.</p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Plan: {s.plan}</h2>
          <p className="text-sm text-muted">Manage your subscription under <a className="text-brand underline" href="/billing">Plan &amp; billing</a>.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Sample data</h2>
          <p className="mb-3 text-sm text-muted">Load a realistic example shop to explore ChatDesk, or clear all contacts, chats, deals and follow-ups.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadSample}>Load sample data</Button>
            <Button variant="danger" onClick={() => confirm("Delete ALL contacts, messages, deals, follow-ups and broadcasts? This cannot be undone.") && wipeAll()}>Delete all CRM data</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
