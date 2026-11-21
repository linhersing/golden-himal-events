import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleE2E} from '../backend/staging-e2e.js';

test('controlled contact write and readback stays with the entrant and organizer',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 try{
  const dir=new URL('../backend/migrations/',import.meta.url);
  for(const name of ['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql',
   '1011_frontline_2027_registration_STAGING_ONLY.sql','1013_muse_audition_details_STAGING_ONLY.sql','1015_muse_contact_handle_STAGING_ONLY.sql'])
   sqlite.exec(readFileSync(new URL(name,dir),'utf8'));
  const DB={
   prepare(sql){
    let values=[];
    return {bind(...v){values=v;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},
     run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}};
   },
   batch(stmts){
    sqlite.exec('BEGIN');
    try{const result=stmts.map(x=>x.run());sqlite.exec('COMMIT');return result}
    catch(e){sqlite.exec('ROLLBACK');throw e}
   }
  };
  const secret='isolated-test-identity-key-not-a-live-credential',host='https://synthetic.example.invalid';
  const hash=value=>createHmac('sha256',secret).update(value).digest('hex');
  const staff=new Map([['owner','member'],['other','member'],['judge','reviewer'],['organizer','organizer']]);
  for(const [person,role] of staff){
   sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(person,hash('email:'+person+'@example.invalid'),'fixture',role,1,1);
   sqlite.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash('session:'+hash(person)),person,9999999999,1);
  }
  const env={DB,STAGING_IDENTITY_SECRET:secret,STAGING_E2E_ENABLED:'true',STAGING_MUSE_AUDITION_ENABLED:'true',STAGING_PASSWORD_SIGNUP_ENABLED:'true',
   STAGING_SUBMISSION_MODE:'links',STAGING_ALLOWED_EMAILS:'owner@example.invalid,other@example.invalid',STAGING_REVIEWER_EMAILS:'judge@example.invalid',STAGING_ORGANIZER_EMAILS:'organizer@example.invalid',STAGING_TEST_APPROVAL_ENABLED:'true'};
  const call=(path,person,body)=>handleE2E(new Request(host+'/api/e2e/'+path,{method:body?'POST':'GET',
   headers:{...(person?{Cookie:'__Host-ghv-e2e='+hash(person)}:{}),...(body?{Origin:host,'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined}),env);
  const contact={full_name:'Fictional Singer',contact_phone:'+977 9800000000',contact_email:'fixture@example.invalid',contact_handle:'Synthetic contact',
   city:'Fixture city',street_address:'Fixture street',educational_background:'Fixture graduate',short_description:'Fixture description',musical_training:'Fixture training'};
  const response=await call('applications','owner',{...contact,frontline_2027:true,competition_region:'A',eligibility_basis:'graduated',
   round_code:'2027-01',category:'community',province:'gandaki',location_basis:'residence',affiliation:'Fixture College',stage_name:'Fixture Singer',
   song_title:'Fixture song',original_artist:'Fixture artist',song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/TEST_012345',no_exclusive_contract:true});
  assert.equal(response.status,201,await response.clone().text());
  const {application_id}=await response.json();
  assert.equal(sqlite.prepare('SELECT contact_handle FROM e2e_muse_audition_details WHERE application_id=?').get(application_id).contact_handle,contact.contact_handle);
  const owner=(await (await call('applications','owner')).json()).applications[0];
  for(const [key,value] of Object.entries(contact))assert.equal(owner[key],value,key);
  assert.equal((await (await call('applications','other')).json()).applications.length,0);
  const path='organizer-contact?id='+application_id;
  assert.equal((await call(path,'owner')).status,403);
  assert.equal((await call(path,'judge')).status,403);
  assert.equal((await call(path,null)).status,401);
  // Unscoped legacy access formerly returned every private field without an audit.
  // It is now blocked until the organizer uses a specific audited section.
  const organizer=await call(path,'organizer');
  assert.equal(organizer.status,422);
  assert.equal((await organizer.json()).contact,undefined);
  const summary=(await (await call('organizer-queue','organizer')).json()).applications[0];
  assert.ok(summary);
  for(const key of Object.keys(contact))assert.ok(!(key in summary),key);
 }finally{sqlite.close()}
});

test('the brand signup entry absorbs legacy sandbox URLs and pauses legacy checkout',async()=>{
 const {default:worker}=await import('../backend/staging-registration-worker.js');
 for(const domain of ['goldenhimalpalace.com','www.goldenhimalpalace.com']){
  const root='https://'+domain;
  for(const suffix of ['/member-portal','/member-login.html','/payment-lab.html/','/practice/','/admin-center.html']){
   const res=await worker.fetch(new Request(root+suffix),{});
   assert.equal(res.status,302);
   assert.equal(res.headers.get('location'),root+'/member.html#register');
  }
  const res=await worker.fetch(new Request(root+'/api/e2e/mock-payment',{method:'POST'}),{});
  assert.equal(res.status,404);
  assert.equal((await res.json()).error,'checkout_paused');
 }
});
