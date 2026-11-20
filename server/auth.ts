import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { sqlite } from './database';
import type { ChatGPTUser } from './auth-context';
const sessionDays=14;
const cookieName=process.env.NODE_ENV==='production'?'__Host-playroom_session':'playroom_session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(err,key)=>err?reject(err):resolve(key)));
const json=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
function cookie(value:string,maxAge=sessionDays*86400){return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
function token(request:Request){return (request.headers.get('cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);}
export function authenticateRequest(request:Request):ChatGPTUser|null {
  const raw=token(request);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
  const row=sqlite.prepare('SELECT u.id,u.email,c.name FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id JOIN customers c ON c.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(hash(raw),Date.now()) as {id:string;email:string;name:string}|undefined;
  return row?{userId:row.id,displayName:row.name,fullName:row.name,email:row.email}:null;
}
function limited(key:string,limit:number){
  const now=Date.now();
  sqlite.prepare('INSERT INTO auth_limits (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').run(hash(key),now+10*60*1000,now,now);
  const row=sqlite.prepare('SELECT attempts FROM auth_limits WHERE key=?').get(hash(key)) as {attempts:number};
  return row.attempts>limit;
}
const credentials=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(128),name:z.string().trim().min(2).max(80).optional()});
export async function authRoute(request:Request,ip:string) {
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Please reload the page and try again.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON is required.'},415);
  const path=new URL(request.url).pathname;
  if(path==='/api/auth/logout'){
    const raw=token(request);if(raw)sqlite.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash(raw));
    return json({ok:true},200,cookie('',0));
  }
  if(path!=='/api/auth/login'&&path!=='/api/auth/register')return json({error:'Not found.'},404);
  if(limited(`ip:${ip}`,30))return json({error:'Too many attempts. Please try again in 10 minutes.'},429);
  const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);
  let input:unknown;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  const parsed=credentials.safeParse(input);
  if(!parsed.success)return json({error:'Enter a valid email and a password of 12–128 characters.'},400);
  const {email,password,name}=parsed.data;
  if(limited(`email:${email}`,15))return json({error:'Too many attempts. Please try again in 10 minutes.'},429);
  let userId:string;
  if(path==='/api/auth/register') {
    if(!name)return json({error:'Tell us your name so we can say hello.'},400);
    const salt=randomBytes(16).toString('hex');
    const passwordHash=`${salt}:${(await derive(password,salt)).toString('hex')}`;
    if(sqlite.prepare('SELECT id FROM auth_users WHERE email=?').get(email))return json({error:'An account with this email already exists. Please sign in.'},409);
    userId=`usr_${randomUUID()}`;
    sqlite.exec('BEGIN IMMEDIATE');
    try{sqlite.prepare('INSERT INTO auth_users (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(userId,email,passwordHash,Date.now());sqlite.prepare('INSERT INTO customers (user_id,name,email,created_at) VALUES (?,?,?,?)').run(userId,name,email,Date.now());sqlite.exec('COMMIT');}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }else{
    const user=sqlite.prepare('SELECT id,password_hash FROM auth_users WHERE email=?').get(email) as {id:string;password_hash:string}|undefined;
    const [salt,stored]=(user?.password_hash||'00000000000000000000000000000000:'+ '0'.repeat(128)).split(':');
    const candidate=await derive(password,salt);
    if(!timingSafeEqual(candidate,Buffer.from(stored,'hex'))||!user)return json({error:'That email and password do not match. Please try again.'},401);
    userId=user.id;
  }
  const sessionToken=randomBytes(32).toString('hex');
  // Rotate an existing browser session after every successful authentication.
  const previous=token(request);if(previous)sqlite.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(hash(previous));
  sqlite.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').run(Date.now());
  sqlite.prepare('DELETE FROM auth_limits WHERE reset_at<=?').run(Date.now());
  sqlite.prepare('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(hash(sessionToken),userId,Date.now()+sessionDays*86400000);
  sqlite.prepare('DELETE FROM auth_limits WHERE key=?').run(hash(`email:${email}`));
  return json({ok:true},200,cookie(sessionToken));
}
