import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleE2E} from '../backend/staging-e2e.js';

const firstId='bbbbbbbb-1111-4111-8111-111111111111';
const secondId='bbbbbbbb-2222-4222-8222-222222222222';
const missingId='bbbbbbbb-3333-4333-8333-333333333333';
const host='https://ghv-staff-fixture.example.invalid';
const secret='sample-only-audited-contact-test-key';
const hash=value=>createHmac('sha256',secret).update(value).digest('hex');

function sqliteAdapter(db){
 const prepare=sql=>{
  let bindings=[];
  return {bind(...args){bindings=args;return this},
   first(){return db.prepare(sql).get(...bindings)},
   all(){return {results:db.prepare(sql).all(...bindings)}},
   run(){return {meta:{changes:db.prepare(sql).run(...bindings).changes}}},
   execute(){return db.prepare(sql).columns().length?this.all():this.run()}};
 };
 return {prepare,batch(commands){
  db.exec('BEGIN');
  try{const result=commands.map(command=>command.execute());db.exec('COMMIT');return result}
  catch(error){db.exec('ROLLBACK');throw error}
 }};
}

test('guarded contact sections return only needed fields and append masked D1 audit entries',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const file of ['1000_e2e_staging_acceptance_ONLY.sql','1003_entrant_profile_optin_STAGING_ONLY.sql',
   '1007_test_application_approval_STAGING_ONLY.sql','1009_test_video_supplements_STAGING_ONLY.sql',
   '1010_nepal_locations_STAGING_ONLY.sql','1011_frontline_2027_registration_STAGING_ONLY.sql',
   '1013_muse_audition_details_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql',
   '1015_muse_contact_handle_STAGING_ONLY.sql','1016_january_demo_test_rosters_ONLY.sql','1017_staff_auth_limits_STAGING_ONLY.sql',
   '1018_admin_registration_audit_STAGING_ONLY.sql']){
   db.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
  }
  const env={DB:sqliteAdapter(db),STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:secret,STAGING_PASSWORD_SIGNUP_ENABLED:'true',
   STAGING_ADMIN_MANAGEMENT_ENABLED:'true',STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_MUSE_AUDITION_ENABLED:'true',
   STAGING_PROFILE_URLS_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',
   STAGING_ALLOWED_EMAILS:'member@example.invalid,other@example.invalid',
   STAGING_ORGANIZER_EMAILS:'organizer@example.invalid',STAGING_REVIEWER_EMAILS:'reviewer@example.invalid'};
  const tokens={organizer:'a'.repeat(64),reviewer:'b'.repeat(64),member:'c'.repeat(64),oldOrganizer:'d'.repeat(64),oldReviewer:'e'.repeat(64)};
  for(const role of ['organizer','reviewer','member','other']){
   db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)')
    .run(role,hash('email:'+role+'@example.invalid'),'MASKED',role==='other'?'member':role,1,1);
   if(tokens[role])db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)')
    .run(hash((role==='member'?'session:':'staff-session:')+tokens[role]),role,4102444800,1);
  }
  db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash('session:'+tokens.oldOrganizer),'organizer',4102444800,1);
  db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash('session:'+tokens.oldReviewer),'reviewer',4102444800,1);
  for(const [id,role] of [[firstId,'member'],[secondId,'other']]){
   db.prepare(`INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,
    original_artist,song_language,song_key,demo_url,payment_status,created_at,updated_at)
    VALUES(?,?,'2027-01','community','bagmati','work','Fictional School','Same Stage Name','Fictional Song',
    'Fictional Artist','ne','C','https://example.invalid/video','simulated_paid',1,1)`).run(id,role);
   db.prepare(`INSERT INTO e2e_muse_audition_details(application_id,full_name,contact_phone,contact_email,contact_handle,
    city,street_address,educational_background,short_description,musical_training,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,1)`)
    .run(id,'Private '+role,'+977 9800000001','private-'+role+'@example.invalid','private chat',
     'private city','private street','private education','private intro','private music');
   db.prepare('INSERT INTO e2e_application_locations VALUES(?,?,?)').run(id,'lumbini','Private location '+role);
   db.prepare('INSERT INTO e2e_application_profiles VALUES(?,?,?,?,?,?,?)')
    .run(id,'prefer_not_say','https://example.com/fixture-'+role+'.jpg',null,null,1,1);
  }
  db.prepare('INSERT INTO e2e_frontline_2027_registration VALUES(?,?,?,?)').run(firstId,'B','graduated',1);
  const call=(path,role,body)=>handleE2E(new Request(host+'/api/e2e/'+path,{
   method:body?'POST':'GET',
   headers:{...(role?{Cookie:'__Host-ghv-e2e='+tokens[role]}:{}),...(body?{Origin:host,'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,
  }),env);

  const roster=(await (await call('organizer-queue?view=workbench','organizer')).json()).applications;
  assert.equal(roster.length,2);
  assert.equal(roster.find(row=>row.id===firstId).province,'lumbini');
  assert.equal(roster.find(row=>row.id===firstId).competition_region,'B');
  assert.equal(roster.find(row=>row.id===secondId).competition_region,null);
  for(const row of roster){
   assert.equal(row.song_title,'Fictional Song');
   for(const key of ['location_detail','gender','affiliation','photo_url_1','contact_email','eligibility_basis'])assert.ok(!(key in row),key);
  }
  const organizerProfile='organizer-queue?view=profile&id='+firstId;
  for(const actor of ['reviewer','member'])assert.equal((await call(organizerProfile,actor)).status,403);
  const profile=(await (await call(organizerProfile,'organizer')).json()).profile;
  assert.deepEqual(profile,{id:firstId,stage_name:'Same Stage Name',round_code:'2027-01',category:'community',province:'lumbini',competition_region:'B',
   photo_url_1:'https://example.com/fixture-member.jpg',photo_url_2:null,photo_url_3:null});
  assert.equal((await call('organizer-queue?view=profile&id=bad-id','organizer')).status,422);
  const legacyRoster=(await (await call('organizer-queue','organizer')).json()).applications;
  assert.equal(legacyRoster.find(row=>row.id===firstId).location_detail,'Private location member');
  assert.equal(legacyRoster.find(row=>row.id===firstId).photo_url_1,profile.photo_url_1);
  assert.ok(legacyRoster.every(row=>!('competition_region' in row)));
  const reviewerQueue=(await (await call('reviewer-queue?view=workbench','reviewer')).json()).queue;
  assert.equal(reviewerQueue.length,2);
  assert.equal(reviewerQueue[0].demo_technique,null);
  assert.equal(reviewerQueue.find(row=>row.id===firstId).competition_region,'B');
  assert.ok(reviewerQueue.every(row=>!('photo_url_1' in row)&&!('gender' in row)&&!('eligibility_basis' in row)));
  const reviewerEntry=id=>'reviewer-queue?view=workbench&id='+id;
  assert.equal((await call(reviewerEntry(firstId),'organizer')).status,403);
  assert.equal((await call(reviewerEntry(firstId),'member')).status,403);
  assert.equal((await call(reviewerEntry('bad-id'),'reviewer')).status,422);
  assert.deepEqual((await (await call(reviewerEntry(firstId),'reviewer')).json()).queue.map(row=>row.id),[firstId]);
  assert.deepEqual((await (await call(reviewerEntry(missingId),'reviewer')).json()).queue,[]);
  const path=(id,section)=>'organizer-contact?id='+id+(section===undefined?'':'&section='+section);
  const results={
   identity:{full_name:'Private member'},
   contact:{contact_phone:'+977 9800000001',contact_email:'private-member@example.invalid',contact_handle:'private chat'},
   address:{city:'private city',street_address:'private street'},
   background:{educational_background:'private education',short_description:'private intro',musical_training:'private music'},
  };
  assert.equal((await call(path(firstId,'identity'))).status,401);
  assert.equal((await call(path(firstId,'identity'),'oldOrganizer')).status,401);
  for(const actor of ['reviewer','member']){
   const response=await call(path(firstId,'contact'),actor);
   assert.equal(response.status,403);
   assert.equal((await response.json()).contact,undefined);
  }
  for(const [section,data] of Object.entries(results)){
   const response=await call(path(firstId,section),'organizer');
   assert.equal(response.status,200,await response.clone().text());
   assert.equal(response.headers.get('cache-control'),'no-store');
   assert.deepEqual(await response.json(),{ok:true,section,contact:data,testOnly:true});
  }
  const second=await (await call(path(secondId,'identity'),'organizer')).json();
  assert.deepEqual(second.contact,{full_name:'Private other'});
  const missing=await call(path(missingId,'identity'),'organizer');
  assert.equal(missing.status,404);
  assert.equal((await missing.json()).contact,undefined);
  const unknown=await call(path(firstId,'constructor'),'organizer');
  assert.equal(unknown.status,422);
  const legacy=await call(path(firstId),'organizer');
  assert.equal(legacy.status,422); // Full-record reads are forbidden, even to organizer.
  assert.equal((await legacy.json()).contact,undefined);
  const audit=await call('organizer-registration-audit?id='+firstId,'organizer');
  const events=(await audit.json()).events;
  assert.equal(events.length,4);
  assert.ok(events.every(x=>x.action==='audit_read'&&x.result==='success'&&x.actor_id==='organizer'&&x.target_id===firstId&&x.occurred_at>1));
  assert.deepEqual(events.map(x=>x.diff.section).sort(),['address','background','contact','identity']);
  assert.doesNotMatch(JSON.stringify(events),/9800000001|example\.invalid|Private member|private chat|private street/i);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM e2e_staff_audit WHERE result='denied' AND target_id IS NULL").get().n,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM e2e_staff_audit WHERE result='missing' AND target_id=?").get(missingId).n,1);

  const disabled=await call('organizer-registration-action','organizer',{id:secondId,action:'disable',version:0,updated_at:1});
  assert.equal(disabled.status,200,await disabled.clone().text());
  const afterDisable=(await (await call('reviewer-queue?view=workbench','reviewer')).json()).queue;
  assert.deepEqual(afterDisable.map(row=>row.id),[firstId]);
  assert.equal((await call('organizer-queue?view=profile&id='+secondId,'organizer')).status,404);
  assert.equal((await call('score','reviewer',{application_id:secondId,phase:'demo',technique:50,interpretation:30,no_conflict:true})).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_judge_scores').get().n,0);
  assert.deepEqual((await (await call(reviewerEntry(secondId),'reviewer')).json()).queue,[]);
  assert.equal((await call('score','reviewer',{application_id:firstId,phase:'demo',technique:50,interpretation:30,no_conflict:true})).status,200);
  const [afterScore]=(await (await call(reviewerEntry(firstId),'reviewer')).json()).queue;
  assert.equal(afterScore.demo_technique,50);
  assert.equal(afterScore.demo_interpretation,30);

  env.STAGING_STAFF_TURNSTILE_REQUIRED='false';
  assert.equal((await call(organizerProfile,'oldOrganizer')).status,200);
  assert.equal((await call(organizerProfile,'oldReviewer')).status,403);
  assert.equal((await call('reviewer-queue?view=workbench','oldOrganizer')).status,403);
  assert.equal((await call(path(firstId,'identity'),'oldOrganizer')).status,503);
  assert.equal((await call(path(firstId),'oldOrganizer')).status,422);
  env.STAGING_ADMIN_MANAGEMENT_ENABLED='false';
  assert.equal((await call(path(firstId,'identity'),'oldOrganizer')).status,503);
  assert.equal((await call(path(firstId),'oldOrganizer')).status,422);
  env.STAGING_STAFF_TURNSTILE_REQUIRED='true';
  env.STAGING_ADMIN_MANAGEMENT_ENABLED='true';

  db.exec("CREATE TRIGGER block_contact_audit BEFORE INSERT ON e2e_staff_audit BEGIN SELECT RAISE(ABORT,'read fixture'); END");
  for(const section of ['contact']){
   const blocked=await call(path(firstId,section),'organizer');
   assert.equal(blocked.status,503);
   assert.deepEqual(await blocked.json(),{ok:false,error:'contact_audit_unavailable'});
  }
  db.exec('DROP TABLE e2e_staff_audit');
  const unavailable=await call(path(firstId,'contact'),'organizer');
  assert.equal(unavailable.status,503);
  assert.equal((await unavailable.json()).error,'contact_audit_unavailable');

  db.exec('DROP TABLE e2e_frontline_2027_registration');
  const olderSchema=(await (await call(organizerProfile,'organizer')).json()).profile;
  assert.equal(olderSchema.competition_region,null);
 }finally{db.close()}
});
