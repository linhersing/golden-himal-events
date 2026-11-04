import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../backend/staging-registration-worker.js';
import {safePerformance} from '../public/practice-roster.js';

const base='https://acceptance.example';
function fixtureDb(db){
 return {prepare(sql){let args=[];const op={bind(...x){args=x;return op},
  async first(){return db.prepare(sql).get(...args)||null},
  async all(){return {results:db.prepare(sql).all(...args)}},
  async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}
 };return op},
 async batch(stmts){db.exec('BEGIN');try{const r=[];for(const stmt of stmts)r.push(await stmt.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
}
async function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 db.exec(await readFile(new URL('../backend/migrations/1002_private_practice_ONLY.sql',import.meta.url),'utf8'));
 const env={STAGING_PRACTICE_ENABLED:'true',E2E_DB:fixtureDb(db)};
 const call=async(path,body,cookie='')=>{
  const r=await worker.fetch(new Request(base+'/api/staging/practice/'+path,{
   method:body===undefined?'GET':'POST',
   headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},
   body:body===undefined?undefined:JSON.stringify(body)
  }),env);
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 return {db,call};
}
const entry={synthetic:true,contact_phone:'+9770000000000',contact_handle:'TEST WHATSAPP',affiliation:'TEST UNIVERSITY',
 song_language:'Nepali',song_key:'C',priority_ack:true,media_ack:true,stage_name:'FICTIONAL SINGER',
 round_code:'2027-01',category:'university',province:'bagmati',song_title:'TEST TRACK',
 original_artist:'TEST ARTIST',work_url:'https://youtu.be/dQw4w9WgXcQ'};
test('member submits then their own Organizer reads the exact saved record and judge login state',async()=>{
 const f=await fixture();
 try{
  const newSpace=await f.call('create',{synthetic:true});
  assert.equal(newSpace.status,201);
  const memberCookie=newSpace.cookie;
  const memberMe=await f.call('me',undefined,memberCookie);
  assert.equal(memberMe.status,200);
  assert.equal(memberMe.data.actor.role,'member');
  const saved=await f.call('application',entry,memberCookie);
  assert.equal(saved.status,201);
  const organizerPass=newSpace.data.passes.find(a=>a.role==='organizer').pass;
  const organizer=await f.call('login',{pass:organizerPass});
  assert.equal(organizer.status,200);
  const dashboard=await f.call('me',undefined,organizer.cookie);
  assert.equal(dashboard.status,200);
  assert.equal(dashboard.data.actor.role,'organizer');
  assert.equal(dashboard.data.applications.length,1);
  assert.equal(dashboard.data.applications[0].id,saved.data.application.id);
  assert.equal(dashboard.data.applications[0].stage_name,entry.stage_name);
  assert.equal(dashboard.data.applications[0].contact_phone,entry.contact_phone);
  assert.equal(dashboard.data.applications[0].contact_handle,entry.contact_handle);
  assert.equal(dashboard.data.applications[0].work_url,entry.work_url);
  assert.equal(dashboard.data.judge_status.length,3);
  assert(dashboard.data.judge_status.every(j=>Number(j.active_session)===0));
  const judgePass=newSpace.data.passes.find(a=>a.actor_id==='judge-1').pass;
  const judge=await f.call('login',{pass:judgePass});
  assert.equal(judge.status,200);
  const active=await f.call('me',undefined,organizer.cookie);
  assert.equal(Number(active.data.judge_status.find(j=>j.actor_id==='judge-1').active_session),1);
  const score=await f.call('score',{application_id:saved.data.application.id,phase:'demo',
   recused:false,no_conflict:true,technique:52,interpretation:38,stage_presence:0,appearance:0},judge.cookie);
  assert.equal(score.status,201);
  const scored=await f.call('me',undefined,organizer.cookie);
  const judge1=scored.data.judge_status.find(j=>j.actor_id==='judge-1');
  assert.equal(Number(judge1.scored_apps),1);
  assert.equal(Number(judge1.scorecards),1);
  assert.equal(Number(judge1.recusal_count),0);
  assert.equal(scored.data.scores[0].technique,52);
  assert.equal(scored.data.scores[0].interpretation,38);
  assert(!JSON.stringify(scored.data).includes(organizerPass));
  const judgeView=await f.call('me',undefined,judge.cookie);
  assert.equal(judgeView.data.applications[0].stage_name,entry.stage_name);
  assert.equal('contact_phone' in judgeView.data.applications[0],false);
 }finally{f.db.close()}
});
test('other workspace Organizer cannot read this workspace records or judge state',async()=>{
 const f=await fixture();
 try{
  const first=await f.call('create',{synthetic:true});
  assert.equal((await f.call('application',entry,first.cookie)).status,201);
  const second=await f.call('create',{synthetic:true});
  const owner2=await f.call('login',{pass:second.data.passes.find(a=>a.role==='organizer').pass});
  const view=await f.call('me',undefined,owner2.cookie);
  assert.equal(view.status,200);
  assert.deepEqual(view.data.applications,[]);
  assert(view.data.judge_status.every(j=>Number(j.scorecards)===0));
  assert.equal((await f.call('me',undefined,'')).status,401);
  const member=await f.call('me',undefined,first.cookie);
  assert.deepEqual(member.data.judge_status,[]);
 }finally{f.db.close()}
});
test('only trusted public YouTube/Google Drive links become clickable',()=>{
 assert.equal(safePerformance('https://youtu.be/demoid'),'https://youtu.be/demoid');
 assert.equal(safePerformance('https://drive.google.com/file/d/demo/view'),'https://drive.google.com/file/d/demo/view');
 for(const bad of ['javascript:alert(1)','http://youtu.be/demo','https://youtube.com.evil.test/demo',
  'https://evil.test/?url=youtube.com','https://evil.test@youtu.be/','data:text/html,hi','not-a-url']){
  assert.equal(safePerformance(bad),null,bad);
 }
});
test('self acceptance page and homepage contain the navigable portal markers',async()=>{
 const practice=await readFile(new URL('../public/practice.html',import.meta.url),'utf8');
 const homepage=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(practice,/id="organizer-roster"/);
 assert.match(practice,/id="organizer-judge-monitor"/);
 assert.match(practice,/自己測試有沒有成功/);
 assert.doesNotMatch(homepage,/class="backoffice-link"/);
 const staff=await readFile(new URL('../public/backoffice.html',import.meta.url),'utf8');
 assert.match(staff,/id="back-signin"/);
 assert.match(staff,/id="back-dashboard"/);
});
