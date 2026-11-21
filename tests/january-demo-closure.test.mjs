import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {handleE2E} from '../backend/staging-e2e.js';

const migrations=['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql',
 '1011_frontline_2027_registration_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql','1016_january_demo_test_rosters_ONLY.sql'];
const host='https://test.example.invalid';

async function database(t){
 if(process.env.GHV_LOCAL_D1_MODULE){
  const {Miniflare}=await import(pathToFileURL(process.env.GHV_LOCAL_D1_MODULE).href);
  const instance=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:{ISOLATED:'january-closure-test'}});
  t.after(()=>instance.dispose());
  const db=await instance.getD1Database('ISOLATED');
  const statements=JSON.parse(await readFile(process.env.GHV_D1_TEST_MIGRATIONS,'utf8'));
  for(const sql of statements)await db.prepare(sql).run();
  return db;
 }
 const db=new DatabaseSync(':memory:');
 t.after(()=>db.close());
 for(const migration of migrations)db.exec(await readFile(new URL('../backend/migrations/'+migration,import.meta.url),'utf8'));
 return {prepare(sql){
  let args=[];return {bind(...values){args=values;return this},first(){return db.prepare(sql).get(...args)||null},
   all(){return {results:db.prepare(sql).all(...args)}},run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}};
 },batch(statements){
  db.exec('BEGIN');
  try{const results=statements.map(s=>s.run());db.exec('COMMIT');return results}
  catch(error){db.exec('ROLLBACK');throw error}
 }};
}

test('January TEST closure uses five immutable scorecards and a single best work per account',async t=>{
 const DB=await database(t);
 const secret='test-only-identity-secret'.repeat(3);
 const sign=value=>createHmac('sha256',secret).update(value).digest('hex');
 const memberIds=['singer','rival'],staff=['organizer'],judges=['judge1','judge2','judge3','judge4'];
 const addresses=ids=>ids.map(id=>id+'@example.invalid').join(',');
 const env={DB,STAGING_IDENTITY_SECRET:secret,STAGING_E2E_ENABLED:'true',STAGING_ONLINE_JUDGING_MODE:'all_stages_test',STAGING_SUBMISSION_MODE:'links',
  STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_FIVE_DEMO_REHEARSAL:'true',STAGING_FRONTLINE_2027_ENABLED:'true',
  STAGING_ALLOWED_EMAILS:addresses(memberIds),STAGING_ORGANIZER_EMAILS:addresses(staff),STAGING_REVIEWER_EMAILS:addresses(judges),
  STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(){}}};
 const cookies={};
 async function signIn(id,suffix='initial'){
  const token=sign(id+':'+suffix);
  await DB.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').bind(sign('session:'+token),id,9999999999,1).run();
  cookies[id]='__Host-ghv-e2e='+token;
 }
 for(const [role,ids] of [['member',memberIds],['organizer',staff],['reviewer',judges]])for(const id of ids){
  await DB.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').bind(id,sign('email:'+id+'@example.invalid'),'TEST',role,1,1).run();
  await signIn(id);
 }
 const call=(path,id,body)=>handleE2E(new Request(host+'/api/e2e/'+path,{method:body?'POST':'GET',
  headers:{...(id?{Cookie:cookies[id]}:{}),...(body?{Origin:host,'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined}),env);
 async function ok(path,id,body,status=200){
  const response=await call(path,id,body);
  const json=await response.json();
  assert.equal(response.status,status,JSON.stringify(json));return json;
 }
 const demos=Array.from({length:5},(_,i)=>({song_title:'TEST Song '+(i+1),original_artist:'TEST Artist '+(i+1),
  song_language:['Nepali','English','Hindi','Maithili','Tamang'][i],demo_url:'https://youtu.be/TEST_Demo_'+(i+1)}));
 const entry={...demos[0],demo_entries:demos,round_code:'2027-01',category:'community',province:'gandaki',
  location_basis:'residence',affiliation:'TEST school',stage_name:'TEST Singer',song_key:'C',no_exclusive_contract:true,
  frontline_2027:true,competition_region:'A',eligibility_basis:'graduated'};
 const six=[...demos,{...demos[0],demo_url:'https://youtu.be/TEST_Demo_6'}];
 assert.equal((await call('applications','singer',{...entry,demo_entries:six})).status,422);
 const {application_id}=await ok('applications','singer',entry,201);
 await ok('logout','singer',{});await signIn('singer','relogin');
 assert.deepEqual((await ok('applications','singer')).applications[0].demo_entries,demos);
 assert.deepEqual((await ok('organizer-queue','organizer')).applications[0].demo_entries,demos);
 assert.equal((await ok('reviewer-queue','judge1')).queue.length,0);
 const request={application_id};
 assert.equal((await call('approve-test-application','singer',request)).status,403);
 assert.equal((await call('january-test-roster','judge1')).status,403);
 assert.equal((await call('update-application','rival',{...request,stage_name:'TEST Rival edit',...demos[0]})).status,404);
 await ok('approve-test-application','organizer',request);
 assert.equal((await ok('organizer-queue','organizer')).applications[0].payment_status,'unpaid');
 assert.deepEqual((await ok('organizer-queue','organizer')).applications[0].demo_entries,demos);
 const q=(await ok('reviewer-queue','judge1')).queue[0];assert.equal(q.per_video_scoring,true);assert.deepEqual(q.demo_entries,demos);
 const score=(position,technique)=>({...request,position,technique,interpretation:35,no_conflict:true});
 assert.equal((await call('january-video-score',null,score(1,40))).status,401);
 assert.equal((await call('january-video-score','organizer',score(1,40))).status,403);
 assert.equal((await call('january-test-roster','organizer',{region:'A'})).status,409);
 const marks=[40,45,57,50,53];
 for(const [index,judge] of judges.slice(0,3).entries())for(const [i,mark] of marks.entries())
  await ok('january-video-score',judge,score(i+1,mark+index-1),201);
 assert.equal((await call('january-video-score','judge1',score(1,59))).status,409);
 assert.equal((await call('january-video-score','judge4',score(1,59))).status,409);
 assert.equal((await ok('reviewer-queue','judge1')).queue[0].demo_entries[2].my_score.technique,56);
 assert.equal(Number((await DB.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_scores').first()).n),15);
 const pending=(await ok('january-test-roster','organizer')).regions[0];
 assert.equal(pending.blocker,'seat_limit_pending');
 assert.equal(pending.ranked[0].position,3);assert.equal(pending.ranked[0].average,92);
 env.STAGING_JANUARY_TEST_SEATS_A='1';
 const rival=await ok('applications','rival',{...entry,stage_name:'TEST Rival',demo_entries:[demos[0]]},201);
 await ok('approve-test-application','organizer',{application_id:rival.application_id});
 for(const judge of judges.slice(0,3))await ok('january-video-score',judge,{...score(1,57),application_id:rival.application_id},201);
 const tie=(await ok('january-test-roster','organizer')).regions[0];
 assert.equal(tie.blocker,'cutoff_tie_pending');
 assert.equal((await call('january-test-roster','organizer',{region:'A'})).status,409);
 env.STAGING_JANUARY_TEST_SEATS_A='2';
 const published=await ok('january-test-roster','organizer',{region:'A'},201);
 assert.equal(published.selected.length,2);assert.equal(published.selected.filter(r=>r.application_id===application_id).length,1);
 const next=(await ok('january-test-roster','organizer')).regions[0];
 assert.deepEqual(next.selected,published.selected);
 assert.equal((await call('january-test-roster','organizer',{region:'A'})).status,409);
});
