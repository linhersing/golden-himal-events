import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://example.invalid';
const request=(path,body,cookie)=>new Request(host+'/api/e2e/'+path,{method:'POST',
 headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
 body:JSON.stringify(body)});
const read=(path,cookie)=>new Request(host+'/api/e2e/'+path,{headers:{Cookie:cookie}});
function dbAdapter(db){return {prepare(sql){let args=[];return {
 bind(...v){args=v;return this},
 first(){return db.prepare(sql).get(...args)||null},
 all(){return {results:db.prepare(sql).all(...args)}},
 run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}
}},batch(statements){
 db.exec('BEGIN');
 try{const results=statements.map(statement=>statement.run());db.exec('COMMIT');return results}
 catch(error){db.exec('ROLLBACK');throw error}
}}}
test('mock-paid member may correct owned song before judging, then scores lock all edits',async()=>{
 const db=new DatabaseSync(':memory:');
 const inbox=[];
 db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const env={DB:dbAdapter(db),STAGING_E2E_ENABLED:'true',
  STAGING_IDENTITY_SECRET:'J'.repeat(64),STAGING_SUBMISSION_MODE:'links',
  STAGING_ALLOWED_EMAILS:'singer@example.invalid,other@example.invalid',
  STAGING_REVIEWER_EMAILS:'judge@example.invalid',
  STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(m){inbox.push(m)}}};
 async function auth(email,role){
  const start=await handleE2E(request('request-code',{email,role}),env);
  assert.equal(start.status,200,email+' challenge');
  const {challenge_id}=await start.json();
  const code=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
  const confirmed=await handleE2E(request('verify-code',{challenge_id,code}),env);
  assert.equal(confirmed.status,200,email+' OTP');
  return confirmed.headers.get('set-cookie').split(';')[0];
 }
 try{
  const member=await auth('singer@example.invalid','member');
  const other=await auth('other@example.invalid','member');
  const demo={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',
   affiliation:'FICTIONAL',stage_name:'Original Singer',song_title:'Original Song',
   original_artist:'TEST Artist',song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/dQw4w9WgXcQ',
   adult_confirmed:true,no_exclusive_contract:true};
  const created=await handleE2E(request('applications',demo,member),env);
  assert.equal(created.status,201,await created.clone().text());
  const {application_id:id}=await created.json();
  assert.equal((await handleE2E(request('mock-payment',{application_id:id},other),env)).status,404);
  db.exec("CREATE TRIGGER reject_mock_payment_update BEFORE UPDATE OF payment_status ON e2e_applications BEGIN SELECT RAISE(ABORT,'synthetic payment update failure'); END");
  const failed=await handleE2E(request('mock-payment',{application_id:id},member),env);
  assert.equal(failed.status,503);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_payment_events').get().n,0,'failed state change leaves no payment event');
  assert.equal(db.prepare('SELECT payment_status FROM e2e_applications WHERE id=?').get(id).payment_status,'unpaid');
  db.exec('DROP TRIGGER reject_mock_payment_update');
  const payments=await Promise.all(Array.from({length:2},()=>handleE2E(request('mock-payment',{application_id:id},member),env)));
  for(const payment of payments)assert.equal(payment.status,200);
  const paid=await Promise.all(payments.map(payment=>payment.json()));
  assert(paid.every(payment=>payment.realCharge===false&&payment.testOnly===true));
  assert.equal(paid.filter(payment=>payment.already).length,1,'parallel retry does not record a second payment');
  const before=(await (await handleE2E(read('applications',member),env)).json()).applications[0];
  assert.equal(before.payment_status,'simulated_paid');assert.equal(before.can_edit,1);
  const corrections={
   application_id:id,stage_name:'Edited Singer',song_title:'Edited Song',
   original_artist:'TEST Artist',song_language:'English',demo_url:'https://youtu.be/dQw4w9WgXcQ'
  };
  const stranger=await handleE2E(request('update-application',corrections,other),env);
  assert.equal(stranger.status,404);
  const changed=await handleE2E(request('update-application',corrections,member),env);
  assert.equal(changed.status,200,await changed.clone().text());
  const saved=(await (await handleE2E(read('applications',member),env)).json()).applications[0];
  assert.equal(saved.stage_name,corrections.stage_name);
  assert.equal(saved.song_language,'English');
  assert.equal(saved.song_title,corrections.song_title);
  assert.equal(saved.payment_status,'simulated_paid');
  assert.equal(saved.can_edit,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_payment_events').get().n,1);
  const invalid=await handleE2E(request('update-application',{...corrections,song_language:'invalid'},member),env);
  assert.equal(invalid.status,422);
  const judge=await auth('judge@example.invalid','reviewer');
  const score=await handleE2E(request('score',{application_id:id,phase:'demo',technique:42,interpretation:33,no_conflict:true},judge),env);
  assert.equal(score.status,200,await score.clone().text());
  const locked=(await (await handleE2E(read('applications',member),env)).json()).applications[0];
  assert.equal(locked.can_edit,0);
  const afterScore=await handleE2E(request('update-application',{...corrections,song_title:'Tampered Song'},member),env);
  assert.equal(afterScore.status,409);
  assert.equal(db.prepare('SELECT song_title FROM e2e_applications WHERE id=?').get(id).song_title,'Edited Song');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_judge_scores').get().n,1);
  // Enable the April TEST window only for this stale-checkout regression.
  env.STAGING_SECOND_AUDITION_ENABLED='true';
  const april=await handleE2E(request('applications',{...demo,round_code:'2027-04'},member),env);
  assert.equal(april.status,201);
  const aprilId=(await april.json()).application_id;
  const batch=env.DB.batch;
  env.DB.batch=async statements=>{
   env.DB.batch=batch;
   const deleted=await handleE2E(request('delete-application',{application_id:aprilId},member),env);
   assert.equal(deleted.status,200);
   return batch(statements);
  };
  const stalePayment=await handleE2E(request('mock-payment',{application_id:aprilId},member),env);
  assert.equal(stalePayment.status,404,'a deletion between checkout lookup and commit cannot report success');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_payment_events').get().n,1);
 }finally{db.close()}
});
