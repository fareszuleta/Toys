import { env } from "cloudflare:workers";

export function commerceMode(): "preview" | "test" | "live" {
  const mode=env.COMMERCE_MODE;
  if (mode==="test" && env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) return "test";
  if (mode==="live" && env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) return "live";
  return "preview";
}
export async function stripeRequest<T>(path:string, fields?:Record<string,string>, idempotencyKey?:string):Promise<T> {
  if (commerceMode()==="preview") throw new Error("Payments are not enabled yet.");
  const response=await fetch(`https://api.stripe.com/v1/${path}`, {
    method:fields?"POST":"GET",
    headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`, "Stripe-Version":"2025-02-24.acacia", ...(fields?{"Content-Type":"application/x-www-form-urlencoded"}:{}), ...(idempotencyKey?{"Idempotency-Key":idempotencyKey}:{}) },
    body:fields?new URLSearchParams(fields).toString():undefined,
    signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) { console.error("Stripe request failed",response.status,path.split("/")[0]); throw new Error("The payment service is temporarily unavailable. Please try again."); }
  return response.json() as Promise<T>;
}
export type StripeSession={id:string;url:string;mode:string;customer:string;payment_status:string;amount_total:number;currency:string;metadata:Record<string,string>};

export { verifyStripeSignature } from "./webhook-signature";
