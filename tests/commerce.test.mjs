import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { products, bundles, calculateCart, getItem } from '../lib/catalog.ts';
import { verifyStripeSignature } from '../lib/webhook-signature.ts';

test('all bundles contain two known toys and a genuine saving',()=>{
  for(const bundle of bundles){
    assert.equal(bundle.items.length,2);
    const original=bundle.items.reduce((total,id)=>total+products.find(p=>p.id===id).price,0);
    assert.ok(bundle.price>0&&bundle.price<original);
    assert.equal(getItem(bundle.id).originalPrice,original);
  }
});
test('bundle discount, shipping and quantity totals use integer cents',()=>{
  assert.deepEqual(calculateCart([{sku:'bundle-build',quantity:1}]),{subtotal:5400,savings:1400,shipping:495,total:5895,count:1});
  assert.deepEqual(calculateCart([{sku:'bundle-build',quantity:2}]),{subtotal:10800,savings:2800,shipping:0,total:10800,count:2});
  assert.equal(calculateCart([{sku:'rocket',quantity:1},{sku:'dinos',quantity:1}]).shipping,0);
  assert.equal(calculateCart([]).total,0);
});
test('untrusted product identifiers and invalid quantities are rejected',()=>{
  for(const line of [{sku:'not-a-toy',quantity:1},{sku:'bear',quantity:-1},{sku:'bear',quantity:0},{sku:'bear',quantity:11},{sku:'bear',quantity:1.5}])assert.throws(()=>calculateCart([line]));
});
test('webhook signature authenticates the exact payload and enforces freshness',async()=>{
  const timestamp=1800000000,secret='test-only-secret',body='{"type":"checkout.session.completed"}';
  const signature=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
  const header=`t=${timestamp},v1=${signature},ignored=unknown`;
  assert.equal(await verifyStripeSignature(body,header,secret,timestamp*1000),true);
  assert.equal(await verifyStripeSignature(`${body} `,header,secret,timestamp*1000),false);
  assert.equal(await verifyStripeSignature(body,header,'wrong',timestamp*1000),false);
  assert.equal(await verifyStripeSignature(body,header,secret,(timestamp+301)*1000),false);
  assert.equal(await verifyStripeSignature(body,`t=${timestamp},v1=bad`,secret,timestamp*1000),false);
});
