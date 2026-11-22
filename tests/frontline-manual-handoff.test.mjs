import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
import {previewFrontlineFinalists} from '../backend/frontline-finalist-preview.js';
import {stageLedger} from '../backend/stage-test-ledger.js';
const implementation=await import('../backend/frontline-manual-handoff.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e});
const actor={id:'organizer',role:'organizer'};
function setup(t){
 const f=bulkFixture(20);t.after(()=>f.close());
 for(const file of ['1011_frontline_2027_registration_STAGING_ONLY.sql','1020_stage_ledger_ISOLATED_TEST_ONLY.sql','1021_final_vote_ISOLATED_TEST_ONLY.sql'])f.sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
 const next=new URL('../backend/migrations/1022_frontline_handoff_ISOLATED_TEST_ONLY.sql',import.meta.url);
 try{f.sqlite.exec(readFileSync(next,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 f.sqlite.exec("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY'); INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','locked','[\"reviewer\",\"judge2\",\"judge3\"]','{}')");
 for(const who of ['judge2','judge3'])f.sqlite.prepare("INSERT INTO e2e_accounts VALUES(?,?,?,'reviewer',1,1)").run(who,who,'TEST hint');
 f.ids.forEach((id,index)=>{f.sqlite.prepare('INSERT INTO e2e_frontline_2027_registration VALUES(?,?,?,1)').run(id,index%2?'B':'A','graduated');f.sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,1)').run(id,'organizer')});
 const input={application_ids:f.ids.slice(0,10),source_reference:'TEST-frontline-20261122'};
 const call=async(body,who=actor,db=f.env.DB)=>{assert.equal(typeof implementation.frontlineHandoff,'function','manual handoff ledger must be implemented');return implementation.frontlineHandoff(db,who,body)};
 const prepare=async()=>{const p=await previewFrontlineFinalists(f.env.DB,actor,input);assert.equal(p.blocked,false);return {...input,operation:'confirm',request_id:'TEST-handoff-001',preview_fingerprint:p.fingerprint,version:0,acknowledge_test:true}};
 const original=()=>JSON.stringify(['e2e_applications','e2e_demo_2027_videos','e2e_judge_scores','e2e_live_scores'].map(table=>f.sqlite.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()));
 return {...f,input,call,prepare,original};
}
test('offline roster creates ten final seats atomically with no earlier online grades or score carry-over',async t=>{
 const f=setup(t),original=f.original(),body=await f.prepare(),r=await f.call(body);
 assert.equal(r.ok,true);assert.equal(r.official,false);assert.equal(r.receipt.member_count,10);assert.equal(r.receipt.source_reference,'TEST-frontline-20261122');
 assert.equal(f.sqlite.prepare("SELECT status FROM stage_test_rounds WHERE code='final'").get().status,'open');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_scores').get().n,0);
 assert.equal(f.original(),original);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,1);
 const score=await stageLedger(f.env.DB,{id:'reviewer',role:'reviewer'},{operation:'score',stage:'final',version:1,request_id:'new-final-grade',unit_id:f.ids[2],position:1,values:{technique:38,interpretation:26,stage_presence:18,appearance:8}});
 assert.equal(score.score.technique,38);assert.equal(f.original(),original);
 const audit=f.sqlite.prepare("SELECT * FROM stage_test_audit WHERE action='frontline_handoff'").get();assert.equal(audit.actor_id,'organizer');assert.equal(audit.result,'success');assert.doesNotMatch(audit.detail,/TEST Singer|TEST College|email|phone/);
 assert.throws(()=>f.sqlite.exec('DELETE FROM frontline_test_handoffs'),/immutable_frontline_handoff/);
});
test('same request replays receipt after source changes while conflicting replay and new overwrite are rejected',async t=>{
 const f=setup(t),body=await f.prepare(),r=await f.call(body);
 f.sqlite.prepare('UPDATE e2e_applications SET updated_at=99 WHERE id=?').run(f.ids[0]);
 const replay=await f.call(body);assert.equal(replay.receipt.id,r.receipt.id);assert.equal(replay.replayed,true);
 assert.equal((await f.call({...body,source_reference:'different'})).error,'idempotency_conflict');
 assert.equal((await f.call({...body,request_id:'other-request'})).ok,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,1);
});
for(const role of [null,'member','reviewer'])test(`role ${role} cannot enumerate or confirm source`,async()=>{
 let reads=0;const db={prepare(){reads++;throw Error('must not access DB')}};
 assert.equal(typeof implementation.frontlineHandoff,'function');
 const r=await implementation.frontlineHandoff(db,role?{id:'other',role}:null,{operation:'list'});assert.equal(r.status,role?403:401);assert.equal(reads,0);
});
test('wrong regional count fails with no roster writes',async t=>{
 const f=setup(t),body=await f.prepare();f.sqlite.prepare("UPDATE e2e_frontline_2027_registration SET competition_region='B' WHERE application_id=?").run(f.ids[0]);
 assert.equal((await f.call(body)).ok,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,0);
});
test('source mutation after preview but before transaction is rejected by SQL guard',async t=>{
 const f=setup(t),body=await f.prepare(),db={...f.env.DB,batch(statements){f.sqlite.prepare("DELETE FROM e2e_test_application_approvals WHERE application_id=?").run(f.ids[0]);return f.env.DB.batch(statements)}};
 const r=await f.call(body,actor,db);assert.equal(r.ok,false);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM stage_test_units WHERE stage='final'").get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,0);
});
test('D1 rollback leaves final locked, zero units and zero handoff/audit',async t=>{
 const f=setup(t),body=await f.prepare();f.setFail(true);assert.equal((await f.call(body)).ok,false);f.setFail(false);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_audit').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,0);assert.equal(f.sqlite.prepare("SELECT status FROM stage_test_rounds WHERE code='final'").get().status,'locked');
});
test('existing target seats block handoff instead of replacing history',async t=>{
 const f=setup(t),body=await f.prepare();f.sqlite.prepare("INSERT INTO stage_test_units VALUES('final',?,'TEST existing','A',1)").run(f.ids[0]);
 assert.equal((await f.call(body)).error,'final_target_not_empty');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_units').get().n,1);
});
for(const [label,sql]of[
 ['new timestamp',"UPDATE e2e_applications SET updated_at=22 WHERE id=?"],
 ['withdrawn',"UPDATE e2e_applications SET status='withdrawn' WHERE id=?"],
 ['disabled',"INSERT INTO e2e_registration_controls VALUES(?,'disabled','submitted',1,'TEST control')"],
 ['approval revoked',"DELETE FROM e2e_test_application_approvals WHERE application_id=?"],
 ['duplicate account in another round',"UPDATE e2e_applications SET account_id='entrant-2',round_code='2027-04' WHERE id= ?"]
])test(`changed ${label} between preview and confirmation blocks`,async t=>{
 const f=setup(t),body=await f.prepare();f.sqlite.prepare(sql).run(f.ids[0]);
 assert.equal((await f.call(body)).ok,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,0);
});
test('concurrent organizers cannot replace or duplicate one final roster',async t=>{
 const f=setup(t),body=await f.prepare(),results=await Promise.all([f.call(body),f.call({...body,request_id:'other-confirm'}, {id:'other',role:'organizer'})]);
 assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_members').get().n,10);
});
test('stored current handoff reloads for another authorized organizer and receipt reads are audited',async t=>{
 const f=setup(t),body=await f.prepare(),first=await f.call(body),loaded=await f.call({operation:'current'},{id:'other',role:'organizer'});
 assert.equal(loaded.ok,true);assert.equal(loaded.receipt.id,first.receipt.id);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM stage_test_audit WHERE action='frontline_receipt_read'").get().n,1);
 assert.equal((await f.call({operation:'receipt',request_id:'other-request'})).receipt,null);
});
test('initialized ballot state blocks empty final target handoff',async t=>{
 const f=setup(t),body=await f.prepare();f.sqlite.exec("INSERT INTO vote_test_round(id,state,last_event) VALUES(1,'draft','TEST previous')");
 assert.equal((await f.call(body)).ok,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').get().n,0);
});
for(const body of [null,[],{operation:'confirm'},{operation:'confirm',role:'organizer'},
 {operation:'list',page:-1},{operation:'list',page:0,include_contacts:true}])test('malformed input fails closed',async t=>{
 const f=setup(t),r=await f.call(body);assert.equal(r.ok,false);assert.equal(r.status,422);
});
test('list only returns compact approved January candidate info and bounded pages, no contacts',async t=>{
 const f=setup(t),r=await f.call({operation:'list',page:0});assert.equal(r.ok,true);assert.equal(r.total,20);assert.equal(r.entries.length,10);
 assert.deepEqual(Object.keys(r.entries[0]).sort(),['application_id','competition_region','stage_name']);assert.doesNotMatch(JSON.stringify(r),/TEST College|phone|email/);
 assert.equal((await f.call({operation:'list',page:999})).entries.length,0);
});
