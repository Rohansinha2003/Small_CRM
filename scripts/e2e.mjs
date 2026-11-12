// End-to-end API test. Usage: BASE=http://localhost:3111 node scripts/e2e.mjs
const BASE = process.env.BASE ?? "http://localhost:3111";
const ORIGIN = new URL(BASE).origin;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

class Client {
  cookie = "";
  async req(path, { method = "GET", body, origin = ORIGIN, raw } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    const r = await fetch(BASE + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined), redirect: "manual" });
    const sc = r.headers.get("set-cookie");
    if (sc) { const c = sc.split(";")[0]; this.cookie = c.endsWith("=") ? "" : c; }
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, j, headers: r.headers };
  }
}
const uniq = Date.now().toString(36);
const A = new Client(), B = new Client(), anon = new Client();
const emailA = `a_${uniq}@example.com`, emailB = `b_${uniq}@example.com`, pw = "correct-horse-battery";

// --- unauthenticated
ok((await anon.req("/api/me")).status === 401, "GET /api/me without session -> 401");
ok((await anon.req("/api/sync", { method: "POST", body: {} })).status === 401, "POST /api/sync without session -> 401");
for (const p of ["/dashboard", "/inbox", "/contacts/x"]) {
  const r = await anon.req(p); ok(r.status === 307 && r.headers.get("location")?.endsWith("/login"), `page ${p} without cookie redirects to /login`);
}
ok((await anon.req("/")).status === 200 && (await anon.req("/signup")).status === 200 && (await anon.req("/login")).status === 200, "public pages render");

// --- pilot program: first signup takes the only pilot slot (server runs with PILOT_SLOTS=1)
{
  const P = new Client();
  ok((await anon.req("/api/pilot")).j.left === 1, "pilot slots: 1 left before first signup");
  await P.req("/api/auth/signup", { method: "POST", body: { name: "Pilot", business: "Pilot Co", email: `pilot_${uniq}@example.com`, password: pw } });
  const m = await P.req("/api/me");
  ok(m.j.user.pilot === true && m.j.user.plan === "Growth", "first workspace is a pilot with Growth access");
  ok((await anon.req("/api/pilot")).j.left === 0, "pilot slots: 0 left after first signup");
}

// --- signup validation
ok((await A.req("/api/auth/signup", { method: "POST", body: { name: "A", business: "Biz", email: emailA, password: pw }, origin: null })).status === 403, "signup without Origin -> 403 (CSRF)");
ok((await A.req("/api/auth/signup", { method: "POST", body: { name: "A", business: "Biz", email: emailA, password: pw }, origin: "https://evil.example" })).status === 403, "signup from foreign Origin -> 403");
ok((await A.req("/api/auth/signup", { method: "POST", body: { name: "A", business: "Biz", email: "nope", password: pw } })).status === 400, "invalid email -> 400");
ok((await A.req("/api/auth/signup", { method: "POST", body: { name: "A", business: "Biz", email: emailA, password: "short" } })).status === 400, "short password -> 400");
ok((await A.req("/api/auth/signup", { method: "POST", body: { name: "", business: "", email: emailA, password: pw } })).status === 400, "missing name/business -> 400");
ok((await A.req("/api/auth/signup", { method: "POST", raw: "{bad json" })).status === 400, "malformed JSON -> 400");

// --- signup
let r = await A.req("/api/auth/signup", { method: "POST", body: { name: "Alice", business: "Alice Shop", email: emailA, password: pw } });
ok(r.status === 201 && A.cookie.startsWith("chatdesk_session="), "signup A -> 201 + session cookie");
ok(/HttpOnly/i.test(r.headers.get("set-cookie") ?? "") && /SameSite=lax/i.test(r.headers.get("set-cookie") ?? ""), "cookie is HttpOnly + SameSite=Lax");
ok((await anon.req("/api/auth/signup", { method: "POST", body: { name: "X", business: "Y", email: emailA.toUpperCase(), password: pw } })).status === 409, "duplicate email (case-insensitive) -> 409");

r = await A.req("/api/me");
ok(r.status === 200 && r.j.user.email === emailA && r.j.user.workspaceName === "Alice Shop", "GET /api/me returns user + workspace");
ok(r.j.data.templates.length === 4 && r.j.data.contacts.length === 0, "new workspace has 4 default templates, no contacts");
ok(r.j.settings.plan === "Free", "new workspace is on Free plan");

// --- data round trip
const c1 = { id: "c_test1", name: "Rahul", phone: "+919800000001", tags: ["VIP"], status: "lead", source: "WhatsApp", notes: "", owner: r.j.user.id, createdAt: new Date().toISOString(), lastContactAt: new Date().toISOString() };
const m1 = { id: "m_test1", contactId: "c_test1", dir: "out", text: "Hello", at: new Date().toISOString(), status: "sent" };
r = await A.req("/api/sync", { method: "POST", body: { upserts: { contacts: [c1], messages: [m1] }, settings: { whatsappNumber: "+919811111111", autoReply: true } } });
ok(r.status === 200, "sync upsert contact+message+settings -> 200");
r = await A.req("/api/me");
ok(r.j.data.contacts.length === 1 && r.j.data.contacts[0].name === "Rahul" && r.j.data.messages.length === 1, "data persisted and reloaded");
ok(r.j.settings.whatsappNumber === "+919811111111" && r.j.settings.autoReply === true && r.j.settings.businessName === "Alice Shop", "settings merged, not replaced");
await A.req("/api/sync", { method: "POST", body: { upserts: { contacts: [{ ...c1, name: "Rahul V" }] } } });
r = await A.req("/api/me");
ok(r.j.data.contacts.length === 1 && r.j.data.contacts[0].name === "Rahul V", "upsert updates in place (no duplicate)");

// --- hostile input
ok((await A.req("/api/sync", { method: "POST", body: { upserts: { users: [{ id: "x" }] } } })).status === 400, "unknown collection (users) rejected");
ok((await A.req("/api/sync", { method: "POST", body: { upserts: { contacts: [{ name: "no id" }] } } })).status === 400, "record without id rejected");
ok((await A.req("/api/sync", { method: "POST", body: { upserts: { contacts: [{ id: "big", blob: "x".repeat(30000) }] } } })).status === 413, "oversized record -> 413");
ok((await A.req("/api/sync", { method: "POST", raw: JSON.stringify({ upserts: {} }), origin: "https://evil.example" })).status === 403, "sync from foreign Origin -> 403");
await A.req("/api/sync", { method: "POST", body: { settings: { plan: "Growth", evil: 1 } } });
r = await A.req("/api/me");
ok(r.j.settings.plan === "Free" && !("evil" in r.j.settings), "client cannot self-upgrade plan or inject settings keys");
ok((await A.req("/api/sync", { method: "POST", body: { upserts: { contacts: [{ id: "'; DROP TABLE records;--", name: "sqli" }] } } })).status === 200 && (await A.req("/api/me")).status === 200, "SQL-injection-shaped id is stored inertly");

// --- tenant isolation
r = await B.req("/api/auth/signup", { method: "POST", body: { name: "Bob", business: "Bob Co", email: emailB, password: pw } });
ok(r.status === 201, "signup B");
r = await B.req("/api/me");
ok(r.j.data.contacts.length === 0 && r.j.data.messages.length === 0, "B cannot see A's data");
await B.req("/api/sync", { method: "POST", body: { deletes: { contacts: ["c_test1"] }, upserts: { contacts: [{ ...c1, name: "HIJACK" }] } } });
r = await A.req("/api/me");
ok(r.j.data.contacts.find((c) => c.id === "c_test1")?.name === "Rahul V", "B's delete/overwrite of same id does not touch A's record");
r = await B.req("/api/me");
ok(r.j.data.contacts.length === 1 && r.j.data.contacts[0].name === "HIJACK", "B's write landed only in B's workspace");

// --- delete
await A.req("/api/sync", { method: "POST", body: { deletes: { contacts: ["c_test1"], messages: ["m_test1"] } } });
r = await A.req("/api/me");
ok(!r.j.data.contacts.some((c) => c.id === "c_test1") && r.j.data.messages.length === 0, "delete removes records");

// --- logout / session
const oldCookie = A.cookie;
ok((await A.req("/api/auth/logout", { method: "POST" })).status === 200, "logout -> 200");
ok((await A.req("/api/me")).status === 401, "after logout /api/me -> 401");
const stale = new Client(); stale.cookie = oldCookie;
ok((await stale.req("/api/me")).status === 401, "old session token is revoked server-side");

// --- login
ok((await A.req("/api/auth/login", { method: "POST", body: { email: emailA, password: "wrong-password" } })).status === 401, "wrong password -> 401");
ok((await A.req("/api/auth/login", { method: "POST", body: { email: `nobody_${uniq}@example.com`, password: pw } })).status === 401, "unknown email -> 401 (same message)");
r = await A.req("/api/auth/login", { method: "POST", body: { email: emailA.toUpperCase(), password: pw } });
ok(r.status === 200 && (await A.req("/api/me")).j?.user?.email === emailA, "login (case-insensitive email) -> session works");
ok((await A.req("/api/me")).j.data.templates.length === 4, "data survives logout/login");

// --- brute force
const V = new Client(); let last = 0;
for (let i = 0; i < 12; i++) last = (await V.req("/api/auth/login", { method: "POST", body: { email: emailB, password: "bad" + i } })).status;
ok(last === 429, "brute-force on one account is rate limited (429)");
ok((await V.req("/api/auth/login", { method: "POST", body: { email: emailB, password: pw } })).status === 429, "…even with the correct password while locked");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
