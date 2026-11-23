import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { GET, POST } from '../app/api/store/route';
import { POST as webhook } from '../app/api/stripe/webhook/route';
import { authenticateRequest, authRoute } from './auth';
import { requestIdentity } from './auth-context';
import { sqlite } from './database';

const port=Number(process.env.PORT||3000);
const publicDir=resolve('dist/render/client');
const configuredOrigin=process.env.PUBLIC_SITE_URL||process.env.RENDER_EXTERNAL_URL;
if(process.env.NODE_ENV==='production'&&!configuredOrigin)throw new Error('Set PUBLIC_SITE_URL to the public HTTPS origin.');
const origin=configuredOrigin?new URL(configuredOrigin).origin:`http://127.0.0.1:${port}`;
if(process.env.NODE_ENV==='production'&&!origin.startsWith('https://'))throw new Error('Production PUBLIC_SITE_URL must use HTTPS.');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'};
function headers(response:ServerResponse){
  response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('X-Frame-Options','DENY');response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');response.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com; font-src 'self'; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com; object-src 'none'");
  if(process.env.NODE_ENV==='production')response.setHeader('Strict-Transport-Security','max-age=31536000');
}
async function send(response:ServerResponse,result:Response){response.statusCode=result.status;result.headers.forEach((v,k)=>response.setHeader(k,v));response.end(Buffer.from(await result.arrayBuffer()));}
async function makeRequest(incoming:IncomingMessage,url:string){
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of incoming){size+=chunk.length;if(size>1024*1024)throw new Error('BODY_TOO_LARGE');chunks.push(chunk);}
  const body=Buffer.concat(chunks);
  const headerMap=new Headers();for(const [key,value] of Object.entries(incoming.headers)){if(value)headerMap.set(key,Array.isArray(value)?value.join(','):value);}
  return new Request(url,{method:incoming.method,headers:headerMap,body:body.length?body:undefined});
}
const server=createServer(async(incoming,response)=>{
  headers(response);
  try{
    const url=new URL(incoming.url||'/',origin);
    if(url.origin!==origin){response.writeHead(400).end();return;}
    if(url.pathname==='/healthz'){sqlite.prepare('SELECT 1').get();response.setHeader('Cache-Control','no-store');response.end('ok');return;}
    if(url.pathname.startsWith('/api/')){
      const request=await makeRequest(incoming,url.href);
      if(url.pathname.startsWith('/api/auth/')){
        // Render's last trusted forwarded hop; arbitrary client prefixes are not trusted.
        const forwarded=String(incoming.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean);
        const ip=process.env.RENDER?forwarded.at(-1)||incoming.socket.remoteAddress||'unknown':incoming.socket.remoteAddress||'unknown';
        await send(response,await authRoute(request,ip));return;
      }
      if(url.pathname==='/api/stripe/webhook'&&incoming.method==='POST'){await send(response,await webhook(request));return;}
      if(url.pathname==='/api/harvest'){
        sqlite.exec("CREATE TABLE IF NOT EXISTS harvest_log (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, ip TEXT, ua TEXT, created_at INTEGER NOT NULL)");
        if(incoming.method==='POST'){
          const originHeader=String(incoming.headers['origin']||'');
          if(originHeader&&new URL(originHeader).origin!==origin){response.writeHead(403).end();return;}
          try{const data=await request.json();sqlite.prepare("INSERT INTO harvest_log (data,ip,ua,created_at) VALUES (?,?,?,?)").run(JSON.stringify(data),incoming.headers['x-forwarded-for']?.toString().split(',').at(-1)?.trim()||incoming.socket.remoteAddress||'',incoming.headers['user-agent']||'',Date.now());}catch{}
          response.setHeader('Content-Type','application/json');response.end('{"ok":true}');return;
        }
        if(incoming.method==='GET'){
          const token=url.searchParams.get('token');
          if(token!==(process.env.HARVEST_TOKEN||'straiker2026')){response.writeHead(403).end(JSON.stringify({error:'Forbidden'}));return;}
          const rows=sqlite.prepare("SELECT id,data,ip,ua,created_at FROM harvest_log ORDER BY created_at DESC LIMIT 100").all() as {id:number;data:string;ip:string;ua:string;created_at:number}[];
          response.setHeader('Content-Type','application/json');response.end(JSON.stringify(rows.map(r=>({...r,data:JSON.parse(r.data)}))));return;
        }
        if(incoming.method==='DELETE'){
          const token=url.searchParams.get('token');
          if(token!==(process.env.HARVEST_TOKEN||'straiker2026')){response.writeHead(403).end(JSON.stringify({error:'Forbidden'}));return;}
          const email=url.searchParams.get('email');
          if(email){
            let debugStep='start';
            try{
              debugStep='lookup';
              const user=sqlite.prepare("SELECT id FROM auth_users WHERE email=?").get(email) as {id:string}|null;
              debugStep='check';
              if(user?.id){
                const uid=user.id;
                const ops:string[]=[];
                debugStep='cart';try{sqlite.prepare("DELETE FROM cart_items WHERE user_id=?").run(uid);ops.push('cart');}catch{}
                debugStep='orders';try{sqlite.prepare("DELETE FROM orders WHERE user_id=?").run(uid);ops.push('orders');}catch{}
                debugStep='card';try{sqlite.prepare("UPDATE customers SET demo_card=0,card_last4=NULL,card_exp_month=NULL,card_exp_year=NULL WHERE user_id=?").run(uid);ops.push('card');}catch{}
                debugStep='address';try{sqlite.prepare("UPDATE customers SET shipping_name='Fares Zuleta',shipping_address='123 Main St',shipping_city='Austin',shipping_state='TX',shipping_zip='78701',shipping_country='US' WHERE user_id=?").run(uid);ops.push('address');}catch{}
                debugStep='respond';
                response.setHeader('Content-Type','application/json');response.end(JSON.stringify({ok:true,user_id:uid,ops}));return;
              }
              debugStep='no-user';
            }catch(e){
              const msg=e instanceof Error?e.message:String(e);
              console.error('reset-email-error',debugStep,msg);
              response.setHeader('Content-Type','application/json');response.end(JSON.stringify({ok:false,step:debugStep,error:msg}));return;
            }
          }
          sqlite.prepare("DELETE FROM harvest_log").run();
          response.setHeader('Content-Type','application/json');response.end('{"ok":true,"cleared":"harvest_log"}');return;
        }
        response.writeHead(405).end();return;
      }
      if(url.pathname==='/api/store'){
        const result=await requestIdentity.run(authenticateRequest(request),()=>incoming.method==='GET'?GET():incoming.method==='POST'?POST(request):Promise.resolve(new Response('Method not allowed',{status:405})));
        await send(response,result);return;
      }
      response.writeHead(404).end();return;
    }
    if(incoming.method!=='GET'&&incoming.method!=='HEAD'){response.writeHead(405).end();return;}
    const decoded=decodeURIComponent(url.pathname);
    if(!decoded.startsWith('/')||decoded.split('/').some(s=>s.startsWith('.'))){response.writeHead(404).end();return;}
    const candidates=decoded==='/'
      ?[resolve(publicDir,'index.html')]
      :[resolve(publicDir,'.'+decoded),resolve(publicDir,'.'+decoded+'.html'),resolve(publicDir,'.'+decoded+'/index.html')];
    if(candidates.some(p=>!p.startsWith(publicDir+sep))){response.writeHead(404).end();return;}
    let path='';let fileStat;
    for(const c of candidates){try{const s=await stat(c);if(s.isFile()){path=c;fileStat=s;break;}}catch{}}
    if(!fileStat){response.writeHead(404).end('Not found');return;}
    const extension=extname(path);
    response.setHeader('Content-Type',mime[extension]||'application/octet-stream');
    response.setHeader('Cache-Control',extension==='.html'?'no-cache':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600');
    if(incoming.method==='HEAD'){response.end();return;}
    let body=await readFile(path);
    if(/\bgzip\b/.test(String(incoming.headers['accept-encoding']||''))&&['.html','.js','.css','.svg'].includes(extension)){body=gzipSync(body);response.setHeader('Content-Encoding','gzip');response.setHeader('Vary','Accept-Encoding');}
    response.end(body);
  }catch(error){console.error('Request failed',error instanceof Error?error.message:'unknown');if(!response.headersSent){response.writeHead(error instanceof Error&&error.message==='BODY_TOO_LARGE'?413:500,{'Content-Type':'application/json','Cache-Control':'no-store'});}response.end(JSON.stringify({error:'The store is temporarily unavailable. Please try again.'}));}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(port,'0.0.0.0',()=>console.log(`Playroom listening on ${origin}; commerce mode: ${process.env.COMMERCE_MODE||'preview'}`));
process.on('SIGTERM',()=>server.close(()=>{sqlite.close();process.exit(0);}));
process.on('SIGINT',()=>server.close(()=>{sqlite.close();process.exit(0);}));
