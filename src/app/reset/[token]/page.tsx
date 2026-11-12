"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Input, Logo } from "@/components/ui";

export default function Reset() {
  const { token } = useParams<{ token: string }>();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setDone(true); else setErr(j.error ?? "Something went wrong.");
  }
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center"><Logo size={34} /></Link>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          {done ? (<><p className="my-4 text-sm text-muted">Your password was updated and all other sessions were signed out.</p><Link href="/login"><Button className="w-full">Sign in</Button></Link></>) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <Field label="New password (min 8 characters)"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required autoFocus autoComplete="new-password" /></Field>
              {err && <div role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{err}</div>}
              <Button type="submit" className="w-full">Update password</Button>
            </form>)}
        </Card>
      </div>
    </main>
  );
}
