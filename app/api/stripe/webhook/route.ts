import { env } from "cloudflare:workers";
import { finishPayment } from "@/lib/store-server";
import { verifyStripeSignature, type StripeSession } from "@/lib/stripe";
export async function POST(request:Request) {
  if(!env.STRIPE_WEBHOOK_SECRET)return new Response("Webhook not configured",{status:503});
  const body=await request.text();
  if(body.length>1000000)return new Response("Payload too large",{status:413});
  if(!await verifyStripeSignature(body,request.headers.get("stripe-signature")||"",env.STRIPE_WEBHOOK_SECRET))return new Response("Invalid signature",{status:400});
  try {
    const event=JSON.parse(body) as {type:string;data:{object:StripeSession}};
    if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded") {
      const session=event.data.object;
      if(session.mode==="payment" && session.payment_status==="paid" && !await finishPayment(session))return new Response("Order is not ready; retry delivery",{status:409});
    }
    return Response.json({received:true});
  }catch{return new Response("Please retry delivery",{status:500});}
}
