import test from 'node:test';
import assert from 'node:assert/strict';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {ownsApplication} from '../backend/staging-e2e.js';
import {stageLedger} from '../backend/stage-test-ledger.js';
const migration=readFileSync(new URL('../backend/migrations/1020_stage_ledger_ISOLATED_TEST_ONLY.sql',import.meta.url),'utf8');
const actor={id:'organizer',role:'organizer'},judge={id:'reviewer',role:'reviewer'};
function setup(){
 const f=bulkFixture(20);f.sqlite.exec(migration);f.sqlite.prepare('INSERT INTO stage_test_scope VALUES(?)').run('FICTIONAL_STAGE_TEST_ONLY');
 const panel=['reviewer','judge2','judge3'];for(const id of panel.slice(1))f.sqlite.prepare("INSERT INTO e2e_accounts VALUES(?,?,?,'reviewer',1,1)").run(id,id,'fixture');
 for(const code of ['audition','qualifier_one','qualifier_two','regional_pk','final'])f.sqlite.prepare('INSERT INTO stage_test_rounds(code,status,panel,config) VALUES(?,?,?,?)').run(code,code==='qualifier_one'?'open':'locked',JSON.stringify(panel),JSON.stringify({quotas:{A:10,B:10},maxTeamSize:2,source:'test_scenario'}));
 for(let i=0;i<f.ids.length;i++){const id=f.ids[i];f.sqlite.prepare('INSERT INTO stage_test_units VALUES(?,?,?,?,1)').run('qualifier_one',id,'TEST '+i,i<10?'A':'B');f.sqlite.prepare('INSERT INTO stage_test_members VALUES(?,?,?)').run('qualifier_one',id,id)}
 let seq=0;return {...f,panel,command:(body,who=actor)=>stageLedger(f.env.DB,who,{request_id:'request-'+(++seq),...body}),read:who=>stageLedger(f.env.DB,who,{operation:'read',stage:'qualifier_one'})};
}
test('stage ledger persists independent assigned scores, rejects roles/duplicates/stale requests and audits atomically',async()=>{
 const f=setup();try{
  const body={operation:'score',stage:'qualifier_one',unit_id:f.ids[3],position:1,version:0,request_id:'same-command',values:{technique:40,interpretation:25,stage_presence:15,appearance:5}};
  await assert.rejects(f.command(body),/reviewer_only/);
  const saved=await f.command(body,judge);assert.equal(saved.score.technique,40);assert(saved.audit_id);
  const replay=await f.command(body,judge);assert.equal(replay.audit_id,saved.audit_id);
  await assert.rejects(f.command({...body,values:{...body.values,technique:39}},judge),/idempotency_conflict/);
  await assert.rejects(f.command({...body,request_id:'second-command'},judge),/already_scored/);
  await assert.rejects(f.command({...body,unit_id:f.ids[4]}, {id:'outsider',role:'reviewer'}),/unassigned_judge/);
  const rows=await f.read(judge);assert.equal(rows.units.find(r=>r.id===f.ids[3]).scores.length,1);assert.equal(rows.units.find(r=>r.id===f.ids[3]).scores[0].judgeId,judge.id);
  const hidden=await f.read({id:'judge2',role:'reviewer'});assert.equal(hidden.units.find(r=>r.id===f.ids[3]).scores.length,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_live_scores').get().n,0);
  assert.throws(()=>f.sqlite.prepare('DELETE FROM e2e_applications WHERE id=?').run(f.ids[3]),/FOREIGN KEY/);
  assert.throws(()=>f.sqlite.exec('DELETE FROM stage_test_audit'),/immutable_stage_audit/);
 }finally{f.close()}
});
test('atomic freeze creates the next stage eligibility without changing old phases or carrying scores',async()=>{
 const f=setup();try{
  await assert.rejects(f.command({operation:'freeze',stage:'qualifier_one',version:0}),/scores_incomplete/);
  for(let i=0;i<f.ids.length;i++)for(const id of f.panel)await f.command({operation:'score',stage:'qualifier_one',unit_id:f.ids[i],position:1,version:0,values:{technique:40-i%10,interpretation:25,stage_presence:15,appearance:5}},{id,role:'reviewer'});
  const frozen=await f.command({operation:'freeze',stage:'qualifier_one',version:0});assert.equal(frozen.result.selected.length,20);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM stage_test_members WHERE stage='qualifier_two'").get().n,20);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM stage_test_scores WHERE stage='qualifier_two'").get().n,0);
  assert.equal(f.sqlite.prepare("SELECT phase FROM e2e_applications WHERE id=?").get(f.ids[0]).phase,'demo');
  await assert.rejects(f.command({operation:'freeze',stage:'qualifier_one',version:0}),/stage_locked/);
  assert.throws(()=>f.sqlite.prepare("UPDATE stage_test_rounds SET result='{}' WHERE code='qualifier_one'").run(),/immutable_stage_result/);
 }finally{f.close()}
});
test('D1 batch failure rolls back score plus audit and member cannot read stage data',async()=>{
 const f=setup();try{
  await assert.rejects(f.read({id:'member',role:'member'}),/staff_only/);
  f.setFail(true);await assert.rejects(f.command({operation:'score',stage:'qualifier_one',unit_id:f.ids[4],position:1,version:0,values:{technique:40,interpretation:25,stage_presence:15,appearance:5}},judge));f.setFail(false);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_scores').get().n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_audit').get().n,0);
 }finally{f.close()}
});
test('self-review and ownership of any team member are blocked, including role-scoped ownership checks',async()=>{
 const f=setup();try{
  const body={operation:'score',stage:'qualifier_one',unit_id:f.ids[4],position:1,version:0,request_id:'self-review-test',values:{technique:40,interpretation:25,stage_presence:15,appearance:5}};
  await assert.rejects(stageLedger(f.env.DB,judge,body,{ownsApplication:async owner=>owner==='entrant-5'}),/self_review_disallowed/);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_scores').get().n,0);
  f.sqlite.prepare('UPDATE e2e_applications SET account_id=? WHERE id=?').run(judge.id,f.ids[4]);
  await assert.rejects(stageLedger(f.env.DB,judge,body),/self_review_disallowed/);
 }finally{f.close()}
});

test('role-scoped ownership blocks a judge scoring their own membership inside a team',async()=>{
 const f=setup();try{
  const email='reviewer@example.invalid',who={...judge,email},owner='role-member',fingerprint=createHmac('sha256',f.env.STAGING_IDENTITY_SECRET).update('role-account:member:'+email).digest('hex');
  f.sqlite.prepare("INSERT INTO e2e_accounts VALUES(?,?,?,'member',1,1)").run(owner,fingerprint,'fixture');
  f.sqlite.prepare('UPDATE e2e_applications SET account_id=? WHERE id=?').run(owner,f.ids[4]);
  f.sqlite.prepare("UPDATE stage_test_rounds SET status='open' WHERE code='qualifier_two'").run();
  f.sqlite.prepare("INSERT INTO stage_test_units VALUES('qualifier_two','team','Fictional team','A',1)").run();
  for(const id of [f.ids[3],f.ids[4]])f.sqlite.prepare("INSERT INTO stage_test_members VALUES('qualifier_two','team',?)").run(id);
  const body={operation:'score',stage:'qualifier_two',unit_id:'team',position:1,version:0,request_id:'role-scoped-team',values:{technique:40,interpretation:25,stage_presence:15,appearance:5}};
  await assert.rejects(stageLedger(f.env.DB,who,body,{ownsApplication:ownerId=>ownsApplication(f.env,who,ownerId)}),/self_review_disallowed/);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM stage_test_scores').get().n,0);
 }finally{f.close()}
});
