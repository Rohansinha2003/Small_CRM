"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Button, Card, Empty, PageHeader, Select } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

interface Member { id: string; name: string; email: string; role: "Owner" | "Admin" | "Agent" }
interface Invite { id: string; role: string; expires_at: string }
interface Entry { id: string; user_name: string; action: string; detail: string; at: string }

async function post(body: unknown) {
  const r = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

export default function Team() {
  const { user, isAdmin, refresh } = useStore();
  const [tab, setTab] = useState<"members" | "activity">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [seats, setSeats] = useState(1);
  const [log, setLog] = useState<Entry[]>([]);
  const [role, setRole] = useState("Agent");
  const [link, setLink] = useState<{ label: string; url: string } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [delName, setDelName] = useState("");

  const load = useCallback(async () => {
    const j = await fetch("/api/team").then((r) => r.json());
    setMembers(j.members ?? []); setInvites(j.invites ?? []); setSeats(j.seats ?? 1);
    if (isAdmin) { const a = await fetch("/api/audit").then((r) => r.json()); setLog(a.entries ?? []); }
  }, [isAdmin]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const act = async (body: unknown, label?: string) => {
    setErr(""); const { ok, j } = await post(body);
    if (!ok) { setErr(j.error ?? "Failed"); return; }
    if (j.link) { setLink({ label: label ?? "Link", url: location.origin + j.link }); setCopied(false); }
    await load(); refresh();
  };
  const full = members.length + invites.length >= seats;

  return (
    <>
      <PageHeader title="Team & admin" sub={`${members.length} of ${seats} seats used`} />
      {!isAdmin && <div className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm">You&apos;re an agent. Ask an owner or admin to manage the team.</div>}
      <div className="mb-4 inline-flex gap-1 rounded-lg bg-brand-soft p-1 text-sm">
        {(["members", "activity"] as const).map((t) => (t === "activity" && !isAdmin) ? null : <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-4 py-1.5 font-medium capitalize", tab === t ? "bg-card shadow-sm" : "text-muted")}>{t === "activity" ? "Activity log" : "Members"}</button>)}
      </div>
      {err && <div role="alert" className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err} {/upgrade/i.test(err) && <Link href="/billing" className="font-semibold underline">See plans</Link>}</div>}
      {link && (
        <Card className="mb-4 border-brand p-4">
          <div className="mb-1 text-sm font-semibold">{link.label} — share it privately</div>
          <div className="flex gap-2"><input readOnly value={link.url} className="w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button onClick={() => { navigator.clipboard.writeText(link.url); setCopied(true); }}>{copied ? "Copied ✓" : "Copy"}</Button></div>
          <p className="mt-1 text-xs text-muted">One-time link. Anyone who has it can use it, so send it only to the intended person.</p>
        </Card>
      )}

      {tab === "members" && (<>
        <Card className="divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{m.name} {m.id === user?.id && <span className="text-xs text-muted">(you)</span>}</div><div className="truncate text-xs text-muted">{m.email}</div></div>
              {user?.role === "Owner" && m.role !== "Owner" ? (
                <Select className="w-28" value={m.role} onChange={(e) => act({ action: "role", userId: m.id, role: e.target.value })}><option>Admin</option><option>Agent</option></Select>
              ) : <Badge>{m.role}</Badge>}
              {isAdmin && m.id !== user?.id && <>
                <Button size="sm" variant="outline" onClick={() => act({ action: "reset", userId: m.id }, `Password reset link for ${m.name}`)}>Reset password</Button>
                {m.role !== "Owner" && <Button size="sm" variant="danger" onClick={() => confirm(`Remove ${m.name}? They will lose access immediately.`) && act({ action: "remove", userId: m.id })}>Remove</Button>}
              </>}
            </div>
          ))}
        </Card>

        {isAdmin && <Card className="mt-4 p-4">
          <h2 className="mb-1 font-semibold">Invite a teammate</h2>
          <p className="mb-3 text-xs text-muted">Owners can do everything. Admins manage the team and settings. Agents work with contacts, chats and deals but can&apos;t delete core records or change settings.</p>
          <div className="flex flex-wrap gap-2">
            <Select className="w-32" value={role} onChange={(e) => setRole(e.target.value)}><option>Agent</option>{user?.role === "Owner" && <option>Admin</option>}</Select>
            <Button disabled={full} onClick={() => act({ action: "invite", role }, "Invite link")}>Create invite link</Button>
            {full && <Link href="/billing" className="self-center text-sm text-brand underline">All seats used — upgrade</Link>}
          </div>
          {invites.length > 0 && <div className="mt-3 space-y-1 text-sm">
            <div className="text-xs font-medium text-muted">Pending invites</div>
            {invites.map((i) => <div key={i.id} className="flex items-center gap-2"><Badge>{i.role}</Badge><span className="text-xs text-muted">expires {new Date(i.expires_at).toLocaleDateString("en-IN")}</span><button className="text-xs text-red-600" onClick={() => act({ action: "revoke", id: i.id })}>Revoke</button></div>)}
          </div>}
        </Card>}

        {isAdmin && <Card className="mt-4 p-4">
          <h2 className="mb-1 font-semibold">Your data</h2>
          <p className="mb-2 text-xs text-muted">Download everything in this workspace as JSON. You own your data.</p>
          <a href="/api/export"><Button variant="outline">Export all data</Button></a>
        </Card>}

        {user?.role === "Owner" && <Card className="mt-4 border-red-500/30 p-4">
          <h2 className="mb-1 font-semibold text-red-600">Delete workspace</h2>
          <p className="mb-2 text-xs text-muted">Permanently deletes all contacts, chats, deals, team accounts and billing history for this workspace. Export your data first. This cannot be undone.</p>
          <div className="flex flex-wrap gap-2">
            <input value={delName} onChange={(e) => setDelName(e.target.value)} placeholder={`Type "${user.workspaceName}" to confirm`} className="min-w-64 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm" />
            <Button variant="danger" disabled={delName !== user.workspaceName} onClick={async () => { const { ok, j } = await post({ action: "delete_workspace", confirm: delName }); if (ok) location.assign("/"); else setErr(j.error ?? "Failed"); }}>Delete forever</Button>
          </div>
        </Card>}
      </>)}

      {tab === "activity" && isAdmin && (
        <Card className="divide-y divide-line">
          {log.length === 0 && <Empty text="No activity recorded yet." />}
          {log.map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1"><b>{e.user_name}</b> · {e.action}{e.detail && <span className="text-muted"> — {e.detail}</span>}</div>
              <div className="shrink-0 text-xs text-muted">{timeAgo(e.at)}</div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
