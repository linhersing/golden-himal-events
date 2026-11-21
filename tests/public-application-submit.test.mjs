import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {handleE2E} from '../backend/staging-e2e.js';

test('verified public members can submit 1, 3 and 5 January demos without a member allowlist',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 try{
  const dir=new URL('../backend/migrations/',import.meta.url);
  for(const name of readdirSync(dir).filter(n=>/^10(?:00|03|04|05|07|09|10|11|12|13|14|15|16|17|18)_.*\.sql$/.test(n)).sort())sqlite.exec(readFileSync(new URL(name,dir),'utf8'));
  const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}}},batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
  const secret='fictional-public-signup-regression-identity-only';
  const hash=value=>createHmac('sha256',secret).update(value).digest('hex');
  const env={DB,STAGING_IDENTITY_SECRET:secret,STAGING_E2E_ENABLED:'true',STAGING_PUBLIC_SIGNUP_ENABLED:'true',STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',STAGING_FRONTLINE_2027_ENABLED:'true',STAGING_FIVE_DEMO_REHEARSAL:'true',STAGING_MUSE_AUDITION_ENABLED:'true',STAGING_EMAIL_PROVIDER:'resend',STAGING_RESEND_API_KEY:'re_fictional_public_regression_only',STAGING_RESEND_VERIFIED_DOMAIN:'mail.example.org',STAGING_FROM_EMAIL:'test@mail.example.org',STAGING_TURNSTILE_SITE_KEY:'0xfictionalpublicsitekey',STAGING_TURNSTILE_SECRET_KEY:'0xfictionalpublicsecret'};
  const host='https://example.invalid';
  const call=(person,body,path='applications')=>handleE2E(new Request(host+'/api/e2e/'+path,{method:body?'POST':'GET',headers:{Cookie:'__Host-ghv-e2e='+hash(person),...(body?{Origin:host,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
  const ids=[];
  for(const count of [1,3,5]){
   const id='public-'+count,mailbox=hash('email:'+id+'@example.invalid');
   sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(id,mailbox,'fixture','member',1,1);
   sqlite.prepare('INSERT INTO e2e_public_signup_accounts(account_id,mailbox_fingerprint) VALUES(?,?)').run(id,mailbox);
   sqlite.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash('session:'+hash(id)),id,9999999999,1);
   const me=await (await call(id,null,'me')).json();
   assert.equal(me.account.role,'member');assert.equal(me.frontline_form_enabled,true);assert.equal(me.five_demo_enabled,true);assert.equal(me.muse_form_enabled,true);
   const demos=Array.from({length:count},(_,i)=>({song_title:'TEST Song '+i,original_artist:'TEST Artist',song_language:'Nepali',demo_url:'https://youtu.be/TEST_PUBLIC'+i}));
   const contact={full_name:'TEST Public Legal Name',contact_phone:'+977 9800000000',contact_email:'public@example.invalid',contact_handle:'TEST Contact',city:'TEST City',street_address:'TEST Tol',educational_background:'TEST Graduate',short_description:'TEST Description',musical_training:'TEST Training'};
   const payload={...contact,frontline_2027:true,competition_region:'A',eligibility_basis:'graduated',round_code:'2027-01',category:'community',province:'lumbini',location_detail:'TEST Municipality',location_basis:'residence',affiliation:'TEST Graduate',stage_name:count===1?'測':'TEST Public '+count,song_key:'Unknown',...demos[0],demo_entries:demos,no_exclusive_contract:true,nonreligious_song_ack:true,video_confirmed:true};
   const response=await call(id,payload);assert.equal(response.status,201,await response.clone().text());
   const saved=await response.json();ids.push(saved.application_id);assert.equal(saved.approval_state,'pending');
   const readback=(await (await call(id)).json()).applications;
   assert.equal(readback.length,1);assert.equal(readback[0].id,saved.application_id);assert.equal(readback[0].demo_entries.length,count);
   assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_demo_2027_videos WHERE application_id=?').get(saved.application_id).n,count);
   assert.equal(readback[0].contact_email,contact.contact_email);
   assert.equal((await call(id,{...payload,contact_email:'invalid'})).status,422);
  }
  assert.equal(new Set(ids).size,3);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_muse_audition_details').get().n,3);
 }finally{sqlite.close()}
});

test('registration validation errors explain the required action rather than an unknown-operation message',()=>{
 const code=readFileSync(new URL('../public/simple.js',import.meta.url),'utf8');
 const source=code.slice(code.indexOf('function friendlyError(e){'),code.indexOf('async function api(path,body){'));
 const explain=new Function('page','mt','return ('+source+')')('member',key=>key);
 for(const error of ['invalid_demo_count','invalid_demo_fields','duplicate_demo_url','demo_first_mismatch','missing_song_or_identity_test_fields','frontline_database_error','temporary_service_error','frontline_round_unavailable','competition_region_locked','invalid_competition_region','invalid_eligibility_basis','legacy_eligibility_mismatch','video_self_recording_confirmation_required','song_policy_declaration_required','five_demo_not_enabled','five_demo_round_unavailable']){
  assert.notEqual(explain(new Error(error)),'errUnknown',error);
 }
 const aborted=new Error('Aborted');aborted.name='AbortError';
 assert.notEqual(explain(aborted),'submitUncertain','OTP and other operations must not suggest a saved entry');
 assert.equal(explain(new Error('application_submit_timeout')),'submitUncertain');
});
