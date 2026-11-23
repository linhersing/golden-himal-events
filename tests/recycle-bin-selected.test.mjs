import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bulkFixture} from './fixtures/registration-bulk.mjs';

async function applyFull(f,plan,token){
 for(let offset=0;offset<plan.total;offset+=10){
  const result=await f.call('apply',{batch_id:plan.batch_id,offset,confirmation:token});
  assert.equal(result.status,200,await result.clone().text());
 }
}
test('organizer selection only recycles the checked names; keeps full original records',async()=>{
 const f=bulkFixture(8);
 try{
  const ids=[f.ids[2],f.ids[4]];
  const totalBefore=f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n;
  const videoBefore=f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n;
  const preview=await f.call('preview',{ids,action:'delete'});
  assert.equal(preview.status,200,await preview.clone().text());
  const plan=await preview.json();
  assert.equal(plan.total,2);
  assert.equal(plan.protected_count,0);
  assert.deepEqual(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_registration_controls').get().n,0);
  assert.equal((await f.call('apply',{batch_id:plan.batch_id,offset:0,confirmation:'wrong'})).status,422);
  await applyFull(f,plan,'DELETE TEST');
  assert.deepEqual(f.sqlite.prepare("SELECT application_id FROM e2e_registration_controls WHERE state='deleted' ORDER BY application_id").all().map(x=>x.application_id),ids);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,totalBefore);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n,videoBefore);
  const left=f.ids.filter(id=>!ids.includes(id));
  for(const id of left){
   assert.equal(f.sqlite.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').get(id).state,'active');
  }
  const restorePlan=await (await f.call('preview',{ids:ids.slice(0,1),action:'restore'})).json();
  assert.equal(restorePlan.action,'restore');assert.equal(restorePlan.total,1);
  await applyFull(f,restorePlan,'RESTORE TEST');
  assert.equal(f.sqlite.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').get(ids[0]).state,'active');
  assert.equal(f.sqlite.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').get(ids[1]).state,'deleted');
 }finally{f.close()}
});

test('invalid, repeated, stale, protected or non-organizer selection fails closed',async()=>{
 const f=bulkFixture(5);
 try{
  const good=f.ids[2],bad=f.ids[0];
  for(const body of [
   {ids:[],action:'delete'},{ids:[good,good],action:'delete'},
   {ids:['not-a-real-id'],action:'delete'},
   {ids:[good],action:'purge'}, {ids:'all',action:'delete'},
   {ids:Array(26).fill(good),action:'delete'},
   {ids:['02000000-0000-4000-8000-000000000999'],action:'delete'}
  ]){
   const r=await f.call('preview',body);
   assert.ok([409,422].includes(r.status),await r.text());
  }
  assert.equal((await f.call('preview',{ids:[good],action:'restore'})).status,409);
  assert.equal((await f.call('preview',{ids:[good],action:'delete'},'reviewer')).status,403);
  const protectedPlan=await (await f.call('preview',{ids:[bad,good],action:'delete'})).json();
  assert.equal(protectedPlan.total,1);assert.equal(protectedPlan.protected_count,1);
  await applyFull(f,protectedPlan,'DELETE TEST');
  assert.equal(f.sqlite.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').get(bad).state,'active');
  assert.equal(f.sqlite.prepare('SELECT state FROM e2e_admin_registrations WHERE id=?').get(good).state,'deleted');
  assert.equal((await f.call('preview',{ids:[good],action:'delete'})).status,409);
  const audit=JSON.stringify(f.sqlite.prepare('SELECT diff FROM e2e_staff_audit').all());
  assert.doesNotMatch(audit,/TEST Singer|TEST College|example\.invalid/i);
 }finally{f.close()}
});

test('organizer UI defaults to active records, explicit selection and separate trash',()=>{
 const html=readFileSync(new URL('../public/backoffice.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../public/simple.js',import.meta.url),'utf8');
 const bulk=readFileSync(new URL('../public/staff-registration-bulk.js',import.meta.url),'utf8');
 assert.match(html,/id="admin-select-page"/);
 assert.match(html,/id="admin-selected-action"/);
 assert.match(html,/option value="available"/);
 assert.match(html,/option value="deleted"[^>]*>資源回收桶/);
 assert.match(ui,/staffManageBatchPick\(ids,isTrash\(\)\?'restore':'delete'\)/);
 assert.match(ui,/input\.dataset\.adminSelectId=row\.id/);
 assert.match(ui,/input\.disabled=!selectable\(row\)/);
 assert.match(bulk,/openSelection\(ids,action\)/);
 assert.doesNotMatch(bulk,/button\('預覽全部可回收報名'/);
});
