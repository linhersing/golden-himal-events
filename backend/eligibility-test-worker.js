import {handleE2E} from './staging-e2e.js';
import {cleanupEligibility,handleEligibility,syntheticReady} from './eligibility-documents.js';
import {humanSignupSource} from './staging-public-signup.js';
import {staffLoginConfig} from './staging-staff-security.js';

const route='/api/e2e/eligibility-document';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const fail=(error,status)=>Response.json({ok:false,error},{status,headers});
// This is not a general E2E proxy: only the existing OTP/session protocol is
// reachable, on the same synthetic loopback resources as the document routes.
const loginMethods=new Map([
 ['/api/e2e/signup-config','GET'],['/api/e2e/staff-login-config','GET'],
 ['/api/e2e/request-code','POST'],['/api/e2e/verify-code','POST'],
 ['/api/e2e/me','GET'],['/api/e2e/logout','POST']
]);
const loginRoles=new Set(['member','organizer']);
async function loginBody(request){
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return null;
 const reader=request.clone().body?.getReader();if(!reader)return null;
 const parts=[];let size=0;
 while(true){
  const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;
  if(size>2600){void reader.cancel().catch(()=>{});return null;}
  parts.push(value);
 }
 const bytes=new Uint8Array(size);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{const body=JSON.parse(new TextDecoder().decode(bytes));return body&&typeof body==='object'&&!Array.isArray(body)?body:null;}
 catch{return null;}
}
async function login(request,env,url){
 // Invited synthetic accounts only: public signup would consume a second
 // CAPTCHA token and allow identities outside this rehearsal's invitation list.
 if(env.STAGING_STAFF_TURNSTILE_REQUIRED!=='true'||env.STAGING_PUBLIC_SIGNUP_ENABLED!=='false')return fail('eligibility_test_unavailable',503);
 const mapped={...env,DB:env.ELIGIBILITY_TEST_D1};
 if(url.pathname.endsWith('/signup-config')){
  const config=await staffLoginConfig(mapped);
  return config.siteKey?Response.json({ok:true,testOnly:true,mode:'invited',...config},{headers}):fail('eligibility_test_unavailable',503);
 }
 if(['/api/e2e/request-code','/api/e2e/verify-code'].includes(url.pathname)){
  if(request.headers.get('Origin')!==url.origin)return fail('origin_not_allowed',403);
  const body=await loginBody(request);if(!body)return fail('invalid_json',400);
  if(url.pathname.endsWith('/request-code')){
   if(!loginRoles.has(body.role))return fail('role_not_allowed',403);
   if(body.role==='member'){
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!String(env.STAGING_ALLOWED_EMAILS||'').split(',').some(value=>value.trim().toLowerCase()===email&&email))return fail('not_on_test_allowlist',403);
    if(!(await staffLoginConfig(mapped)).siteKey)return fail('eligibility_test_unavailable',503);
    // handleE2E skips CAPTCHA for invited members; check it here exactly once.
    if(!await humanSignupSource(request,mapped,body.turnstile_token,'ghv_signup'))return fail('human_check_required',403);
   }
  }else if(typeof body.challenge_id==='string'&&/^[-a-f0-9]{36}$/i.test(body.challenge_id)){
   const challenge=await mapped.DB.prepare('SELECT kind FROM e2e_email_challenges WHERE id=?').bind(body.challenge_id).first();
   if(challenge&&!loginRoles.has(challenge.kind))return fail('role_not_allowed',403);
  }
 }
 return handleE2E(request,mapped);
}

// Isolated loopback test worker only. The site's regular Worker never imports it.
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!syntheticReady(url,env))return fail('not_found',404);
  if(loginMethods.has(url.pathname)){
   if(request.method!==loginMethods.get(url.pathname))return fail('method_not_allowed',405);
   try{return await login(request,env,url);}
   catch{return fail('eligibility_test_unavailable',503);}
  }
  if(request.method==='GET'&&['/eligibility-test.html','/eligibility-test.css','/eligibility-test.js'].includes(url.pathname)&&env.ELIGIBILITY_TEST_ASSETS){
   const asset=await env.ELIGIBILITY_TEST_ASSETS.fetch(request);
   const safe=new Headers(asset.headers);
   for(const [key,value] of Object.entries(headers))safe.set(key,value);
   safe.set('Content-Security-Policy',"default-src 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
   safe.set('Referrer-Policy','no-referrer');
   return new Response(asset.body,{status:asset.status,headers:safe});
  }
  if(![route,route+'/download'].includes(url.pathname))return fail('not_found',404);
  try{
   const cookies=request.headers.get('cookie');
   const session=await handleE2E(new Request(new URL('/api/e2e/me',url),{headers:cookies?{Cookie:cookies}:{}}),{...env,DB:env.ELIGIBILITY_TEST_D1});
   if(session.status===401)return fail('login_required',401);
   if(!session.ok)return fail('eligibility_test_unavailable',503);
   return await handleEligibility(request,env,(await session.json()).account);
  }catch{return fail('eligibility_test_unavailable',503);}
 },
 async scheduled(_event,env){
  if(syntheticReady(new URL('http://localhost'),env))await cleanupEligibility(env);
 }
};
