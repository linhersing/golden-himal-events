import test from 'node:test';
import assert from 'node:assert/strict';
import {bulkFixture} from './fixtures/registration-bulk.mjs';

test('organizer previews, recycles eligible TEST entries and restores the exact batch with data preserved',async()=>{
 const f=bulkFixture();try{
  const before={apps:f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,videos:f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n};
  for(const role of ['guest','member','reviewer'])assert.equal((await f.call('preview',{},role)).status,role==='guest'?401:403);
  assert.equal((await f.call('preview',{},'organizer','https://wrong.invalid')).status,403);
  const response=await f.call('preview');assert.equal(response.status,200,await response.clone().text());
  const plan=await response.json();assert.equal(plan.total,21);assert.equal(plan.protected_count,2);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").get().n,0);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'wrong',offset:0})).status,422);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0},'other')).status,404);
  for(let offset=0;offset<plan.total;offset+=10){const r=await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset});assert.equal(r.status,200,await r.clone().text());}
  const status=await (await f.call('status',{batch_id:plan.batch_id})).json();assert.equal(status.success,21);assert.equal(status.pending,0);assert.equal(status.current_applied,21);
  const audits=f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_staff_audit WHERE id LIKE ?').get(plan.batch_id+':%').n;
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0})).status,200);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_staff_audit WHERE id LIKE ?').get(plan.batch_id+':%').n,audits);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,before.apps);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n,before.videos);
  assert.equal(f.sqlite.prepare('SELECT SUM(technique+interpretation) n FROM e2e_judge_scores').get().n,90);
  const restore=await (await f.call('preview_restore',{batch_id:plan.batch_id})).json();assert.equal(restore.total,21);
  for(let offset=0;offset<restore.total;offset+=10)assert.equal((await f.call('apply',{batch_id:restore.batch_id,confirmation:'RESTORE TEST',offset})).status,200);
  const restored=await (await f.call('status',{batch_id:restore.batch_id})).json();assert.equal(restored.current_applied,21);
  assert.equal((await (await f.call('status',{batch_id:plan.batch_id})).json()).current_applied,0);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0})).status,200);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE state='deleted'").get().n,0,'replay cannot recycle records already restored');
  const log=JSON.stringify(f.sqlite.prepare('SELECT diff FROM e2e_staff_audit').all());assert.doesNotMatch(log,/TEST Singer|TEST College|example\.invalid|TEST_BULK/);
 }finally{f.close()}
});

test('frozen candidates exclude later entrants, reject stale versions and newly scored entries',async()=>{
 const f=bulkFixture(6);try{
  const plan=await (await f.call('preview')).json();f.add(99);
  f.sqlite.prepare("UPDATE e2e_applications SET stage_name='Changed after preview' WHERE id=?").run(f.ids[2]);
  f.sqlite.prepare('INSERT INTO e2e_judge_scores VALUES(?,?,55,35,1,1)').run(f.ids[3],'reviewer');
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0})).status,200);
  const status=await (await f.call('status',{batch_id:plan.batch_id})).json();assert.equal(status.conflict,1);assert.equal(status.protected,1);assert.equal(status.success,2);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM e2e_registration_controls WHERE application_id LIKE '%000000000099'").get().n,0);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:1})).status,422);
 }finally{f.close()}
});

test('disabled feature, expired plan, empty list and failed transactions are fail closed',async()=>{
 const f=bulkFixture(4);try{
  f.env.STAGING_TEST_APPROVAL_ENABLED='false';assert.equal((await f.call('preview')).status,503);f.env.STAGING_TEST_APPROVAL_ENABLED='true';
  const plan=await (await f.call('preview')).json();
  const now=Date.now;Date.now=()=>now()+700000;
  try{assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0})).status,410);assert.equal((await f.call('status',{batch_id:plan.batch_id})).status,200);}finally{Date.now=now;}
  f.setFail(true);assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:0})).status,503);f.setFail(false);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_registration_controls').get().n,0);
  assert.equal((await (await f.call('status',{batch_id:plan.batch_id})).json()).pending,2);
 }finally{f.close()}
 const empty=bulkFixture(0);try{const data=await (await empty.call('preview')).json();assert.equal(data.total,0);assert.equal(data.batch_id,null);}finally{empty.close()}
});

test('preview is bounded to 500 candidates and preserves an explicit count beyond the batch',async()=>{
 const f=bulkFixture(504);try{
  const plan=await (await f.call('preview')).json();assert.equal(plan.total,500);assert.equal(plan.protected_count,2);assert.equal(plan.remaining_count,2);
  const recent=await (await f.call('recent')).json();assert.equal(recent.batches[0].batch_id,plan.batch_id);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,confirmation:'DELETE TEST',offset:500})).status,422);
  assert.equal((await f.call('status',{batch_id:plan.batch_id},'other')).status,404);
  const foreignRecent=await (await f.call('recent',{},'other')).json();assert.equal(foreignRecent.batches.length,0);
 }finally{f.close()}
});
