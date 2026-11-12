import Link from "next/link";
import { Logo } from "@/components/ui";
import { COMPANY } from "@/lib/company";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-card"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3"><Link href="/"><Logo /></Link><Link href="/login" className="text-sm text-brand">Sign in</Link></div></header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Last updated {COMPANY.updated}</p>
        <div className="space-y-4 text-[15px] leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">{children}</div>
      </main>
      <LegalFooter />
    </div>
  );
}
export function LegalFooter() {
  return (
    <footer className="border-t border-line py-6 text-center text-xs text-muted">
      <div className="flex flex-wrap justify-center gap-4"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refund">Refunds &amp; cancellation</Link><Link href="/contact">Contact</Link></div>
      <div className="mt-2">© 2026 {COMPANY.name}</div>
    </footer>
  );
}
