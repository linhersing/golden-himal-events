import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://example.invalid';
const entry={round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',
 affiliation:'TEST',stage_name:'TEST SINGER',song_title:'TEST SONG',original_artist:'TEST ARTIST',
 song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/dQw4w9WgXcQ',adult_confirmed:true,no_exclusive_contract:true};
const corrections={stage_name:'TEST SINGER',song_title:'Corrected TEST SONG',original_artist:'TEST ARTIST',demo_url:entry.demo_url};

async function fixture(t,{enabled=true,migrated=true,supplements=false}={}){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['1000_e2e_staging_acceptance_ONLY.sql',...(migrated?['1007_test_application_approval_STAGING_ONLY.sql']:[])]){
  db.exec(await readFile(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 }
 const secret='H'.repeat(64),fingerprint=value=>createHmac('sha256',secret).update(value).digest('hex');
 const members={member:['member','owner@example.invalid'],self:['reviewer','owner@example.invalid'],
  reviewer:['reviewer','judge@example.invalid'],organizer:['organizer','org@example.invalid']};
 const cookies={};
 for(const [id,[role,email]] of Object.entries(members)){
  const token=fingerprint('fictional-token:'+id);
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(id,fingerprint(id==='self'?'role-account:reviewer:'+email:'email:'+email),'TEST',role,1,1);
  db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(fingerprint('session:'+token),id,9999999999,1);
  cookies[id]='__Host-ghv-e2e='+token;
 }
 const env={STAGING_E2E_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',STAGING_IDENTITY_SECRET:secret,
  STAGING_ALLOWED_EMAILS:'owner@example.invalid',STAGING_REVIEWER_EMAILS:'owner@example.invalid,judge@example.invalid',
  STAGING_ORGANIZER_EMAILS:'org@example.invalid',STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(){}},
  ...(enabled?{STAGING_TEST_APPROVAL_ENABLED:'true'}:{}),DB:{prepare(sql){let args=[];return {
   bind(...values){args=values;return this},first(){return db.prepare(sql).get(...args)||null},
   all(){return {results:db.prepare(sql).all(...args)}},run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}
  }},batch(statements){
   db.exec('BEGIN');
   try{const results=statements.map(statement=>statement.run());db.exec('COMMIT');return results}
   catch(error){db.exec('ROLLBACK');throw error}
  }}};
 if(supplements)db.exec(await readFile(new URL('../backend/migrations/1009_test_video_supplements_STAGING_ONLY.sql',import.meta.url),'utf8'));
 const call=(route,role,body,origin=host)=>handleE2E(new Request(host+'/api/e2e/'+route,{
  method:body?'POST':'GET',headers:{...(role?{Cookie:cookies[role]}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 }),env);
 return {db,env,call};
}

test('the current rules allow all seven Nepal provinces and retain the actual location privately',async t=>{
 const {db,call}=await fixture(t);
 const legacy=await call('applications','member',entry);
 assert.equal(legacy.status,201);
 const location={...entry,round_code:'2027-04',province:'karnali',location_detail:'Birendranagar, Surkhet'};
 const migration=new URL('../backend/migrations/1010_nepal_locations_STAGING_ONLY.sql',import.meta.url);
 assert.equal((await call('applications','member',location)).status,503);
 db.exec(await readFile(migration,'utf8'));
 const created=await call('applications','member',location);
 assert.equal(created.status,201);
 const {application_id}=await created.json();
 for(const [route,role] of [['applications','member'],['organizer-queue','organizer']]){
  const data=await (await call(route,role)).json();
  const row=data.applications.find(item=>item.id===application_id);
  assert.equal(row.province,'karnali');assert.equal(row.location_detail,location.location_detail);
  assert.equal(data.applications.find(item=>item.id!==application_id).province,'gandaki');
 }
 assert.equal((await call('applications','member',{...location,province:'outside-nepal'})).status,400);
 assert.equal((await call('mock-payment','member',{application_id})).status,200);
 for(const [province,location_detail,song_key] of [['koshi','Dharan, Sunsari','D'],['madhesh','Janakpur, Dhanusha','E']]){
  const update={application_id,...corrections,province,location_detail,location_basis:'study',affiliation:'TEST SCHOOL',song_key};
  assert.equal((await call('update-application','member',update)).status,200);
  const row=(await (await call('applications','member')).json()).applications.find(item=>item.id===application_id);
  assert.equal(row.province,province);
  assert.equal(row.location_detail,location_detail);
  assert.equal(row.location_basis,'study');
  assert.equal(row.affiliation,'TEST SCHOOL');
  assert.equal(row.song_key,song_key);
 }
 assert.equal((await call('approve-test-application','organizer',{application_id})).status,200);
 const [review]= (await (await call('reviewer-queue','reviewer')).json()).queue;
 assert.equal(review.id,application_id);
 assert.equal(Object.hasOwn(review,'location_detail'),false);
});

test('organizer records a notified video correction, and the member can replace the link exactly once before approval',async t=>{
 const {db,call}=await fixture(t,{supplements:true});
 const {application_id}=await (await call('applications','member',entry)).json();
 const request={application_id};
 assert.equal((await call('request-video-supplement','reviewer',request)).status,403);
 assert.equal((await call('request-video-supplement','organizer',request)).status,200);
 const [pending]=(await (await call('applications','member')).json()).applications;
 assert.equal(pending.video_supplement_state,'pending');
 assert.equal(pending.video_supplement_deadline-pending.video_supplement_requested_at,48*3600);
 assert.equal(pending.can_edit,0);
 assert.equal((await call('approve-test-application','organizer',request)).status,409);
 assert.equal((await call('update-application','member',{...request,...corrections})).status,409);
 const replacement={...request,demo_url:'https://youtu.be/test-replacement',affiliation:'TEST CORRECTED SCHOOL',song_key:'D'};
 assert.equal((await call('submit-video-supplement','member',replacement)).status,200);
 assert.equal((await call('submit-video-supplement','member',replacement)).status,409);
 assert.equal((await call('request-video-supplement','organizer',request)).status,409);
 assert.equal(db.prepare('SELECT demo_url FROM e2e_applications WHERE id=?').get(application_id).demo_url,replacement.demo_url);
 assert.equal(db.prepare('SELECT affiliation FROM e2e_applications WHERE id=?').get(application_id).affiliation,replacement.affiliation);
 assert.equal(db.prepare('SELECT song_key FROM e2e_applications WHERE id=?').get(application_id).song_key,replacement.song_key);
 assert.equal((await call('approve-test-application','organizer',request)).status,200);
});

test('expired video corrections stay ineligible for approval',async t=>{
 const {db,call}=await fixture(t,{supplements:true});
 const {application_id}=await (await call('applications','member',entry)).json();
 assert.equal((await call('request-video-supplement','organizer',{application_id})).status,200);
 db.prepare('UPDATE e2e_test_video_supplements SET requested_at=1 WHERE application_id=?').run(application_id);
 assert.equal((await (await call('applications','member')).json()).applications[0].video_supplement_state,'expired');
 assert.equal((await call('submit-video-supplement','member',{application_id,demo_url:'https://youtu.be/test-replacement'})).status,409);
 assert.equal((await call('approve-test-application','organizer',{application_id})).status,409);
});

test('configured approval mode fails closed until the migration is available',async t=>{
 const {db,call}=await fixture(t,{migrated:false});
 const result=await call('applications','member',entry);
 assert.equal(result.status,503);
 assert.equal((await result.json()).error,'test_approval_schema_unavailable');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,0);
});

test('payment and organizer approval are independent gates for the assigned reviewer',async t=>{
 const {db,call}=await fixture(t);
 assert.equal((await (await call('me','member')).json()).approval_enabled,true);
 const created=await call('applications','member',entry);
 assert.equal(created.status,201);
 const {application_id,approval_state}=await created.json();
 assert.equal(approval_state,'pending');
 const score={application_id,phase:'demo',technique:42,interpretation:33,no_conflict:true};
 for(const role of ['member','reviewer','self'])assert.equal((await call('approve-test-application',role,{application_id})).status,403);
 assert.equal((await call('approve-test-application',null,{application_id})).status,401);
 assert.equal((await call('approve-test-application','organizer',{application_id},'https://other.invalid')).status,403);
 assert.equal((await call('mock-payment','member',{application_id})).status,200);
 const pending=(await (await call('applications','member')).json()).applications[0];
 assert.equal(pending.payment_status,'simulated_paid');assert.equal(pending.approval_state,'pending');assert.equal(pending.can_edit,1);
 assert.equal((await (await call('organizer-queue','organizer')).json()).applications[0].approval_state,'pending');
 assert.deepEqual((await (await call('reviewer-queue','reviewer')).json()).queue,[]);
 assert.equal((await call('score','reviewer',score)).status,409);
 const granted=await call('approve-test-application','organizer',{application_id});
 assert.equal(granted.status,200);
 assert.deepEqual(await granted.json(),{ok:true,application_id,approval_state:'approved',testOnly:true});
 assert.equal((await (await call('approve-test-application','organizer',{application_id})).json()).already,true);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_test_application_approvals').get().n,1);
 assert.equal(db.prepare('SELECT approved_by FROM e2e_test_application_approvals').get().approved_by,'organizer');
 const approved=(await (await call('applications','member')).json()).applications[0];
 assert.equal(approved.approval_state,'approved');assert.equal(approved.can_edit,0);
 assert.equal((await call('update-application','member',{application_id,...corrections})).status,409);
 assert.equal((await (await call('reviewer-queue','reviewer')).json()).queue[0].id,application_id);
 assert.equal((await call('score','self',score)).status,403);
 assert.equal((await call('score','reviewer',score)).status,200);
});

test('existing entries default pending and approval alone neither pays nor exposes a work to reviewers',async t=>{
 const {db,env,call}=await fixture(t,{enabled:false});
 const {application_id}=await (await call('applications','member',entry)).json();
 assert.equal((await call('approve-test-application','organizer',{application_id})).status,404);
 assert.equal((await (await call('applications','member')).json()).applications[0].approval_state,undefined);
 env.STAGING_TEST_APPROVAL_ENABLED='true';
 assert.equal((await (await call('applications','member')).json()).applications[0].approval_state,'pending');
 assert.equal((await call('approve-test-application','organizer',{application_id})).status,200);
 assert.equal(db.prepare('SELECT payment_status FROM e2e_applications WHERE id=?').get(application_id).payment_status,'unpaid');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_payment_events').get().n,0);
 assert.deepEqual((await (await call('reviewer-queue','reviewer')).json()).queue,[]);
 assert.equal((await call('delete-application','member',{application_id})).status,409);
});
