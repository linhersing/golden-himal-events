import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://example.invalid';
const demos=Array.from({length:5},(_,i)=>({song_title:`TEST Song ${i+1}`,original_artist:`TEST Artist ${i+1}`,
 song_language:['Nepali','English','Hindi','Maithili','Tamang'][i],demo_url:`https://youtu.be/TEST_Demo_${i+1}`}));
const correction={demo_url:'https://youtu.be/TEST_corrected',song_title:'TEST Corrected song',original_artist:'TEST Corrected artist',
 stage_name:'TEST Corrected singer',affiliation:'TEST Corrected school',song_key:'D'};

// Each fixture uses real migrations, authenticated handleE2E requests and disposable SQLite.
// Session seeding is not human verification or real email-delivery acceptance.
async function fixture(t,{five=true,canonical=five}={}){
 const clock={now:Date.now()};t.mock.method(Date,'now',()=>clock.now);
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.function('unixepoch',()=>Math.floor(clock.now/1000));
 for(const file of ['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql',
  '1009_test_video_supplements_STAGING_ONLY.sql',...(canonical?['1014_demo_five_2027_STAGING_ONLY.sql']:[])])
  db.exec(await readFile(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 const secret='S'.repeat(64),hmac=value=>createHmac('sha256',secret).update(value).digest('hex'),cookies={};
 for(const [id,role] of [['owner','member'],['other','member'],['reviewer','reviewer'],['organizer','organizer']]){
  const token=hmac('fictional-token:'+id);
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(id,hmac('email:'+id+'@example.invalid'),'TEST',role,1,1);
  db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hmac('session:'+token),id,9999999999,1);
  cookies[id]='__Host-ghv-e2e='+token;
 }
 const prepare=sql=>{let args=[];return {bind(...values){args=values;return this},
  first(){return db.prepare(sql).get(...args)||null},all(){return {results:db.prepare(sql).all(...args)}},
  run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}};
 // Serialize like D1 so competing requests cannot overlap a SQLite transaction.
 let queue=Promise.resolve();
 const env={STAGING_E2E_ENABLED:'true',STAGING_ONLINE_JUDGING_MODE:'final_only',STAGING_SUBMISSION_MODE:'links',
  STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_IDENTITY_SECRET:secret,
  STAGING_ALLOWED_EMAILS:'owner@example.invalid,other@example.invalid',STAGING_REVIEWER_EMAILS:'reviewer@example.invalid',
  STAGING_ORGANIZER_EMAILS:'organizer@example.invalid',STAGING_FROM_EMAIL:'test@example.invalid',EMAIL:{async send(){throw Error('Real mail is not part of this fixture')}},
  ...(five?{STAGING_FIVE_DEMO_ENABLED:'true',STAGING_PER_VIDEO_JUDGING_ENABLED:'true'}:{}),
  DB:{prepare,batch(statements){const result=queue.then(()=>{db.exec('BEGIN');
   try{const results=statements.map(s=>s.run());db.exec('COMMIT');return results}
   catch(error){db.exec('ROLLBACK');throw error}});queue=result.catch(()=>{});return result}}};
 const call=async(route,role='owner',body)=>{
  const response=await handleE2E(new Request(host+'/api/e2e/'+route,{method:body===undefined?'GET':'POST',
   headers:{...(cookies[role]?{Cookie:cookies[role]}:{}),...(body===undefined?{}:{Origin:host,'Content-Type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
  return {status:response.status,data:await response.json()};
 };
 const created=await call('applications','owner',{round_code:'2027-01',category:'community',province:'gandaki',
  location_basis:'residence',affiliation:'TEST School',stage_name:'TEST Singer',song_key:'C',...demos[0],
  adult_confirmed:true,no_exclusive_contract:true,...(five?{demo_entries:demos}:{})});
 assert.equal(created.status,201,JSON.stringify(created.data));
 const id=created.data.application_id;
 const request=(role='organizer')=>call('request-video-supplement',role,{application_id:id});
 const submit=(fields=correction,role='owner')=>call('submit-video-supplement',role,{application_id:id,...fields});
 const saved=()=>({...db.prepare('SELECT * FROM e2e_applications WHERE id=?').get(id)});
 const videos=()=>canonical?db.prepare('SELECT * FROM e2e_demo_2027_videos WHERE application_id=? ORDER BY position').all(id).map(r=>({...r})):[];
 const window=()=>({...db.prepare('SELECT * FROM e2e_test_video_supplements WHERE application_id=?').get(id)});
 return {db,env,clock,call,id,request,submit,saved,videos,window};
}

test('first-video correction atomically updates canonical and legacy fields; other four remain identical',async t=>{
 const f=await fixture(t),before=f.videos();assert.equal((await f.request()).status,200);
 assert.equal((await f.submit()).status,200);
 const stored=f.videos(),app=f.saved();
 for(const key of ['demo_url','song_title','original_artist']){
  assert.equal(stored[0][key],correction[key],`canonical ${key}`);assert.equal(app[key],correction[key],`legacy ${key}`);
 }
 assert.equal(stored[0].song_language,before[0].song_language);assert.deepEqual(stored.slice(1),before.slice(1));
 for(const [route,role] of [['applications','owner'],['organizer-queue','organizer']]){
  const read=await f.call(route,role);assert.equal(read.status,200);
  const row=read.data.applications.find(a=>a.id===f.id);
  assert.equal(row.demo_url,correction.demo_url);assert.equal(row.demo_entries[0].demo_url,correction.demo_url);
  assert.equal(row.demo_entries[0].song_title,correction.song_title);assert.equal(row.video_supplement_state,'submitted');
  assert.equal(row.demo_entries.length,5);
 }
 assert.equal((await f.submit()).status,409);assert.equal((await f.request()).status,409);
 assert.deepEqual(f.videos(),stored);assert.equal(f.window().submitted_at,Math.floor(f.clock.now/1000));
});

test('foreign members, staff, unauthenticated callers and forged fields cannot consume the owner window',async t=>{
 const f=await fixture(t),before=f.saved(),videos=f.videos();
 for(const role of ['owner','other','reviewer'])assert.equal((await f.request(role)).status,403);
 assert.equal((await f.request('guest')).status,401);assert.equal((await f.request()).status,200);
 assert.equal((await f.submit(correction,'other')).status,409);
 for(const role of ['organizer','reviewer'])assert.equal((await f.submit(correction,role)).status,403);
 assert.equal((await f.submit(correction,'guest')).status,401);
 for(const fields of [{},{demo_url:'javascript:alert(1)'},{demo_url:''},{stage_name:'x'},{song_title:'x'.repeat(101)},
  {demo_entries:demos},{position:2},{account_id:'other'},{song_language:'English'},{submitted_at:1}])
  assert.equal((await f.submit(fields)).status,422,JSON.stringify(fields));
 assert.deepEqual(f.saved(),before);assert.deepEqual(f.videos(),videos);assert.equal(f.window().submitted_at,null);
 assert.equal((await f.call('approve-test-application','organizer',{application_id:f.id})).status,409);
});

for(const offset of [-1,0,1])test(`48h server boundary ${offset}s`,async t=>{
 const f=await fixture(t),before=f.videos();assert.equal((await f.request()).status,200);
 f.clock.now+=(172800+offset)*1000;
 assert.equal((await f.submit()).status,offset<0?200:409);
 if(offset>=0){assert.deepEqual(f.videos(),before);assert.equal(f.window().submitted_at,null);
  assert.equal((await f.call('applications')).data.applications[0].video_supplement_state,'expired');}
});

test('future request timestamp cannot be consumed',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,200);
 f.db.prepare('UPDATE e2e_test_video_supplements SET requested_at=requested_at+10').run();
 assert.equal((await f.submit()).status,409);assert.equal(f.window().submitted_at,null);
});

const locks={
 approved:f=>f.db.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,?)').run(f.id,'organizer',1),
 scored:f=>f.db.prepare("UPDATE e2e_applications SET status='scored' WHERE id=?").run(f.id),
 promoted:f=>f.db.prepare("UPDATE e2e_applications SET phase='qualifier' WHERE id=?").run(f.id),
 historicalPromotion:f=>f.db.prepare("INSERT INTO e2e_promotion_events VALUES(?,?,?,'demo','qualifier',?)").run('TEST promotion',f.id,'organizer',1),
 legacyScore:f=>f.db.prepare('INSERT INTO e2e_judge_scores VALUES(?,?,?,?,1,?)').run(f.id,'reviewer',50,30,1),
 canonicalScore:f=>f.db.prepare('INSERT INTO e2e_demo_2027_scores VALUES(?,?,?,?,?,?)').run(f.id,2,'reviewer',50,30,1)
};
for(const [name,lock] of Object.entries(locks))for(const timing of ['before request','after request'])
 test(`${name} lock ${timing} denies correction without mutation`,async t=>{
  const f=await fixture(t);
  if(timing==='after request')assert.equal((await f.request()).status,200);
  lock(f);const before=f.saved(),videos=f.videos();
  if(timing==='before request')assert.equal((await f.request()).status,409);
  assert.equal((await f.submit()).status,409);
  assert.deepEqual(f.saved(),before);assert.deepEqual(f.videos(),videos);
  if(timing==='after request')assert.equal(f.window().submitted_at,null);
 });

test('canonical database failure rolls back window and legacy update, then retry succeeds',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,200);
 const before=f.saved(),videos=f.videos();
 f.db.exec("CREATE TRIGGER test_fail_canonical BEFORE UPDATE ON e2e_demo_2027_videos BEGIN SELECT RAISE(ABORT,'TEST injected canonical failure'); END");
 const failed=await f.submit();assert.equal(failed.status,503);assert.equal(failed.data.error,'temporary_service_error');
 assert.deepEqual(f.saved(),before);assert.deepEqual(f.videos(),videos);assert.equal(f.window().submitted_at,null);
 f.db.exec('DROP TRIGGER test_fail_canonical');assert.equal((await f.submit()).status,200);
 assert.equal(f.videos()[0].demo_url,correction.demo_url);
});

test('two competing corrections persist one winner in both representations',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,200);
 const results=await Promise.all([f.submit(),f.submit({...correction,demo_url:'https://youtu.be/TEST_competing'})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=results.find(r=>r.status===200).data.demo_url;
 assert.equal(f.saved().demo_url,winner);assert.equal(f.videos()[0].demo_url,winner);
});

for(const canonical of [false,true])test(`legacy single video still corrects with canonical schema ${canonical?'present':'absent'}`,async t=>{
 const f=await fixture(t,{five:false,canonical});assert.equal((await f.request()).status,200);
 assert.equal((await f.submit()).status,200);assert.equal(f.saved().demo_url,correction.demo_url);assert.deepEqual(f.videos(),[]);
 assert.equal((await f.submit()).status,409);
});

test('non-video correction preserves all canonical rows and language',async t=>{
 const f=await fixture(t),before=f.videos();assert.equal((await f.request()).status,200);
 assert.equal((await f.submit({affiliation:'TEST New school',song_key:'E'})).status,200);
 assert.deepEqual(f.videos(),before);assert.equal(f.saved().affiliation,'TEST New school');assert.equal(f.saved().song_key,'E');
});

test('persisted five-demo data stays consistent after its feature flags are switched off',async t=>{
 const f=await fixture(t),before=f.videos();
 f.env.STAGING_FIVE_DEMO_ENABLED='false';f.env.STAGING_PER_VIDEO_JUDGING_ENABLED='false';
 assert.equal((await f.request()).status,200);assert.equal((await f.submit({song_title:'TEST Title only'})).status,200);
 assert.equal(f.saved().song_title,'TEST Title only');assert.equal(f.videos()[0].song_title,'TEST Title only');
 for(const key of ['demo_url','original_artist','song_language'])assert.equal(f.videos()[0][key],before[0][key]);
 assert.deepEqual(f.videos().slice(1),before.slice(1));
});

test('legacy projection failure rolls back the claimed one-time window before canonical write',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,200);
 const before=f.saved(),videos=f.videos();
 f.db.exec("CREATE TRIGGER test_fail_projection BEFORE UPDATE ON e2e_applications BEGIN SELECT RAISE(ABORT,'TEST injected projection failure'); END");
 assert.equal((await f.submit()).status,503);assert.equal(f.window().submitted_at,null);
 assert.deepEqual(f.saved(),before);assert.deepEqual(f.videos(),videos);
 f.db.exec('DROP TRIGGER test_fail_projection');assert.equal((await f.submit()).status,200);
});
