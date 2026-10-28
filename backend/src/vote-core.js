// Private backend candidate for Cloudflare Workers + D1.
// NOT deployed; requires accounts, domain, secrets, reviewed legal rules.
// Production must fail closed unless the operator explicitly enables voting.
export function normalizedEmail(input){
  if(typeof input!=='string')return null;
  const email=input.trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)&&email.length<=254?email:null;
}
export function sixDigitCode(randomBytes){
  if(!(randomBytes instanceof Uint32Array)||randomBytes.length<1)throw new TypeError('Secure random Uint32Array required');
  // rejection sampling to avoid modulo bias
  const cap=4294000000; // floor(2^32 / 1,000,000) * 1,000,000
  if(randomBytes[0]>=cap)return null;
  return String(randomBytes[0]%1000000).padStart(6,'0');
}
export function getSecureCode(cryptoObject=crypto){
  let code=null;
  while(code===null) code=sixDigitCode(cryptoObject.getRandomValues(new Uint32Array(1)));
  return code;
}
export async function hmacHex(secret,value,cryptoObject=crypto){
  const encoder=new TextEncoder();
  const key=await cryptoObject.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await cryptoObject.subtle.sign('HMAC',key,encoder.encode(value)));
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export function publicFailure(message,status=400){
  return Response.json({ok:false,error:message},{status,headers:{'Cache-Control':'no-store'}});
}
export function isActive(round,now){
  return round?.state==='open'&&round.opens_at<=now&&now<round.closes_at;
}
