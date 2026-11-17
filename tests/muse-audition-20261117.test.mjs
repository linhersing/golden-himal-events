import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {MUSE_FIELDS,museHasFields,parseMuseAudition,museAuditionReady,insertMuseAudition,updateMuseAudition,attachMuseAudition} from '../backend/muse-audition.js';

const p={full_name:'TEST Singer',contact_phone:'+977 9812345678',contact_email:'test@example.invalid',
 city:'TEST Chitwan',street_address:'TEST Tol 12',educational_background:'TEST Bachelor',
 short_description:'TEST singing audition statement',musical_training:'TEST music course'};
function adapter(db){return {prepare(sql){let a=[];return {bind(...args){a=args;return this},first(){return db.prepare(sql).get(...a)||null},run(){let r=db.prepare(sql).run(...a);return {meta:{changes:r.changes}}}}}}}
test('Muse entries validate each screenshot field; wrong contact details fail closed',()=>{
 assert.equal(MUSE_FIELDS.length,8);
 assert.equal(museHasFields(p),true);
 assert.deepEqual(parseMuseAudition(p),{profile:p});
 assert.equal(parseMuseAudition({...p,contact_email:'wrong'}).error,'muse_email_invalid');
 assert.equal(parseMuseAudition({...p,contact_phone:'abc'}).error,'muse_phone_invalid');
 assert.equal(parseMuseAudition({...p,city:''}).error,'muse_profile_invalid');
});
test('Muse D1 migration keeps private details under application ownership and supports guarded updates',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec(`CREATE TABLE e2e_applications(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,phase TEXT NOT NULL,status TEXT NOT NULL,payment_status TEXT NOT NULL);`);
  for(const x of ['e2e_judge_scores','e2e_live_scores','e2e_promotion_events'])db.exec('CREATE TABLE '+x+'(application_id TEXT NOT NULL)');
  db.exec(readFileSync(new URL('../backend/migrations/1013_muse_audition_details_STAGING_ONLY.sql',import.meta.url),'utf8'));
  const a=adapter(db);
  const env={DB:a,STAGING_MUSE_AUDITION_ENABLED:'true'};
  assert.equal(await museAuditionReady({...env,STAGING_MUSE_AUDITION_ENABLED:'false'}),false);
  assert.equal(await museAuditionReady(env),true);
  db.prepare('INSERT INTO e2e_applications VALUES(?,?,?,?,?)').run('app1','owner','demo','submitted','unpaid');
  insertMuseAudition(a,'app1',p,123).run();
  let joined=await attachMuseAudition(env,[{id:'app1'}]);
  assert.equal(joined[0].contact_phone,p.contact_phone);
  const changed={...p,city:'Updated TEST city'};
  updateMuseAudition(a,'app1','intruder',changed,456).run();
  assert.equal(db.prepare('SELECT city FROM e2e_muse_audition_details').get().city,p.city);
  updateMuseAudition(a,'app1','owner',changed,456).run();
  assert.equal(db.prepare('SELECT city FROM e2e_muse_audition_details').get().city,'Updated TEST city');
  db.prepare("UPDATE e2e_applications SET status='scored' WHERE id='app1'").run();
  updateMuseAudition(a,'app1','owner',p,789).run();
  assert.equal(db.prepare('SELECT city FROM e2e_muse_audition_details').get().city,'Updated TEST city');
  db.prepare("DELETE FROM e2e_applications WHERE id='app1'").run();
  assert.equal(db.prepare('SELECT COUNT(*) n FROM e2e_muse_audition_details').get().n,0);
 }finally{db.close();}
});
