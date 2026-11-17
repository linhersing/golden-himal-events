import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {validPerformanceLink} from '../public/performance-link.js';
import {parseFiveDemos,fiveDemoReady,insertFiveDemos,replaceFiveDemos,attachFiveDemos} from '../backend/demo-five-2027.js';
const item=i=>({song_title:'Song '+i,original_artist:'Singer '+i,song_language:'Nepali',demo_url:'https://youtu.be/TEST_Demo_'+i});
const make=entries=>({...entries[0],demo_entries:entries});
function adapter(db){return {prepare(sql){let args=[];return {bind(...x){args=x;return this},first(){return db.prepare(sql).get(...args)||null},all(){return {results:db.prepare(sql).all(...args)}},run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}}}
test('only one to five unique personal video links with own song metadata are accepted',()=>{
 for(let n=1;n<=5;n++){
  const list=Array.from({length:n},(_,i)=>item(i+1));
  const result=parseFiveDemos(make(list),validPerformanceLink);
  assert.deepEqual(result.entries,list);
 }
 const six=Array.from({length:6},(_,i)=>item(i+1));
 assert.equal(parseFiveDemos(make(six),validPerformanceLink).error,'invalid_demo_count');
 const a=[item(1),item(1)];
 assert.equal(parseFiveDemos(make(a),validPerformanceLink).error,'duplicate_demo_url');
 assert.equal(parseFiveDemos({...make([item(1)]),song_title:'Changed'},validPerformanceLink).error,'demo_first_mismatch');
 const invalid=make([item(1),{...item(2),demo_url:'http://unsafe.example.org/video'}]);
 assert.equal(parseFiveDemos(invalid,validPerformanceLink).error,'invalid_demo_fields');
});
test('private linked D1 videos stay disabled without BOTH migration and reviewer-release checks',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec('CREATE TABLE e2e_accounts(id TEXT PRIMARY KEY);');
  db.exec("CREATE TABLE e2e_applications(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,phase TEXT NOT NULL,status TEXT NOT NULL,payment_status TEXT NOT NULL,FOREIGN KEY(account_id) REFERENCES e2e_accounts(id) ON DELETE CASCADE);");
  for(const name of ['e2e_judge_scores','e2e_live_scores','e2e_promotion_events'])db.exec('CREATE TABLE '+name+'(application_id TEXT NOT NULL)');
  db.exec(readFileSync(new URL('../backend/migrations/1014_demo_five_2027_STAGING_ONLY.sql',import.meta.url),'utf8'));
  const d=adapter(db),env={DB:d,STAGING_FIVE_DEMO_ENABLED:'true',STAGING_PER_VIDEO_JUDGING_ENABLED:'true'};
  assert.equal(await fiveDemoReady({...env,STAGING_PER_VIDEO_JUDGING_ENABLED:'false'}),false);
  assert.equal(await fiveDemoReady(env),true);
  db.prepare('INSERT INTO e2e_accounts VALUES(?)').run('owner');
  db.prepare('INSERT INTO e2e_accounts VALUES(?)').run('other');
  db.prepare('INSERT INTO e2e_applications VALUES(?,?,?,?,?)').run('app','owner','demo','submitted','unpaid');
  const items=[item(1),item(2),item(3)];
  for(const stmt of insertFiveDemos(d,'app',items,17))stmt.run();
  const rows=await attachFiveDemos(env,[{id:'app'}]);
  assert.equal(rows[0].demo_entries.length,3);
  for(const stmt of replaceFiveDemos(d,'app','other',[item(4)],18))stmt.run();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n,3);
  for(const stmt of replaceFiveDemos(d,'app','owner',[item(4)],19))stmt.run();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n,1);
  db.prepare("UPDATE e2e_applications SET status='scored' WHERE id='app'").run();
  for(const stmt of replaceFiveDemos(d,'app','owner',[item(3)],20))stmt.run();
  assert.equal(db.prepare('SELECT song_title FROM e2e_demo_2027_videos').get().song_title,'Song 4');
  db.prepare("DELETE FROM e2e_applications WHERE id='app'").run();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').get().n,0);
 }finally{db.close();}
});
