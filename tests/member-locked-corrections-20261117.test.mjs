import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleCorrectionRoute,correctionReady} from '../backend/member-corrections.js';

const origin='https://golden-himal-voice-preview.linhersing.workers.dev';
const json=(data,status=200)=>Response.json(data,{status});
const deny=(error,status=400)=>json({ok:false,error},status);
const bodyJSON=async request=>request.json();
let num=0;
const uuid=()=>String(++num).padStart(8,'0')+'-0000-4000-8000-000000000000';
const NOW=()=>1794920000;
function adapter(db){return{
 prepare(sql){let args=[];return{
  bind(...v){args=v;return this},
  first(){return db.prepare(sql).get(...args)||null},
  all(){return{results:db.prepare(sql).all(...args)}},
  run(){const x=db.prepare(sql).run(...args);return{meta:{changes:x.changes}}}
 }},
 async batch(stmts){db.exec('BEGIN');try{const out=stmts.map(s=>s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}
}}
const request=(path,payload)=>new Request(origin+'/api/e2e/'+path,{
 method:payload?'POST':'GET',headers:payload?{Origin:origin,'Content-Type':'application/json'}:{},
 body:payload?JSON.stringify(payload):undefined
});
function fixture(withMigration=true){
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
 if(withMigration)db.exec(readFileSync(new URL('../backend/migrations/1013_member_corrections_STAGING_ONLY.sql',import.meta.url),'utf8'));
 for(const [id,role] of [['m','member'],['j','reviewer'],['o','organizer']])
  db.prepare('INSERT INTO e2e_accounts (id,email_fingerprint,email_hint,role,created_at) VALUES(?,?,?,?,?)')
   .run(id,id+'-hash','hidden',role,1);
 db.prepare('INSERT INTO e2e_applications (id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,phase,status,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .run('a','m','2027-01','university','bagmati','residence','Old School','Old Name','Song unchanged','Artist','Nepali','C','https://youtu.be/test','demo','scored','unpaid',1,1);
 db.prepare('INSERT INTO e2e_judge_scores (application_id,reviewer_id,technique,interpretation,conflict_checked,created_at) VALUES(?,?,?,?,?,?)').run('a','j',54,36,1,2);
 const env={DB:adapter(db)};
 const call=(path,actor,payload)=>handleCorrectionRoute(request(path,payload),env,actor,{json,deny,bodyJSON,uuid,NOW});
 return{db,env,call,member:{id:'m',role:'member'},reviewer:{id:'j',role:'reviewer'},organizer:{id:'o',role:'organizer'}};
}
test('scored TEST entry: audited member request -> organizer acceptance changes basics, preserves score/video',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 assert.equal(await correctionReady(f.env.DB),true);
 assert.equal((await f.call('organizer-corrections',f.member)).status,403);
 assert.equal((await f.call('member-corrections',f.reviewer)).status,403);
 assert.equal((await f.call('request-member-correction',f.organizer,{application_id:'a',stage_name:'New Name',affiliation:'New School',reason:'correct spelling'})).status,403);
 assert.equal((await f.call('request-member-correction',f.member,{application_id:'other',stage_name:'New Name',affiliation:'New School',reason:'correct spelling'})).status,404);
 assert.equal((await f.call('request-member-correction',f.member,{application_id:'a',stage_name:'Old Name',affiliation:'Old School',reason:'no actual change'})).status,422);
 const propose={application_id:'a',stage_name:'Corrected Name',affiliation:'Corrected School',reason:'Please correct my public display name'};
 const sent=await f.call('request-member-correction',f.member,propose);
 assert.equal(sent.status,201,await sent.clone().text());
 const {request:record}=await sent.json();assert.equal(record.state,'pending');
 assert.equal((await f.call('request-member-correction',f.member,propose)).status,409,'one pending correction');
 const mine=(await(await f.call('member-corrections',f.member)).json()).requests;
 assert.equal(mine.length,1);assert.equal(mine[0].id,record.id);
 const pending=(await(await f.call('organizer-corrections',f.organizer)).json()).requests;
 assert.equal(pending.length,1);assert.equal(pending[0].state,'pending');
 assert.equal((await f.call('decide-member-correction',f.member,{request_id:record.id,decision:'accepted'})).status,403);
 const accepted=await f.call('decide-member-correction',f.organizer,{request_id:record.id,decision:'accepted'});
 assert.equal(accepted.status,200,await accepted.clone().text());
 assert.equal((await accepted.json()).decision,'accepted');
 const saved=f.db.prepare('SELECT stage_name,affiliation,song_title,demo_url FROM e2e_applications WHERE id=?').get('a');
 assert.equal(saved.stage_name,'Corrected Name');assert.equal(saved.affiliation,'Corrected School');
 assert.equal(saved.song_title,'Song unchanged');assert.equal(saved.demo_url,'https://youtu.be/test');
 const score=f.db.prepare('SELECT technique,interpretation FROM e2e_judge_scores WHERE application_id=?').get('a');
 assert.equal(score.technique+score.interpretation,90);
 assert.equal(f.db.prepare('SELECT count(*) n FROM e2e_member_correction_audit WHERE correction_id=?').get(record.id).n,2);
 assert.equal((await f.call('decide-member-correction',f.organizer,{request_id:record.id,decision:'declined'})).status,409);
});
test('missing additive D1 table: GET reports disabled and POST fails closed, never pretends to save',async t=>{
 const f=fixture(false);t.after(()=>f.db.close());
 assert.equal(await correctionReady(f.env.DB),false);
 const v=await(await f.call('member-corrections',f.member)).json();
 assert.equal(v.enabled,false);
 assert.equal((await f.call('request-member-correction',f.member,{application_id:'a',stage_name:'New Name',affiliation:'New School',reason:'correct spelling'})).status,503);
});
test('approved-but-unscored entry can still request audited correction without modifying its song',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 f.db.prepare('DELETE FROM e2e_judge_scores WHERE application_id=?').run('a');
 f.db.prepare("UPDATE e2e_applications SET status='submitted' WHERE id='a'").run();
 const r=await f.call('request-member-correction',f.member,{application_id:'a',stage_name:'New Name',affiliation:'New School',reason:'correct spelling'});
 assert.equal(r.status,201);
 assert.equal((await r.json()).request.state,'pending');
 assert.equal(f.db.prepare("SELECT song_title FROM e2e_applications WHERE id='a'").get().song_title,'Song unchanged');
});

test('stale organizer correction cannot overwrite a changed entry or mark a false approval',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 const sent=await f.call('request-member-correction',f.member,{
  application_id:'a',stage_name:'Proposed Name',affiliation:'Proposed School',reason:'Correction requested by the account'
 });
 assert.equal(sent.status,201);
 const id=(await sent.json()).request.id;
 f.db.prepare("UPDATE e2e_applications SET stage_name='Separately Updated' WHERE id='a'").run();
 const decision=await f.call('decide-member-correction',f.organizer,{request_id:id,decision:'accepted'});
 assert.equal(decision.status,409);
 assert.equal(f.db.prepare("SELECT stage_name FROM e2e_applications WHERE id='a'").get().stage_name,'Separately Updated');
 assert.equal(f.db.prepare('SELECT state FROM e2e_member_correction_requests WHERE id=?').get(id).state,'pending');
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM e2e_member_correction_audit WHERE correction_id=?').get(id).n,1);
});
test('organizer may decline without changing the locked entry or its grade',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 const sent=await f.call('request-member-correction',f.member,{application_id:'a',stage_name:'New Person',affiliation:'Other School',reason:'Please check submitted name'});
 const id=(await sent.json()).request.id;
 const rejected=await f.call('decide-member-correction',f.organizer,{request_id:id,decision:'declined'});
 assert.equal(rejected.status,200);
 assert.equal(f.db.prepare("SELECT stage_name FROM e2e_applications WHERE id='a'").get().stage_name,'Old Name');
 assert.equal(f.db.prepare("SELECT state FROM e2e_member_correction_requests WHERE id=?").get(id).state,'declined');
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM e2e_member_correction_audit WHERE correction_id=?').get(id).n,2);
});
