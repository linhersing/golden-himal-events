import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {handleE2E} from '../backend/staging-e2e.js';
import {parseProfileInput,safePhotoUrl} from '../backend/entrant-profile.js';

const host='https://golden-himal-voice-preview.linhersing.workers.dev';
const post=(path,data,cookie)=>new Request(host+path,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
const get=(path,cookie)=>new Request(host+path,{headers:{Cookie:cookie}});
function adapter(db){
 const prep=sql=>{let args=[];return {
  bind(...xs){args=xs;return this},
  first(){return db.prepare(sql).get(...args)||null},
  all(){return {results:db.prepare(sql).all(...args)}},
  run(){let r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}
 }};
 return {prepare:prep,async batch(queries){
  db.exec('BEGIN');
  try{const rows=[];for(const q of queries)rows.push(await q.run());db.exec('COMMIT');return rows;}
  catch(e){db.exec('ROLLBACK');throw e}
 }};
}
test('staging profile URL validation rejects unsafe/internal URLs and missing consent',()=>{
 for(const v of ['http://images.example.org/a.jpg','javascript:alert(1)','data:image/png,123',
  'https://127.0.0.1/a.png','https://192.168.2.4/a.png',
  'https://localhost/img.jpg','https://private.local/a.jpg',
  'https://example.org:8080/a.jpg','https://a:b@example.org/a.jpg','https://abc.invalid/a.jpg']){
   assert.equal(safePhotoUrl(v),null,v);
 }
 assert.equal(parseProfileInput({gender:'male',photo_url_1:'https://images.example.org/a.jpg',profile_consent:false}).error,'profile_consent_required');
 assert.equal(parseProfileInput({gender:'female',photo_url_2:'https://images.example.org/2.jpg',profile_consent:true}).error,'main_photo_required');
 assert.equal(parseProfileInput({gender:'robot',profile_consent:true}).error,'invalid_gender');
 assert.equal(parseProfileInput({photo_url_1:'',gender:''}).profile,null);
 assert.equal(parseProfileInput({photo_url_1:'https://images.example.org/1.jpg',photo_url_2:'https://images.example.org/2.jpg',gender:'prefer_not_say',profile_consent:true}).profile.gender,'prefer_not_say');
});
test('two independent singers keep distinct D1 URLs, authenticated readers and authorized judge see correct records',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 db.exec(await readFile(new URL('../backend/migrations/1003_entrant_profile_optin_STAGING_ONLY.sql',import.meta.url),'utf8'));
 const emails=[];
 const env={
  DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_PROFILE_URLS_ENABLED:'true',
  STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:'X'.repeat(64),
  STAGING_ALLOWED_EMAILS:'a@test.invalid,b@test.invalid',
  STAGING_REVIEWER_EMAILS:'judge@test.invalid',STAGING_ORGANIZER_EMAILS:'organizer@test.invalid',
  STAGING_FROM_EMAIL:'test@example.invalid',
  EMAIL:{async send(m){emails.push(m);return {id:'accepted'}}}
 };
 async function auth(email,role){
  const start=await handleE2E(post('/api/e2e/request-code',{email,role}),env);
  assert.equal(start.status,200,email+' start '+await start.clone().text());
  const {challenge_id}=await start.json(),code=emails.at(-1).text.match(/\b\d{6}\b/)[0];
  const response=await handleE2E(post('/api/e2e/verify-code',{challenge_id,code}),env);
  assert.equal(response.status,200,email+' verified');
  return response.headers.get('set-cookie').split(';')[0];
 }
 const a=await auth('a@test.invalid','member'),b=await auth('b@test.invalid','member');
 const song={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',
   affiliation:'TEST LOCATION',stage_name:'TEST',song_title:'TEST SONG',original_artist:'TEST ARTIST',
   song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/test-song-video',
   adult_confirmed:true,no_exclusive_contract:true};
 const profileA={gender:'female',photo_url_1:'https://images.example.org/alice.jpg',photo_url_2:'https://images.example.org/a2.jpg',profile_consent:true};
 const profileB={gender:'male',photo_url_1:'https://images.example.org/bob.jpg',profile_consent:true};
 try{
  const me=(await (await handleE2E(get('/api/e2e/me',a),env)).json());
  assert.equal(me.profile_enabled,true);
  const missingConsent=await handleE2E(post('/api/e2e/applications',{...song,...profileA,profile_consent:false},a),env);
  assert.equal(missingConsent.status,422);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n,0);
  const createdA=await handleE2E(post('/api/e2e/applications',{...song,...profileA,stage_name:'Alice'},a),env);
  assert.equal(createdA.status,201,await createdA.clone().text());
  const aId=(await createdA.json()).application_id;
  const createdB=await handleE2E(post('/api/e2e/applications',{...song,...profileB,stage_name:'Bob'},b),env);
  assert.equal(createdB.status,201,await createdB.clone().text());
  const bId=(await createdB.json()).application_id;
  assert.notEqual(aId,bId);
  assert.equal(db.prepare('SELECT photo_url_1 FROM e2e_application_profiles WHERE application_id=?').get(aId).photo_url_1,profileA.photo_url_1);
  assert.equal(db.prepare('SELECT photo_url_1 FROM e2e_application_profiles WHERE application_id=?').get(bId).photo_url_1,profileB.photo_url_1);
  const ownA=(await (await handleE2E(get('/api/e2e/applications',a),env)).json()).applications;
  const ownB=(await (await handleE2E(get('/api/e2e/applications',b),env)).json()).applications;
  assert.equal(ownA.length,1);assert.equal(ownA[0].photo_url_1,profileA.photo_url_1);
  assert.equal(ownB.length,1);assert.equal(ownB[0].photo_url_1,profileB.photo_url_1);
  assert.equal(JSON.stringify(ownA).includes('bob.jpg'),false);
  assert.equal(JSON.stringify(ownB).includes('alice.jpg'),false);
  assert.equal((await handleE2E(post('/api/e2e/update-application',{application_id:bId,stage_name:'Evil',song_title:'Evil',original_artist:'Evil',demo_url:song.demo_url,...profileA},a),env)).status,404);
  const update=await handleE2E(post('/api/e2e/update-application',{application_id:aId,stage_name:'Alice Updated',song_title:song.song_title,original_artist:song.original_artist,demo_url:song.demo_url,gender:'other',photo_url_1:'https://images.example.org/alice-new.png',photo_url_2:'',photo_url_3:'',profile_consent:true},a),env);
  assert.equal(update.status,200,await update.clone().text());
  assert.equal(db.prepare('SELECT gender FROM e2e_application_profiles WHERE application_id=?').get(aId).gender,'other');
  for(const [cookie,id] of [[a,aId],[b,bId]]){
   const paid=await handleE2E(post('/api/e2e/mock-payment',{application_id:id},cookie),env);
   assert.equal(paid.status,200,await paid.clone().text());
  }
  const judge=await auth('judge@test.invalid','reviewer');
  const organizer=await auth('organizer@test.invalid','organizer');
  const reviewerData=(await (await handleE2E(get('/api/e2e/reviewer-queue',judge),env)).json()).queue;
  const orgData=(await (await handleE2E(get('/api/e2e/organizer-queue',organizer),env)).json()).applications;
  assert.equal(reviewerData.length,2);assert.equal(orgData.length,2);
  const byId=id=>reviewerData.find(x=>x.id===id);
  assert.equal(byId(aId).photo_url_1,'https://images.example.org/alice-new.png');
  assert.equal(byId(bId).photo_url_1,profileB.photo_url_1);
  assert.equal(orgData.find(x=>x.id===aId).gender,'other');
  assert.equal(orgData.find(x=>x.id===bId).gender,'male');
  assert.equal((await handleE2E(get('/api/e2e/organizer-queue',a),env)).status,403);
  assert.equal((await handleE2E(get('/api/e2e/reviewer-queue',b),env)).status,403);
 }finally{db.close()}
});
test('profile schema is fail-closed when not enabled; old entries can still be submitted',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 const emails=[];
 const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_PROFILE_URLS_ENABLED:'true',
  STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:'T'.repeat(64),
  STAGING_ALLOWED_EMAILS:'member@test.invalid',STAGING_FROM_EMAIL:'test@example.invalid',
  EMAIL:{async send(m){emails.push(m)}}};
 try{
  const res=await handleE2E(post('/api/e2e/request-code',{email:'member@test.invalid',role:'member'}),env);
  assert.equal(res.status,200);
  const {challenge_id}=await res.json();
  const code=emails.at(-1).text.match(/\b\d{6}\b/)[0];
  const login=await handleE2E(post('/api/e2e/verify-code',{challenge_id,code}),env);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await handleE2E(get('/api/e2e/me',cookie),env)).json()).profile_enabled,false);
  const request={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',
   affiliation:'Test',stage_name:'Staging Singer',song_title:'Song',original_artist:'Artist',
   song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/valid-test',adult_confirmed:true,no_exclusive_contract:true};
  const refused=await handleE2E(post('/api/e2e/applications',{...request,photo_url_1:'https://images.example.org/one.jpg',profile_consent:true},cookie),env);
  assert.equal(refused.status,503);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n,0);
  assert.equal((await handleE2E(post('/api/e2e/applications',request,cookie),env)).status,201);
 }finally{db.close()}
});
