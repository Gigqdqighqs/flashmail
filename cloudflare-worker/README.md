# FlashMail — Cloudflare Email Worker

This worker receives emails via Cloudflare Email Routing and forwards them to the FlashMail API.

## Setup Instructions

### 1. Prerequisites
- Domain `qzz.io` must be on Cloudflare DNS
- Node.js and npm installed locally (for deploying worker)

### 2. Enable Email Routing
1. Go to Cloudflare Dashboard → `qzz.io` → **Email** → **Email Routing**
2. Click **Get started** / **Enable Email Routing**
3. Cloudflare will add the required MX and TXT records automatically
4. Under **Routing rules**, select **Catch-all** → **Send to Worker**

### 3. Deploy the Worker

```bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler deploy
```

### 4. Set the Secret

```bash
npx wrangler secret put INBOUND_SECRET
# Enter: flashmail-inbound-secret-change-me
# (must match the INBOUND_SECRET in your .env.local)
```

### 5. Configure Catch-All Route
1. Go to Cloudflare Dashboard → `qzz.io` → **Email** → **Email Routing** → **Routing rules**
2. Set **Catch-all** action to: **Send to a Worker** → select `flashmail-email-worker`

### 6. Add Subdomain (if using flashmail.qzz.io)
If using subdomain `flashmail.qzz.io`, you need to:
1. Add `flashmail.qzz.io` as a **Custom Address** in Email Routing
2. Or use the catch-all on the root domain and filter by `to` address in the worker

> **Note:** Cloudflare Email Routing works on the **root domain** by default. For subdomains like `flashmail.qzz.io`, you may need to add it as a separate zone in Cloudflare or use the root domain for email (e.g., `user@qzz.io`).

## Flow
```
Someone sends email to xxx@flashmail.qzz.io
  → Cloudflare MX receives it
  → Cloudflare Email Worker processes it
  → Worker POSTs to https://flashmail.qzz.io/api/inbound
  → API saves to Turso DB
  → User sees it in inbox (auto-refresh)
```
