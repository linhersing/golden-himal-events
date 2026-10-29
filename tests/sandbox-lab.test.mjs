import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {blank,PEOPLE,addSyntheticRegistration,reviewSynthetic,castSyntheticVote} from '../public/test-lab-model.mjs';

test('user can safely simulate a full applicant -> approval -> vote workflow',()=>{
 const s=blank();
 const data=addSyntheticRegistration(s,'T001','2027-03','university','demo-a','mock-pending');
 assert.equal(data.record.id,'GHV-TEST-0001');
 assert.equal(data.record.status,'pending');
 assert.equal(s.registrations.length,1);
 assert.equal(reviewSynthetic(s,data.record.id,'approved'),true);
 assert.equal(s.registrations[0].status,'approved');
 assert.deepEqual(castSyntheticVote(s,'V001','T001'),{ok:true});
 assert.equal(s.votes.length,1);
 assert.equal(castSyntheticVote(s,'V001','T001').error,'重複投票已拒絕');
 assert.equal(s.votes.length,1);
});
test('duplicate people and round rejected; new round allowed',()=>{
 const s=blank();
 addSyntheticRegistration(s,'T002','2027-03','community','demo-a','mock-receipt');
 assert.match(addSyntheticRegistration(s,'T002','2027-03','community','demo-a','mock-receipt').error,/不能重複/);
 assert.ok(addSyntheticRegistration(s,'T002','2027-06','community','demo-b','mock-pending').record);
 assert.equal(s.registrations.length,2);
});
test('invalid arbitrary identities, uploaded evidence and payment fields rejected',()=>{
 const s=blank();
 assert.ok(addSyntheticRegistration(s,'Real Human','2027-03','university','demo-a','mock-pending').error);
 assert.ok(addSyntheticRegistration(s,'T001','2027-03','university','personal-video.mp4','mock-pending').error);
 assert.ok(addSyntheticRegistration(s,'T001','2027-03','university','demo-a','actual-bank-transfer').error);
 assert.ok(addSyntheticRegistration(s,'T001','2027-03','student','demo-a','mock-pending').error);
 assert.equal(s.registrations.length,0);
});
test('voting for pending/rejected fake participants denied and revoked on rejection',()=>{
 const s=blank();
 const reg=addSyntheticRegistration(s,'T003','2027-09','university','demo-b','mock-receipt').record;
 assert.ok(castSyntheticVote(s,'V001','T003').error);
 assert.equal(reviewSynthetic(s,reg.id,'approved'),true);
 assert.deepEqual(castSyntheticVote(s,'V001','T003'),{ok:true});
 assert.equal(reviewSynthetic(s,reg.id,'rejected'),true);
 assert.equal(s.votes.length,0);
 assert.ok(castSyntheticVote(s,'V002','T003').error);
});
test('sandbox is bounded by six fictional people and three rounds',()=>{
 const s=blank();
 for(const p of Object.keys(PEOPLE)){
  for(const round of ['2027-03','2027-06','2027-09']){
   assert.ok(addSyntheticRegistration(s,p,round,'community','demo-a','mock-pending').record);
  }
 }
 assert.equal(s.registrations.length,18);
 assert.ok(addSyntheticRegistration(s,'T001','2027-03','community','demo-a','mock-pending').error);
 assert.deepEqual(blank(),{version:1,next:1,registrations:[],votes:[],published:false});
});
test('staging lab HTML is prominently marked TEST and contains both front and admin panels',async()=>{
 const html=await readFile(new URL('../public/test-lab.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../public/test-lab.js',import.meta.url),'utf8');
 const worker=await readFile(new URL('../backend/staging-registration-worker.js',import.meta.url),'utf8');
 for(const name of ['panel-applicant','panel-admin','panel-news','panel-votes','panel-reports','registration-rows','cloud-state']) {
  assert.match(html,new RegExp('id="'+name+'"'));
 }
 assert.match(html,/僅供內部演練/);
 assert.match(html,/不是正式報名/);
 assert.match(html,/不會傳送姓名或 Email 至 D1/);
 assert.match(js,/GET|fetch\('/);
 assert.doesNotMatch(js,/fetch\([^)]*\{\s*method:\s*['"]POST/);
 assert.doesNotMatch(html,/<input[^>]+type="file"/);
 assert.match(worker,/pathname==='\/api\/staging\/dashboard'/);
 assert.doesNotMatch(worker,/pathname==='\/api\/staging\/admin-write'/);
});
