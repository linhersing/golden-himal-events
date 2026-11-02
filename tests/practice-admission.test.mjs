import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceFixture} from './support/practice-attendance-fixture.mjs';
test('published primary offer gives48h; owning member confirms once and advances atomically',async t=>{
 const f=await attendanceFixture(t),ids=f.seed();const published=await f.publish();assert.equal(published.status,201);
 const member=await f.role('member-a'),view=(await f.call('me',undefined,member)).data;assert.equal(view.admission_slots.length,1);const slot=view.admission_slots[0];assert.equal(slot.deadline_at-slot.notified_at,172800);
 const result=await f.call('admission-respond',{pool_id:slot.pool_id,application_id:ids[0],response:'confirm'},member);assert.equal(result.status,200);
 const reloaded=(await f.call('me',undefined,member)).data;assert.equal(reloaded.applications[0].phase,'qualifier');assert.equal(reloaded.admission_slots[0].status,'confirmed');
 assert.equal((await f.call('admission-respond',{pool_id:slot.pool_id,application_id:ids[0],response:'confirm'},member)).status,200);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_events WHERE application_id=? AND kind='admission_confirmed'").get(ids[0]).n,1);
 assert.equal((await f.call('admission-respond',{pool_id:slot.pool_id,application_id:ids[0],response:'decline'},member)).status,409);
});
test('Demo25+5 quota and role/workspace boundaries cannot be overridden by caller payloads',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(30,'demo',26),p=await f.publish();assert.equal(p.status,201);const pool=p.data.pool;
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_admission_slots WHERE status='offered'").get().n,25);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_admission_slots WHERE status='waiting'").get().n,5);
 assert.equal((await f.publish()).status,409);assert.equal((await f.publish('demo',{},await f.role('member-a'))).status,403);
 assert.equal((await f.publish('demo',{primary_limit:99})).status,422);assert.equal((await f.publish('demo',{notified_manually:false})).status,422);
 const member=await f.role('member-a');assert.equal((await f.call('admission-respond',{pool_id:pool.id,application_id:ids[0],response:'confirm'},member)).status,404);
 const other=await f.call('create',{synthetic:true}),owner=(await f.call('login',{pass:other.data.passes.find(p=>p.role==='organizer').pass})).cookie;
 assert.deepEqual((await f.call('me',undefined,owner)).data.admission_slots,[]);assert.equal((await f.call('admission-notify',{pool_id:pool.id,application_id:ids[25],notified_manually:true},owner)).status,404);
 assert.equal((await f.call('admission-respond',{pool_id:pool.id,application_id:ids[0],response:'confirm'},await f.role('judge-1'))).status,403);
});
test('cron expires offers without visitors and reserve24h begins only after manual notification',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(26,'demo',26),p=await f.publish();assert.equal(p.status,201);f.clock.value+=172800000;
 await f.worker.scheduled({cron:'*/5 * * * *'},f.env,{});
 let row=f.db.prepare('SELECT * FROM ghv_practice_admission_slots WHERE application_id=?').get(ids[25]);assert.equal(row.status,'awaiting_notice');assert.equal(row.deadline_at,null);
 f.clock.value+=7200000;await f.worker.scheduled({cron:'*/5 * * * *'},f.env,{});assert.equal(f.db.prepare('SELECT status FROM ghv_practice_admission_slots WHERE application_id=?').get(ids[25]).status,'awaiting_notice');
 const admin=await f.role('organizer'),notice=await f.call('admission-notify',{pool_id:p.data.pool.id,application_id:ids[25],notified_manually:true},admin);assert.equal(notice.status,200);
 row=f.db.prepare('SELECT * FROM ghv_practice_admission_slots WHERE application_id=?').get(ids[25]);assert.equal(row.deadline_at-row.notified_at,86400);
 f.clock.value+=86399000;assert.equal((await f.call('admission-respond',{pool_id:p.data.pool.id,application_id:ids[25],response:'confirm'},await f.role('member-a'))).status,200);
 assert.equal(f.db.prepare('SELECT phase FROM ghv_practice_applications WHERE id=?').get(ids[25]).phase,'qualifier');
});
test('concurrent sweeps fill only one vacancy and follow reserve merit order after decline',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(30,'demo',26),p=await f.publish();assert.equal(p.status,201);
 for(const id of ids.slice(0,24)){const actor=f.db.prepare('SELECT actor_id FROM ghv_practice_applications WHERE id=?').get(id).actor_id;f.db.prepare("UPDATE ghv_practice_admission_slots SET status='confirmed',responded_by=?,response_at=unixepoch() WHERE application_id=?").run(actor,id);}
 f.clock.value+=172800000;await Promise.all([f.worker.scheduled({},f.env,{}),f.worker.scheduled({},f.env,{})]);
 assert.deepEqual(f.db.prepare("SELECT application_id FROM ghv_practice_admission_slots WHERE status='awaiting_notice' ORDER BY merit_order").all().map(x=>x.application_id),[ids[25]]);
 const admin=await f.role('organizer');await f.call('admission-notify',{pool_id:p.data.pool.id,application_id:ids[25],notified_manually:true},admin);
 assert.equal((await f.call('admission-respond',{pool_id:p.data.pool.id,application_id:ids[25],response:'decline'},await f.role('member-a'))).status,200);
 assert.equal(f.db.prepare('SELECT status FROM ghv_practice_admission_slots WHERE application_id=?').get(ids[26]).status,'awaiting_notice');
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_admission_slots WHERE status IN ('confirmed','offered','awaiting_notice')").get().n,25);
});
test('qualifier8+2 uses seven-day final lock and never shortens a promised confirmation window',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(10,'qualifier',9),start=Math.floor(f.clock.value/1000);
 assert.equal((await f.publish('qualifier',{event_at:start+8*86400})).status,422);
 const p=await f.publish('qualifier',{event_at:start+10*86400});assert.equal(p.status,201);assert.equal(p.data.pool.lock_at,start+3*86400);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_admission_slots WHERE status='offered'").get().n,8);
 f.clock.value+=172801000;await f.worker.scheduled({},f.env,{});
 assert.equal((await f.call('admission-notify',{pool_id:p.data.pool.id,application_id:ids[8],notified_manually:true},await f.role('organizer'))).status,409);
 f.clock.value=start*1000+3*86400000;assert.equal((await f.call('admission-respond',{pool_id:p.data.pool.id,application_id:ids[0],response:'confirm'},await f.role('member-b'))).status,409);
});
test('publication freezes source judging and prevents old manual promotion from bypassing attendance',async t=>{
 const f=await attendanceFixture(t),ids=f.seed();const p=await f.publish();assert.equal(p.status,201);
 assert.equal((await f.call('promote',{application_id:ids[0],phase:'demo'},await f.role('organizer'))).status,409);
 assert.throws(()=>f.db.prepare("UPDATE ghv_practice_applications SET phase='qualifier' WHERE id=?").run(ids[0]),/admission/);
 assert.throws(()=>f.db.prepare('UPDATE ghv_practice_admission_pools SET target_count=99').run(),/admission|constraint/i);
});
test('the next list cannot invalidate a still-valid earlier attendance offer',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(),demo=await f.publish(),member=await f.role('member-a');
 assert.equal((await f.call('admission-respond',{pool_id:demo.data.pool.id,application_id:ids[0],response:'confirm'},member)).status,200);
 for(const judge of ['judge-1','judge-2','judge-3'])f.db.prepare("INSERT INTO ghv_practice_scores VALUES(?,?,?,'qualifier',36,27,18,9,0,NULL,unixepoch())").run(f.ws,ids[0],judge);
 assert.equal((await f.publish('qualifier')).status,409);
 assert.equal((await f.call('admission-respond',{pool_id:demo.data.pool.id,application_id:ids[1],response:'decline'},await f.role('member-b'))).status,200);
 assert.equal((await f.publish('qualifier')).status,201);
});
test('exact ties block publication until three named judges provide a majority ordering; ballots stay private',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(2,'demo',1,true);assert.equal((await f.publish()).status,409);
 const judge1=await f.role('judge-1'),view=(await f.call('me',undefined,judge1)).data,tie=view.admission_ties[0];assert(tie.tie_key);assert.equal(view.tie_ballots.length,0);
 for(const [judge,order] of [['judge-1',ids],['judge-2',[...ids].reverse()],['judge-3',ids]]){
  assert.equal((await f.call('tie-ballot',{tie_key:tie.tie_key,order},await f.role(judge))).status,201);
 }
 const mine=(await f.call('me',undefined,judge1)).data.tie_ballots;assert.equal(mine.length,1);assert(mine.every(b=>b.judge_id==='judge-1'));
 const owner=(await f.call('me',undefined,await f.role('organizer'))).data;assert.equal(owner.tie_ballots.length,3);assert.equal(owner.admission_ties[0].resolved,true);
 assert.equal((await f.call('tie-ballot',{tie_key:tie.tie_key,order:ids},await f.role('member-a'))).status,403);
 assert.equal((await f.publish()).status,201);assert.equal((await f.call('tie-ballot',{tie_key:tie.tie_key,order:ids},judge1)).status,409);
});
test('invalid/stale tie proposals and incomplete/correction-pending groups never publish',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(2,'demo',1,true),j=await f.role('judge-1'),tie=(await f.call('me',undefined,j)).data.admission_ties[0];
 assert.equal((await f.call('tie-ballot',{tie_key:tie.tie_key,order:[ids[0],ids[0]]},j)).status,422);
 assert.equal((await f.call('tie-ballot',{tie_key:'stale',order:ids},j)).status,409);
 f.db.prepare('DELETE FROM ghv_practice_scores WHERE application_id=? AND judge_id=?').run(ids[0],'judge-3');assert.equal((await f.publish()).status,409);
});
test('a reversed three-way tie receives consecutive ranks',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(3,'demo',1,true),j=await f.role('judge-1'),tie=(await f.call('me',undefined,j)).data.admission_ties[0];
 const order=[ids[1],ids[0],ids[2]];for(const judge of ['judge-1','judge-2','judge-3'])assert.equal((await f.call('tie-ballot',{tie_key:tie.tie_key,order},await f.role(judge))).status,201);
 const ranked=(await f.call('me',undefined,await f.role('organizer'))).data.rankings;assert.deepEqual(ranked.map(r=>[r.id,r.rank]),order.map((id,i)=>[id,i+1]));
 assert.equal((await f.publish()).status,201);assert.deepEqual(f.db.prepare('SELECT application_id FROM ghv_practice_admission_slots ORDER BY merit_order').all().map(r=>r.application_id),order);
});
test('additive rerun preserves published pool and disabling the practice gate disables cron writes',async t=>{
 const f=await attendanceFixture(t);f.seed();assert.equal((await f.publish()).status,201);f.db.exec(f.migration);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM ghv_practice_admission_pools').get().n,1);
 f.clock.value+=172800000;await f.worker.scheduled({}, {...f.env,STAGING_PRACTICE_ENABLED:'false'},{});assert.equal(f.db.prepare("SELECT COUNT(*) n FROM ghv_practice_admission_slots WHERE status='offered'").get().n,2);
 f.db.exec('DROP TRIGGER ghv_practice_admission_slot_guard');assert.equal((await f.call('readiness')).status,503);
});

test('remote batch crossing a clock second still publishes a full48h persisted deadline',async t=>{
 const f=await attendanceFixture(t);f.seed();const batch=f.env.E2E_DB.batch.bind(f.env.E2E_DB);
 f.env.E2E_DB.batch=stmts=>{if(stmts[0]?.sql.startsWith('INSERT INTO ghv_practice_admission_pools'))f.clock.value+=1100;return batch(stmts)};
 assert.equal((await f.publish()).status,201);const pool=f.db.prepare('SELECT published_at FROM ghv_practice_admission_pools').get();for(const slot of f.db.prepare('SELECT * FROM ghv_practice_admission_slots').all()){assert.equal(slot.notified_at,pool.published_at);assert.equal(slot.deadline_at-slot.notified_at,172800);}
});

test('a real cohort change invalidates previous named ballots and a recusal keeps a new tie locked',async t=>{
 const f=await attendanceFixture(t),ids=f.seed(2,'demo',1,true),judge=await f.role('judge-1'),old=(await f.call('me',undefined,judge)).data.admission_ties[0];
 for(const j of ['judge-1','judge-2','judge-3'])assert.equal((await f.call('tie-ballot',{tie_key:old.tie_key,order:ids},await f.role(j))).status,201);
 assert.equal((await f.call('me',undefined,judge)).data.admission_ties[0].resolved,true);
 f.seed(1,'demo',0,true,2);const next=(await f.call('me',undefined,judge)).data.admission_ties[0];assert.notEqual(next.tie_key,old.tie_key);assert.equal(next.ballots_count,0);assert.equal(next.resolved,false);assert.equal((await f.call('tie-ballot',{tie_key:old.tie_key,order:ids},judge)).status,409);assert.equal((await f.publish()).status,409);
 f.db.prepare("DELETE FROM ghv_practice_scores WHERE application_id=? AND judge_id='judge-3'").run(ids[0]);
 f.db.prepare("INSERT INTO ghv_practice_scores VALUES(?,?,?,'demo',0,0,0,0,1,'TEST conflict',unixepoch())").run(f.ws,ids[0],'judge-3');
 const recused=(await f.call('me',undefined,judge)).data.admission_ties[0];assert.equal(recused.conflict,true);assert.equal((await f.call('tie-ballot',{tie_key:recused.tie_key,order:recused.candidates.map(c=>c.id)},judge)).status,409);
});
