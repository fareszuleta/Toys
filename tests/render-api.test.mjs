import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
const directory=await mkdtemp(join(tmpdir(),'playroom-tests-'));
const port=31870+Math.floor(Math.random()*1000),origin=`http://127.0.0.1:${port}`;
let child;
async function start(){
 child=spawn(process.execPath,['dist/render/server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:String(port),PUBLIC_SITE_URL:origin,SQLITE_PATH:join(directory,'store.sqlite'),COMMERCE_MODE:'preview'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',data=>{output+=data;});child.stderr.on('data',data=>{output+=data;});
 for(let n=0;n<100;n++){if(child.exitCode!==null)throw new Error(output);try{if((await fetch(origin+'/healthz')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw new Error('Server not ready: '+output);
}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
async function request(path='/api/store',body,cookie,extra={}){
 const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const password='Synthetic-test-password-123!';
await start();
try{
 await test('Render: auth, isolation, pricing, persistence and demo checkout',async t=>{
  let alice,bob;
  await t.test('guests cannot mutate and trusted identity headers cannot be spoofed',async()=>{
    assert.equal((await request('/api/store',{action:'add',sku:'bear'})).status,401);
    const spoofed=await request('/api/store',undefined,undefined,{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin@example.test'});
    assert.equal(spoofed.data.user,null);assert.equal(spoofed.data.authProvider,'email');
  });
  await t.test('accounts register with protected sessions and invalid credentials fail',async()=>{
    const a=await request('/api/auth/register',{name:'Alice Test',email:'alice@example.test',password});assert.equal(a.status,200);assert.ok(a.cookie);alice=a.cookie;
    const b=await request('/api/auth/register',{name:'Bob Test',email:'bob@example.test',password});assert.equal(b.status,200);bob=b.cookie;
    assert.equal((await request('/api/auth/login',{email:'alice@example.test',password:'Wrong-password-123!'})).status,401);
    assert.equal((await request('/api/auth/register',{name:'Short Password',email:'short@example.test',password:'123'})).status,400);
  });
  await t.test('CSRF, unknown SKUs and invalid quantities are rejected',async()=>{
    assert.equal((await request('/api/store',{action:'add',sku:'bear'},alice,{Origin:'https://attacker.example'})).status,403);
    assert.equal((await request('/api/store',{action:'add',sku:'unknown'},alice)).status,404);
    assert.equal((await request('/api/store',{action:'quantity',sku:'bear',quantity:-1},alice)).status,400);
    assert.equal((await request('/api/store',{action:'quantity',sku:'bear',quantity:11},alice)).status,400);
  });
  await t.test('cart, favorites and demo cards are isolated by account',async()=>{
    await request('/api/store',{action:'quantity',sku:'bundle-build',quantity:2,price:1},alice);
    await request('/api/store',{action:'favorite',sku:'bear',saved:true},alice);
    await request('/api/store',{action:'add-card'},alice);
    const a=(await request('/api/store',undefined,alice)).data;
    assert.deepEqual(a.cart,[{sku:'bundle-build',quantity:2}]);assert.deepEqual(a.favorites,['bear']);assert.equal(a.cards[0].last4,'4242');
    const b=(await request('/api/store',undefined,bob)).data;
    assert.deepEqual(b.cart,[]);assert.deepEqual(b.favorites,[]);assert.deepEqual(b.cards,[]);assert.deepEqual(b.orders,[]);
  });
  await t.test('sessions and carts survive a server restart',async()=>{
    await stop();await start();
    const a=(await request('/api/store',undefined,alice)).data;
    assert.equal(a.user.email,'alice@example.test');assert.equal(a.cart[0].quantity,2);assert.equal(a.cards[0].demo,true);
  });
  await t.test('server ignores client prices and demo checkout is idempotent',async()=>{
    const requestId=randomUUID();const result=await request('/api/store',{action:'checkout',requestId,total:1},alice);
    assert.equal(result.status,200);assert.equal(result.data.orders[0].total,10800);assert.equal(result.data.orders[0].status,'demo');assert.equal(result.data.cart.length,0);
    await request('/api/store',{action:'add',sku:'dinos'},alice);
    const retry=await request('/api/store',{action:'checkout',requestId},alice);
    assert.equal(retry.data.orders.length,1);assert.equal(retry.data.cart[0].sku,'dinos');
    assert.equal((await request('/api/store',undefined,bob)).data.orders.length,0);
  });
  await t.test('quantity caps and favorite operations remain consistent',async()=>{
    await Promise.all(Array.from({length:12},()=>request('/api/store',{action:'add',sku:'bear'},bob)));
    assert.equal((await request('/api/store',undefined,bob)).data.cart[0].quantity,10);
    await request('/api/store',{action:'favorite',sku:'bear',saved:true},alice);await request('/api/store',{action:'favorite',sku:'bear',saved:true},alice);
    assert.deepEqual((await request('/api/store',undefined,alice)).data.favorites,['bear']);
    await request('/api/store',{action:'remove-card',id:'demo-visa'},alice);assert.deepEqual((await request('/api/store',undefined,alice)).data.cards,[]);
  });
  await t.test('logout revokes the session server-side',async()=>{
    assert.equal((await request('/api/auth/logout',{},alice)).status,200);
    assert.equal((await request('/api/store',undefined,alice)).data.user,null);
    assert.equal((await request('/api/store',{action:'add',sku:'bear'},alice)).status,401);
  });
 });
}finally{await stop();}
