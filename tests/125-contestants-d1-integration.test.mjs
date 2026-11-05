import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://example.invalid';
const post=(key,payload,cookie)=>new Request(host+'/api/e2e/'+key,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload)});
const get=(key,cookie)=>new Request(host+'/api/e2e/'+key,{headers:{Cookie:cookie}});
function adapter(db){
 const prepare=sql=>{let args=[];return {
  bind(...values){args=values;return this},
  first(){return db.prepare(sql).get(...args)||null},
  all(){return {results:db.prepare(sql).all(...args)}},
  run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}
 }};
 return {prepare,async batch(stmts){
  db.exec('BEGIN');
  try{const out=[];for(const stmt of stmts)out.push(await stmt.run());db.exec('COMMIT');return out;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }};
}
test('125 fictional contestants in isolated D1: photos, three roles, search, anti-self-score',async()=>{
 const db=new DatabaseSync(':memory:');
 const inbox=[];
 try{
  db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
  db.exec(await readFile(new URL('../backend/migrations/1003_entrant_profile_optin_STAGING_ONLY.sql',import.meta.url),'utf8'));
  const env={STAGING_E2E_ENABLED:'true',STAGING_PROFILE_URLS_ENABLED:'true',
   STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:'Q'.repeat(64),
   STAGING_ALLOWED_EMAILS:'owner@test.invalid',STAGING_REVIEWER_EMAILS:'owner@test.invalid',
   STAGING_ORGANIZER_EMAILS:'owner@test.invalid',STAGING_FROM_EMAIL:'test@example.invalid',
   EMAIL:{async send(m){inbox.push(m);}},DB:adapter(db)};
  async function auth(role){
   const start=await handleE2E(post('request-code',{email:'owner@test.invalid',role}),env);
   assert.equal(start.status,200,'OTP start '+role);
   const {challenge_id}=await start.json();
   const code=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
   const response=await handleE2E(post('verify-code',{challenge_id,code}),env);
   assert.equal(response.status,200,'OTP verify '+role);
   return {cookie:response.headers.get('set-cookie').split(';')[0],...await response.json()};
  }
  const member=await auth('member'),reviewer=await auth('reviewer'),organizer=await auth('organizer');
  assert.equal(new Set([member.account_id,reviewer.account_id,organizer.account_id]).size,3);
  const insertAccount=db.prepare('INSERT INTO e2e_accounts(id,email_fingerprint,email_hint,role,verified_at,created_at) VALUES(?,?,?,?,?,?)');
  const insertApp=db.prepare('INSERT INTO e2e_applications (id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,phase,status,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const insertProfile=db.prepare('INSERT INTO e2e_application_profiles (application_id,gender,photo_url_1,photo_url_2,photo_url_3,consent_at,updated_at) VALUES(?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  try{
   for(let i=1;i<=125;i++){
    const str=String(i).padStart(3,'0'),accountId=i===1?member.account_id:'FAKE-ACCOUNT-'+str;
    if(i>1)insertAccount.run(accountId,'synthetic-fingerprint-'+str,'NO-REAL-INBOX','member',1000+i,1000+i);
    const id='FAKE-'+str,language=i%2?'Nepali':'English',category=i%2?'community':'university';
    insertApp.run(id,accountId,'2027-01',category,'gandaki','residence','FICTIONAL',
     'TEST Singer '+str,'TEST Song '+str,'FICTIONAL Artist',language,'C',
     'https://youtu.be/fictional-test-'+str,'demo','submitted','simulated_paid',10000+i,10000+i);
    insertProfile.run(id,i%4===0?'prefer_not_say':i%2?'female':'male',
     'https://images.example.org/ghv-'+str+'.jpg',
     i%3===0?'https://images.example.org/ghv-'+str+'-2.jpg':null,
     i%7===0?'https://images.example.org/ghv-'+str+'-3.jpg':null,10000+i,10000+i);
   }
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,125);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_application_profiles').get().n,125);
  assert.equal(db.prepare('SELECT COUNT(DISTINCT photo_url_1) n FROM e2e_application_profiles').get().n,125);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_payment_events').get().n,0,'simulated status is NOT real money');
  const ownerRows=(await (await handleE2E(get('applications',member.cookie),env)).json()).applications;
  assert.equal(ownerRows.length,1);assert.equal(ownerRows[0].id,'FAKE-001');
  assert.equal(ownerRows[0].photo_url_1,'https://images.example.org/ghv-001.jpg');
  assert.equal(JSON.stringify(ownerRows).includes('ghv-125.jpg'),false);
  assert.equal((await handleE2E(get('organizer-queue',member.cookie),env)).status,403);
  assert.equal((await handleE2E(get('reviewer-queue',organizer.cookie),env)).status,403);
  assert.equal((await handleE2E(get('organizer-queue',reviewer.cookie),env)).status,403);
  const orgResponse=await handleE2E(get('organizer-queue',organizer.cookie),env);
  assert.equal(orgResponse.status,200);
  const org=(await orgResponse.json()).applications;
  assert.equal(org.length,125);
  assert.equal(org.filter(x=>x.song_language==='Nepali').length,63);
  assert.equal(org.filter(x=>x.song_language==='English').length,62);
  assert.equal(org.filter(x=>x.category==='community').length,63);
  assert.equal(org.filter(x=>x.category==='university').length,62);
  assert.equal(new Set(org.map(x=>x.photo_url_1)).size,125,'no duplicate photos');
  assert.equal(JSON.stringify(org).includes('synthetic-fingerprint'),false,'no account secrets in staff output');
  assert.equal(org.find(x=>x.id==='FAKE-125').photo_url_1,'https://images.example.org/ghv-125.jpg');
  const judgeResponse=await handleE2E(get('reviewer-queue',reviewer.cookie),env);
  assert.equal(judgeResponse.status,200);
  const judge=(await judgeResponse.json()).queue;
  assert.equal(judge.length,125);
  assert.equal(judge[0].id,'FAKE-125');
  assert.equal(judge[124].id,'FAKE-001');
  assert.equal(judge[0].photo_url_1,'https://images.example.org/ghv-125.jpg');
  assert.equal(judge[124].photo_url_1,'https://images.example.org/ghv-001.jpg');
  assert.equal(judge.filter(x=>x.photo_url_3).length,17);
  const self=await handleE2E(post('score',{application_id:'FAKE-001',phase:'demo',technique:52,interpretation:30,no_conflict:true},reviewer.cookie),env);
  assert.equal(self.status,403,'same-Email member/reviewer cannot score own entry');
  const other=await handleE2E(post('score',{application_id:'FAKE-125',phase:'demo',technique:52,interpretation:30,no_conflict:true},reviewer.cookie),env);
  assert.equal(other.status,200);
  assert.equal((await other.json()).score,82);
  const repeat=await handleE2E(post('score',{application_id:'FAKE-125',phase:'demo',technique:55,interpretation:35,no_conflict:true},reviewer.cookie),env);
  assert.equal(repeat.status,409,'score cannot be overwritten');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_judge_scores').get().n,1);
  const fresh=(await (await handleE2E(get('reviewer-queue',reviewer.cookie),env)).json()).queue;
  assert.equal(fresh.find(x=>x.id==='FAKE-125').demo_technique,52);
  assert.equal(fresh.find(x=>x.id==='FAKE-124').demo_technique,null);
  const lock=await handleE2E(post('update-application',{
   application_id:'FAKE-001',stage_name:'NEW TEST',song_title:'TEST',
   original_artist:'TEST',demo_url:'https://youtu.be/fictional-001',
   gender:'male',photo_url_1:'https://images.example.org/evil.jpg',profile_consent:true},member.cookie),env);
  assert.equal(lock.status,409);
  assert.equal(db.prepare('SELECT photo_url_1 FROM e2e_application_profiles WHERE application_id=?').get('FAKE-001').photo_url_1,'https://images.example.org/ghv-001.jpg');
 }finally{db.close()}
});
