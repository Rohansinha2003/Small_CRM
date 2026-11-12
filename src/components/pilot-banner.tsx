"use client";
import { useEffect, useState } from "react";

export function PilotBanner() {
  const [p, setP] = useState<{ total: number; left: number } | null>(null);
  useEffect(() => { fetch("/api/pilot").then((r) => r.json()).then(setP).catch(() => {}); }, []);
  if (!p || p.total === 0) return null;
  return (
    <div className="mt-3 inline-block rounded-lg border border-brand/40 bg-brand-soft px-3 py-1.5 text-sm">
      {p.left > 0 ? <>🚀 <b>Pilot program:</b> {p.left} of {p.total} free full-access spots left</> : <>Pilot program is full — start free, upgrade any time</>}
    </div>
  );
}
