import { databaseAdapter } from './database';
export const env={
  DB:databaseAdapter,
  STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET:process.env.STRIPE_WEBHOOK_SECRET,
  COMMERCE_MODE:process.env.COMMERCE_MODE||'preview',
  PUBLIC_SITE_URL:process.env.PUBLIC_SITE_URL||process.env.RENDER_EXTERNAL_URL,
  AUTH_PROVIDER:'email',
} as unknown as Cloudflare.Env;
