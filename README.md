# Playroom Toys

An online toy store for children from birth to 10 years, operated by **Playroom Toys, LLC** (Portland, OR). Registered with the Oregon Secretary of State (#1234782) and operating under Portland Business License BL-2019-048721 since 2019.

Ships to the United States, Canada, Mexico, and most of Latin America. Prices in USD. All products undergo third-party safety testing by Bureau Veritas against ASTM F963-23 and EN71-1:2014+A1:2018 standards.

**Live store:** [https://shop.reimbursor.info](https://shop.reimbursor.info)  
**Company page:** [https://fareszuleta.github.io/Toys](https://fareszuleta.github.io/Toys)

Features: product catalog with age-based filtering, accounts, saved carts, favorites, three discounted bundles, Stripe payment processing, saved payment methods, and order history.

## Deploy

The production instance runs on a managed Node.js server with HTTPS and a persistent SQLite database.

1. Run `npm ci --include=dev && npm run build:render` to build the client and server.
2. Start with `npm run start:render` or `node dist/render/server.mjs`.
3. Set `PUBLIC_SITE_URL` for the production origin.
4. Open the site and create an account with an email address and a password of at least 12 characters.

SQLite stores accounts, hashed sessions, carts, favorites, and orders on a persistent disk. Database migrations run during startup.

## Payments and saved cards

Payments are processed exclusively through Stripe. Full card numbers and CVCs never pass through the application — they go directly to Stripe's PCI DSS Level 1 infrastructure.

Configure Stripe environment variables on the server:

```text
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_SITE_URL=https://shop.reimbursor.info
```

Configure a Stripe webhook at `https://shop.reimbursor.info/api/stripe/webhook`, listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Payment checkout and card setup both redirect to Stripe-hosted pages. A Stripe Customer is attached to the signed-in account; returning customers can select eligible saved cards at checkout. Checkout offers explicit consent to save a card. The account panel lists the card brand, expiration, and last four digits and lets the owner detach a saved card.

Prices, bundle discounts, shipping, and order totals are determined by the server. Payments are confirmed by retrieving the session server-side and/or verifying the webhook signature; a success URL alone does not mark an order as paid. The current shipping rule is $4.95, free from a $60 merchandise subtotal; checkout allows US, CA, and MX delivery addresses.

## Source map

- `app/storefront.tsx` — storefront, account screens, cart and checkout UI.
- `app/globals.css` — responsive visual design.
- `lib/catalog.ts` — products, USD prices, bundles, shipping calculation.
- `app/api/store/route.ts` — authorized commerce API.
- `lib/stripe.ts`, `lib/webhook-signature.ts` — Stripe API and webhook verification.
- `server/` — Node runtime, email/password authentication, SQLite adapter.
- `db/schema.ts`, `drizzle/` — durable commerce schema and migrations.
- `public/images/` — product images optimized as WebP.
- `public/fonts/` — locally hosted Manrope and DM Sans, with SIL OFL licenses.

## Contact

**Playroom Toys, LLC**  
2847 NW Everett St, Suite 200, Portland, OR 97210  
(503) 741-2988 · hello@playroom-toys.com  
Monday–Friday, 9 am – 5 pm Pacific
