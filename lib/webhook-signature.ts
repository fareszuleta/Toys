export async function verifyStripeSignature(body:string, signature:string, secret:string, now=Date.now()):Promise<boolean> {
  const parts=signature.split(",").map(s=>s.trim().split("="));
  const timestamp=parts.find(([key])=>key==="t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now/1000-Number(timestamp))>300) return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const payload=new TextEncoder().encode(`${timestamp}.${body}`);
  for(const [type,value] of parts) {
    if(type!=="v1"||!value||!/^[a-f0-9]{64}$/.test(value)) continue;
    const bytes=Uint8Array.from(value.match(/../g)!,h=>parseInt(h,16));
    if(await crypto.subtle.verify("HMAC",key,bytes,payload)) return true;
  }
  return false;
}
