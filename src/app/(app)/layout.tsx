"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo, Avatar, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { QuickAdd } from "@/components/quick-add";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/contacts", label: "Contacts", icon: "☺" },
  { href: "/pipeline", label: "Pipeline", icon: "▤" },
  { href: "/tasks", label: "Follow-ups", icon: "✓" },
  { href: "/broadcasts", label: "Broadcasts", icon: "☄" },
  { href: "/templates", label: "Templates", icon: "❝" },
  { href: "/reports", label: "Reports", icon: "◔" },
  { href: "/team", label: "Team & admin", icon: "☻" },
  { href: "/billing", label: "Plan & billing", icon: "₹" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">Loading your workspace…</div>}><Shell>{children}</Shell></Suspense>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { db, ready, status, user, syncError, pending, logout } = useStore();
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const me = db.team[0] ?? { id: "", name: user?.name ?? "You", role: "Owner" as const, color: "#16a34a" };
  const unread = db.contacts.filter((c) => {
    const last = db.messages.filter((m) => m.contactId === c.id).at(-1);
    return last?.dir === "in";
  }).length;

  useEffect(() => { if (status === "anon") router.replace("/login"); }, [status, router]);

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading your workspace…</div>;

  const items = user?.isPlatformAdmin ? [...NAV, { href: "/admin", label: "Platform admin", icon: "★" }] : NAV;
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-brand-soft/60 hover:text-foreground")}>
            <span className="w-4 text-center">{n.icon}</span>{n.label}
            {n.href === "/inbox" && unread > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-card md:flex">
        <div className="p-4"><Link href="/dashboard"><Logo /></Link></div>
        {nav}
        <div className="mt-auto border-t border-line p-3">
          <div className="mb-2 rounded-lg bg-brand-soft p-3 text-xs">
            <div className="font-semibold text-brand">{user?.pilot ? "Pilot · Growth" : `${db.settings.plan} plan`}</div>
            <div className="text-muted">{db.settings.connected ? "● WhatsApp connected" : "○ WhatsApp not connected"}</div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <Avatar name={me.name} color={me.color} size={32} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{me.name}</div><div className="text-xs text-muted">{me.role}</div></div>
            <button title="Sign out" className="text-muted hover:text-foreground"
              onClick={() => logout()}>⎋</button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-xl transition-transform md:hidden", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="p-4"><Logo /></div>{nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <button className="rounded-md p-1 text-xl md:hidden" aria-label="Menu" onClick={() => setOpen(true)}>☰</button>
          <GlobalSearch />
          <Button onClick={() => setQuick(true)}>+ <span className="hidden sm:inline">Quick add</span></Button>
        </header>
        {syncError && <div role="alert" className="bg-red-500/10 px-4 py-2 text-center text-sm text-red-600">⚠ {syncError} {/limit|upgrade/i.test(syncError) && <Link href="/billing" className="font-semibold underline">View plans</Link>}</div>}
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        <div className="pointer-events-none fixed bottom-3 right-3 rounded-full bg-card px-3 py-1 text-xs text-muted shadow ring-1 ring-line">{pending ? "Saving…" : "✓ Saved"}</div>
      </div>
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
    </div>
  );
}

function GlobalSearch() {
  const { db } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const res = q.length < 2 ? [] : db.contacts.filter((c) => (c.name + c.phone + (c.company ?? "")).toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <div className="relative max-w-md flex-1">
      <Input placeholder="Search contacts, phone, company…" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setTimeout(() => setQ(""), 150)} />
      {res.length > 0 && (
        <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          {res.map((c) => (
            <button key={c.id} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-soft" onMouseDown={() => router.push(`/contacts/${c.id}`)}>
              <Avatar name={c.name} size={28} /><div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted">{c.phone}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
