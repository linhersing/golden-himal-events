import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../backend/staging-registration-worker.js';
const base='https://correction.example';
const entry={synthetic:true,stage_name:'TEST Correction',round_code:'2027-01',category:'university',province:'bagmati',song_title:'TEST Same Song',original_artist:'TEST Artist',work_url:'https://youtu.be/dQw4w9WgXcQ',contact_phone:'+9770000000000',contact_handle:'TEST contact',affiliation:'TEST college',song_language:'Nepali',song_key:'C',priority_ack:true,media_ack:true};
const correction={work_url:'https://drive.google.com/file/d/test-corrected/view',contact_phone:'+9770000000001',contact_handle:'TEST corrected contact',affiliation:'TEST corrected college'};
async function fixture(t){
 const clock={value:Date.now()};t.mock.method(Date,'now',()=>clock.value);
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.function('unixepoch',()=>Math.floor(clock.value/1000));
 const migration=await readFile(new URL('../backend/migrations/1002_private_practice_ONLY.sql',import.meta.url),'utf8');db.exec(migration);
 const prepare=sql=>{let args=[];const s={bind(...x){args=x;return s},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}};return s};
 // D1 serializes batches. Do not create overlapping transactions on one SQLite connection.
 let queue=Promise.resolve();
 const env={STAGING_PRACTICE_ENABLED:'true',E2E_DB:{prepare,batch(stmts){const result=queue.then(async()=>{db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}});queue=result.catch(()=>{});return result}}};
 const call=async(path,body,cookie='')=>{const r=await worker.fetch(new Request(base+'/api/staging/practice/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const created=await call('create',{synthetic:true});assert.equal(created.status,201);
 const role=async id=>(await call('login',{pass:created.data.passes.find(p=>p.actor_id===id).pass})).cookie;
 const member=created.cookie,organizer=await role('organizer'),judge=await role('judge-1');
 const saved=await call('application',entry,member);assert.equal(saved.status,201);const id=saved.data.application.id;
 const request=(extra={},cookie=organizer)=>call('supplement-request',{application_id:id,reason:'TEST private video; correct link',notified_manually:true,...extra},cookie);
 t.after(()=>db.close());return {db,clock,call,role,member,organizer,judge,id,request,migration};
}
test('organizer opens one 48h manual-notification window; member corrects once and both read the audit',async t=>{
 const f=await fixture(t),opened=await f.request();assert.equal(opened.status,201);const before=Math.floor(f.clock.value/1000);
 assert.equal(opened.data.supplement.deadline_at,before+172800);assert.equal(opened.data.supplement.status,'pending');assert.equal(opened.data.emailSent,false);
 const judgeView=(await f.call('me',undefined,f.judge)).data;
 assert(!JSON.stringify(judgeView.supplements).includes('TEST private video'));assert(!JSON.stringify(judgeView.supplements).includes('contact_phone'));
 const done=await f.call('supplement',{application_id:f.id,...correction},f.member);assert.equal(done.status,200);
 for(const cookie of [f.member,f.organizer]){const state=(await f.call('me',undefined,cookie)).data;assert.equal(state.applications[0].work_url,correction.work_url);assert.equal(state.applications[0].song_title,entry.song_title);assert.equal(state.supplements[0].status,'completed');assert.equal(state.supplements[0].requested_by,'organizer');}
 const row=f.db.prepare('SELECT * FROM ghv_practice_supplements').get();assert.equal(JSON.parse(row.original_values).work_url,entry.work_url);assert.equal(JSON.parse(row.corrected_values).work_url,correction.work_url);
 assert.equal((await f.request()).status,409);assert.equal((await f.call('supplement',{application_id:f.id,...correction},f.member)).status,409);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_events WHERE kind='supplement_completed'").get().n,1);
});
test('members, judges, other members and other workspace organizers cannot open or use a correction',async t=>{
 const f=await fixture(t);for(const cookie of [f.member,f.judge])assert.equal((await f.request({},cookie)).status,403);
 assert.equal((await f.request({},'')).status,401);assert.equal((await f.request()).status,201);
 const other=await f.role('member-b');assert.equal((await f.call('supplement',{application_id:f.id,...correction},other)).status,404);
 assert.deepEqual((await f.call('me',undefined,other)).data.supplements,[]);
 assert.equal((await f.call('supplement',{application_id:f.id,...correction},f.organizer)).status,403);
 const two=await f.call('create',{synthetic:true}),owner2=(await f.call('login',{pass:two.data.passes.find(p=>p.role==='organizer').pass})).cookie;
 assert.equal((await f.request({},owner2)).status,404);assert.deepEqual((await f.call('me',undefined,owner2)).data.supplements,[]);
});
test('window requires manual notification and a reason; caller cannot choose deadline or rewrite locked song/identity',async t=>{
 const f=await fixture(t);for(const extra of [{notified_manually:false},{reason:''},{reason:'x'.repeat(301)},{deadline_at:9999999999}])assert.equal((await f.request(extra)).status,422);
 assert.equal((await f.request()).status,201);
 for(const extra of [{song_title:'OTHER SONG'},{category:'community'},{phase:'qualifier'},{actor_id:'member-b'},{deadline_at:9999999999}])assert.equal((await f.call('supplement',{application_id:f.id,...correction,...extra},f.member)).status,422);
 assert.equal((await f.call('supplement',{application_id:f.id,...correction,work_url:'javascript:alert(1)'},f.member)).status,422);
 assert.equal((await f.call('supplement',{application_id:f.id,...correction,contact_phone:'0966'},f.member)).status,422);
 assert.equal((await f.call('me',undefined,f.member)).data.supplements[0].status,'pending');
});
test('server accepts one second before 48h and rejects the exact deadline even with a fresh session',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,201);f.clock.value+=172799000;const fresh=await f.role('member-a');assert.equal((await f.call('supplement',{application_id:f.id,...correction},fresh)).status,200);
 const second=await f.call('application',{...entry,round_code:'2027-04'},fresh),id=second.data.application.id;
 const owner=await f.role('organizer');assert.equal((await f.call('supplement-request',{application_id:id,reason:'TEST fix',notified_manually:true},owner)).status,201);
 f.clock.value+=172800000;const again=await f.role('member-a');assert.equal((await f.call('supplement',{application_id:id,...correction},again)).status,409);
 assert.equal((await f.call('me',undefined,again)).data.supplements.find(s=>s.application_id===id).status,'expired');
 const judge=await f.role('judge-1'),admin=await f.role('organizer');
 assert.equal((await f.call('score',{application_id:id,phase:'demo',technique:54,interpretation:36,no_conflict:true},judge)).status,409);
 assert.equal((await f.call('promote',{application_id:id,phase:'demo'},admin)).status,409);
});
test('first score locks out correction; pending or expired correction blocks score and promotion at SQL boundary',async t=>{
 const f=await fixture(t),score={application_id:f.id,phase:'demo',technique:54,interpretation:36,no_conflict:true};
 assert.equal((await f.request()).status,201);assert.equal((await f.call('score',score,f.judge)).status,409);
 assert.throws(()=>f.db.prepare("INSERT INTO ghv_practice_scores VALUES(?,?,?,'demo',54,36,0,0,0,NULL,?)").run((f.db.prepare('SELECT workspace_id FROM ghv_practice_applications').get()).workspace_id,f.id,'judge-1',Math.floor(f.clock.value/1000)),/supplement/);
 assert.throws(()=>f.db.prepare("UPDATE ghv_practice_applications SET phase='qualifier' WHERE id=?").run(f.id),/supplement/);
 assert.equal((await f.call('supplement',{application_id:f.id,...correction},f.member)).status,200);
 assert.equal((await f.call('score',score,f.judge)).status,201);
 const second=(await f.call('application',{...entry,round_code:'2027-04'},f.member)).data.application.id;
 assert.equal((await f.call('score',{...score,application_id:second},f.judge)).status,201);
 assert.equal((await f.call('supplement-request',{application_id:second,reason:'TEST too late',notified_manually:true},f.organizer)).status,409);
});
test('two concurrent correction writes consume one slot and preserve the actual winner',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,201);
 const results=await Promise.all([f.call('supplement',{application_id:f.id,...correction},f.member),f.call('supplement',{application_id:f.id,...correction,contact_handle:'TEST loser'},f.member)]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);const row=f.db.prepare('SELECT * FROM ghv_practice_supplements').get();const app=f.db.prepare('SELECT * FROM ghv_practice_applications').get();assert.equal(JSON.parse(row.corrected_values).contact_handle,app.contact_handle);
});
test('additive rerun preserves completed records, rejects audit tampering and missing guards fail closed',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,201);assert.equal((await f.call('supplement',{application_id:f.id,...correction},f.member)).status,200);
 f.db.exec(f.migration);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ghv_practice_applications').get().n,1);assert.equal((await f.call('me',undefined,f.member)).data.supplements[0].status,'completed');
 assert.throws(()=>f.db.prepare('UPDATE ghv_practice_supplements SET reason=?').run('tampered'),/immutable/);
 f.db.exec('DROP TRIGGER ghv_practice_supplement_edit_guard');assert.equal((await f.call('readiness')).status,503);
});
