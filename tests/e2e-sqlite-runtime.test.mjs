import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://golden-himal-voice-preview.linhersing.workers.dev';
function adapter(db){return {prepare(sql){let args=[];return {
 bind(...values){args=values;return this},
 first(){return db.prepare(sql).get(...args)||null},
 all(){return {results:db.prepare(sql).all(...args)}},
 run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}
}}}}
const req=(path,obj,cookie)=>new Request(host+path,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(obj)});
const get=(path,cookie)=>new Request(host+path,{headers:cookie?{Cookie:cookie}:{}});

for (const mode of ['uploads','links']) test(`Alan V2 ${mode}: persisted audition -> mock fee -> 3 judges -> live -> final -> vote`,async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const inbox=[],r2=new Map(),env={
  STAGING_E2E_ENABLED:'true',STAGING_SUBMISSION_MODE:mode,STAGING_IDENTITY_SECRET:'G'.repeat(64),
  STAGING_ALLOWED_EMAILS:'singer@test.invalid,voter@test.invalid',
  STAGING_REVIEWER_EMAILS:'judge1@test.invalid,judge2@test.invalid,judge3@test.invalid',
  STAGING_ORGANIZER_EMAILS:'organizer@test.invalid',
  STAGING_FROM_EMAIL:'test@example.invalid',
  DB:adapter(db),
  EMAIL:{async send(m){inbox.push(m);return {id:'mail-test'}}},
  STAGING_MEDIA:{async put(k,d,m){r2.set(k,{data:d,metadata:m})},async get(k){const v=r2.get(k);return v?{body:v.data,httpMetadata:v.metadata.httpMetadata}:null},async delete(k){r2.delete(k)}}
 };
 async function auth(email,role){
  const start=await handleE2E(req('/api/e2e/request-code',{email,role}),env);assert.equal(start.status,200,email+' start');
  const challenge=(await start.json()).challenge_id;
  const code=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
  const verified=await handleE2E(req('/api/e2e/verify-code',{challenge_id:challenge,code}),env);
  assert.equal(verified.status,200,email+' verify');return verified.headers.get('set-cookie').split(';')[0];
 }
 async function upload(cookie,id,kind,type){
  const r=await handleE2E(new Request(host+'/api/e2e/demo-upload?application='+id+'&kind='+kind,{
   method:'POST',headers:{Origin:host,Cookie:cookie,'Content-Type':type},body:new Uint8Array(512)
  }),env);assert.equal(r.status,200,kind+' '+JSON.stringify(await r.clone().json()));return r;
 }
 if(mode==='links')delete env.STAGING_MEDIA;
 try{
  assert.equal((await handleE2E(req('/api/e2e/request-code',{email:'not-listed@test.invalid',role:'organizer'}),env)).status,403);
  const member=await auth('singer@test.invalid','member');
  const request={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',
   affiliation:'TEST JOB',stage_name:'TEST SINGER',song_title:'TEST SONG',original_artist:'TEST ORIGINAL',
   song_language:'Nepali',song_key:'C',demo_url:mode==='links'?'https://drive.google.com/file/d/fictional-test-performance/view?usp=sharing':'',adult_confirmed:true,no_exclusive_contract:true};
  assert.equal((await handleE2E(req('/api/e2e/applications',{...request,round_code:'2027-09'},member),env)).status,400);
  assert.equal((await handleE2E(req('/api/e2e/applications',{...request,adult_confirmed:false},member),env)).status,422);
  if(mode==='links'){
   for(const demo_url of ['', 'javascript:alert(1)', 'http://youtu.be/test', 'https://user:secret@youtube.com/watch?v=test', 'https://localhost/demo', 'https://127.0.0.1/demo', 'https://youtube.com:8443/demo', 'https://youtube.com/'+ 'x'.repeat(2100)]){
    const rejected=await handleE2E(req('/api/e2e/applications',{...request,demo_url},member),env);
    assert.equal(rejected.status,422,'reject unsafe/empty link '+demo_url.slice(0,60));
   }
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n,0);
  }
  const created=await handleE2E(req('/api/e2e/applications',request,member),env);
  assert.equal(created.status,201,JSON.stringify(await created.clone().json()));
  const appId=(await created.json()).application_id;
  assert.equal(db.prepare('SELECT round_code FROM e2e_applications').get().round_code,'2027-01');
  // D1 table, not the browser, is the authoritative application record.
  assert.equal((await (await handleE2E(get('/api/e2e/applications',member),env)).json()).applications[0].id,appId);
  assert.equal((await handleE2E(req('/api/e2e/applications',{...request,round_code:'2027-04',category:'university',student_confirmed:true},member),env)).status,409);
  if(mode==='links'){
   assert.equal(db.prepare('SELECT demo_url FROM e2e_applications WHERE id=?').get(appId).demo_url,request.demo_url);
   const reauth=await auth('singer@test.invalid','member');
   const saved=(await (await handleE2E(get('/api/e2e/applications',reauth),env)).json()).applications[0];
   assert.equal(saved.demo_url,request.demo_url);
   assert.equal(saved.has_eligibility_file,0);
   const blocked=await handleE2E(new Request(host+'/api/e2e/demo-upload?application='+appId,{method:'POST',headers:{Origin:host,Cookie:member,'Content-Type':'video/mp4'},body:new Uint8Array(512)}),env);
   assert.equal(blocked.status,409);assert.equal((await blocked.json()).error,'link_submission_only');
  }else{
  await upload(member,appId,'demo','video/mp4');
  await upload(member,appId,'eligibility','application/pdf');
  await upload(member,appId,'receipt','image/png');
  assert.equal((await handleE2E(get('/api/e2e/demo-download?application='+appId,member),env)).status,200);
  }
  const paid=await handleE2E(req('/api/e2e/mock-payment',{application_id:appId},member),env);
  assert.equal(paid.status,200);assert.equal((await paid.json()).realCharge,false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_payment_events').get().n,1);
  // Test-only 3 invite-only professional reviewers, separate permissions.
  const reviewers=[];
  for(let i=1;i<=3;i++)reviewers.push(await auth('judge'+i+'@test.invalid','reviewer'));
  const org=await auth('organizer@test.invalid','organizer');
  assert.equal((await handleE2E(get('/api/e2e/reviewer-queue',member),env)).status,403);
  assert.equal((await handleE2E(get('/api/e2e/organizer-queue',reviewers[0]),env)).status,403);
  const queue=(await (await handleE2E(get('/api/e2e/reviewer-queue',reviewers[0]),env)).json()).queue;
  assert.equal(queue[0].id,appId);assert.equal(queue[0].phase,'demo');
  if(mode==='links')assert.equal(queue[0].demo_url,request.demo_url);
  const docDenied=await handleE2E(get('/api/e2e/demo-download?application='+appId+'&kind=eligibility',reviewers[0]),env);
  assert.equal(docDenied.status,mode==='links'?503:404);
  assert.equal((await handleE2E(req('/api/e2e/organizer-promote',{application_id:appId,to_phase:'qualifier'},org),env)).status,409);
  for(const cookie of reviewers){
   const s=await handleE2E(req('/api/e2e/score',{application_id:appId,phase:'demo',technique:50,interpretation:30,no_conflict:true},cookie),env);
   assert.equal(s.status,200);
   assert.equal((await s.json()).phase,'demo');
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_judge_scores').get().n,3);
  // An April retry may be opened before the January results are known.
  const april=await handleE2E(req('/api/e2e/applications',{...request,round_code:'2027-04'},member),env);
  assert.equal(april.status,201);const aprilId=(await april.json()).application_id;
  const toLive=await handleE2E(req('/api/e2e/organizer-promote',{application_id:appId,to_phase:'qualifier'},org),env);
  assert.equal(toLive.status,200);assert.equal((await toLive.json()).phase,'qualifier');
  assert.equal((await (await handleE2E(get('/api/e2e/reviewer-queue',reviewers[0]),env)).json()).queue[0].phase,'qualifier');
  assert.equal((await handleE2E(req('/api/e2e/score',{application_id:appId,phase:'qualifier',technique:50,interpretation:30,no_conflict:true},reviewers[0]),env)).status,422);
  for(const cookie of reviewers){
   const s=await handleE2E(req('/api/e2e/score',{application_id:appId,phase:'qualifier',technique:33,interpretation:26,stage_presence:14,appearance:7,no_conflict:true},cookie),env);
   assert.equal(s.status,200);assert.equal((await s.json()).score,80);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM e2e_live_scores WHERE stage='qualifier'").get().n,3);
  assert.equal((await handleE2E(req('/api/e2e/organizer-promote',{application_id:appId,to_phase:'final'},org),env)).status,200);
  // D1 itself prevents two finalist seats for the same account.
  db.prepare("UPDATE e2e_applications SET phase='qualifier' WHERE id=?").run(aprilId);
  assert.throws(()=>db.prepare("UPDATE e2e_applications SET phase='final' WHERE id=?").run(aprilId),/member_already_has_finalist_entry/);
  const stale=await handleE2E(req('/api/e2e/score',{application_id:appId,phase:'qualifier',technique:30,interpretation:20,stage_presence:14,appearance:7,no_conflict:true},reviewers[0]),env);
  assert.equal(stale.status,409,'stale qualifier form may not become a final score');
  assert.equal((await handleE2E(req('/api/e2e/applications',{...request,round_code:'2027-04'},member),env)).status,409);
  const voter=await auth('voter@test.invalid','member');
  assert.equal((await (await handleE2E(get('/api/e2e/finalists',voter),env)).json()).finalists.length,1);
  assert.equal((await handleE2E(req('/api/e2e/test-vote',{application_id:appId},member),env)).status,403);
  assert.equal((await handleE2E(req('/api/e2e/test-vote',{application_id:appId},voter),env)).status,200);
  assert.equal((await handleE2E(req('/api/e2e/test-vote',{application_id:appId},voter),env)).status,409);
  let standings=(await (await handleE2E(get('/api/e2e/standings',org),env)).json()).standings;
  assert.equal(standings[0].total_score,null,'final jurors have not yet scored');
  for(const cookie of reviewers){
   const s=await handleE2E(req('/api/e2e/score',{application_id:appId,phase:'final',technique:33,interpretation:26,stage_presence:14,appearance:7,no_conflict:true},cookie),env);
   assert.equal(s.status,200);assert.equal((await s.json()).phase,'final');
  }
  standings=(await (await handleE2E(get('/api/e2e/standings',org),env)).json()).standings;
  assert.equal(standings[0].judges_mean,80);
  assert.equal(standings[0].vote_score,100);
  assert.equal(standings[0].total_score,90.2); // 100 * 51% + 80 * 49%
  // An authenticated member can erase their own D1 and R2 data; score/votes cascade.
  const erased=await handleE2E(req('/api/e2e/delete-my-data',{},member),env);assert.equal(erased.status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_live_scores').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_final_votes').get().n,0);
  assert.equal(r2.size,0);
  if(mode==='links')assert.equal(env.STAGING_MEDIA,undefined);
 }finally{db.close()}
});
test('expired and over-attempted emailed codes are rejected',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 let sent;const env={STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'B'.repeat(64),
 STAGING_ALLOWED_EMAILS:'member@test.invalid',STAGING_FROM_EMAIL:'tester@test.invalid',
 DB:adapter(db),EMAIL:{async send(x){sent=x}}};
 try{
  const start=await handleE2E(req('/api/e2e/request-code',{email:'member@test.invalid',role:'member'}),env);
  assert.equal(start.status,200);const id=(await start.json()).challenge_id;
  db.prepare('UPDATE e2e_email_challenges SET attempts=5 WHERE id=?').run(id);
  const correct=sent.text.match(/\b\d{6}\b/)[0];
  assert.equal((await handleE2E(req('/api/e2e/verify-code',{challenge_id:id,code:correct}),env)).status,401);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').get().n,0);
 }finally{db.close()}
});

test('one Gmail inbox can exercise separate invited test roles and concurrent OTP requests stay distinct',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const inbox=[],env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'Z'.repeat(64),
  STAGING_FROM_EMAIL:'sender@test.invalid',STAGING_ALLOWED_EMAILS:'qa+ghv-member@gmail.com',
  STAGING_REVIEWER_EMAILS:'qa+ghv-judge1@gmail.com,qa+ghv-judge2@gmail.com,qa+ghv-judge3@gmail.com',
  STAGING_ORGANIZER_EMAILS:'qa+ghv-admin@gmail.com',EMAIL:{async send(m){inbox.push(m)}}};
 async function start(email,role){
  const r=await handleE2E(req('/api/e2e/request-code',{email,role}),env);assert.equal(r.status,200);
  const packet=await r.json(),mail=inbox.at(-1);assert.equal(packet.request_ref,packet.challenge_id.slice(0,8));
  assert(mail.text.includes(packet.request_ref));assert(mail.subject.includes(role));assert.equal(packet.code,undefined);
  return {...packet,code:mail.text.match(/\b\d{6}\b/)[0]};
 }
 async function verify(x){return handleE2E(req('/api/e2e/verify-code',{challenge_id:x.challenge_id,code:x.code}),env)}
 try{
  const first=await start('qa+ghv-member@gmail.com','member'),second=await start('qa+ghv-member@gmail.com','member');
  assert.notEqual(first.challenge_id,second.challenge_id);
  const a=await verify(first),b=await verify(second);assert.equal(a.status,200);assert.equal(b.status,200);
  assert.equal((await a.clone().json()).account_id,(await b.clone().json()).account_id);
  assert.equal((await verify(first)).status,401,'a used code cannot sign in twice');
  const cookieA=a.headers.get('set-cookie').split(';')[0],cookieB=b.headers.get('set-cookie').split(';')[0];
  await handleE2E(req('/api/e2e/logout',{},cookieA),env);
  assert.equal((await handleE2E(get('/api/e2e/me',cookieA),env)).status,401);
  assert.equal((await handleE2E(get('/api/e2e/me',cookieB),env)).status,200,'logout revokes only its own server session');
  for(const [suffix,role] of [['judge1','reviewer'],['judge2','reviewer'],['judge3','reviewer'],['admin','organizer']]){
   const x=await start('qa+ghv-'+suffix+'@gmail.com',role);assert.equal((await verify(x)).status,200);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_accounts').get().n,5);
  assert.equal((await handleE2E(req('/api/e2e/request-code',{email:'qa+ghv-member@gmail.com',role:'organizer'}),env)).status,403);
  await start('qa+ghv-member@gmail.com','member');
  assert.equal((await handleE2E(req('/api/e2e/request-code',{email:'qa+ghv-member@gmail.com',role:'member'}),env)).status,429);
 }finally{db.close()}
});

test('email send failure never claims sent or leaves a usable failed challenge',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 let failedCode;const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'F'.repeat(64),STAGING_FROM_EMAIL:'test@example.invalid',
  STAGING_ALLOWED_EMAILS:'member@test.invalid',EMAIL:{async send(m){failedCode=m.text.match(/\b\d{6}\b/)[0];throw Error('private provider message')}}};
 try{
  const r=await handleE2E(req('/api/e2e/request-code',{email:'member@test.invalid',role:'member'}),env);
  assert.equal(r.status,503);assert.deepEqual(await r.json(),{ok:false,error:'test_email_service_unavailable'});
  const row=db.prepare('SELECT id FROM e2e_email_challenges').get();
  assert.equal((await handleE2E(req('/api/e2e/verify-code',{challenge_id:row.id,code:failedCode}),env)).status,401);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_sessions').get().n,0);
 }finally{db.close()}
});

test('the actual OTP route can use Mailgun without an EMAIL binding and keeps codes out of API responses',async t=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 let mailText; t.mock.method(globalThis,'fetch',async(url,init)=>{
  assert.equal(url,'https://api.mailgun.net/v3/sandboxabc123.mailgun.org/messages');
  mailText=init.body.get('text');return Response.json({id:'unit-message-id',message:'Queued. Thank you.'});
 });
 const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'M'.repeat(64),
  STAGING_ALLOWED_EMAILS:'qa+ghv-member@gmail.com',STAGING_EMAIL_PROVIDER:'mailgun',
  STAGING_MAILGUN_DOMAIN:'sandboxabc123.mailgun.org',STAGING_MAILGUN_API_KEY:'test-only-key-'.repeat(5),STAGING_FROM_EMAIL:'test@sandboxabc123.mailgun.org'};
 try{
  const response=await handleE2E(req('/api/e2e/request-code',{email:'qa+ghv-member@gmail.com',role:'member'}),env);
  assert.equal(response.status,200);const packet=await response.json();assert.equal(packet.code,undefined);
  assert(mailText.includes(packet.request_ref));const code=mailText.match(/\b\d{6}\b/)[0];
  const verified=await handleE2E(req('/api/e2e/verify-code',{challenge_id:packet.challenge_id,code}),env);
  assert.equal(verified.status,200);assert.equal(db.prepare('SELECT role FROM e2e_accounts').get().role,'member');
 }finally{db.close()}
});
