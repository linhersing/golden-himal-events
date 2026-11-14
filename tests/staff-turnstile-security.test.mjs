import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://golden-himal-voice-preview.linhersing.workers.dev';
const siteKey='0x'+'A'.repeat(24),secret='0x'+'B'.repeat(24);
function adapter(db){return {prepare(sql){let args=[];return{
 bind(...xs){args=xs;return this},
 first(){return db.prepare(sql).get(...args)||null},
 all(){return {results:db.prepare(sql).all(...args)}},
 run(){const x=db.prepare(sql).run(...args);return {meta:{changes:x.changes}}}
}}}}
function post(path,body,ip='198.51.100.23',cookie){
 return new Request(host+path,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',
 ...(ip?{'CF-Connecting-IP':ip}:{}),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
}
const get=path=>new Request(host+path);
async function setup(flag='true'){
 const db=new DatabaseSync(':memory:');
 db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const inbox=[],env={
  STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'G'.repeat(64),
  STAGING_FROM_EMAIL:'test@example.invalid',
  STAGING_ORGANIZER_EMAILS:'boss@example.invalid',
  STAGING_REVIEWER_EMAILS:'judge@example.invalid',
  STAGING_ALLOWED_EMAILS:'boss@example.invalid',
  STAGING_TURNSTILE_SITE_KEY:siteKey,
  STAGING_TURNSTILE_SECRET_KEY:secret,
  STAGING_STAFF_TURNSTILE_REQUIRED:flag,DB:adapter(db),
  EMAIL:{async send(message){inbox.push(message);return {id:'mock-mail'}}}
 };
 return {db,env,inbox};
}

test('required staff Turnstile fails closed, checks hostname and staff action for BOTH roles',async()=>{
 const {db,env,inbox}=await setup();
 const original=globalThis.fetch;
 let siteverifyCalls=0,action='ghv_staff_login',hostname=new URL(host).hostname;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const payload=JSON.parse(options.body);assert.equal(payload.secret,secret);
  assert.equal(payload.remoteip,'198.51.100.23');siteverifyCalls++;
  return Response.json({success:payload.response==='valid-staff',hostname,action});
 };
 try{
  const config=await (await handleE2E(get('/api/e2e/staff-login-config'),env)).json();
  assert.equal(config.required,true);assert.equal(config.siteKey,siteKey);
  assert.ok(!('secret' in config));
  for(const email of ['boss@example.invalid','judge@example.invalid']){
   for(const requestedRole of ['staff',email.startsWith('boss')?'organizer':'reviewer']){
    const noToken=await handleE2E(post('/api/e2e/request-code',{email,role:requestedRole}),env);
    assert.equal(noToken.status,403,'staff cannot send OTP without challenge');
   }
  }
  assert.equal(inbox.length,0);
  let denied=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'staff',turnstile_token:'invalid'}),env);
  assert.equal(denied.status,403);
  action='ghv_signup';
  denied=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'staff',turnstile_token:'valid-staff'}),env);
  assert.equal(denied.status,403,'member/signup challenge cannot replace staff challenge');
  action='ghv_staff_login';hostname='evil.example';
  denied=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'staff',turnstile_token:'valid-staff'}),env);
  assert.equal(denied.status,403,'wrong domain token is rejected');
  hostname=new URL(host).hostname;
  for(const [email,role] of [['boss@example.invalid','organizer'],['judge@example.invalid','reviewer']]){
   const issued=await handleE2E(post('/api/e2e/request-code',{email,role:'staff',turnstile_token:'valid-staff'}),env);
   assert.equal(issued.status,200,await issued.clone().text());
   const challenge=(await issued.json()).challenge_id;
   const otp=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
   const verified=await handleE2E(post('/api/e2e/verify-code',{challenge_id:challenge,code:otp},null),env);
   assert.equal(verified.status,200);
   const details=await verified.json();assert.equal(details.role,role);
  }
  assert.equal(inbox.length,2);assert.ok(siteverifyCalls>=4);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_email_challenges').get().n,2);
 }finally{globalThis.fetch=original;db.close()}
});

test('member session cannot bypass staff human-check by switch-role',async()=>{
 const {db,env,inbox}=await setup();
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({success:true,hostname:new URL(host).hostname,action:'ghv_staff_login'});
 try{
  const request=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'member'}),env);
  assert.equal(request.status,200);
  const id=(await request.json()).challenge_id;
  const code=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
  const login=await handleE2E(post('/api/e2e/verify-code',{challenge_id:id,code},null),env);
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const swapped=await handleE2E(post('/api/e2e/switch-role',{role:'organizer'},null,cookie),env);
  assert.equal(swapped.status,403);
  assert.equal((await swapped.json()).error,'staff_reauthentication_required');
  const orgMail=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'staff',turnstile_token:'pass'}),env);
  assert.equal(orgMail.status,200);
 }finally{globalThis.fetch=original;db.close()}
});

test('disabled rollout retains invited staff OTP; enabled without keys fails closed',async()=>{
 const {db,env,inbox}=await setup('false');
 try{
  const config=await (await handleE2E(get('/api/e2e/staff-login-config'),env)).json();
  assert.equal(config.required,false);
  assert.equal((await handleE2E(post('/api/e2e/request-code',{email:'judge@example.invalid',role:'staff'}),env)).status,200);
  assert.equal(inbox.length,1);
  env.STAGING_STAFF_TURNSTILE_REQUIRED='true';
  delete env.STAGING_TURNSTILE_SECRET_KEY;
  const fail=await handleE2E(post('/api/e2e/request-code',{email:'boss@example.invalid',role:'staff',turnstile_token:'fake'}),env);
  assert.equal(fail.status,503);
  const missing=await (await handleE2E(get('/api/e2e/staff-login-config'),env)).json();
  assert.equal(missing.required,true);assert.ok(!missing.siteKey);
 }finally{db.close()}
});
