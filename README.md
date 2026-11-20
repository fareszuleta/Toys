# Playroom · Toys

An English-language toy store with prices in USD, original product imagery, responsive layouts, accounts, saved carts, favorites, three discounted bundles, saved payment methods, and order history.

**Status:** functional preview. Demo checkout records a sample order without charging or shipping anything. Real payments and saved cards use Stripe when configured. The catalog, prices, age ranges, and imagery are illustrative.

## Deploy on Render

[Deploy with a Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint)

1. Connect this GitHub repository (`fareszuleta/Toys`) to Render.
2. Choose **New → Blueprint**, select the repository and `main`, then review `render.yaml`.
3. Render runs `npm ci --include=dev && npm run build:render`, then `npm run start:render`.
4. Open the service URL and create an account with an email address and a password of at least 12 characters.

The blueprint uses Node.js 24.22.1, a single paid web-service instance, and a 1 GB persistent disk at `/var/data`. SQLite stores accounts, hashed sessions, carts, favorites, and orders on that disk. A paid instance is necessary because Render does not attach persistent disks to free services. No Render resource is provisioned merely by including this configuration.

`RENDER_EXTERNAL_URL` supplies the service origin automatically. For a custom domain, set `PUBLIC_SITE_URL=https://your-domain.example` before using it. Serve production over HTTPS. Database migrations run during startup, when Render's persistent disk is mounted. Do not run them as a build or pre-deploy command.

References: [Render Blueprints](https://render.com/docs/blueprint-spec), [persistent disks](https://render.com/docs/disks), [Node versions](https://render.com/docs/node-version).

## Run the Render version locally

Use Node.js 24 (recommended) and npm:

```sh
npm ci
npm run build:render
npm run start:render
```

Open `http://127.0.0.1:3000`. The local database is `.data/playroom.sqlite`, which is ignored by Git. Set `PORT` and `SQLITE_PATH` to change the defaults. The local server accepts the origin `http://127.0.0.1:PORT`; use that URL instead of `localhost`, or explicitly set `PUBLIC_SITE_URL` for a different local origin.

The Render frontend is the same React storefront as the Sites preview. Its backend runs on Node's HTTP server and SQLite, without requiring Cloudflare or ChatGPT authentication. It supports email/password registration and login, password hashing with scrypt and random salts, opaque server-side sessions, HTTP-only cookies, login rate limits, and CSRF origin checks. Client-provided identity headers are ignored.

## Payments and saved cards

Default `COMMERCE_MODE=preview`:

- The **Add a demo card** button saves a fictional Visa ending in 4242.
- The **Place demo order** button records an explicitly labeled demo order.
- No real card data is requested, no money moves, and no shipments are created.

To test Stripe, set these server-side environment variables in Render:

```text
COMMERCE_MODE=test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional when using the default Render URL:
PUBLIC_SITE_URL=https://your-service.onrender.com
```

Configure a Stripe webhook at `https://your-service.onrender.com/api/stripe/webhook`, listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Payment checkout and card setup both redirect to Stripe-hosted pages. A Stripe Customer is attached to the signed-in account; returning customers can select eligible saved cards at checkout. Checkout offers explicit consent to save a card. The account panel lists the card brand, expiration, and last four digits and lets the owner detach a saved card. Full card numbers and CVCs never pass through the application.

Prices, bundle discounts, shipping, and order totals are determined by the server. Payments are confirmed by retrieving the session server-side and/or verifying the webhook signature; a success URL alone does not mark an order as paid. Webhook processing and demo checkout are idempotent. Cart changes made after starting checkout are preserved.

A real Stripe account was not configured during development, so actual Stripe payment/setup flows still need an end-to-end test with your test keys. Set `COMMERCE_MODE=live` and `sk_live_...` only after replacing the sample catalog with actual inventory and finalizing fulfillment, shipping destinations, tax calculation, returns/contact details, and privacy terms. The current shipping rule is $4.95, free from a $60 merchandise subtotal; the sample checkout allows US, CA, and MX delivery addresses. Adjust these rules for your business.

Sources: [Stripe saved payment methods](https://docs.stripe.com/payments/checkout/save-during-payment), [card setup](https://docs.stripe.com/payments/save-and-reuse), [webhook signatures](https://docs.stripe.com/webhooks/signature).

## Verify

```sh
npm run typecheck
npm test
npm run build:render
npm run test:integration
```

The integration suite starts its own server and temporary database. It checks registration/login, authorization, cross-account isolation, session and cart persistence across a restart, server-calculated totals, rejection of invalid quantities, quantity caps, demo checkout idempotency, card removal, and logout revocation. No real payment service is called.

## Source map

- `app/storefront.tsx` — shared storefront, account screens, cart and checkout UI.
- `app/globals.css` — responsive visual design.
- `lib/catalog.ts` — products, USD prices, bundles, shipping calculation.
- `app/api/store/route.ts` — authorized commerce API shared by both deployments.
- `lib/stripe.ts`, `lib/webhook-signature.ts` — Stripe API and webhook verification.
- `server/` — Node runtime, email/password authentication, SQLite/D1-compatible adapter.
- `render/`, `vite.render.config.ts`, `render.yaml` — Render client and deployment configuration.
- `db/schema.ts`, `drizzle/` — durable commerce schema and immutable migrations.
- `public/images/` — seven original AI-generated images, optimized as WebP.
- `docs/image-prompts.json` — exact prompts and built-in Imagegen attribution.
- `public/fonts/` — locally hosted Manrope and DM Sans, with SIL OFL licenses.

## Sites preview

The repository also preserves a separate Cloudflare/Vinext deployment configured by `.openai/hosting.json`. This hosted preview uses dispatch-owned Sign in with ChatGPT and D1, instead of the Render account/session adapter. Accounts and data are separate between the two deployments.

```sh
npm run dev
npm run build
```

`npm run dev` starts the portable preview at `http://127.0.0.1:5173`; its local-only sign-in simulates a development identity. To initialize local D1, run a build and apply pending migrations using the Wrangler configuration at `dist/server/wrangler.json`. Production Sites migrations are applied by Sites during publication. Stripe webhooks cannot reach an owner-private Sites preview; use the public Render endpoint for payment tests.

## Operational scope

This version does not implement inventory/warehouse administration, shipping label creation, transactional emails, password recovery, or email verification. It is a single-instance SQLite service; keep the persistent disk and maintain database backups before serving real customers. Never commit `.env`, `.dev.vars`, database files, or payment secrets. The sample store is intentionally deployed in preview mode.
