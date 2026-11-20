declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    COMMERCE_MODE?: "preview" | "test" | "live";
    PUBLIC_SITE_URL?: string;
    AUTH_PROVIDER?: "email" | "chatgpt";
    HARVEST_TOKEN?: string;
  }
}
