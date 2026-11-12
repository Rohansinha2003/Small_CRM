import Link from "next/link";
import { PilotBanner } from "@/components/pilot-banner";
import { Logo } from "@/components/ui";
import { LegalFooter } from "@/components/legal";

const features = [
  ["💬", "WhatsApp-first inbox", "Every customer chat in one shared inbox. Reply from your team, from any device, with quick replies."],
  ["👥", "Contacts that fill themselves", "New chat? Contact created. Tag, note and assign owners in a tap. Import your old list from CSV."],
  ["▤", "Visual sales pipeline", "Drag deals from enquiry to won. See exactly how much money is on the table this month."],
  ["⏰", "Follow-up reminders", "Never forget the customer who said 'I'll let you know'. One-tap nudge opens WhatsApp ready to send."],
  ["☄", "Broadcasts that feel personal", "Send offers to a segment — each message is personalised and lands as a normal 1-to-1 chat."],
  ["📊", "Reports in plain language", "Revenue, win rate, best lead sources and team activity — no analyst required."],
];
const plans = [
  { name: "Free", price: "₹0", note: "forever", items: ["100 contacts", "1 user", "Shared inbox", "Quick replies"] },
  { name: "Starter", price: "₹499", note: "per month", hot: true, items: ["2,000 contacts", "3 users", "Broadcasts", "CSV import/export", "Pay by UPI, card or netbanking"] },
  { name: "Growth", price: "₹1,499", note: "per month", items: ["50,000 contacts", "10 users", "Broadcasts", "Roles, audit log & data export", "Priority support"] },
];
const faqs = [
  ["Do I need the WhatsApp Business API?", "No. You can start by connecting your existing WhatsApp Business app with a QR code. Upgrade to the official API when you grow."],
  ["How long does setup take?", "About two minutes: sign in with your number, scan a QR, and your chats and contacts appear."],
  ["Is my customers' data safe?", "Data is encrypted in transit and at rest, and you can export or delete everything any time."],
  ["Can my team use it together?", "Yes. Assign chats and deals to teammates and see who did what, from the same shared inbox."],
];

export default function Landing() {
  return (
    <div className="bg-background">
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo size={32} />
          <nav className="hidden gap-6 text-sm text-muted md:flex"><a href="#why" className="hover:text-foreground">Why ChatDesk</a><a href="#features" className="hover:text-foreground">Features</a><a href="#pricing" className="hover:text-foreground">Pricing</a><a href="#faq" className="hover:text-foreground">FAQ</a></nav>
          <div className="flex gap-2"><Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-soft">Sign in</Link><Link href="/signup" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Get started free</Link></div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">Built for businesses with 1–10 people</span>
          <PilotBanner />
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-6xl">The CRM that lives in <span className="text-brand">WhatsApp</span>.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">Your customers already talk to you on WhatsApp. ChatDesk turns those chats into organised contacts, follow-ups and sales — without the setup, the training or the enterprise price tag.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-dark">Start free — no card</Link>
            <a href="#features" className="rounded-xl border border-line bg-card px-6 py-3 font-semibold hover:bg-brand-soft">See how it works</a>
          </div>
          <p className="mt-4 text-sm text-muted">✓ Set up in 2 minutes &nbsp; ✓ No training needed &nbsp; ✓ From ₹0</p>
        </div>
        <PhoneMock />
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-center sm:grid-cols-3">
          {[["2 min", "average setup time"], ["90%", "of leads in small teams arrive on WhatsApp"], ["₹499", "per month for the whole team"]].map(([n, l]) => (
            <div key={n}><div className="text-4xl font-bold text-brand">{n}</div><div className="mt-1 text-sm text-muted">{l}</div></div>
          ))}
        </div>
      </section>

      <section id="why" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Traditional CRMs weren&apos;t built for you</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">Big CRMs assume a sales department. A small team just needs to remember who to message next.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <div className="mb-4 text-sm font-semibold text-red-500">Typical enterprise CRM</div>
            <ul className="space-y-3 text-sm">{["Weeks of setup and consultants", "₹2,000+ per user per month", "Dozens of fields and workflows you never use", "Needs a dedicated admin", "WhatsApp is a paid add-on — if at all"].map((t) => <li key={t} className="flex gap-2"><span className="text-red-500">✕</span>{t}</li>)}</ul>
          </div>
          <div className="rounded-2xl border-2 border-brand bg-brand-soft p-6">
            <div className="mb-4 text-sm font-semibold text-brand">ChatDesk</div>
            <ul className="space-y-3 text-sm">{["Sign in with your number, start in 2 minutes", "Flat ₹499/month for the whole team", "Only what you need: contacts, chats, deals, reminders", "If you can use WhatsApp, you can use ChatDesk", "WhatsApp is the product, not an add-on"].map((t) => <li key={t} className="flex gap-2"><span className="text-brand">✓</span>{t}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="features" className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Everything you need. Nothing you don&apos;t.</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([i, t, d]) => (
              <div key={t} className="rounded-2xl border border-line bg-background p-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-lg">{i}</div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Up and running in 3 steps</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[["1", "Connect WhatsApp", "Scan a QR code. Your existing chats and contacts sync in."], ["2", "Organise in a tap", "Tag contacts, add deals, set follow-ups right from the chat."], ["3", "Grow your sales", "Broadcast offers, track the pipeline, see what's working."]].map(([n, t, d]) => (
            <div key={n} className="text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand text-lg font-bold text-white">{n}</div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-card py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Simple pricing. Whole team included.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`rounded-2xl border p-6 ${p.hot ? "border-2 border-brand shadow-xl shadow-brand/10" : "border-line"} bg-background`}>
                {p.hot && <div className="mb-2 text-xs font-semibold uppercase text-brand">Most popular</div>}
                <div className="font-semibold">{p.name}</div>
                <div className="mt-2"><span className="text-4xl font-bold">{p.price}</span> <span className="text-sm text-muted">{p.note}</span></div>
                <ul className="my-5 space-y-2 text-sm">{p.items.map((i) => <li key={i}>✓ {i}</li>)}</ul>
                <Link href="/signup" className={`block rounded-lg py-2.5 text-center text-sm font-semibold ${p.hot ? "bg-brand text-white hover:bg-brand-dark" : "border border-line hover:bg-brand-soft"}`}>Get started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Questions, answered</h2>
        <div className="space-y-3">{faqs.map(([q, a]) => (
          <details key={q} className="group rounded-xl border border-line bg-card p-4"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-2 text-sm text-muted">{a}</p></details>
        ))}</div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-brand p-10 text-center text-white">
          <h2 className="text-3xl font-bold">Stop losing customers in the chat scroll.</h2>
          <p className="mx-auto mt-2 max-w-xl opacity-90">Create a free workspace in under a minute — no card needed. Load sample data to explore.</p>
          <Link href="/signup" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-dark hover:opacity-90">Create free account →</Link>
        </div>
      </section>
      <LegalFooter />
    </div>
  );
}

function PhoneMock() {
  const msgs: [string, string][] = [["in", "Hi, is the oak table back in stock?"], ["out", "Yes! 4 pieces just arrived. Want me to hold one?"], ["in", "Please hold. Will pay by evening 🙏"]];
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-[2rem] border-8 border-neutral-800 bg-neutral-800 shadow-2xl">
        <div className="overflow-hidden rounded-[1.3rem] bg-card">
          <div className="flex items-center gap-2 bg-brand px-4 py-3 text-white"><div className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-sm font-semibold">RV</div><div><div className="text-sm font-semibold">Rahul Verma</div><div className="text-[10px] opacity-80">online</div></div></div>
          <div className="chat-bg space-y-2 p-3">
            {msgs.map(([d, t], i) => <div key={i} className={`flex ${d === "out" ? "justify-end" : ""}`}><div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${d === "out" ? "bubble-out" : "bg-card"}`}>{t}</div></div>)}
          </div>
          <div className="space-y-2 border-t border-line p-3 text-xs">
            <div className="font-semibold text-brand">ChatDesk sidebar</div>
            <div className="flex flex-wrap gap-1"><span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">VIP</span><span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand">Interior</span></div>
            <div className="flex justify-between rounded-lg bg-brand-soft p-2"><span>💼 Oak console table</span><b>₹28,000</b></div>
            <div className="rounded-lg bg-amber-500/15 p-2">⏰ Follow-up today: send UPI details</div>
          </div>
        </div>
      </div>
    </div>
  );
}
