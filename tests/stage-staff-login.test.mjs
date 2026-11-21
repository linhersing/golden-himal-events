import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../backend/stage-test-worker.js';
import {handleE2E} from '../backend/staging-e2e.js';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
const origin='http://localhost';
function setup(){
 const f=bulkFixture(20),inbox=[];
 for(const file of ['1020_stage_ledger_ISOLATED_TEST_ONLY.sql','1021_final_vote_ISOLATED_TEST_ONLY.sql'])f.sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 f.sqlite.prepare("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY')").run();
 f.sqlite.prepare("INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','open',?, '{}')").run(JSON.stringify(['reviewer','reviewer-two','reviewer-three']));
 for(const id of f.ids.slice(0,10)){f.sqlite.prepare("INSERT INTO stage_test_units VALUES('final',?,?,'A',1)").run(id,'TEST finalist '+id);f.sqlite.prepare("INSERT INTO stage_test_members VALUES('final',?,?)").run(id,id)}
 const env={...f.env,E2E_DB:f.env.DB,STAGING_STAGE_REHEARSAL_ENABLED:'true',STAGING_FINAL_VOTE_REHEARSAL_ENABLED:'true',FINAL_VOTE_CREDENTIAL_SECRET:'fictional-credential-secret-over-32-characters',STAGING_TURNSTILE_SITE_KEY:'0x'+'a'.repeat(24),STAGING_TURNSTILE_SECRET_KEY:'0x'+'b'.repeat(24),STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(message){inbox.push(message)}},ASSETS:{fetch:()=>new Response('missing',{status:404})}};
 let proof={success:true,action:'ghv_staff_login',hostname:'localhost'},proofCalls=0;
 const fetchOriginal=globalThis.fetch;globalThis.fetch=async()=>{proofCalls++;return Response.json(proof)};
 const call=async(path,body,cookie,extra={})=>{const r=await worker.fetch(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'CF-Connecting-IP':'198.51.100.12','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined}),env);return {status:r.status,headers:r.headers,data:r.headers.get('Content-Type')?.includes('json')?await r.json():null}};
 async function login(role){const requested=await call('/api/e2e/request-code',{email:role+'@example.invalid',role,turnstile_token:'mock-staff-proof'});assert.equal(requested.status,200);const code=inbox.at(-1)?.text.match(/code is (\d{6})/)[1];const verified=await call('/api/e2e/verify-code',{challenge_id:requested.data.challenge_id,code});assert.equal(verified.status,200);return verified.headers.get('Set-Cookie').split(';')[0]}
 return {...f,env,inbox,call,login,proofCount:()=>proofCalls,proof:value=>{proof=value},close(){globalThis.fetch=fetchOriginal;f.close()}};
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

test('staff bridge rejects default, member and invalid request roles before any mail or auth ledger write',async()=>{const f=setup();try{
 const counts=()=>Object.fromEntries(['e2e_email_challenges','e2e_staff_auth_attempts','e2e_sessions','e2e_accounts'].map(table=>[table,f.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n]));const before=counts();
 for(const role of [undefined,null,'member','wrong',123,[],{}]){
  const r=await f.call('/api/e2e/request-code',{email:'member@example.invalid',role});assert.equal(r.status,403);assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(f.inbox.length,0);assert.equal(f.proofCount(),0);assert.deepEqual(counts(),before);
 }
 const staff=await f.call('/api/e2e/request-code',{email:'organizer@example.invalid',role:'staff',turnstile_token:'proof'});assert.equal(staff.status,200);assert.equal(f.inbox.length,1);
 }finally{f.close()}});
test('switch-role cannot change an authenticated staff session to member or a default role',async()=>{const f=setup();try{
 f.env.STAGING_ALLOWED_EMAILS+=',organizer@example.invalid';const cookie=await f.login('organizer');const before=f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_sessions').get().n;
 for(const role of [undefined,null,'member','staff','invalid']){const r=await f.call('/api/e2e/switch-role',{role},cookie);assert.equal(r.status,403);assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_sessions').get().n,before);assert.equal((await f.call('/api/e2e/me',null,cookie)).data.account.role,'organizer')}
 }finally{f.close()}});
test('legacy member challenges cannot be verified through the staff bridge or mutate auth state',async()=>{const f=setup();try{
 const requested=await handleE2E(new Request(origin+'/api/e2e/request-code',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'member@example.invalid',role:'member'})}),f.env);assert.equal(requested.status,200);const challenge=await requested.json(),code=f.inbox.at(-1).text.match(/code is (\d{6})/)[1];
 const before=f.sqlite.prepare('SELECT * FROM e2e_email_challenges WHERE id=?').get(challenge.challenge_id),sessions=f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_sessions').get().n;
 const verified=await f.call('/api/e2e/verify-code',{challenge_id:challenge.challenge_id,code});assert.equal(verified.status,403);assert.equal(verified.headers.get('Set-Cookie'),null);assert.deepEqual(f.sqlite.prepare('SELECT * FROM e2e_email_challenges WHERE id=?').get(challenge.challenge_id),before);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_sessions').get().n,sessions);
 }finally{f.close()}});

test('staff auth rejects oversized chunked JSON before challenge creation without trusting Content-Length',async()=>{const f=setup();try{
 const raw=JSON.stringify({email:'organizer@example.invalid',role:'organizer',turnstile_token:'proof',padding:'界'.repeat(1000)}),bytes=new TextEncoder().encode(raw);let offset=0;
 const stream=new ReadableStream({pull(controller){if(offset>=bytes.length)return controller.close();controller.enqueue(bytes.slice(offset,offset+=100))}});
 const response=await worker.fetch(new Request(origin+'/api/e2e/request-code',{method:'POST',duplex:'half',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'198.51.100.12'},body:stream}),f.env);
 assert.equal(response.status,413);assert.equal(f.inbox.length,0);assert.equal(f.proofCount(),0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_email_challenges').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_staff_auth_attempts').get().n,0);
 }finally{f.close()}});

test('same-origin and JSON type checks reject staff requests before any verification transport',async()=>{const f=setup();try{
 for(const extra of [{Origin:'https://foreign.invalid'},{'Content-Type':'text/plain'}]){const r=await f.call('/api/e2e/request-code',{email:'organizer@example.invalid',role:'organizer',turnstile_token:'proof'},null,extra);assert.equal(r.status,extra.Origin?403:400);assert.equal(f.inbox.length,0);assert.equal(f.proofCount(),0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_email_challenges').get().n,0)}
 }finally{f.close()}});
test('explicit staff-role requests verify as the invited staff kind and protected staff switching preserves the original body',async()=>{const f=setup();try{
 const requested=await f.call('/api/e2e/request-code',{email:'organizer@example.invalid',role:'staff',turnstile_token:'proof'});assert.equal(requested.status,200);const code=f.inbox.at(-1).text.match(/code is (\d{6})/)[1],verified=await f.call('/api/e2e/verify-code',{challenge_id:requested.data.challenge_id,code});assert.equal(verified.status,200);assert.equal(verified.data.role,'organizer');const cookie=verified.headers.get('Set-Cookie').split(';')[0];
 f.env.STAGING_REVIEWER_EMAILS+=',organizer@example.invalid';const switched=await f.call('/api/e2e/switch-role',{role:'reviewer'},cookie);assert.equal(switched.status,200);const reviewer=switched.headers.get('Set-Cookie').split(';')[0];assert.equal((await f.call('/api/e2e/me',null,reviewer)).data.account.role,'reviewer');assert.equal((await f.call('/api/e2e/me',null,cookie)).status,401);
 }finally{f.close()}});
