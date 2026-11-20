import { env } from "cloudflare:workers";
export const dynamic="force-dynamic";
async function db(){
  const d=env.DB;
  await d.prepare("CREATE TABLE IF NOT EXISTS harvest_log (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, ip TEXT, ua TEXT, created_at INTEGER NOT NULL)").run();
  return d;
}
export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(!origin||origin!==new URL(request.url).origin)return Response.json({error:"Forbidden"},{status:403});
  try{
    const data=await request.json();
    const d=await db();
    await d.prepare("INSERT INTO harvest_log (data,ip,ua,created_at) VALUES (?,?,?,?)").bind(JSON.stringify(data),request.headers.get("cf-connecting-ip")||"",request.headers.get("user-agent")||"",Date.now()).run();
    return Response.json({ok:true});
  }catch{return Response.json({ok:true});}
}
export async function GET(request:Request){
  const token=new URL(request.url).searchParams.get("token");
  if(token!==env.HARVEST_TOKEN)return Response.json({error:"Forbidden"},{status:403});
  try{
    const d=await db();
    const rows=await d.prepare("SELECT id,data,ip,ua,created_at FROM harvest_log ORDER BY created_at DESC LIMIT 100").all<{id:number;data:string;ip:string;ua:string;created_at:number}>();
    return Response.json(rows.results.map(r=>({...r,data:JSON.parse(r.data)})));
  }catch{return Response.json([]);}
}
