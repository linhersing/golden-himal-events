import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../backend/stage-test-worker.js';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
const origin='http://localhost';
function setup(){
 const f=bulkFixture(20),inbox=[];
 for(const file of ['1020_stage_ledger_ISOLATED_TEST_ONLY.sql','1021_final_vote_ISOLATED_TEST_ONLY.sql'])f.sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 f.sqlite.prepare("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY')").run();
 f.sqlite.prepare("INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','open',?, '{}')").run(JSON.stringify(['reviewer','reviewer-two','reviewer-three']));
 for(const id of f.ids.slice(0,10)){f.sqlite.prepare("INSERT INTO stage_test_units VALUES('final',?,?,'A',1)").run(id,'TEST finalist '+id);f.sqlite.prepare("INSERT INTO stage_test_members VALUES('final',?,?)").run(id,id)}
 const env={...f.env,E2E_DB:f.env.DB,STAGING_STAGE_REHEARSAL_ENABLED:'true',STAGING_FINAL_VOTE_REHEARSAL_ENABLED:'true',FINAL_VOTE_CREDENTIAL_SECRET:'fictional-credential-secret-over-32-characters',STAGING_TURNSTILE_SITE_KEY:'0x'+'a'.repeat(24),STAGING_TURNSTILE_SECRET_KEY:'0x'+'b'.repeat(24),STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(message){inbox.push(message)}},ASSETS:{fetch:()=>new Response('missing',{status:404})}};
 let proof={success:true,action:'ghv_staff_login',hostname:'localhost'};
 const fetchOriginal=globalThis.fetch;globalThis.fetch=async()=>Response.json(proof);
 const call=async(path,body,cookie,extra={})=>{const r=await worker.fetch(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'CF-Connecting-IP':'198.51.100.12','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined}),env);return {status:r.status,headers:r.headers,data:r.headers.get('Content-Type')?.includes('json')?await r.json():null}};
 async function login(role){const requested=await call('/api/e2e/request-code',{email:role+'@example.invalid',role,turnstile_token:'mock-staff-proof'});assert.equal(requested.status,200);const code=inbox.at(-1)?.text.match(/code is (\d{6})/)[1];const verified=await call('/api/e2e/verify-code',{challenge_id:requested.data.challenge_id,code});assert.equal(verified.status,200);return verified.headers.get('Set-Cookie').split(';')[0]}
 return {...f,env,inbox,call,login,proof:value=>{proof=value},close(){globalThis.fetch=fetchOriginal;f.close()}};
}
test('OTP protocol creates a real organizer cookie usable by isolated final-stage and ballot APIs',async()=>{const f=setup();try{
 const cookie=await f.login('organizer');assert.match(cookie,/^__Host-ghv-e2e=[a-f0-9]{64}$/);
 const me=await f.call('/api/e2e/me',null,cookie);assert.equal(me.data.account.role,'organizer');assert.equal(me.data.judging_policy.mode,'final_only');
 const stage=await f.call('/api/stage-test',{operation:'read',stage:'final'},cookie);assert.equal(stage.status,200);assert.equal(stage.data.units.length,10);
 assert.equal((await f.call('/api/vote-test',{operation:'initialize'},cookie)).status,200);
 assert.equal((await f.call('/api/vote-test',{operation:'read'},cookie)).data.actor.role,'organizer');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,20);
 }finally{f.close()}});
test('reviewer OTP cannot exercise organizer actions and logout invalidates the issued cookie',async()=>{const f=setup();try{
 const cookie=await f.login('reviewer');const stage=await f.call('/api/stage-test',{operation:'read',stage:'final'},cookie);assert.equal(stage.status,200);assert(!Object.hasOwn(stage.data,'preview'));
 assert.equal((await f.call('/api/vote-test',{operation:'initialize'},cookie)).status,403);
 assert.equal((await f.call('/api/e2e/logout',{},cookie)).status,200);
 assert.equal((await f.call('/api/e2e/me',null,cookie)).status,401);assert.equal((await f.call('/api/stage-test',{operation:'read',stage:'final'},cookie)).status,401);
 }finally{f.close()}});
test('expired sessions and uninvited or incorrectly proved staff never access the rehearsal',async()=>{const f=setup();try{
 for(const changed of [{hostname:'wrong.invalid',action:'ghv_staff_login'},{hostname:'localhost',action:'ghv_signup'}]){f.proof({success:true,...changed});assert.equal((await f.call('/api/e2e/request-code',{email:'organizer@example.invalid',role:'organizer',turnstile_token:'proof'})).status,403)}
 assert.equal(f.inbox.length,0);f.proof({success:true,hostname:'localhost',action:'ghv_staff_login'});
 const unknown=await f.call('/api/e2e/request-code',{email:'outsider@example.invalid',role:'reviewer',turnstile_token:'proof'});assert.equal(unknown.status,200);assert.equal(f.inbox.length,0);
 assert.equal((await f.call('/api/e2e/verify-code',{challenge_id:unknown.data.challenge_id,code:'123456'})).status,401);
 const cookie=await f.login('organizer');f.sqlite.prepare("UPDATE e2e_sessions SET expires_at=1 WHERE account_id='organizer'").run();assert.equal((await f.call('/api/e2e/me',null,cookie)).status,401);
 assert.equal((await f.call('/api/vote-test',{operation:'initialize'},cookie)).status,403);
 }finally{f.close()}});
test('the auth bridge denies unlisted E2E APIs, cross-origin requests and missing staff protection',async()=>{const f=setup();try{
 assert.equal((await f.call('/api/e2e/request-code',{email:'organizer@example.invalid',role:'organizer',turnstile_token:'proof'},null,{Origin:'https://wrong.invalid'})).status,403);
 const cookie=await f.login('organizer');for(const path of ['organizer-queue','organizer-promote','test-vote','applications','password-register'])assert.equal((await f.call('/api/e2e/'+path,{},cookie)).status,404);
 f.env.STAGING_STAFF_TURNSTILE_REQUIRED='false';assert.equal((await f.call('/api/e2e/staff-login-config')).status,503);
 }finally{f.close()}});
