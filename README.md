# Playroom Toys

An online toy store for children from birth to 10 years, operated by Playroom Toys, LLC (Portland, OR). Ships to the United States, Canada, Mexico, and most of Latin America. Prices in USD.

**Live store:** [https://shop.reimbursor.info](https://shop.reimbursor.info)

Features: product catalog with age-based filtering, accounts, saved carts, favorites, three discounted bundles, Stripe payment processing, saved payment methods, and order history.

## Deploy

The production instance runs on a managed Node.js server with HTTPS and a persistent SQLite database. The `render.yaml` and `vite.render.config.ts` files configure the build pipeline.

1. Run `npm ci --include=dev && npm run build:render` to build the client and server.
2. Start with `npm run start:render` or `node dist/render/server.mjs`.
3. Set `PUBLIC_SITE_URL=https://shop.reimbursor.info` for the production origin.
4. Open the site and create an account with an email address and a password of at least 12 characters.

SQLite stores accounts, hashed sessions, carts, favorites, and orders on a persistent disk. Database migrations run during startup. Do not run them as a build or pre-deploy command.

## Run locally

Use Node.js 24 (recommended) and npm:

```sh
npm ci
npm run build:render
npm run start:render
```

Open `http://127.0.0.1:3000`. The local database is `.data/playroom.sqlite`, which is ignored by Git. Set `PORT` and `SQLITE_PATH` to change the defaults. The local server accepts the origin `http://127.0.0.1:PORT`; use that URL instead of `localhost`, or explicitly set `PUBLIC_SITE_URL` for a different local origin.

The backend runs on Node's HTTP server and SQLite. It supports email/password registration and login, password hashing with scrypt and random salts, opaque server-side sessions, HTTP-only cookies, login rate limits, and CSRF origin checks. Client-provided identity headers are ignored.

## Payments and saved cards

Payments are processed exclusively through Stripe. Full card numbers and CVCs never pass through the application — they go directly to Stripe's PCI DSS Level 1 infrastructure.

To configure Stripe, set these server-side environment variables in Render:

```text
COMMERCE_MODE=test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional when using the default Render URL:
PUBLIC_SITE_URL=https://shop.reimbursor.info
```

Configure a Stripe webhook at `https://shop.reimbursor.info/api/stripe/webhook`, listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Payment checkout and card setup both redirect to Stripe-hosted pages. A Stripe Customer is attached to the signed-in account; returning customers can select eligible saved cards at checkout. Checkout offers explicit consent to save a card. The account panel lists the card brand, expiration, and last four digits and lets the owner detach a saved card.

Prices, bundle discounts, shipping, and order totals are determined by the server. Payments are confirmed by retrieving the session server-side and/or verifying the webhook signature; a success URL alone does not mark an order as paid. Checkout processing is idempotent. Cart changes made after starting checkout are preserved.

Set `COMMERCE_MODE=live` and `sk_live_...` after finalizing fulfillment, shipping destinations, tax calculation, returns, and privacy terms. The current shipping rule is $4.95, free from a $60 merchandise subtotal; checkout allows US, CA, and MX delivery addresses.

Sources: [Stripe saved payment methods](https://docs.stripe.com/payments/checkout/save-during-payment), [card setup](https://docs.stripe.com/payments/save-and-reuse), [webhook signatures](https://docs.stripe.com/webhooks/signature).

## Verify

```sh
npm run typecheck
npm test
npm run build:render
npm run test:integration
```

The integration suite starts its own server and temporary database. It checks registration/login, authorization, cross-account isolation, session and cart persistence across a restart, server-calculated totals, rejection of invalid quantities, quantity caps, checkout idempotency, card removal, and logout revocation. No real payment service is called.

## Source map

- `app/storefront.tsx` — storefront, account screens, cart and checkout UI.
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

## Operational scope

This version does not implement inventory/warehouse administration, shipping label creation, transactional emails, password recovery, or email verification. It is a single-instance SQLite service; keep the persistent disk and maintain database backups. Never commit `.env`, `.dev.vars`, database files, or payment secrets.
