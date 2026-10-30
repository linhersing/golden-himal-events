import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';
const host='https://golden-himal-voice-preview.linhersing.workers.dev';
function adapter(db){
 return {prepare(sql){let args=[];
  return {bind(...x){args=x;return this},
   first(){return db.prepare(sql).get(...args)||null},
   all(){return {results:db.prepare(sql).all(...args)}},
   run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}};
 }};
}
const req=(path,body,cookie)=>new Request(host+path,{method:'POST',
 headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
const get=(path,cookie)=>new Request(host+path,{headers:cookie?{Cookie:cookie}:{}});
test('real D1-style SQLite adapter persists OTP, entry, simulated fee and score across distinct sessions',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const inbox=[],bucket=new Map(),env={
  STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'A'.repeat(64),
  STAGING_ALLOWED_EMAILS:'participant@test.invalid',
  STAGING_REVIEWER_EMAILS:'judge@test.invalid',
  STAGING_FROM_EMAIL:'tests@test.invalid',
  DB:adapter(db),
  EMAIL:{async send(x){inbox.push(x);return {id:'test-message'}}},
  STAGING_MEDIA:{async put(k,data,meta){bucket.set(k,{data,meta})},async get(k){const item=bucket.get(k);return item?{body:item.data,httpMetadata:item.meta.httpMetadata}:null},async delete(k){bucket.delete(k)}}
 };
 try{
  const refused=await handleE2E(req('/api/e2e/request-code',{email:'stranger@test.invalid'}),env);
  assert.equal(refused.status,403);
  const start=await handleE2E(req('/api/e2e/request-code',{email:'participant@test.invalid',role:'member'}),env);
  assert.equal(start.status,200);const challenge=(await start.json()).challenge_id;
  assert.equal(inbox.length,1);
  const code=inbox[0].text.match(/\b\d{6}\b/)[0];
  const login=await handleE2E(req('/api/e2e/verify-code',{challenge_id:challenge,code}),env);
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.match(cookie,/^__Host-ghv-e2e=/);
  assert.equal((await handleE2E(get('/api/e2e/me',cookie),env)).status,200);
  assert.equal((await handleE2E(get('/api/e2e/reviewer-queue',cookie),env)).status,403);
  const appResponse=await handleE2E(req('/api/e2e/applications',{
   round_code:'2027-03',category:'university',stage_name:'TEST SINGER',demo_url:'https://youtu.be/test123',adult_confirmed:true
  },cookie),env);
  assert.equal(appResponse.status,201);const appId=(await appResponse.json()).application_id;
  assert.equal((await handleE2E(get('/api/e2e/applications',cookie),env)).status,200);
  // Authenticated direct upload is persisted to a private R2 fixture and linked to D1.
  const uploaded=await handleE2E(new Request(host+'/api/e2e/demo-upload?application='+appId,{
   method:'POST',headers:{Origin:host,Cookie:cookie,'Content-Type':'audio/mpeg'},
   body:new Uint8Array(512)
  }),env);
  assert.equal(uploaded.status,200);
  assert.equal((await uploaded.json()).private,true);
  assert.equal(db.prepare('SELECT media_key FROM e2e_applications WHERE id=?').get(appId).media_key.startsWith('e2e/'),true);
  const ownDownload=await handleE2E(get('/api/e2e/demo-download?application='+appId,cookie),env);
  assert.equal(ownDownload.status,200);
  assert.equal((await ownDownload.arrayBuffer()).byteLength,512);
  assert.equal((await handleE2E(get('/api/e2e/demo-download?application='+appId),env)).status,401);
  // Category is locked by a D1 trigger, including direct SQL writers and
  // concurrent Worker requests; a second round cannot change group.
  assert.throws(()=>db.prepare('INSERT INTO e2e_applications(id,account_id,round_code,category,stage_name,demo_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
    .run('group-cheat',db.prepare('SELECT account_id FROM e2e_applications LIMIT 1').get().account_id,
     '2027-06','community','TEST','https://youtu.be/test123',1,1),/annual_category_locked/);
  const duplicate=await handleE2E(req('/api/e2e/applications',{round_code:'2027-03',category:'university',stage_name:'TEST SINGER',demo_url:'https://youtu.be/test123',adult_confirmed:true},cookie),env);
  assert.equal(duplicate.status,409);
  const paid=await handleE2E(req('/api/e2e/mock-payment',{application_id:appId},cookie),env);
  assert.equal(paid.status,200);assert.equal((await paid.json()).realCharge,false);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_payment_events').get().n,1);
  const again=await handleE2E(req('/api/e2e/mock-payment',{application_id:appId},cookie),env);
  assert.equal((await again.json()).already,true);
  const askReviewer=await handleE2E(req('/api/e2e/request-code',{email:'judge@test.invalid',role:'reviewer'}),env);
  assert.equal(askReviewer.status,200);
  const judgeCode=inbox[1].text.match(/\b\d{6}\b/)[0];
  const judgeAuth=await handleE2E(req('/api/e2e/verify-code',{challenge_id:(await askReviewer.json()).challenge_id,code:judgeCode}),env);
  assert.equal(judgeAuth.status,200);const judgeCookie=judgeAuth.headers.get('set-cookie').split(';')[0];
  const queue=await handleE2E(get('/api/e2e/reviewer-queue',judgeCookie),env);
  assert.equal((await queue.json()).queue[0].id,appId);
  assert.equal((await handleE2E(req('/api/e2e/score',{application_id:appId,technique:50,interpretation:33,no_conflict:true},cookie),env)).status,403);
  const scored=await handleE2E(req('/api/e2e/score',{application_id:appId,technique:50,interpretation:33,no_conflict:true},judgeCookie),env);
  assert.equal(scored.status,200);assert.equal((await scored.json()).score,83);
  const scoredAgain=await handleE2E(req('/api/e2e/score',{application_id:appId,technique:55,interpretation:34,no_conflict:true},judgeCookie),env);
  assert.equal(scoredAgain.status,409);
  assert.equal((await (await handleE2E(get('/api/e2e/applications',cookie),env)).json()).applications[0].status,'scored');
  const count=db.prepare('SELECT count(*) AS n FROM e2e_accounts').get().n;assert.equal(count,2);
  // Deletion is self-service only; the other reviewer account remains intact.
  const erased=await handleE2E(req('/api/e2e/delete-my-data',{},cookie),env);
  assert.equal(erased.status,200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_applications').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_judge_scores').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_accounts').get().n,1);
 }finally{db.close()}
});

test('OTP challenge refuses the correct code after five attempts are consumed',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 let sent;
 const env={STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:'B'.repeat(64),
 STAGING_ALLOWED_EMAILS:'participant@test.invalid',STAGING_FROM_EMAIL:'tests@test.invalid',
 DB:adapter(db),EMAIL:{async send(x){sent=x;return {id:'test'}}}};
 try{
  const response=await handleE2E(req('/api/e2e/request-code',{email:'participant@test.invalid',role:'member'}),env);
  assert.equal(response.status,200);
  const id=(await response.json()).challenge_id;
  const code=sent.text.match(/\b\d{6}\b/)[0];
  db.prepare('UPDATE e2e_email_challenges SET attempts=5 WHERE id=?').run(id);
  const rejected=await handleE2E(req('/api/e2e/verify-code',{challenge_id:id,code}),env);
  assert.equal(rejected.status,401);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_sessions').get().n,0);
 }finally{db.close()}
});
