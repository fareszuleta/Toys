import { env } from "cloudflare:workers";
import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getItem, products } from "@/lib/catalog";
import { database, ensureCustomer, finishPayment, getCart, getCustomerId, loadStore, orderSnapshot } from "@/lib/store-server";
import { commerceMode, stripeRequest, type StripeSession } from "@/lib/stripe";

export const dynamic="force-dynamic";
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const command=z.discriminatedUnion("action",[
  z.object({action:z.literal("add"),sku:z.string().max(50)}),
  z.object({action:z.literal("quantity"),sku:z.string().max(50),quantity:z.number().int().min(0).max(10)}),
  z.object({action:z.literal("favorite"),sku:z.string().max(50),saved:z.boolean()}),
  z.object({action:z.literal("profile"),name:z.string().trim().min(2).max(80)}),
  z.object({action:z.literal("update-phone"),phone:z.string().trim().max(20)}),
  z.object({action:z.literal("update-address"),name:z.string().trim().min(2).max(80),line1:z.string().trim().min(3).max(120),city:z.string().trim().min(2).max(60),state:z.string().trim().min(2).max(40),zip:z.string().trim().min(3).max(12),phone:z.string().trim().max(20).optional()}),
  z.object({action:z.literal("add-card"),last4:z.string().length(4).regex(/^\d{4}$/).optional(),expMonth:z.number().int().min(1).max(12).optional(),expYear:z.number().int().min(2024).max(2060).optional()}),
  z.object({action:z.literal("remove-card"),id:z.string().max(100)}),
  z.object({action:z.literal("checkout"),requestId:z.string().uuid()}),
  z.object({action:z.literal("confirm"),sessionId:z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(255)}),
  z.object({action:z.literal("delete-order"),id:z.string().regex(/^PR-[a-zA-Z0-9_-]+$/).max(100)}),
]);
export async function GET() {
  try{return response(await loadStore(await getChatGPTUser()));}
  catch(error){console.error("Store load error",error instanceof Error?error.message:"unknown");return response({error:"We could not load your account. Please try again."},503);}
}
export async function POST(request:Request) {
  const origin=request.headers.get("origin");
  if(!origin || origin!==new URL(request.url).origin) return response({error:"This request could not be verified. Please reload the page."},403);
  if(!request.headers.get("content-type")?.includes("application/json")) return response({error:"JSON is required."},415);
  const user=await getChatGPTUser();
  if(!user)return response({error:"Sign in to save your favorites and build your cart."},401);
  try {
    const raw=await request.text();
    if(raw.length>8192)return response({error:"Request is too large."},413);
    let parsed:unknown;
    try{parsed=JSON.parse(raw);}catch{return response({error:"Invalid request."},400);}
    const result=command.safeParse(parsed);
    if(!result.success)return response({error:"Please check the information and try again."},400);
    const data=result.data, db=database(),mode=commerceMode();
    await ensureCustomer(user);
    if(data.action==="add"||data.action==="quantity") {
      if(!getItem(data.sku)) return response({error:"That toy is not in our catalog."},404);
      if(data.action==="add") await db.prepare("INSERT INTO cart_items (user_id,sku,quantity,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id,sku) DO UPDATE SET quantity=MIN(cart_items.quantity+1,10),updated_at=MAX(cart_items.updated_at+1,excluded.updated_at)").bind(user.userId,data.sku,Date.now()).run();
      else if(data.quantity===0) await db.prepare("DELETE FROM cart_items WHERE user_id=? AND sku=?").bind(user.userId,data.sku).run();
      else await db.prepare("INSERT INTO cart_items (user_id,sku,quantity,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,sku) DO UPDATE SET quantity=excluded.quantity,updated_at=MAX(cart_items.updated_at+1,excluded.updated_at)").bind(user.userId,data.sku,data.quantity,Date.now()).run();
    }
    if(data.action==="favorite") {
      if(!products.some(p=>p.id===data.sku))return response({error:"That toy is not in our catalog."},404);
      await (data.saved?db.prepare("INSERT OR IGNORE INTO favorites (user_id,sku) VALUES (?,?)"):db.prepare("DELETE FROM favorites WHERE user_id=? AND sku=?")).bind(user.userId,data.sku).run();
    }
    if(data.action==="profile")await db.prepare("UPDATE customers SET name=? WHERE user_id=?").bind(data.name,user.userId).run();
    if(data.action==="update-phone")await db.prepare("UPDATE customers SET phone=? WHERE user_id=?").bind(data.phone||null,user.userId).run();
    if(data.action==="update-address")await db.prepare("UPDATE customers SET shipping_name=?,shipping_address=?,shipping_city=?,shipping_state=?,shipping_zip=?,phone=? WHERE user_id=?").bind(data.name,data.line1,data.city,data.state,data.zip,data.phone||null,user.userId).run();
    if(data.action==="add-card") {
      if(mode==="preview") await db.prepare("UPDATE customers SET demo_card=1,card_last4=?,card_exp_month=?,card_exp_year=? WHERE user_id=?").bind(data.last4??null,data.expMonth??null,data.expYear??null,user.userId).run();
      else {
        const customer=await getCustomerId(user);
        const base=env.PUBLIC_SITE_URL||new URL(request.url).origin;
        const session=await stripeRequest<StripeSession>("checkout/sessions",{mode:"setup",customer,currency:"usd","payment_method_types[0]":"card",locale:"en",success_url:`${base}/?card=saved`,cancel_url:`${base}/?card=canceled`,"metadata[user_id]":user.userId});
        return response({url:session.url});
      }
    }
    if(data.action==="remove-card") {
      if(mode==="preview"&&data.id==="demo-visa") await db.prepare("UPDATE customers SET demo_card=0 WHERE user_id=?").bind(user.userId).run();
      else if(mode!=="preview") {
        if(!/^pm_[a-zA-Z0-9]+$/.test(data.id))return response({error:"Invalid payment method."},400);
        const customer=await getCustomerId(user);
        const method=await stripeRequest<{customer:string}>(`payment_methods/${data.id}`);
        if(method.customer!==customer)return response({error:"Payment method not found."},404);
        await stripeRequest(`payment_methods/${data.id}/detach`,{});
      }
    }
    if(data.action==="delete-order") {
      await db.prepare("DELETE FROM orders WHERE id=? AND user_id=?").bind(data.id,user.userId).run();
    }
    if(data.action==="confirm") {
      if(mode==="preview")return response({error:"Payments are not enabled."},400);
      const session=await stripeRequest<StripeSession>(`checkout/sessions/${data.sessionId}`);
      if(!await finishPayment(session,user.userId))return response({error:"The payment is not confirmed yet. Please check your orders again shortly."},409);
    }
    if(data.action==="checkout") {
      const id=`PR-${data.requestId}`;
      const existing=await db.prepare("SELECT id,status,stripe_session_id,items_json,total,shipping FROM orders WHERE id=? AND user_id=?").bind(id,user.userId).first<{id:string;status:string;stripe_session_id:string|null;items_json:string;total:number;shipping:number}>();
      if(existing?.stripe_session_id) {
        const session=await stripeRequest<StripeSession>(`checkout/sessions/${existing.stripe_session_id}`);
        return response({url:session.url});
      }
      if(existing?.status==="demo")return response({...await loadStore(user),completedOrder:id});
      const cart=await getCart(user.userId);
      if(!cart.length&&!existing)return response({error:"Add a little joy to your cart first."},400);
      // Retry an unfinished checkout using its immutable price snapshot.
      const {totals,items}=existing?{totals:{total:existing.total,shipping:existing.shipping},items:JSON.parse(existing.items_json) as ReturnType<typeof orderSnapshot>["items"]}:orderSnapshot(cart);
      if(mode==="preview") {
        const cust=await db.prepare("SELECT demo_card FROM customers WHERE user_id=?").bind(user.userId).first<{demo_card:number}>();
        if(!cust?.demo_card)return response({error:"A payment method is required to place your order. Please add a card to continue."},400);
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO orders (id,user_id,status,mode,items_json,total,shipping,created_at) VALUES (?,?,'demo','preview',?,?,?,?)").bind(id,user.userId,JSON.stringify(items),totals.total,totals.shipping,Date.now()),
          ...cart.map(l=>db.prepare("DELETE FROM cart_items WHERE user_id=? AND sku=? AND quantity=? AND updated_at=?").bind(user.userId,l.sku,l.quantity,l.updated_at)),
        ]);
        return response({...await loadStore(user),completedOrder:id});
      }
      const customer=await getCustomerId(user);
      const base=env.PUBLIC_SITE_URL||new URL(request.url).origin;
      const fields:Record<string,string>={mode:"payment",customer,locale:"en",success_url:`${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/?checkout=canceled`,"metadata[user_id]":user.userId,"metadata[order_id]":id,"saved_payment_method_options[payment_method_save]":"enabled","payment_method_types[0]":"card","shipping_address_collection[allowed_countries][0]":"US","shipping_address_collection[allowed_countries][1]":"CA","shipping_address_collection[allowed_countries][2]":"MX"};
      const paidLines=[...items.map(l=>({name:l.name,price:l.price,quantity:l.quantity})),...(totals.shipping?[{name:"Shipping",price:totals.shipping,quantity:1}]:[])];
      paidLines.forEach((l,i)=>{fields[`line_items[${i}][price_data][currency]`]="usd";fields[`line_items[${i}][price_data][unit_amount]`]=String(l.price);fields[`line_items[${i}][price_data][product_data][name]`]=l.name;fields[`line_items[${i}][quantity]`]=String(l.quantity);});
      await db.prepare("INSERT OR IGNORE INTO orders (id,user_id,status,mode,items_json,total,shipping,created_at) VALUES (?,?,'pending',?,?,?,?,?)").bind(id,user.userId,mode,JSON.stringify(items),totals.total,totals.shipping,Date.now()).run();
      const session=await stripeRequest<StripeSession>("checkout/sessions",fields,id);
      await db.prepare("UPDATE orders SET stripe_session_id=? WHERE id=? AND user_id=?").bind(session.id,id,user.userId).run();
      return response({url:session.url});
    }
    return response(await loadStore(user));
  }catch(error){console.error("Store action error",error instanceof Error?error.message:"unknown");return response({error:"Something went wrong. Your payment details have not been collected here. Please try again."},503);}
}
