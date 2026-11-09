import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';

const origin='https://golden-himal-voice-preview.linhersing.workers.dev';
const makeDb=()=>{const db=new DatabaseSync(':memory:');return db};
function adapter(db){
 const statement=(sql,values=[])=>({
  bind(...args){return statement(sql,args)},
  first:async()=>db.prepare(sql).get(...values)||null,
  all:async()=>({results:db.prepare(sql).all(...values)}),
  run:async()=>{const r=db.prepare(sql).run(...values);return {meta:{changes:r.changes}}}
 });
 return {
  prepare:sql=>statement(sql),
  async batch(operations){
   db.exec('BEGIN IMMEDIATE');
   try{const values=[];for(const operation of operations)values.push(await operation.run());db.exec('COMMIT');return values}
   catch(error){db.exec('ROLLBACK');throw error}
  }
 };
}
const req=(path,data,cookie,ip='127.0.0.1')=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...cookie?{Cookie:cookie}:{}},body:JSON.stringify(data)});
const get=(path,cookie)=>new Request(origin+path,{headers:cookie?{Cookie:cookie}:{}});

test('username-only TEST registration, account isolation, password recovery and legacy denial',async()=>{
 const db=makeDb();
 try{
  db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
  db.exec(await readFile(new URL('../backend/migrations/1005_password_members_STAGING_ONLY.sql',import.meta.url),'utf8'));
  const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_PASSWORD_SIGNUP_ENABLED:'true',
   STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:'S'.repeat(64),
   STAGING_TURNSTILE_SITE_KEY:'0x'+'A'.repeat(30),STAGING_TURNSTILE_SECRET_KEY:'0x'+'B'.repeat(30)};
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({success:true,action:'ghv_signup',hostname:'golden-himal-voice-preview.linhersing.workers.dev'});
  try{
   assert.equal((await (await handleE2E(get('/api/e2e/password-config'),env)).json()).enabled,true);
   assert.equal((await handleE2E(req('/api/e2e/password-register',{username:'myname',password:'not-enough'},undefined),env)).status,422);
   const result=await handleE2E(req('/api/e2e/password-register',{username:'myname',password:'a sufficiently long example passphrase',turnstile_token:'simulated-turnstile-token'},undefined),env);
   assert.equal(result.status,201,JSON.stringify(await result.clone().json()));
   const data=await result.json();
   assert.match(data.recovery_code,/^GHV-(?:[0-9A-F]{4}-){7}[0-9A-F]{4}$/);
   const cookie=result.headers.get('set-cookie').split(';')[0];
   const me=await handleE2E(get('/api/e2e/me',cookie),env);
   assert.equal(me.status,200);
   const account=(await me.json()).account;assert.deepEqual(account.available_roles,['member']);
   assert.equal(account.role,'member');
   assert.equal(JSON.stringify(account).includes('email'),false);
   const duplicate=await handleE2E(req('/api/e2e/password-register',{username:'myname',password:'another sufficiently long password',turnstile_token:'simulated-turnstile-token'}),env);
   assert.equal(duplicate.status,409);
   assert.equal(db.prepare('SELECT COUNT(*) as n FROM e2e_password_accounts').get().n,1);
   const signout=await handleE2E(req('/api/e2e/logout',{},cookie),env);assert.equal(signout.status,200);
   assert.equal((await handleE2E(get('/api/e2e/me',cookie),env)).status,401);
   assert.equal((await handleE2E(req('/api/e2e/password-login',{username:'myname',password:'wrong wrong wrong wrong'}),env)).status,401);
   const signed=await handleE2E(req('/api/e2e/password-login',{username:'myname',password:'a sufficiently long example passphrase'}),env);
   assert.equal(signed.status,200);
   const memberCookie=signed.headers.get('set-cookie').split(';')[0];
   const form={round_code:'2027-01',category:'university',province:'bagmati',location_basis:'study',affiliation:'TEST SCHOOL',
     stage_name:'TEST MEMBER',song_title:'TEST SONG',original_artist:'TEST ARTIST',song_language:'Nepali',song_key:'C',
     demo_url:'https://youtube.com/watch?v=fictionalDemo',student_confirmed:true,no_exclusive_contract:true};
   const submitted=await handleE2E(req('/api/e2e/applications',form,memberCookie),env);
   assert.equal(submitted.status,201,JSON.stringify(await submitted.clone().json()));
   const read=await handleE2E(get('/api/e2e/applications',memberCookie),env);
   assert.equal((await read.json()).applications.length,1);
   assert.equal((await handleE2E(req('/api/e2e/switch-role',{role:'organizer'},memberCookie),env)).status,403);
   const reset=await handleE2E(req('/api/e2e/password-recover',{username:'myname',recovery_code:data.recovery_code,password:'new sufficiently long sample password'}),env);
   assert.equal(reset.status,200,JSON.stringify(await reset.clone().json()));
   const replacement=(await reset.json()).recovery_code;assert.notEqual(replacement,data.recovery_code);
   assert.equal((await handleE2E(req('/api/e2e/password-recover',{username:'myname',recovery_code:data.recovery_code,password:'another sufficiently long password'}),env)).status,401);
   assert.equal((await handleE2E(req('/api/e2e/password-login',{username:'myname',password:'a sufficiently long example passphrase'}),env)).status,401);
   assert.equal((await handleE2E(req('/api/e2e/password-login',{username:'myname',password:'new sufficiently long sample password'}),env)).status,200);
   const plain=JSON.stringify(db.prepare('SELECT * FROM e2e_password_accounts').get());
   assert(!plain.includes('new sufficiently long sample password'),'DB never stores raw passwords');
   assert(!plain.includes(data.recovery_code),'DB never stores recovery code');
  }finally{globalThis.fetch=previousFetch}
 }finally{db.close()}
});

test('username signup stays closed unless flag, Turnstile and isolated migration are ready',async()=>{
 const db=makeDb();try{
  db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
  const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_PASSWORD_SIGNUP_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:'S'.repeat(64),STAGING_TURNSTILE_SITE_KEY:'0x'+'A'.repeat(30),STAGING_TURNSTILE_SECRET_KEY:'0x'+'B'.repeat(30)};
  assert.equal((await (await handleE2E(get('/api/e2e/password-config'),env)).json()).enabled,false);
  assert.equal((await handleE2E(req('/api/e2e/password-register',{username:'testname',password:'an appropriately long password'}),env)).status,503);
  db.exec(await readFile(new URL('../backend/migrations/1005_password_members_STAGING_ONLY.sql',import.meta.url),'utf8'));
  assert.equal((await handleE2E(get('/api/e2e/password-config'),{...env,STAGING_PASSWORD_SIGNUP_ENABLED:'false'})).status,503,'with no Email fallback and password switch off the API must fail closed');
  assert.equal((await (await handleE2E(get('/api/e2e/password-config'),{...env,STAGING_TURNSTILE_SECRET_KEY:''})).json()).enabled,false);
 }finally{db.close()}
});
