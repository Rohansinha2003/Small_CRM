"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, Contact, Deal, Message, Task, Template, Broadcast, Stage, Settings, TeamMember } from "./types";
import { seed } from "./seed";
import { uid, fill } from "./utils";

export interface User {
  id: string; name: string; email: string; role: "Owner" | "Admin" | "Agent"; workspaceId: string; workspaceName: string;
  plan: "Free" | "Starter" | "Growth"; planExpiresAt: string | null; pilot: boolean; isPlatformAdmin: boolean;
}
export interface Limits { contacts: number; users: number; broadcasts: boolean }
const COLORS = ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#ec4899"];
type Status = "loading" | "anon" | "ready";
const COLS = ["contacts", "messages", "deals", "tasks", "templates", "broadcasts"] as const;
const WRITABLE = ["businessName", "whatsappNumber", "connected", "autoReply", "autoReplyText", "sample"] as const;
type Item = { id: string };

interface Ctx {
  db: DB; ready: boolean; status: Status; user: User | null;
  syncError: string | null; pending: boolean; limits: Limits; isAdmin: boolean; refresh: () => void;
  addContact: (c: Omit<Contact, "id" | "createdAt" | "lastContactAt">) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  importContacts: (rows: Pick<Contact, "name" | "phone">[]) => number;
  sendMessage: (contactId: string, text: string) => void;
  simulateIncoming: (contactId: string) => void;
  addDeal: (d: Omit<Deal, "id" | "createdAt">) => void;
  moveDeal: (id: string, stage: Stage) => void;
  deleteDeal: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  saveTemplate: (t: Omit<Template, "id"> & { id?: string }) => void;
  deleteTemplate: (id: string) => void;
  sendBroadcast: (b: { name: string; body: string; audience: string }, ids: string[]) => void;
  updateSettings: (s: Partial<Settings> & { sample?: boolean }) => void;
  loadSample: () => void;
  wipeAll: () => void;
  logout: () => Promise<void>;
}

const EMPTY: DB = {
  contacts: [], messages: [], deals: [], tasks: [], templates: [], broadcasts: [], team: [],
  settings: { businessName: "", whatsappNumber: "", connected: false, autoReply: false, autoReplyText: "", plan: "Free" },
};
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => { const c = useContext(StoreCtx); if (!c) throw new Error("no store"); return c; };

const REPLIES = ["Okay, thanks!", "Can you share more details?", "What's the final price?", "Sounds good 👍", "Will confirm by evening.", "Do you have this in other colours?"];

/** Compute what changed between the last server-confirmed snapshot and now (immutable updates keep unchanged refs). */
function diff(prev: DB, next: DB) {
  const upserts: Record<string, Item[]> = {}, deletes: Record<string, string[]> = {};
  let n = 0;
  for (const col of COLS) {
    const before = new Map((prev[col] as Item[]).map((x) => [x.id, x]));
    const after = new Set<string>();
    for (const it of next[col] as Item[]) {
      after.add(it.id);
      if (before.get(it.id) !== it) { (upserts[col] ??= []).push(it); n++; }
    }
    for (const id of before.keys()) if (!after.has(id)) { (deletes[col] ??= []).push(id); n++; }
  }
  const settings: Record<string, unknown> = {};
  for (const k of WRITABLE) {
    const a = (prev.settings as unknown as Record<string, unknown>)[k], b = (next.settings as unknown as Record<string, unknown>)[k];
    if (a !== b) { settings[k] = b; n++; }
  }
  return { n, body: { upserts, deletes, settings } };
}

type SyncBody = ReturnType<typeof diff>["body"];
/** Split a diff into requests the server accepts (≤500 changes, ≤1.5 MB each). Deletes and settings go first. */
function chunk(body: SyncBody): SyncBody[] {
  const MAX_ITEMS = 500, MAX_BYTES = 1_500_000;
  const out: SyncBody[] = [];
  let cur: SyncBody = { upserts: {}, deletes: {}, settings: body.settings }, items = 0, bytes = JSON.stringify(body.settings).length;
  const flush = () => { out.push(cur); cur = { upserts: {}, deletes: {}, settings: {} }; items = 0; bytes = 0; };
  for (const [col, ids] of Object.entries(body.deletes)) for (const id of ids) {
    if (items >= MAX_ITEMS) flush();
    (cur.deletes[col] ??= []).push(id); items++; bytes += id.length + 4;
  }
  for (const [col, list] of Object.entries(body.upserts)) for (const it of list) {
    const size = JSON.stringify(it).length + 4;
    if (items >= MAX_ITEMS || (items > 0 && bytes + size > MAX_BYTES)) flush();
    (cur.upserts[col] ??= []).push(it); items++; bytes += size;
  }
  if (items > 0 || Object.keys(cur.settings).length || !out.length) out.push(cur);
  return out;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const saved = useRef<DB>(EMPTY);          // last snapshot the server confirmed
  const latest = useRef<DB>(EMPTY);
  const inflight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = useRef<User | null>(null);
  const [limits, setLimits] = useState<Limits>({ contacts: 100, users: 1, broadcasts: false });
  const flushRef = useRef<(k?: boolean) => void>(() => {});
  const version = useRef<string>("");

  const load = useCallback(async (silent = false) => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (r.status === 401) { setStatus("anon"); return; }
      if (!r.ok) throw new Error("load failed");
      const j = await r.json();
      const u: User = j.user;
      const team: TeamMember[] = (j.team as { id: string; name: string; email: string; role: TeamMember["role"] }[])
        .map((t, i) => ({ ...t, color: COLORS[i % COLORS.length] }));
      const next: DB = { ...EMPTY, ...j.data, team, settings: { ...EMPTY.settings, ...j.settings } };
      me.current = u; saved.current = next; latest.current = next; version.current = j.version ?? "";
      setUser(u); setLimits(j.limits); setDb(next); setStatus("ready");
      if (!silent) setSyncError(null);
    } catch { if (!silent) { setSyncError("Couldn't reach the server. Check your connection and refresh."); setStatus("anon"); } }
  }, []);
  useEffect(() => { queueMicrotask(() => load()); }, [load]);
  // Live team sync: pull others' changes every 20s, but only when we have nothing unsaved.
  useEffect(() => {
    if (status !== "ready") return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible" || inflight.current || latest.current !== saved.current) return;
      fetch("/api/version", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j && j.v !== version.current && !inflight.current && latest.current === saved.current) load(true); })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [status, load]);

  const flush = useCallback(async (keepalive = false) => {
    if (inflight.current || status !== "ready") return;
    const snap = latest.current;
    const { n, body } = diff(saved.current, snap);
    if (!n) { setPending(false); return; }
    inflight.current = true;
    try {
      const parts = chunk(body);
      // keepalive requests are capped at 64 KB by browsers; only use it for a single small request.
      const ka = keepalive && parts.length === 1 && JSON.stringify(parts[0]).length < 60_000;
      for (const part of parts) {
        const r = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(part), keepalive: ka });
        if (r.status === 401) { setStatus("anon"); return; }
        if (!r.ok) {
          const msg = (await r.json().catch(() => ({}))).error ?? "Save failed";
          if (r.status >= 400 && r.status < 500 && r.status !== 429) {
            // Rejected for good (plan limit, permissions…): show why and roll back to the server's truth.
            setSyncError(msg); setTimeout(() => setSyncError(null), 9000); await load(true); return;
          }
          // Transient failure: the retry re-sends the full diff; upserts/deletes are idempotent, so batches that landed are harmless.
          throw new Error(msg);
        }
      }
      saved.current = snap; setSyncError(null);
    } catch (e) {
      setSyncError((e as Error).message + " — retrying…");
      timer.current = setTimeout(() => { timer.current = null; flushRef.current(); }, 5000);
    } finally {
      inflight.current = false;
      if (latest.current !== saved.current && !timer.current) timer.current = setTimeout(() => { timer.current = null; flushRef.current(); }, 300);
      else setPending(latest.current !== saved.current);
    }
  }, [status, load]);

  useEffect(() => { flushRef.current = flush; }, [flush]);
  useEffect(() => {
    latest.current = db;
    if (status !== "ready" || db === saved.current) return;
    queueMicrotask(() => setPending(true));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; flush(); }, 400);
  }, [db, status, flush]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === "hidden") flush(true); };
    const warn = (e: BeforeUnloadEvent) => { if (latest.current !== saved.current) e.preventDefault(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("beforeunload", warn);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("beforeunload", warn); };
  }, [flush]);

  const up = useCallback((fn: (d: DB) => DB) => setDb(fn), []);
  const now = () => new Date().toISOString();
  const owner = () => me.current?.id ?? "";

  const api = useMemo<Ctx>(() => ({
    db, ready: status === "ready", status, user, syncError, pending, limits, isAdmin: user?.role !== "Agent", refresh: () => load(true),
    addContact: (c) => { const id = uid(); up((d) => ({ ...d, contacts: [{ ...c, id, createdAt: now(), lastContactAt: now() }, ...d.contacts] })); return id; },
    updateContact: (id, patch) => up((d) => ({ ...d, contacts: d.contacts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    deleteContact: (id) => up((d) => ({
      ...d, contacts: d.contacts.filter((x) => x.id !== id), messages: d.messages.filter((x) => x.contactId !== id),
      deals: d.deals.filter((x) => x.contactId !== id), tasks: d.tasks.filter((x) => x.contactId !== id),
    })),
    importContacts: (rows) => {
      let added = 0;
      up((d) => {
        const have = new Set(d.contacts.map((c) => c.phone.replace(/\D/g, "")));
        const fresh: Contact[] = [];
        for (const r of rows) {
          const p = r.phone.replace(/\D/g, "");
          if (!r.name || p.length < 8 || have.has(p)) continue;
          have.add(p); added++;
          fresh.push({ id: uid(), name: r.name, phone: r.phone, tags: ["Imported"], status: "lead", source: "CSV import", notes: "", owner: owner(), createdAt: now(), lastContactAt: now() });
        }
        return { ...d, contacts: [...fresh, ...d.contacts] };
      });
      return added;
    },
    sendMessage: (contactId, text) => up((d) => ({
      ...d,
      messages: [...d.messages, { id: uid(), contactId, dir: "out", text, at: now(), status: "sent", by: owner() }],
      contacts: d.contacts.map((c) => (c.id === contactId ? { ...c, lastContactAt: now() } : c)),
    })),
    simulateIncoming: (contactId) => up((d) => ({
      ...d,
      messages: [...d.messages, { id: uid(), contactId, dir: "in", text: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: now() }],
      contacts: d.contacts.map((c) => (c.id === contactId ? { ...c, lastContactAt: now() } : c)),
    })),
    addDeal: (x) => up((d) => ({ ...d, deals: [{ ...x, id: uid(), createdAt: now() }, ...d.deals] })),
    moveDeal: (id, stage) => up((d) => ({
      ...d, deals: d.deals.map((x) => (x.id === id ? { ...x, stage, closedAt: stage === "won" || stage === "lost" ? now() : undefined } : x)),
      contacts: d.contacts.map((c) => {
        const deal = d.deals.find((x) => x.id === id);
        return deal && c.id === deal.contactId && stage === "won" ? { ...c, status: "customer" } : c;
      }),
    })),
    deleteDeal: (id) => up((d) => ({ ...d, deals: d.deals.filter((x) => x.id !== id) })),
    addTask: (t) => up((d) => ({ ...d, tasks: [{ ...t, id: uid(), done: false }, ...d.tasks] })),
    toggleTask: (id) => up((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
    deleteTask: (id) => up((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
    saveTemplate: (t) => up((d) => ({
      ...d,
      templates: t.id ? d.templates.map((x) => (x.id === t.id ? ({ ...x, ...t } as Template) : x)) : [...d.templates, { ...t, id: uid() } as Template],
    })),
    deleteTemplate: (id) => up((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) })),
    sendBroadcast: (b, ids) => up((d) => {
      const at = now();
      const msgs: Message[] = ids.map((cid) => {
        const c = d.contacts.find((x) => x.id === cid)!;
        return { id: uid(), contactId: cid, dir: "out", text: fill(b.body, c.name, d.settings.businessName), at, status: "sent", by: owner() };
      });
      const delivered = Math.round(ids.length * 0.97);
      const bc: Broadcast = { id: uid(), ...b, recipients: ids.length, delivered, read: Math.round(delivered * 0.8), replied: Math.round(delivered * 0.25), at };
      return { ...d, messages: [...d.messages, ...msgs], broadcasts: [bc, ...d.broadcasts] };
    }),
    updateSettings: (s) => up((d) => ({ ...d, settings: { ...d.settings, ...s } })),
    loadSample: () => up((d) => {
      const raw = seed(); const u = owner(); const P = (id: string) => "s_" + id;
      const map = (v?: string) => (v && /^t\d$/.test(v) ? u : v ? P(v) : v);
      const rec = <T extends { id: string }>(xs: T[], f: (x: T) => T) => xs.map((x) => f({ ...x, id: P(x.id) }));
      const merge = <T extends { id: string }>(old: T[], add: T[]) => { const ids = new Set(add.map((x) => x.id)); return [...old.filter((x) => !ids.has(x.id)), ...add]; };
      return {
        ...d,
        contacts: merge(d.contacts, rec(raw.contacts, (c) => ({ ...c, owner: u }))),
        messages: merge(d.messages, rec(raw.messages, (m) => ({ ...m, contactId: P(m.contactId), by: m.by ? u : undefined }))),
        deals: merge(d.deals, rec(raw.deals, (x) => ({ ...x, contactId: P(x.contactId) }))),
        tasks: merge(d.tasks, rec(raw.tasks, (t) => ({ ...t, contactId: t.contactId ? P(t.contactId) : undefined, assignee: map(t.assignee)! }))),
        templates: merge(d.templates, rec(raw.templates, (t) => t)),
        broadcasts: limits.broadcasts ? merge(d.broadcasts, rec(raw.broadcasts, (b) => b)) : d.broadcasts,
        settings: { ...d.settings, sample: true } as Settings,
      };
    }),
    wipeAll: () => up((d) => ({ ...d, contacts: [], messages: [], deals: [], tasks: [], broadcasts: [], settings: { ...d.settings, sample: false } as Settings })),
    logout: async () => {
      await flush();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      window.location.assign("/");
    },
  }), [db, status, user, syncError, pending, limits, up, flush, load]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}
