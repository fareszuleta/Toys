import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { calculateCart, getItem, type CartLine } from "./catalog";
import { commerceMode, stripeRequest, type StripeSession } from "./stripe";

export function database() {
  if(!env.DB) throw new Error("The store is temporarily unavailable. Please try again.");
  return env.DB;
}
export async function ensureCustomer(user:ChatGPTUser) {
  await database().prepare("INSERT INTO customers (user_id,name,email,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email").bind(user.userId,user.fullName||user.email.split("@")[0],user.email,Date.now()).run();
}
export type StoredLine=CartLine&{updated_at:number};
export async function getCart(userId:string):Promise<StoredLine[]> {
  const rows=await database().prepare("SELECT sku,quantity,updated_at FROM cart_items WHERE user_id=? ORDER BY updated_at").bind(userId).all<StoredLine>();
  return rows.results.filter(l=>getItem(l.sku));
}
export async function getCustomerId(user:ChatGPTUser) {
  const mode=commerceMode();
  const row=await database().prepare("SELECT stripe_customer_id FROM customers WHERE user_id=?").bind(user.userId).first<{stripe_customer_id:string|null}>();
  if(row?.stripe_customer_id?.startsWith(`${mode}:`)) return row.stripe_customer_id.slice(mode.length+1);
  const customer=await stripeRequest<{id:string}>("customers",{email:user.email,name:user.fullName||user.displayName,"metadata[playroom_user_id]":user.userId},`playroom-customer-${mode}-${user.userId}`);
  await database().prepare("UPDATE customers SET stripe_customer_id=? WHERE user_id=?").bind(`${mode}:${customer.id}`,user.userId).run();
  return customer.id;
}
export async function loadStore(user:ChatGPTUser|null) {
  const mode=commerceMode(),authProvider=env.AUTH_PROVIDER||"chatgpt";
  if(!user) return {user:null,cart:[],favorites:[],orders:[],cards:[],mode,cardsError:false,authProvider};
  const db=database();
  const [customer,cart,favoriteRows,orderRows]=await Promise.all([
    db.prepare("SELECT name,phone,demo_card,stripe_customer_id,card_last4,card_exp_month,card_exp_year,shipping_name,shipping_address,shipping_city,shipping_state,shipping_zip,shipping_country FROM customers WHERE user_id=?").bind(user.userId).first<{name:string;phone:string|null;demo_card:number;stripe_customer_id:string|null;card_last4:string|null;card_exp_month:number|null;card_exp_year:number|null;shipping_name:string|null;shipping_address:string|null;shipping_city:string|null;shipping_state:string|null;shipping_zip:string|null;shipping_country:string|null}>(),
    getCart(user.userId),
    db.prepare("SELECT sku FROM favorites WHERE user_id=?").bind(user.userId).all<{sku:string}>(),
    db.prepare("SELECT id,status,mode,items_json,total,shipping,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 30").bind(user.userId).all<{id:string;status:string;mode:string;items_json:string;total:number;shipping:number;created_at:number}>(),
  ]);
  let cards:Array<{id:string;brand:string;last4:string;expMonth:number;expYear:number;demo:boolean}>=[];
  let cardsError=false;
  if(mode==="preview"&&customer?.demo_card) cards=[{id:"demo-visa",brand:"Visa",last4:customer.card_last4??"4242",expMonth:customer.card_exp_month??12,expYear:customer.card_exp_year??2030,demo:true}];
  if(mode!=="preview"&&customer?.stripe_customer_id?.startsWith(`${mode}:`)) {
    try {
      const cid=customer.stripe_customer_id.slice(mode.length+1);
      const list=await stripeRequest<{data:Array<{id:string;card:{brand:string;last4:string;exp_month:number;exp_year:number}}> }>(`payment_methods?customer=${encodeURIComponent(cid)}&type=card&limit=10`);
      cards=list.data.map(p=>({id:p.id,brand:p.card.brand,last4:p.card.last4,expMonth:p.card.exp_month,expYear:p.card.exp_year,demo:false}));
    } catch { cardsError=true; }
  }
  return {
    user:{name:customer?.name||user.fullName||user.email.split("@")[0],email:user.email,phone:customer?.phone??null,shippingAddress:customer?.shipping_address?{name:customer.shipping_name,line1:customer.shipping_address,city:customer.shipping_city,state:customer.shipping_state,zip:customer.shipping_zip,country:customer.shipping_country??'US'}:null},
    cart:cart.map(({sku,quantity})=>({sku,quantity})), favorites:favoriteRows.results.map(r=>r.sku),
    orders:orderRows.results.map(o=>({id:o.id,status:o.status,mode:o.mode,total:o.total,shipping:o.shipping,createdAt:o.created_at,items:JSON.parse(o.items_json)})),cards,mode,cardsError,authProvider,
  };
}
export async function finishPayment(session:StripeSession, userId?:string) {
  if(session.mode!=="payment"||session.payment_status!=="paid") return false;
  const db=database();
  const order=await db.prepare("SELECT id,user_id,status,total,items_json FROM orders WHERE stripe_session_id=?").bind(session.id).first<{id:string;user_id:string;status:string;total:number;items_json:string}>();
  if(!order || (userId&&order.user_id!==userId) || session.metadata?.user_id!==order.user_id || session.amount_total!==order.total || session.currency!=="usd") return false;
  if(order.status==="paid") return true;
  const items=JSON.parse(order.items_json) as StoredLine[];
  // Only clear the exact purchased snapshot. Later cart edits remain untouched.
  await db.batch([
    db.prepare("UPDATE orders SET status='paid' WHERE id=? AND status='pending'").bind(order.id),
    ...items.map(l=>db.prepare("DELETE FROM cart_items WHERE user_id=? AND sku=? AND quantity=? AND updated_at=?").bind(order.user_id,l.sku,l.quantity,l.updated_at)),
  ]);
  return true;
}
export function orderSnapshot(lines:StoredLine[]) {
  const totals=calculateCart(lines);
  return {totals,items:lines.map(l=>({...l,name:getItem(l.sku)!.name,price:getItem(l.sku)!.price}))};
}
