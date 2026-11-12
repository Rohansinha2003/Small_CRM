// SaaS layer tests: plan limits, roles, invites, resets, Razorpay fulfilment, platform admin.
// Needs: node scripts/fake-razorpay.mjs (port 4010), and the app started with
//   PILOT_SLOTS=0 ADMIN_EMAILS=platform-admin@chatdesk.test RAZORPAY_API_BASE=http://localhost:4010
//   RAZORPAY_KEY_ID=rzp_test_x RAZORPAY_KEY_SECRET=test_secret RAZORPAY_WEBHOOK_SECRET=whsec_test
import { createHmac } from "node:crypto";
const BASE = process.env.BASE ?? "http://localhost:3111";
const ORIGIN = new URL(BASE).origin;
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };
const sig = (secret, data) => createHmac("sha256", secret).update(data).digest("hex");

class Client {
  cookie = "";
  async req(path, { method = "GET", body, raw, headers: extra = {}, origin = ORIGIN } = {}) {
    const headers = { "Content-Type": "application/json", ...extra };
    if (origin) headers.Origin = origin;
    if (this.cookie) headers.Cookie = this.cookie;
    const r = await fetch(BASE + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined), redirect: "manual" });
    const sc = r.headers.get("set-cookie");
    if (sc) { const c = sc.split(";")[0]; this.cookie = c.endsWith("=") ? "" : c; }
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, j };
  }
  post(path, body, o) { return this.req(path, { method: "POST", body, ...o }); }
}
const u = Date.now().toString(36), pw = "correct-horse-battery";
const signup = async (c, name, email) => (await c.post("/api/auth/signup", { name, business: name + " Co", email, password: pw }));
const contact = (i, owner = "x") => ({ id: `c${i}`, name: `Contact ${i}`, phone: `+9198000${String(i).padStart(5, "0")}`, tags: [], status: "lead", source: "t", notes: "", owner, createdAt: new Date().toISOString(), lastContactAt: new Date().toISOString() });

const owner = new Client(), admin = new Client(), agent = new Client(), other = new Client();
const ownerEmail = `own_${u}@example.com`, agentEmail = `agt_${u}@example.com`;

// ---------- Free plan limits
ok((await signup(owner, "Owner", ownerEmail)).status === 201, "owner signs up (Free, no pilot slots)");
let me = (await owner.req("/api/me")).j;
ok(me.user.plan === "Free" && me.user.pilot === false && me.limits.contacts === 100 && me.limits.users === 1, "Free plan: 100 contacts, 1 user");
ok((await owner.post("/api/sync", { upserts: { contacts: Array.from({ length: 100 }, (_, i) => contact(i)) } })).status === 200, "100 contacts allowed on Free");
let r = await owner.post("/api/sync", { upserts: { contacts: [contact(1000)] } });
ok(r.status === 402 && /limit/i.test(r.j.error), "101st contact rejected with 402 + upgrade message");
ok((await owner.req("/api/me")).j.data.contacts.length === 100, "rejected write left data unchanged (transaction rolled back)");
ok((await owner.post("/api/sync", { upserts: { contacts: [{ ...contact(5), name: "Edited" }] } })).status === 200, "editing an existing contact at the limit still works");
r = await owner.post("/api/sync", { upserts: { broadcasts: [{ id: "b1", name: "x", recipients: 1 }] } });
ok(r.status === 402 && /Starter/.test(r.j.error), "broadcasts blocked on Free plan");
r = await owner.post("/api/team", { action: "invite", role: "Agent" });
ok(r.status === 402, "inviting a teammate blocked on Free (1 seat)");

// ---------- Razorpay billing
ok((await other.req("/api/billing/order")).status === 401, "billing endpoints need a session");
r = await owner.post("/api/billing/order", { plan: "Free", period: "monthly" });
ok(r.status === 400, "cannot 'buy' the Free plan");
r = await owner.post("/api/billing/order", { plan: "Starter", period: "weekly" });
ok(r.status === 400, "invalid period rejected");
r = await owner.post("/api/billing/order", { plan: "Starter", period: "monthly", amount: 1 });
ok(r.status === 200 && r.j.amount === 49900 && r.j.orderId, "order created; amount decided by server (₹499 → 49900 paise), client 'amount' ignored");
const order1 = r.j.orderId;
r = await owner.post("/api/billing/verify", { orderId: order1, paymentId: `pay_1_${u}`, signature: "deadbeef" });
ok(r.status === 400, "forged payment signature rejected");
ok((await owner.req("/api/me")).j.user.plan === "Free", "forged payment did not upgrade the plan");
ok((await other.post("/api/billing/verify", { orderId: order1, paymentId: `pay_1_${u}`, signature: sig("test_secret", `${order1}|pay_1_${u}`) })).status === 401, "verify without a session -> 401");
const intruder = new Client(); await signup(intruder, "Intruder", `int_${u}@example.com`);
ok((await intruder.post("/api/billing/verify", { orderId: order1, paymentId: `pay_1_${u}`, signature: sig("test_secret", `${order1}|pay_1_${u}`) })).status === 404, "another workspace cannot claim my order (404)");
r = await owner.post("/api/billing/verify", { orderId: order1, paymentId: `pay_1_${u}`, signature: sig("test_secret", `${order1}|pay_1_${u}`) });
ok(r.status === 200, "valid signature accepted");
me = (await owner.req("/api/me")).j;
ok(me.user.plan === "Starter" && me.limits.users === 3 && me.limits.contacts === 2000, "plan upgraded to Starter with new limits");
const exp1 = new Date(me.user.planExpiresAt).getTime();
ok(exp1 > Date.now() + 27 * 864e5 && exp1 < Date.now() + 32 * 864e5, "expiry is ~1 month out");
await owner.post("/api/billing/verify", { orderId: order1, paymentId: `pay_1_${u}`, signature: sig("test_secret", `${order1}|pay_1_${u}`) });
ok(new Date((await owner.req("/api/me")).j.user.planExpiresAt).getTime() === exp1, "replaying the same payment does not extend the plan twice (idempotent)");
ok((await owner.post("/api/sync", { upserts: { contacts: [contact(1001)], broadcasts: [{ id: "b1", name: "Offer", recipients: 3 }] } })).status === 200, "after upgrade: >100 contacts and broadcasts allowed");

// webhook
const order2 = (await owner.post("/api/billing/order", { plan: "Starter", period: "yearly" })).j;
ok(order2.amount === 499000, "yearly price = 10 months (₹4,990)");
const evt = (o, id, amount) => JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id, order_id: o, amount, status: "captured" } } } });
let body = evt(order2.orderId, `pay_2_${u}`, 499000);
ok((await other.req("/api/billing/webhook", { method: "POST", raw: body, origin: null, headers: { "x-razorpay-signature": "bad" } })).status === 400, "webhook with bad signature rejected");
ok((await other.req("/api/billing/webhook", { method: "POST", raw: evt(order2.orderId, `pay_2_${u}`, 100), origin: null, headers: { "x-razorpay-signature": sig("whsec_test", evt(order2.orderId, `pay_2_${u}`, 100)) } })).status === 400, "webhook with wrong amount rejected");
ok((await other.req("/api/billing/webhook", { method: "POST", raw: body, origin: null, headers: { "x-razorpay-signature": sig("whsec_test", body) } })).status === 200, "valid webhook accepted (no cookie, HMAC only)");
const exp2 = new Date((await owner.req("/api/me")).j.user.planExpiresAt).getTime();
ok(exp2 > exp1 + 360 * 864e5, "yearly renewal stacked on remaining time (~13 months out)");
await other.req("/api/billing/webhook", { method: "POST", raw: body, origin: null, headers: { "x-razorpay-signature": sig("whsec_test", body) } });
ok(new Date((await owner.req("/api/me")).j.user.planExpiresAt).getTime() === exp2, "webhook retry is idempotent");
const hist = (await owner.req("/api/billing/order")).j;
ok(hist.payments.filter((p) => p.status === "paid").length === 2, "payment history shows 2 paid orders");

// ---------- Team: invites, roles
r = await owner.post("/api/team", { action: "invite", role: "Agent" });
ok(r.status === 200 && r.j.link.startsWith("/invite/"), "owner creates an invite link");
const inviteTok = r.j.link.split("/").pop();
ok((await agent.post("/api/auth/signup", { name: "Agent Smith", email: "bad", password: pw, invite: inviteTok })).status === 400, "invite signup still validates input");
ok((await agent.post("/api/auth/signup", { name: "Agent", email: agentEmail, password: pw, invite: "not-a-real-token" })).status === 400, "bogus invite token rejected");
ok((await agent.post("/api/auth/signup", { name: "Agent Smith", email: agentEmail, password: pw, invite: inviteTok })).status === 201, "agent joins via invite link");
ok((await new Client().post("/api/auth/signup", { name: "Reuse", email: `reuse_${u}@example.com`, password: pw, invite: inviteTok })).status === 400, "invite link is single-use");
let am = (await agent.req("/api/me")).j;
ok(am.user.role === "Agent" && am.user.workspaceName === "Owner Co" && am.data.contacts.length === 101, "agent sees the owner's workspace data");
ok(am.team.length === 2, "team list includes both members");
ok((await agent.post("/api/sync", { upserts: { contacts: [{ ...contact(7), name: "Agent edit" }] } })).status === 200, "agent can edit contacts");
ok((await agent.post("/api/sync", { deletes: { contacts: ["c7"] } })).status === 403, "agent cannot delete contacts");
ok((await agent.post("/api/sync", { settings: { businessName: "Hacked" } })).status === 403, "agent cannot change settings");
ok((await agent.post("/api/team", { action: "invite", role: "Admin" })).status === 403, "agent cannot invite");
ok((await agent.req("/api/audit")).status === 403 && (await agent.req("/api/export")).status === 403, "agent cannot read audit log or export data");
ok((await owner.req("/api/export")).status === 200, "owner can export data");
const au = (await owner.req("/api/audit")).j.entries.map((e) => e.action);
ok(au.includes("Payment received") && au.includes("Joined the team") && au.includes("Created invite link"), "audit log records payments, joins and invites");
ok((await owner.post("/api/team", { action: "invite", role: "Agent" })).status === 200, "second seat invite OK (Starter has 3)");
// seats: owner + agent + 1 pending = 3 -> next invite blocked
ok((await owner.post("/api/team", { action: "invite", role: "Agent" })).status === 402, "seat limit counts pending invites");

// ---------- Password reset by admin link
const agentId = am.user.id;
r = await agent.post("/api/team", { action: "reset", userId: agentId });
ok(r.status === 403, "agent cannot generate reset links");
r = await owner.post("/api/team", { action: "reset", userId: agentId });
ok(r.status === 200 && r.j.link.startsWith("/reset/"), "owner generates a reset link for the agent");
const resetTok = r.j.link.split("/").pop();
ok((await other.post("/api/auth/reset", { token: resetTok, password: "short" })).status === 400, "reset enforces password length");
ok((await other.post("/api/auth/reset", { token: "nope", password: "brand-new-password" })).status === 400, "bogus reset token rejected");
ok((await other.post("/api/auth/reset", { token: resetTok, password: "brand-new-password" })).status === 200, "reset link sets a new password");
ok((await agent.req("/api/me")).status === 401, "reset signed the agent out everywhere");
ok((await other.post("/api/auth/reset", { token: resetTok, password: "another-password-1" })).status === 400, "reset link is single-use");
ok((await agent.post("/api/auth/login", { email: agentEmail, password: pw })).status === 401, "old password no longer works");
ok((await agent.post("/api/auth/login", { email: agentEmail, password: "brand-new-password" })).status === 200, "new password works");

// ---------- Roles management
am = (await agent.req("/api/me")).j;
ok((await owner.post("/api/team", { action: "role", userId: agentId, role: "Admin" })).status === 200, "owner promotes agent to admin");
ok((await agent.post("/api/sync", { deletes: { contacts: ["c7"] } })).status === 200, "admin can now delete contacts");
ok((await agent.post("/api/team", { action: "remove", userId: me.user.id })).status === 400, "cannot remove the owner");
ok((await owner.post("/api/team", { action: "remove", userId: agentId })).status === 200, "owner removes the member");
ok((await agent.req("/api/me")).status === 401, "removed member is locked out immediately");

// ---------- Platform admin
ok((await owner.req("/api/admin")).status === 403, "workspace owner cannot access platform admin");
ok((await signup(admin, "Platform Admin", "platform-admin@chatdesk.test")).status === 201 || (await admin.post("/api/auth/login", { email: "platform-admin@chatdesk.test", password: pw })).status === 200, "platform admin account ready");
r = await admin.req("/api/admin");
ok(r.status === 200 && r.j.workspaces.length >= 2 && r.j.stats.revenue >= 5489, "platform admin sees all workspaces + revenue stats");
const ws = r.j.workspaces.find((w) => w.name === "Owner Co");
ok(ws && ws.effective === "Starter" && ws.contacts === 100, "admin sees plan and usage per workspace");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "grant", plan: "Growth", months: 3 })).status === 200 && (await owner.req("/api/me")).j.user.plan === "Growth", "admin can grant a plan");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "suspend" })).status === 200, "admin suspends workspace");
ok((await owner.req("/api/me")).status === 401, "suspended workspace is signed out");
ok((await owner.post("/api/auth/login", { email: ownerEmail, password: pw })).status === 403, "suspended workspace cannot sign in (403)");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "unsuspend" })).status === 200 && (await owner.post("/api/auth/login", { email: ownerEmail, password: pw })).status === 200, "reinstated workspace can sign in again");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "delete", confirm: "wrong" })).status === 400, "delete requires typing the workspace name");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "revoke" })).status === 200 && (await owner.req("/api/me")).j.user.plan === "Free", "revoke returns workspace to Free");
ok((await admin.post("/api/admin", { workspaceId: ws.id, action: "pilot" })).status === 200 && (await owner.req("/api/me")).j.user.pilot === true, "admin can mark a workspace as pilot");
ok((await other.post("/api/admin", { workspaceId: ws.id, action: "revoke" })).status === 403, "anonymous admin POST -> 403");
ok((await intruder.post("/api/admin", { workspaceId: ws.id, action: "suspend" })).status === 403, "ordinary user cannot call admin actions");

// ---------- Self-serve workspace deletion
{
  const D = new Client(); await signup(D, "Doomed", `doom_${u}@example.com`);
  await D.post("/api/sync", { upserts: { contacts: [contact(1)] } });
  ok((await D.post("/api/team", { action: "delete_workspace", confirm: "wrong" })).status === 400, "workspace deletion requires typing the exact name");
  ok((await D.post("/api/team", { action: "delete_workspace", confirm: "Doomed Co" })).status === 200, "owner deletes own workspace");
  ok((await D.req("/api/me")).status === 401, "deleted workspace's session is dead");
  ok((await D.post("/api/auth/login", { email: `doom_${u}@example.com`, password: pw })).status === 401, "deleted account cannot sign in");
  const again = new Client(); ok((await signup(again, "Reborn", `doom_${u}@example.com`)).status === 201, "email can be reused after deletion");
}
// ---------- Ops endpoints
{
  const h = await fetch(BASE + "/api/health"); const hj = await h.json();
  ok(h.status === 200 && hj.ok && hj.checks.database, "GET /api/health reports database up");
  ok((await fetch(BASE + "/api/cron/cleanup")).status === 401, "cron endpoint rejects unauthenticated calls");
  const c = await fetch(BASE + "/api/cron/cleanup", { headers: { Authorization: "Bearer cron_test_secret" } });
  ok(c.status === 200, "cron endpoint accepts the CRON_SECRET");
  for (const p of ["/terms", "/privacy", "/refund", "/contact", "/robots.txt", "/sitemap.xml"]) ok((await fetch(BASE + p)).status === 200, `public page ${p} renders`);
  ok((await fetch(BASE + "/no-such-page")).status === 404, "unknown route -> 404 page");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
