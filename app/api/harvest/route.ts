export const dynamic="force-dynamic";
export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(!origin||origin!==new URL(request.url).origin)return Response.json({error:"Forbidden"},{status:403});
  try{
    const data=await request.json();
    console.log("[harvest]",JSON.stringify(data));
    return Response.json({ok:true});
  }catch{return Response.json({ok:true});}
}
