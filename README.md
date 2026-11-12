# ChatDesk — WhatsApp-first CRM for micro-businesses

Next.js (App Router) + Tailwind + Postgres. Multi-tenant SaaS with Razorpay billing.

## Run
    npm install && npm run dev      # http://localhost:3000
    npm run build && npm start

## Architecture
- Auth: email + password (scrypt), random session tokens stored hashed in Postgres, HttpOnly SameSite=Lax cookie,
  Origin check on all writes (CSRF), DB-backed rate limiting on login/signup, `proxy.ts` gate on app pages.
- Data: one Postgres database, every row scoped by `workspace_id` taken from the session (never from the request).
  Schema is created automatically on first request (`src/server/db.ts`).
- Client: optimistic UI; `src/lib/store.tsx` diffs state and syncs to `/api/sync` in batches (≤500 changes per request);
  shows Saving/Saved + retry on failure. Every 20s it polls the cheap `/api/version` fingerprint and reloads only when
  a teammate changed something. Concurrent edits to the same record are last-write-wins.

## Business model
- First `PILOT_SLOTS` (default 5) workspaces become **pilots**: free full (Growth) access. Everyone after starts on **Free**.
- Plans: Free (100 contacts, 1 user) · Starter ₹499/mo (2,000 contacts, 3 users, broadcasts) · Growth ₹1,499/mo (50,000 contacts, 10 users). Yearly = 10 months.
- Payments: Razorpay Orders (prepaid, UPI/cards/netbanking). Amount is set server-side; fulfilment happens on signature-verified
  browser callback **and** on the signed webhook (idempotent). Plans expire back to Free when the period ends (data is kept).
- Limits (contacts, users, total stored items, broadcasts) are enforced server-side, never trusted from the client.

## Admin
- **Workspace admin** (`/team`): roles (Owner / Admin / Agent), invite links, password-reset links, remove members, activity/audit log, full data export.
- **Platform admin** (`/admin`, emails in `ADMIN_EMAILS`): all workspaces, usage, revenue/MRR, grant/revoke plans, mark pilots, suspend, delete.

## Deploy (Vercel) — full checklist in DEPLOY.md
1. Create Postgres (Vercel Marketplace -> Neon). 2. Set every variable in `.env.example`. 3. Deploy.
4. In Razorpay, register the webhook URL above. 5. Run the test suites against the live URL (use Razorpay *test* keys first).

## Tests
    npm run build && npm start -p 3111   # with env: PILOT_SLOTS=1 SIGNUP_RATE_MAX=1000 ADMIN_EMAILS=platform-admin@chatdesk.test
                                         #   RAZORPAY_API_BASE=http://localhost:4010 RAZORPAY_KEY_ID=rzp_test_x RAZORPAY_KEY_SECRET=test_secret RAZORPAY_WEBHOOK_SECRET=whsec_test CRON_SECRET=cron_test_secret
    node scripts/fake-razorpay.mjs &                         # stand-in for api.razorpay.com
    BASE=http://localhost:3111 node scripts/e2e.mjs          # 45 core API/security checks
    BASE=http://localhost:3111 node scripts/e2e-saas.mjs     # 72 billing/team/admin checks
    BASE=http://localhost:3111 node scripts/browser-e2e.mjs  # real-browser checks (needs: npm i playwright)

## Not built yet
Email delivery (verification, receipts, forgot-password emails), auto-renewing subscriptions, GST invoices,
WhatsApp Cloud API (inbound/outbound sync), 2FA.
