import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {contactReady,parseContact} from '../backend/entrant-contacts.js';
import {handleE2E} from '../backend/staging-e2e.js';

const host='https://golden-himal-voice-preview.linhersing.workers.dev';
function adapter(db){return {prepare(sql){let args=[];return {
 bind(...values){args=values;return this},
 first(){return db.prepare(sql).get(...args)||null},
 all(){return {results:db.prepare(sql).all(...args)}},
 run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}}
}},batch(statements){
 db.exec('BEGIN');try{const out=statements.map(s=>s.run());db.exec('COMMIT');return out}
 catch(err){db.exec('ROLLBACK');throw err}
}}}
function post(path,body,cookie){return new Request(host+'/api/e2e/'+path,{
 method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
 body:JSON.stringify(body)
});}
function get(path,cookie){return new Request(host+'/api/e2e/'+path,{headers:cookie?{Cookie:cookie}:{}});}

test('contact validation, deployment guard and role-scoped TEST D1 readback',async()=>{
 assert.equal(parseContact({contact_email:'test@example.com',contact_phone:'1234',contact_consent:true}).error,'contact_phone_invalid');
 assert.equal(parseContact({contact_email:'test@example.com',contact_phone:'+977 9812345678'}).error,'contact_consent_required');
 assert.equal(parseContact({contact_email:'bad',contact_phone:'+977 9812345678',contact_consent:true}).error,'contact_email_invalid');
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(await readFile(new URL('../backend/migrations/1000_e2e_staging_acceptance_ONLY.sql',import.meta.url),'utf8'));
  let inbox=[];
  const env={DB:adapter(db),STAGING_E2E_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',
   STAGING_CONTACT_FIELDS_ENABLED:'true',STAGING_IDENTITY_SECRET:'S'.repeat(64),
   STAGING_ALLOWED_EMAILS:'singer@test.invalid',STAGING_REVIEWER_EMAILS:'judge@test.invalid',
   STAGING_ORGANIZER_EMAILS:'organizer@test.invalid',STAGING_FROM_EMAIL:'test@example.invalid',
   EMAIL:{async send(message){inbox.push(message);return {id:'mail-test'}}}};
  assert.equal(await contactReady(env),false,'schema gate must remain closed before migration');
  db.exec(await readFile(new URL('../backend/migrations/1008_entrant_contacts_STAGING_ONLY.sql',import.meta.url),'utf8'));
  assert.equal(await contactReady(env),true);
  async function login(email,role){
   const first=await handleE2E(post('request-code',{email,role}),env);
   assert.equal(first.status,200,await first.clone().text());
   const challenge=(await first.json()).challenge_id;
   const code=inbox.at(-1).text.match(/\b\d{6}\b/)[0];
   const verified=await handleE2E(post('verify-code',{challenge_id:challenge,code}),env);
   assert.equal(verified.status,200,await verified.clone().text());
   return verified.headers.get('set-cookie').split(';')[0];
  }
  const member=await login('singer@test.invalid','member');
  assert.equal((await (await handleE2E(get('me',member),env)).json()).contact_enabled,true);
  const application={round_code:'2027-01',category:'community',province:'bagmati',
   location_basis:'residence',affiliation:'TEST school',stage_name:'TEST singer',
   song_title:'TEST original',original_artist:'TEST artist',song_language:'Nepali',song_key:'C',
   demo_url:'https://youtu.be/fictional-test-song',adult_confirmed:true,
   no_exclusive_contract:true,video_confirmed:true,contact_email:'singer@test.invalid',
   contact_phone:'+977 9812345678',contact_consent:true};
  async function submit(payload){return handleE2E(post('applications',payload,member),env)}
  assert.equal((await submit({...application,contact_email:'other@example.com'})).status,422,'contact must match verified login');
  assert.equal((await submit({...application,contact_phone:'1234'})).status,422);
  assert.equal((await submit({...application,contact_consent:false})).status,422);
  const created=await submit(application);
  assert.equal(created.status,201,await created.clone().text());
  const id=(await created.json()).application_id;
  assert.equal(db.prepare('SELECT contact_phone FROM e2e_application_contacts WHERE application_id=?').get(id).contact_phone,application.contact_phone);
  const own=await (await handleE2E(get('applications',member),env)).json();
  assert.equal(own.applications[0].contact_email,'singer@test.invalid');
  assert.equal(own.applications[0].contact_phone,application.contact_phone);
  const judge=await login('judge@test.invalid','reviewer');
  const organizer=await login('organizer@test.invalid','organizer');
  assert.equal((await handleE2E(get('organizer-queue',judge),env)).status,403);
  const staff=await (await handleE2E(get('organizer-queue',organizer),env)).json();
  assert.equal(staff.applications[0].contact_phone,application.contact_phone);
  await handleE2E(post('mock-payment',{application_id:id},member),env);
  const queue=await (await handleE2E(get('reviewer-queue',judge),env)).json();
  assert.equal(queue.queue.length,1);
  assert.equal(Object.hasOwn(queue.queue[0],'contact_phone'),false,'judges never receive private phone');
  assert.equal(Object.hasOwn(queue.queue[0],'contact_email'),false,'judges never receive private email');
  const deleted=await handleE2E(post('delete-my-data',{},member),env);
  assert.equal(deleted.status,200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM e2e_application_contacts').get().n,0,'CASCADE removes contact data');
 }finally{db.close()}
});
