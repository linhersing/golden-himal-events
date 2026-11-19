import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('brand TEST provisioning installs staff guards without changing the legacy 90-point score',()=>{
 const db=new DatabaseSync(':memory:');
 const migration=name=>db.exec(readFileSync(new URL('../backend/migrations/'+name,import.meta.url),'utf8'));
 try{
  migration('1000_e2e_staging_acceptance_ONLY.sql');
  db.exec(`INSERT INTO e2e_accounts VALUES('member','m','fictional','member',1,1),('judge','j','fictional','reviewer',1,1);
   INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,created_at,updated_at)
   VALUES('entry','member','2027-01','community','bagmati','work','TEST','TEST','Song','Artist','English','C',1,1);
   INSERT INTO e2e_judge_scores VALUES('entry','judge',55,35,1,1);`);
  const source=readFileSync(new URL('../scripts/provision-practice.mjs',import.meta.url),'utf8');
  const list=source.match(/for\(const file of \[([\s\S]*?)\]\)/)[1];
  for(const [,name] of list.matchAll(/'([^']+\.sql)'/g))migration(name);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('e2e_staff_auth_attempts','e2e_staff_audit','e2e_registration_controls','e2e_removed_member_media')").get().n,4);
  assert.equal(db.prepare('SELECT technique+interpretation AS score FROM e2e_judge_scores').get().score,90);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n,1);
  assert.equal(db.prepare("SELECT protected FROM e2e_admin_registrations WHERE id='entry'").get().protected,1);
 }finally{db.close()}
});
