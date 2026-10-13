# Storefront Kit

A working, reusable e-commerce prototype: catalogue, basket, checkout, payments, order management and an admin panel.
**Zero npm dependencies.** Needs only Node >= 22.13 (uses built-in `node:sqlite`, `node:http`, `node:crypto`).
It lives in `shop/` and is independent of the static page at the repo root.

## Run it (60 seconds)

```bash
cd shop
npm start            # http://localhost:3000   (admin: /admin/)
npm test             # 26 tests
```

In dev, no config is needed: a random admin password is printed at boot, payments are the **mock** provider
(a fake pay page, no money moves) and the DB is seeded with demo merch. Copy `.env.example` to `.env` to set your own.

## What's in the box

| Area | Detail |
|---|---|
| Storefront | Product grid, categories, product page, basket (localStorage), checkout, order status page |
| Pricing | Integer pence only. Server re-prices everything from the DB (client prices are ignored). VAT-inclusive pricing, flat shipping with free-over threshold |
| Stock | Reserved atomically when an order is created (guarded `UPDATE ... WHERE stock >= qty`, tested under concurrency). Released on failed payment, expiry (30 min sweeper) or admin cancel |
| Payments | Provider interface in `lib/payments/`. `mock` for dev, `stripe` (hosted Checkout + signed webhooks, idempotent, amount-verified) |
| Admin | `/admin/`: sign-in, revenue/queue stats, order list + dispatch/cancel, product create/edit/hide, low-stock warning |
| Security | scrypt + timing-safe password check, login rate limit, HttpOnly/SameSite=Strict/Secure session cookie, CSRF header on writes, strict CSP (no inline JS/CSS), body size limit, HTML escaping, order pages need an unguessable token, refuses to boot in production with insecure config |
| Ops | `/healthz`, `/readyz`, graceful shutdown, Dockerfile (non-root, healthcheck), docker-compose, GitHub Actions CI (`.github/workflows/shop-ci.yml`) |

## Repurpose it for a different product

1. Edit `store.config.json`: name, tagline, currency, VAT, shipping, theme colours. No code changes.
2. Replace the catalogue: edit `lib/seed.js` (dev seed) or use the admin Products tab / `POST /api/admin/products`.
3. Real photos: set a product's `image_url` (`https://...` or `/path`). Otherwise coloured placeholder art is generated.

## Going live (checklist)

1. Host somewhere that runs Node/Docker with a **persistent volume** for the SQLite file (`DATABASE_PATH`). GitHub Pages (which serves `dre.me.uk`) cannot run this.
2. Set `NODE_ENV=production`, `BASE_URL` (https), `ADMIN_PASSWORD` (12+ chars), `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
3. In Stripe, add a webhook to `https://YOUR_DOMAIN/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.expired`.
4. **Test the Stripe flow in Stripe test mode first** (see "Not done" below).
5. Put TLS in front (the host/reverse proxy). Back up the DB file (SQLite WAL: use `sqlite3 .backup`, not a plain copy while running).

## Not done yet (honest list)

- **Stripe integration is not tested against a real Stripe account.** Signature verification, idempotency and amount checks are unit-tested with simulated events; the outbound Checkout Session call is written to Stripe's docs but never run.
- **Docker image and CI workflow have not been run** (no Docker daemon where this was built). The same file set was boot-tested directly with Node.
- **Emails are written to an `outbox` table, not sent.** Needs an SMTP/Resend/Postmark adapter.
- **No refunds from the admin** (do it in Stripe; cancelling an order only releases stock).
- Single admin user, single shared password. No customer accounts. No product variants (sizes), discounts, or multi-currency.
- UK-only shipping by default (`shipping.countries`); VAT is a single rate. Check your VAT/consumer-law obligations (UK Consumer Contracts Regulations: returns info, T&Cs, privacy policy pages are legally needed before taking real orders).
- SQLite means one server instance. Fine for a small shop; move to Postgres to scale out.
- Rate limiters are in-memory and key on the socket IP: behind a reverse proxy they will see the proxy's IP (needs `X-Forwarded-For` handling configured for your host).
