import {verifiedResendSender} from './staging-mail.js';

const VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ACTION='ghv_signup';
const liveKey=value=>typeof value==='string'&&/^0x[A-Za-z0-9_-]{16,}$/.test(value);

export async function publicSignupReady(env){
 if(env.STAGING_PUBLIC_SIGNUP_ENABLED!=='true'||env.STAGING_SUBMISSION_MODE!=='links'||
    !verifiedResendSender(env)||!liveKey(env.STAGING_TURNSTILE_SITE_KEY)||
    !liveKey(env.STAGING_TURNSTILE_SECRET_KEY))return false;
 try{
  await env.DB.prepare("SELECT mailbox_fingerprint,source_fingerprint FROM e2e_public_signup_accounts, e2e_public_signup_attempts LIMIT 0").all();
  return true;
 }catch{return false}
}

export async function humanSignupSource(request,env,token){
 // This Worker is the public edge. Read only Cloudflare's injected client IP.
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||!/^[a-f0-9:.]{3,45}$/i.test(ip)||typeof token!=='string'||!token||token.length>2048)return null;
 try{
  const response=await fetch(VERIFY_URL,{
   method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({secret:env.STAGING_TURNSTILE_SECRET_KEY,response:token,remoteip:ip}),
   signal:AbortSignal.timeout(5000)
  });
  if(!response.ok)return null;
  const result=await response.json();
  return result.success===true&&result.action===ACTION&&result.hostname===new URL(request.url).hostname?ip:null;
 }catch{return null}
}

export async function reservePublicSend(db,id,sourceFingerprint,now){
 // Retain at most one rolling day of the pseudonymous send ledger.
 await db.prepare('DELETE FROM e2e_public_signup_attempts WHERE created_at<=?').bind(now-86400).run();
 // Use one D1 write for both limits so simultaneous requests share the same budget.
 const reservation=await db.prepare(
  'INSERT INTO e2e_public_signup_attempts(challenge_id,source_fingerprint,created_at) SELECT ?,?,? '+
  'WHERE (SELECT COUNT(*) FROM e2e_public_signup_attempts WHERE source_fingerprint=? AND created_at>?)<8 '+
  'AND (SELECT COUNT(*) FROM e2e_public_signup_attempts WHERE created_at>?)<40'
 ).bind(id,sourceFingerprint,now,sourceFingerprint,now-600,now-86400).run();
 return Boolean(reservation.meta?.changes);
}
