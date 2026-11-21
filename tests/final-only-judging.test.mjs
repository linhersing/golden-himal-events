import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
import {handleE2E} from '../backend/staging-e2e.js';
const host='https://example.invalid';
function fixture(){const f=bulkFixture(5),hash=v=>createHmac('sha256',f.env.STAGING_IDENTITY_SECRET).update(v).digest('hex');
 for(const id of f.ids){f.sqlite.prepare("UPDATE e2e_applications SET payment_status='simulated_paid' WHERE id=?").run(id);f.sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,1)').run(id,'organizer')}
 const call=async(path,body,role='reviewer')=>{const r=await handleE2E(new Request(host+'/api/e2e/'+path,{method:body?'POST':'GET',headers:{Origin:host,Cookie:'__Host-ghv-e2e='+hash(role),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),f.env);return {status:r.status,data:await r.json()}};
 return {...f,call};}
const score=(id,phase)=>({application_id:id,phase,no_conflict:true,technique:35,interpretation:25,stage_presence:15,appearance:5});
test('default reviewer queue exposes only final candidates while organizer retains the registration roster',async()=>{const f=fixture();try{
 const q=await f.call('reviewer-queue?view=workbench');assert.equal(q.status,200);assert.equal(q.data.judging_policy.mode,'final_only');assert.deepEqual(q.data.queue.map(a=>a.id),[f.ids[1]]);assert(!JSON.stringify(q.data).includes(f.ids[0]));
 const admin=await f.call('organizer-queue?view=workbench',null,'organizer');assert.equal(admin.data.applications.length,5);assert.equal(admin.data.january_roster_enabled,false);assert.equal(admin.data.judging_policy.earlier_stages,'frontline_managed');
 const me=await f.call('me');assert.equal(me.data.judging_policy.mode,'final_only');
 }finally{f.close()}});
test('default denies early score routes and phase spoofing without deleting history or forcing online scores for advancement',async()=>{const f=fixture();try{
 const counts=()=>({legacy:f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_judge_scores').get().n,live:f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_live_scores').get().n,video:f.sqlite.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_scores').get().n}),before=counts();
 for(const body of [score(f.ids[0],'demo'),score(f.ids[0],'final')])assert.equal((await f.call('score',body)).data.error,'online_judging_frontline_managed');
 f.sqlite.prepare("UPDATE e2e_applications SET phase='qualifier' WHERE id=?").run(f.ids[2]);assert.equal((await f.call('score',score(f.ids[2],'qualifier'))).data.error,'online_judging_frontline_managed');
 assert.equal((await f.call('january-video-score',{...score(f.ids[0],'demo'),position:1})).data.error,'online_judging_frontline_managed');
 assert.equal((await f.call('january-test-roster',null,'organizer')).data.error,'frontline_results_required');assert.equal((await f.call('organizer-promote',{application_id:f.ids[0],to_phase:'qualifier'},'organizer')).data.error,'frontline_results_required');assert.deepEqual(counts(),before);
 }finally{f.close()}});
test('invited final TEST scoring still works with original roles, criteria and stored-value readback',async()=>{const f=fixture();try{
 const body=score(f.ids[1],'final');assert.equal((await f.call('score',body,'organizer')).status,403);assert.equal((await f.call('score',body,'member')).status,403);const r=await f.call('score',body);assert.equal(r.status,200);assert.equal(r.data.score,80);const q=await f.call('reviewer-queue');assert.equal(q.data.queue[0].live_technique,35);
 }finally{f.close()}});
test('old TEST judging is recoverable only from server configuration; request fields cannot reopen it',async()=>{const f=fixture();try{
 assert.equal((await f.call('reviewer-queue?judging_mode=all_stages_test')).data.queue.length,1);
 f.env.STAGING_ONLINE_JUDGING_MODE='typo';assert.equal((await f.call('reviewer-queue')).data.queue.length,1);
 f.env.STAGING_ONLINE_JUDGING_MODE='all_stages_test';const q=await f.call('reviewer-queue');assert.equal(q.data.queue.length,5);assert.equal(q.data.judging_policy.mode,'all_stages_test');const r=await f.call('score',score(f.ids[2],'demo'));assert.equal(r.status,200);
 }finally{f.close()}});

test('reviewers cannot use a direct private-media URL to bypass the earlier-stage restriction',async()=>{const f=fixture();try{
 let reads=0;f.env.STAGING_MEDIA={get:async()=>{reads++;return {body:'fictional-media',httpMetadata:{contentType:'text/plain'}}}};
 for(const id of [f.ids[0],f.ids[1]])f.sqlite.prepare('UPDATE e2e_applications SET media_key=? WHERE id=?').run('TEST-media-'+id,id);
 const hash=v=>createHmac('sha256',f.env.STAGING_IDENTITY_SECRET).update(v).digest('hex'),request=id=>new Request(host+'/api/e2e/demo-download?application='+id,{headers:{Cookie:'__Host-ghv-e2e='+hash('reviewer')}});
 assert.equal((await handleE2E(request(f.ids[0]),f.env)).status,404);assert.equal(reads,0);assert.equal((await handleE2E(request(f.ids[1]),f.env)).status,200);assert.equal(reads,1);
 }finally{f.close()}});
