"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Field, Input, Logo } from "@/components/ui";

export function AuthForm({ mode, invite }: { mode: "login" | "signup"; invite?: string }) {
  const [f, setF] = useState({ name: "", business: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, invite }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? "Something went wrong. Please try again."); setBusy(false); return; }
      window.location.assign("/dashboard"); // full load so the store boots with the new session
    } catch { setErr("Can't reach the server. Check your connection."); setBusy(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center"><Logo size={34} /></Link>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">{invite ? "Join your team" : signup ? "Create your workspace" : "Welcome back"}</h1>
          <p className="mb-4 text-sm text-muted">{invite ? "You've been invited to a ChatDesk workspace. Create your login to join." : signup ? "Free forever for your first 100 contacts. No card needed." : "Sign in to your ChatDesk workspace."}</p>
          <form onSubmit={submit} className="space-y-3">
            {signup && <>
              <Field label="Your name"><Input value={f.name} onChange={set("name")} autoComplete="name" required autoFocus /></Field>
              {!invite && <Field label="Business name"><Input value={f.business} onChange={set("business")} autoComplete="organization" required /></Field>}
            </>}
            <Field label="Email"><Input type="email" value={f.email} onChange={set("email")} autoComplete="email" required autoFocus={!signup} /></Field>
            <Field label={signup ? "Password (min 8 characters)" : "Password"}>
              <Input type="password" value={f.password} onChange={set("password")} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} required />
            </Field>
            {err && <div role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err}</div>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            {signup ? <>Already have an account? <Link href="/login" className="font-medium text-brand">Sign in</Link></> : <>New to ChatDesk? <Link href="/signup" className="font-medium text-brand">Create an account</Link></>}
            {!signup && <span className="mt-2 block text-xs">Forgot your password? Ask your workspace owner or admin for a reset link (Team → Reset password).</span>}
          </p>
        </Card>
        {signup && <p className="mt-3 text-center text-xs text-muted">By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>}
      </div>
    </main>
  );
}
