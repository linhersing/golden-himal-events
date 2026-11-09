/* Golden Himal Voice TEST-only password onboarding. No Email or phone required.
 * This module is opt-in, uses an isolated D1 migration, and never grants staff roles.
 */
import {humanSignupSource} from './staging-public-signup.js';

const ITERATIONS=600000;
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const validUser=u=>typeof u==='string'&&/^[a-z][a-z0-9._-]{3,31}$/.test(u);
const validPassword=p=>typeof p==='string'&&[...p].length>=15&&[...p].length<=128&&encoder.encode(p).length<=512;
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0};
const keyString=s=>typeof s==='string'&&/^0x[A-Za-z0-9_-]{16,}$/.test(s);

async function derive(password,salt){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits(
  {name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:Uint8Array.from(salt.match(/../g).map(x=>parseInt(x,16)))},key,256)));
}
function recoveryCode(){
 const bytes=hex(randomBytes(16));
 return 'GHV-'+bytes.match(/.{1,4}/g).join('-').toUpperCase();
}
const normalizeRecovery=value=>typeof value==='string'?value.trim().toUpperCase():'';

export async function passwordModeReady(env){
 if(env.STAGING_PASSWORD_SIGNUP_ENABLED!=='true'||env.STAGING_SUBMISSION_MODE!=='links'||
    !keyString(env.STAGING_TURNSTILE_SITE_KEY)||!keyString(env.STAGING_TURNSTILE_SECRET_KEY)||
    !env.DB||typeof env.STAGING_IDENTITY_SECRET!=='string'||env.STAGING_IDENTITY_SECRET.length<32)return false;
 try{
  await env.DB.prepare('SELECT account_id FROM e2e_password_accounts LIMIT 0').all();
  await env.DB.prepare('SELECT id FROM e2e_password_attempts LIMIT 0').all();
  return true;
 }catch{return false}
}
async function budget(db,source,kind,now,uuid){
 const window=kind==='register'?86400:600;
 const perSource=kind==='register'?5:kind==='recover'?5:20;
 const total=kind==='register'?40:kind==='recover'?40:200;
 await db.prepare('DELETE FROM e2e_password_attempts WHERE created_at<=?').bind(now-86400).run();
 const result=await db.prepare(
  'INSERT INTO e2e_password_attempts(id,source_fingerprint,kind,created_at) SELECT ?,?,?,? '+
  'WHERE (SELECT COUNT(*) FROM e2e_password_attempts WHERE source_fingerprint=? AND kind=? AND created_at>?)<? '+
  'AND (SELECT COUNT(*) FROM e2e_password_attempts WHERE kind=? AND created_at>?)<?'
 ).bind(uuid(),source,kind,now,source,kind,now-window,perSource,kind,now-window,total).run();
 return Boolean(result.meta?.changes);
}
export async function passwordIdentity(env,accountId){
 if(!await passwordModeReady(env))return false;
 return Boolean(await env.DB.prepare('SELECT account_id FROM e2e_password_accounts WHERE account_id=?').bind(accountId).first());
}
export async function passwordRequest(request,env,context){
 const {json,deny,uuid,NOW,bodyJSON,sign,newSession,cookie}=context;
 if(!await passwordModeReady(env))return deny('password_test_not_ready',503);
 const path=new URL(request.url).pathname;
 const b=await bodyJSON(request,1500);
 if(!b)return deny('invalid_json',400);
 const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
 if(!validUser(username))return deny('invalid_username',422);
 const action=path.endsWith('/password-register')?'register':path.endsWith('/password-recover')?'recover':'login';
 if(!validPassword(b.password)&&action!=='login')return deny('invalid_password',422);
 if(action==='login'&&typeof b.password!=='string')return deny('invalid_credentials',401);
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>45||!/^[a-f0-9:.]{3,45}$/i.test(ip))return deny('password_request_blocked',403);
 if(action==='register'){
  const source=await humanSignupSource(request,env,b.turnstile_token);
  if(!source)return deny('human_check_required',403);
 }
 const now=NOW();
 const sourceHash=await sign(env,'password-rate:'+ip);
 if(!await budget(env.DB,sourceHash,action,now,uuid))return deny('too_many_password_attempts',429);
 const userHash=await sign(env,'password-username:'+username);
 if(action==='register'){
  if(typeof env.DB.batch!=='function')return deny('password_test_not_ready',503);
  if(await env.DB.prepare('SELECT account_id FROM e2e_password_accounts WHERE username_fingerprint=?').bind(userHash).first())
   return deny('username_taken',409);
  const accountId=uuid(),salt=hex(randomBytes(16)),passwordHash=await derive(b.password,salt),rescue=recoveryCode();
  const rescueHash=await sign(env,'password-rescue:'+rescue);
  try{
   await env.DB.batch([
    env.DB.prepare('INSERT INTO e2e_accounts(id,email_fingerprint,email_hint,role,verified_at,created_at) VALUES(?,?,?,?,?,?)')
     .bind(accountId,await sign(env,'password-account:'+username),'test-username-account','member',now,now),
    env.DB.prepare('INSERT INTO e2e_password_accounts(account_id,username_fingerprint,password_salt,password_hash,recovery_fingerprint,created_at) VALUES(?,?,?,?,?,?)')
     .bind(accountId,userHash,salt,passwordHash,rescueHash,now)
   ]);
  }catch{return deny('username_taken_or_storage_error',409)}
  const token=await newSession(env,{id:accountId,role:'member'});
  return json({ok:true,role:'member',recovery_code:rescue,testOnly:true},201,{'Set-Cookie':cookie(token)});
 }
 const record=await env.DB.prepare(
  'SELECT p.*,a.role FROM e2e_password_accounts p JOIN e2e_accounts a ON a.id=p.account_id WHERE p.username_fingerprint=?'
 ).bind(userHash).first();
 if(!record||record.role!=='member')return deny(action==='recover'?'invalid_recovery':'invalid_credentials',401);
 if(record.locked_until>now)return deny('account_temporarily_locked',429);
 if(action==='login'){
  if(!validPassword(b.password))return deny('invalid_credentials',401);
  const candidate=await derive(b.password,record.password_salt);
  if(!equal(candidate,record.password_hash)){
   await env.DB.prepare('UPDATE e2e_password_accounts SET failed_count=failed_count+1,locked_until=CASE WHEN failed_count>=4 THEN ? ELSE locked_until END WHERE account_id=?')
    .bind(now+900,record.account_id).run();
   return deny('invalid_credentials',401);
  }
  await env.DB.prepare('UPDATE e2e_password_accounts SET failed_count=0,locked_until=0 WHERE account_id=?').bind(record.account_id).run();
  const token=await newSession(env,{id:record.account_id,role:'member'});
  return json({ok:true,role:'member',testOnly:true},200,{'Set-Cookie':cookie(token)});
 }
 const rescue=normalizeRecovery(b.recovery_code);
 if(!/^GHV-(?:[0-9A-F]{4}-){7}[0-9A-F]{4}$/.test(rescue)||
    !equal(await sign(env,'password-rescue:'+rescue),record.recovery_fingerprint)){
  await env.DB.prepare('UPDATE e2e_password_accounts SET failed_count=failed_count+1,locked_until=CASE WHEN failed_count>=4 THEN ? ELSE locked_until END WHERE account_id=?')
   .bind(now+900,record.account_id).run();
  return deny('invalid_recovery',401);
 }
 const salt=hex(randomBytes(16)),replacement=recoveryCode();
 await env.DB.prepare('UPDATE e2e_password_accounts SET password_salt=?,password_hash=?,recovery_fingerprint=?,failed_count=0,locked_until=0 WHERE account_id=? AND recovery_fingerprint=?')
 .bind(salt,await derive(b.password,salt),await sign(env,'password-rescue:'+replacement),record.account_id,record.recovery_fingerprint).run();
 await env.DB.prepare('DELETE FROM e2e_sessions WHERE account_id=?').bind(record.account_id).run();
 const token=await newSession(env,{id:record.account_id,role:'member'});
 return json({ok:true,role:'member',recovery_code:replacement,testOnly:true},200,{'Set-Cookie':cookie(token)});
}
