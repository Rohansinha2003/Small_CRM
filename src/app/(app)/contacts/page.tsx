"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Input, Modal, PageHeader, Select, Empty } from "@/components/ui";
import { ContactForm } from "@/components/quick-add";
import { timeAgo, waLink } from "@/lib/utils";

const statusColor = { lead: "#0ea5e9", customer: "#16a34a", inactive: "#94a3b8" } as const;

export default function Contacts() {
  const { db, importContacts, updateContact, deleteContact, isAdmin } = useStore();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState("");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");
  const [add, setAdd] = useState(false);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const tags = useMemo(() => [...new Set(db.contacts.flatMap((c) => c.tags))].sort(), [db.contacts]);
  const list = db.contacts.filter((c) =>
    (status === "all" || c.status === status) && (tag === "all" || c.tags.includes(tag)) &&
    (c.name + c.phone + (c.company ?? "")).toLowerCase().includes(q.toLowerCase()));

  const onCsv = async (f?: File) => {
    if (!f) return;
    const lines = (await f.text()).split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(/name/i.test(lines[0]) ? 1 : 0).map((l) => { const [name, phone] = l.split(",").map((s) => s.trim().replace(/^"|"$/g, "")); return { name, phone: phone ?? "" }; });
    const n = importContacts(rows);
    setMsg(`Imported ${n} new contact${n === 1 ? "" : "s"} (${rows.length - n} skipped as duplicates/invalid).`);
    if (file.current) file.current.value = "";
  };
  const exportCsv = () => {
    const csv = ["Name,Phone,Company,Status,Tags", ...db.contacts.map((c) => [c.name, c.phone, c.company ?? "", c.status, c.tags.join("|")].map((v) => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "contacts.csv"; a.click();
  };

  return (
    <>
      <PageHeader title="Contacts" sub={`${db.contacts.length} people in your WhatsApp book`}
        actions={<>
          <input ref={file} type="file" accept=".csv" hidden onChange={(e) => onCsv(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => file.current?.click()}>Import CSV</Button>
          <Button variant="outline" onClick={exportCsv}>Export</Button>
          <Button onClick={() => setAdd(true)}>+ Add contact</Button>
        </>} />
      {msg && <div className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{msg}</div>}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Filter by name, phone, company" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="lead">Leads</option><option value="customer">Customers</option><option value="inactive">Inactive</option></Select>
        <Select className="w-36" value={tag} onChange={(e) => setTag(e.target.value)}><option value="all">All tags</option>{tags.map((t) => <option key={t}>{t}</option>)}</Select>
      </div>
      {sel.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand bg-brand-soft p-2.5 text-sm">
          <b>{sel.size} selected</b>
          <Input className="w-32" placeholder="Tag name" value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} />
          <Button size="sm" disabled={!bulkTag.trim()} onClick={() => { const t = bulkTag.trim(); db.contacts.filter((c) => sel.has(c.id) && !c.tags.includes(t)).forEach((c) => updateContact(c.id, { tags: [...c.tags, t] })); setBulkTag(""); }}>Add tag</Button>
          <Select className="w-36" defaultValue="" onChange={(e) => { if (e.target.value) { sel.forEach((id) => updateContact(id, { owner: e.target.value })); e.target.value = ""; } }}>
            <option value="">Assign to…</option>{db.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select className="w-32" defaultValue="" onChange={(e) => { if (e.target.value) { sel.forEach((id) => updateContact(id, { status: e.target.value as "lead" })); e.target.value = ""; } }}>
            <option value="">Set status…</option><option value="lead">Lead</option><option value="customer">Customer</option><option value="inactive">Inactive</option>
          </Select>
          {isAdmin && <Button size="sm" variant="danger" onClick={() => { if (confirm(`Delete ${sel.size} contacts and all their chats, deals and follow-ups?`)) { sel.forEach((id) => deleteContact(id)); setSel(new Set()); } }}>Delete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-brand-soft/50 text-left text-xs text-muted"><tr>
              <th className="w-10 px-4 py-2.5"><input type="checkbox" aria-label="Select all" className="accent-[var(--brand)]" checked={list.length > 0 && list.every((c) => sel.has(c.id))} onChange={(e) => setSel(e.target.checked ? new Set(list.map((c) => c.id)) : new Set())} /></th><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Status</th><th className="hidden px-4 py-2.5 font-medium md:table-cell">Tags</th><th className="hidden px-4 py-2.5 font-medium lg:table-cell">Owner</th><th className="hidden px-4 py-2.5 font-medium sm:table-cell">Last contact</th><th className="px-4 py-2.5" />
            </tr></thead>
            <tbody className="divide-y divide-line">
              {list.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-brand-soft/40" onClick={() => router.push(`/contacts/${c.id}`)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${c.name}`} className="accent-[var(--brand)]" checked={sel.has(c.id)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(c.id); else n.delete(c.id); setSel(n); }} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={c.name} size={32} /><div><div className="font-medium">{c.name}</div><div className="text-xs text-muted">{c.phone}{c.company && ` · ${c.company}`}</div></div></div></td>
                  <td className="px-4 py-3"><Badge color={statusColor[c.status]} className="capitalize">{c.status}</Badge></td>
                  <td className="hidden px-4 py-3 md:table-cell"><div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div></td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{db.team.find((t) => t.id === c.owner)?.name}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{timeAgo(c.lastContactAt)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}><a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">Chat</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <Empty text="No contacts match your filters." />}
        </div>
      </Card>
      <p className="mt-2 text-xs text-muted">Tip: CSV format is <code>Name,Phone</code> per line. Duplicates are skipped automatically.</p>
      <Modal open={add} onClose={() => setAdd(false)} title="Add contact" wide><ContactForm onDone={(id) => { setAdd(false); if (id) router.push(`/contacts/${id}`); }} /></Modal>
    </>
  );
}
