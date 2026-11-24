import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://ghv-test.example.invalid';
const id='11111111-2222-4333-8444-555555555555';
const identity='test-only-staff-administration-secret';
const fingerprint=value=>createHmac('sha256',identity).update(value).digest('hex');

function adapter(db){
 const prepare=sql=>{
  let values=[];
  return {bind(...args){values=args;return this},first(){return db.prepare(sql).get(...values)},
   all(){return {results:db.prepare(sql).all(...values)}},run(){return {meta:{changes:db.prepare(sql).run(...values).changes}}},
   execute(){return db.prepare(sql).columns().length?this.all():this.run()}};
 };
 return {prepare,batch(commands){
  db.exec('BEGIN');
  try{const result=commands.map(command=>command.execute());db.exec('COMMIT');return result}
  catch(error){db.exec('ROLLBACK');throw error}
 }};
}
test('organizer alone edits, disables, removes and restores a fictional D1 registration with masked audit',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const file of ['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql','1009_test_video_supplements_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql','1016_january_demo_test_rosters_ONLY.sql','1017_staff_auth_limits_STAGING_ONLY.sql','1018_admin_registration_audit_STAGING_ONLY.sql']){
   db.exec(await readFile(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
  }
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run('organizer-fake',fingerprint('email:organizer@example.invalid'),'masked','organizer',1,1);
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run('judge-fake',fingerprint('email:judge@example.invalid'),'masked','reviewer',1,1);
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run('singer-fake',fingerprint('email:singer@example.invalid'),'masked','member',1,1);
  const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:identity,STAGING_PASSWORD_SIGNUP_ENABLED:'true',
   STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_ADMIN_MANAGEMENT_ENABLED:'true',
   STAGING_ORGANIZER_EMAILS:'organizer@example.invalid',STAGING_REVIEWER_EMAILS:'judge@example.invalid',STAGING_ALLOWED_EMAILS:'singer@example.invalid'};
  const tokens={'organizer-fake':'a'.repeat(64),'judge-fake':'b'.repeat(64),'singer-fake':'c'.repeat(64)};
  for(const [account,token] of Object.entries(tokens))db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)')
   .run(fingerprint((account==='singer-fake'?'session:':'staff-session:')+token),account,4102444800,1);
  db.prepare("INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,created_at,updated_at) VALUES(?,?,'2027-01','community','bagmati','work','Fictional School','Test Singer','Test Song','Test Artist','ne','C',1,1)").run(id,'singer-fake');
  const call=(path,actor,body)=>handleE2E(new Request(host+'/api/e2e/'+path,{
   method:body?'POST':'GET',headers:{...(actor?{Cookie:'__Host-ghv-e2e='+tokens[actor]}:{}),...(body?{Origin:host,'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined}),env);
  const actions='organizer-registration-action';
  assert.equal((await call('organizer-registrations',null)).status,401);
  for(const role of ['judge-fake','singer-fake']){
   assert.equal((await call('organizer-registrations',role)).status,403);
   assert.equal((await call(actions,role,{id,action:'delete',version:0,updated_at:1})).status,403);
  }
  const search=await call('organizer-registrations?q=Test%20Singer','organizer-fake');
  assert.equal(search.status,200);
  assert.deepEqual((await search.json()).registrations.map(row=>row.id),[id]);
  const change=(action,version,fields={})=>call(actions,'organizer-fake',{id,action,version,updated_at:db.prepare('SELECT updated_at FROM e2e_applications WHERE id=?').get(id).updated_at,...fields});
  const edited=await change('edit',0,{stage_name:'Fictional Edit',affiliation:'Fictional Workspace'});
  assert.equal(edited.status,200,await edited.clone().text());
  assert.equal((await change('delete',0)).status,409);
  assert.equal((await change('disable',1)).status,200);
  assert.equal(db.prepare('SELECT status FROM e2e_applications WHERE id=?').get(id).status,'withdrawn');
  assert.equal((await change('delete',2)).status,200);
  assert.throws(()=>db.prepare('DELETE FROM e2e_applications WHERE id=?').run(id),/managed_registration_preserved/);
  assert.equal((await change('restore',3)).status,200);
  const readBack=db.prepare('SELECT stage_name,affiliation,status FROM e2e_applications WHERE id=?').get(id);
  assert.deepEqual({...readBack},{stage_name:'Fictional Edit',affiliation:'Fictional Workspace',status:'submitted'});
  db.prepare('INSERT INTO e2e_judge_scores VALUES(?,?,55,35,1,1)').run(id,'judge-fake');
  for(const action of ['edit','disable','delete'])assert.equal((await change(action,4,{stage_name:'Blocked',affiliation:'Blocked'})).status,409);
  const audit=await call('organizer-registration-audit?id='+id,'organizer-fake');
  assert.equal(audit.status,200);
  const events=(await audit.json()).events;
  assert.equal(events.filter(x=>x.result==='success').length,4);
  assert.ok(events.some(x=>x.result==='protected'));
  const edit=events.find(x=>x.action==='edit'&&x.result==='success');
  assert.equal(edit.actor_id,'organizer-fake');
  assert.deepEqual(edit.diff.stage_name,['[redacted]','[redacted]']);
  assert.doesNotMatch(JSON.stringify(events),/Fictional Edit|Fictional School|Fictional Workspace|example\.invalid/);
  assert.throws(()=>db.exec('DELETE FROM e2e_staff_audit'),/staff_audit_append_only/);
  assert.equal(db.prepare('SELECT technique+interpretation AS total FROM e2e_judge_scores').get().total,90);
  db.prepare('UPDATE e2e_applications SET media_key=? WHERE id=?').run('fictional-object',id);
  const removedObjects=[];
  env.STAGING_MEDIA={async delete(key){removedObjects.push(key)}};
  const erased=await call('delete-my-data','singer-fake',{});
  assert.equal(erased.status,409);
  assert.equal(removedObjects.length,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_removed_member_media').get().n,0);
  assert.equal(db.prepare('SELECT media_key FROM e2e_applications WHERE id=?').get(id).media_key,'fictional-object');

  // Check PR #173 protections independently of legacy score existence.
  db.exec('DELETE FROM e2e_judge_scores');
  for(let pos=1;pos<=5;pos++)db.prepare('INSERT INTO e2e_demo_2027_videos VALUES(?,?,?,?,?,?,?)')
   .run(id,pos,'Fictional Song '+pos,'Fictional Artist','ne','https://example.invalid/video/'+pos,1);
  for(let j=1;j<=3;j++){
   const judge='video-judge-'+j;
   db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(judge,fingerprint(judge),'masked','reviewer',1,1);
   for(let pos=1;pos<=5;pos++)db.prepare('INSERT INTO e2e_demo_2027_scores VALUES(?,?,?,?,?,?)').run(id,pos,judge,50+pos,37,1);
  }
  assert.equal((await change('delete',4)).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_demo_2027_scores').get().n,15);
  const highest=db.prepare(`SELECT MAX(average) AS n FROM
   (SELECT AVG(technique+interpretation) AS average FROM e2e_demo_2027_scores GROUP BY position)`).get().n;
  assert.equal(highest,92);
  const roster=JSON.stringify([{application_id:id,average:highest}]);
  db.prepare('INSERT INTO e2e_january_demo_test_rosters VALUES(?,?,?,?,?)').run('A','organizer-fake',3,1,roster);
  const row=db.prepare('SELECT id,updated_at FROM e2e_applications WHERE id=?').get(id);
  assert.equal((await change('edit',4,{stage_name:'Failed Edit',affiliation:'Failed Studio'})).status,409);
  assert.throws(()=>db.prepare('DELETE FROM e2e_applications WHERE id=?').run(id),/managed_registration_preserved/);
  assert.equal(db.prepare('SELECT roster FROM e2e_january_demo_test_rosters WHERE region=?').get('A').roster,roster);
  assert.deepEqual(db.prepare('SELECT id,updated_at FROM e2e_applications WHERE id=?').get(id),row);
  // The member endpoint must not bypass managed scores/rosters.
  assert.equal((await call('delete-application','singer-fake',{application_id:id})).status,409);
  const secondId='22222222-3333-4444-8555-666666666666';
  db.prepare("INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,created_at,updated_at) VALUES(?,?,'2027-04','community','bagmati','work','Fictional School','Test Singer','Test Song','Test Artist','ne','C',1,1)").run(secondId,'singer-fake');
  db.prepare('INSERT INTO e2e_test_video_supplements(application_id,requested_by,requested_at) VALUES(?,?,?)').run(secondId,'organizer-fake',1);
  assert.equal((await call('delete-application','singer-fake',{application_id:secondId})).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_test_video_supplements WHERE application_id=?').get(secondId).n,0);
  const receipt=db.prepare("SELECT actor_role,action,result,diff FROM e2e_staff_audit WHERE target_id=? AND actor_role='member'").get(secondId);
  assert.deepEqual({...receipt},{actor_role:'member',action:'delete',result:'success',diff:JSON.stringify({member_self_delete:true})});

 }finally{db.close()}
});
