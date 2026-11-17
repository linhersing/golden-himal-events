import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleFiveDemoRoute,fiveDemoReady,getDemoVideos,bestDemo} from '../backend/five-demo.js';
import {handleV2Route} from '../backend/staging-v2-flow.js';
const origin='https://golden-himal-voice-preview.linhersing.workers.dev';
let seq=0;
const uuid=()=>('00000000-'+String(++seq).padStart(4,'0')+'-4000-8000-000000000001');
const json=(value,status=200)=>Response.json(value,{status});
const deny=(error,status=400)=>json({ok:false,error},status);
const NOW=()=>1794900000;
const bodyJSON=async r=>r.json();
const req=(name,data)=>new Request(origin+'/api/e2e/'+name,{
 method:data===undefined?'GET':'POST',headers:data===undefined?{}:{Origin:origin,'Content-Type':'application/json'},
 body:data===undefined?undefined:JSON.stringify(data)
});
const fixture=()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['1000_e2e_staging_acceptance_ONLY.sql','1011_frontline_2027_registration_STAGING_ONLY.sql','1012_frontline_region_lock_STAGING_ONLY.sql','1014_five_demo_videos_STAGING_ONLY.sql']){
  db.exec(readFileSync(new URL('../backend/migrations/'+name,import.meta.url),'utf8'));
 }
 const DB={prepare(sql){let args=[];return{
  bind(...v){args=v;return this},first(){return db.prepare(sql).get(...args)||null},
  all(){return {results:db.prepare(sql).all(...args)}},
  run(){const r=db.prepare(sql).run(...args);return{meta:{changes:r.changes}}}
 }}};
 for(const [id,role] of [['m','member'],['j1','reviewer'],['j2','reviewer'],['j3','reviewer'],['o','organizer']]){
  db.prepare('INSERT INTO e2e_accounts(id,email_fingerprint,email_hint,role,created_at) VALUES(?,?,?,?,?)')
   .run(id,id+'-email-hash','test',role,1);
 }
 db.prepare('INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,phase,status,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .run('app1','m','2027-01','university','bagmati','residence','University','Singer Test','One','Artist','Nepali','C major','https://youtu.be/demo1','demo','submitted','unpaid',1,1);
 db.prepare('INSERT INTO e2e_frontline_2027_registration(application_id,competition_region,eligibility_basis,created_at) VALUES(?,?,?,?)')
  .run('app1','A','graduated',1);
 const env={DB,STAGING_FIVE_DEMOS_ENABLED:'true',STAGING_SUBMISSION_MODE:'links'};
 const member={id:'m',role:'member'},organizer={id:'o',role:'organizer'},judge=id=>({id,role:'reviewer'});
 const call=(name,actor,data)=>handleFiveDemoRoute(req(name,data),env,actor,{json,deny,bodyJSON,uuid,NOW});
 const v2=(name,actor,data)=>handleV2Route(req(name,data),env,actor,{
  json,deny,bodyJSON,uuid,NOW,ownsApplication:async(_env,_actor,accountId)=>_actor.id===accountId,
  attachProfiles:async(_env,rows)=>rows,approval:false,supplements:false
 });
 return {db,DB,env,member,organizer,judge,call,v2};
};
const row=(n)=>({application_id:'app1',song_title:'Song '+n,original_artist:'Artist '+n,song_language:'Nepali',demo_url:'https://youtu.be/demo'+n,video_confirmed:true});
test('up to 5 Jan Demo links are separately persisted, owner scoped, server-limited, and read back',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 assert.equal(await fiveDemoReady(f.DB),true);
 assert.equal((await f.call('demo-videos',f.judge('j1'))).status,403);
 assert.equal((await f.call('add-demo-video',f.organizer,row(2))).status,403);
 for(let n=2;n<=5;n++){
  const r=await f.call('add-demo-video',f.member,row(n));
  assert.equal(r.status,201,await r.clone().text());
  const v=(await r.json()).video;assert.equal(v.video_index,n);
 }
 const got=await f.call('demo-videos?application_id=app1',f.member);
 assert.equal(got.status,200);
 const data=await got.json();
 assert.deepEqual(data.videos.map(x=>x.video_index),[1,2,3,4,5]);
 assert.equal(data.max_videos,5);
 assert.equal((await f.call('add-demo-video',f.member,row(6))).status,409);
 assert.equal((await f.call('add-demo-video',f.member,row(4))).status,409);
 assert.equal((await f.call('add-demo-video',f.member,{...row(6),application_id:'other'})).status,404);
 assert.equal((await f.call('add-demo-video',f.member,{...row(6),video_confirmed:false})).status,422);
 assert.equal((await f.call('demo-videos?application_id=other',f.member)).status,404);
 assert.equal(f.db.prepare('SELECT count(*) n FROM e2e_demo_videos').get().n,4);
});
test('free January A/B application joins reviewer queue without mock payment; five videos score independently',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 for(let n=2;n<=5;n++)assert.equal((await f.call('add-demo-video',f.member,row(n))).status,201);
 const queue=await f.v2('reviewer-queue',f.judge('j1'));
 assert.equal(queue.status,200);
 const entries=(await queue.json()).queue;
 assert.deepEqual(entries.map(x=>x.video_index),[1,2,3,4,5]);
 assert.equal((await f.v2('score',f.member,{application_id:'app1',phase:'demo',no_conflict:true,technique:50,interpretation:30})).status,403);
 assert.equal((await f.v2('score',f.judge('j1'),{application_id:'app1',phase:'demo',video_index:6,no_conflict:true,technique:40,interpretation:30})).status,422);
 const grade=(index,score)=>({application_id:'app1',phase:'demo',video_index:index,no_conflict:true,technique:Math.min(60,score),interpretation:score-Math.min(60,score)});
 for(const j of ['j1','j2','j3']){
  for(let index=1;index<=5;index++){
   const points=index===4?95:index===3?85:70;
   const r=await f.v2('score',f.judge(j),grade(index,points));
   assert.equal(r.status,200,await r.clone().text());
  }
 }
 assert.equal((await f.v2('score',f.judge('j1'),grade(4,95))).status,409,'no score overwrite');
 const summary=await f.call('organizer-demo-best?application_id=app1',f.organizer);
 const scored=await summary.json();
 assert.equal(summary.status,200);assert.equal(scored.best.video_index,4);assert.equal(scored.best.mean,95);
 assert.equal(scored.videos.length,5);
 const returned=await f.v2('reviewer-queue',f.judge('j1'));const scoredRows=(await returned.json()).queue;
 assert.equal(scoredRows.length,5);
 assert.equal(scoredRows[3].demo_technique+scoredRows[3].demo_interpretation,95);
 assert.equal(f.db.prepare('SELECT count(*) n FROM e2e_extra_demo_scores').get().n,12);
 assert.equal((await f.call('add-demo-video',f.member,row(6))).status,409,'scored application locked');
});
test('best score ignores incomplete videos and ties favor submitted index, never sums videos',async t=>{
 const f=fixture();t.after(()=>f.db.close());
 assert.equal(bestDemo([{video_index:1,judges_count:2,judges_mean:95},{video_index:2,judges_count:3,judges_mean:70}]).mean,70);
 assert.equal(bestDemo([{video_index:2,judges_count:3,judges_mean:80},{video_index:1,judges_count:3,judges_mean:80}]).video_index,1);
 assert.equal(bestDemo([{video_index:1,judges_count:2,judges_mean:100}]),null);
});
