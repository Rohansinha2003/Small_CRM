# Deployment checklist

## 1. Accounts you need (can't be automated)
- [ ] **Vercel** account
- [ ] **Postgres** (Neon via the Vercel Marketplace is simplest)
- [ ] **Razorpay** account (KYC-verified for live payments)

## 2. Environment variables
Vercel → Project → Settings → Environment Variables. Template: `.env.example`.

Required: `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ADMIN_EMAILS`, `CRON_SECRET`,
`NEXT_PUBLIC_APP_URL`, and the `COMPANY_*` / `SUPPORT_*` values (baked into the legal pages at build time, so set them before building).
Use a *pooled* connection string for serverless. Start with Razorpay **test** keys.

## 3. Deploy
```
npm i -g vercel && vercel link && vercel --prod
```
(or import the Git repo). `vercel.json` pins the Mumbai region (bom1) and schedules the daily cleanup cron.
The app refuses to start without `DATABASE_URL` in production.

## 4. Razorpay
- Settings → Payment Capture → **Automatic capture** must be ON (the app activates a plan as soon as the checkout signature verifies).
- Dashboard → Webhooks → add `https://YOUR-DOMAIN/api/billing/webhook`, secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured` and `order.paid`.
- Razorpay activation asks for your site's Terms, Privacy, Refund and Contact pages: `/terms`, `/privacy`, `/refund`, `/contact`.
  The text is a generic template. **Have a lawyer review it.**

## 5. Verify the live site
1. `curl https://YOUR-DOMAIN/api/health` → `{"ok":true,"checks":{"database":true,"billing":true,...}}`
2. Sign up (you become pilot #1) and open /team and /billing. Sign up with an email listed in `ADMIN_EMAILS` → /admin appears.
3. Make a test payment with Razorpay **test** keys → plan flips to Starter; Razorpay shows the webhook delivered with 200.
4. Switch to live keys, pay ₹499 yourself once, then refund it from the Razorpay dashboard.
5. Turn on automated backups / point-in-time recovery on the database. Add error monitoring (Vercel Observability or Sentry).

## Known gaps (not blockers for a pilot)
No email sending (password resets are admin-generated links), no auto-renewing subscriptions, no GST invoices,
no WhatsApp Cloud API sync, no 2FA, no strict CSP header.
