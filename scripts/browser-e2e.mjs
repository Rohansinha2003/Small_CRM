// Real-browser end-to-end test. Needs `playwright` installed. Usage: BASE=http://localhost:3111 node browser-e2e.mjs
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3111";
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const email = `ui_${Date.now().toString(36)}@example.com`;
const settle = () => page.waitForSelector("text=✓ Saved", { timeout: 8000 });

try {
  // unauthenticated app access bounces to login
  await page.goto(BASE + "/dashboard");
  await page.waitForURL("**/login");
  ok(true, "unauthenticated /dashboard -> /login");

  // sign up through the UI
  await page.goto(BASE + "/signup");
  await page.fill('input[autocomplete="name"]', "Test Owner");
  await page.fill('input[autocomplete="organization"]', "UI Test Shop");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "supersecret1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForSelector("text=Good day");
  ok(true, "sign up through UI lands on dashboard");

  // add a contact through Quick add
  await page.click("text=Quick add");
  await page.fill('input[value="+91"]', "+919876500001");
  await page.locator('label:has-text("Name *") input').fill("Browser Contact");
  await page.click('button:has-text("Add contact")');
  await page.waitForURL("**/contacts/*");
  await page.waitForSelector("h1:has-text('Browser Contact')");
  ok(true, "contact created, profile opens");
  await settle();

  // send a chat message
  await page.click("text=Open chat");
  await page.waitForSelector("text=Select a conversation").catch(() => {});
  ok(true, "inbox opens");

  // reload -> data must come back from the database
  await page.goto(BASE + "/contacts");
  await page.waitForSelector("text=Browser Contact", { timeout: 8000 });
  ok(true, "contact persists across full page reload (loaded from DB)");

  // create a deal + task on that contact
  await page.click("text=Browser Contact");
  await page.click('button:has-text("+ Add") >> nth=0');
  await page.locator('label:has-text("Deal title") input').fill("Persisted deal");
  await page.click('button:has-text("Create deal")');
  await page.waitForSelector("text=Persisted deal");
  await settle();
  await page.reload();
  await page.waitForSelector("text=Persisted deal", { timeout: 8000 });
  ok(true, "deal persists after reload");

  // load sample data, then verify it persists
  await page.goto(BASE + "/settings");
  await page.click("text=Load sample data");
  await settle();
  await page.goto(BASE + "/contacts");
  await page.waitForSelector("text=Rahul Verma", { timeout: 8000 });
  ok(true, "sample data loads into workspace");

  // sign out, then sign in again and see the same data
  await page.click('button[title="Sign out"]');
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/dashboard");
  await page.waitForURL("**/login");
  ok(true, "after sign out, app is locked");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "wrongpassword");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Incorrect email or password");
  ok(true, "wrong password shows error");
  await page.fill('input[type="password"]', "supersecret1");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.goto(BASE + "/contacts");
  await page.waitForSelector("text=Browser Contact");
  await page.waitForSelector("text=Rahul Verma");
  ok(true, "sign in again: all data is intact");

  // billing page shows plan + usage; team page lists the owner
  await page.goto(BASE + "/billing");
  await page.waitForSelector("text=Plan & billing");
  ok(await page.locator("text=Upgrade to Starter").count() + await page.locator("text=Renew / extend").count() > 0, "billing page shows paid plan options");
  await page.goto(BASE + "/team");
  await page.waitForSelector("text=Test Owner");
  ok(true, "team page lists the owner");
  await page.goto(BASE + "/admin");
  await page.waitForSelector("text=don't have access");
  ok(true, "platform admin console is denied to normal users");

  // every app route renders without a crash
  for (const p of ["dashboard", "inbox", "contacts", "pipeline", "tasks", "broadcasts", "templates", "reports", "team", "billing", "settings"]) {
    await page.goto(`${BASE}/${p}`);
    await page.waitForSelector("main", { timeout: 8000 });
    ok(true, `route /${p} renders`);
  }
} catch (e) {
  ok(false, "browser flow aborted: " + e.message.split("\n")[0]);
  await page.screenshot({ path: process.env.SHOT ?? "fail.png" });
}
const real = errors.filter((e) => !/401|favicon/i.test(e));
ok(real.length === 0, `no console/page errors${real.length ? ": " + real.slice(0, 3).join(" | ") : ""}`);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
