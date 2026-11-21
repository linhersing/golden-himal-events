import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleE2E} from '../backend/staging-e2e.js';
import {MUSE_FIELDS} from '../backend/muse-audition.js';

const contact={full_name:'TEST Private Legal Name',contact_phone:'+977 9800000000',contact_email:'contact@example.invalid',
 contact_handle:'TEST Contact Handle',city:'TEST City',street_address:'TEST Tol',educational_background:'TEST Graduate',
 short_description:'TEST Description',musical_training:'TEST Training'};
const entry={...contact,frontline_2027:true,competition_region:'A',eligibility_basis:'graduated',round_code:'2027-01',
 category:'community',province:'lumbini',location_detail:'TEST District',location_basis:'residence',affiliation:'TEST College',stage_name:'TEST Stage Name',
 song_title:'TEST Song',original_artist:'TEST Artist',song_language:'Nepali',song_key:'C',demo_url:'https://youtu.be/TEST_012345',
 no_exclusive_contract:true,video_confirmed:true,nonreligious_song_ack:true,
 demo_entries:Array.from({length:5},(_,i)=>({song_title:i?'TEST Song '+(i+1):'TEST Song',original_artist:'TEST Artist',song_language:'Nepali',demo_url:i?'https://youtu.be/TEST_01234'+i:'https://youtu.be/TEST_012345'}))};

function fixture(){
 const db=new DatabaseSync(':memory:'),dir=new URL('../backend/migrations/',import.meta.url);
 for(const name of readdirSync(dir).filter(x=>/^10(?:00|03|04|05|07|09|10|11|12|13|14|15|16|17|18|19)_.*\.sql$/.test(x)).sort())db.exec(readFileSync(new URL(name,dir),'utf8'));
 const prepare=sql=>{let args=[];return {bind(...v){args=v;return this},first(){return db.prepare(sql).get(...args)},all(){return {results:db.prepare(sql).all(...args)}},run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}},execute(){return db.prepare(sql).columns().length?this.all():this.run()}}};
 const DB={prepare,batch(statements){db.exec('BEGIN');try{const result=statements.map(s=>s.execute());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};
 const secret='fictional-member-contact-regression-secret-only',origin='https://fixture.example.invalid';
 const hash=x=>createHmac('sha256',secret).update(x).digest('hex');
 const env={DB,STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:secret,STAGING_SUBMISSION_MODE:'links',STAGING_MUSE_AUDITION_ENABLED:'true',
  STAGING_PUBLIC_SIGNUP_ENABLED:'true',STAGING_PASSWORD_SIGNUP_ENABLED:'true',STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_FRONTLINE_2027_ENABLED:'true',
  STAGING_ADMIN_MANAGEMENT_ENABLED:'true',STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_FIVE_DEMO_REHEARSAL:'true',STAGING_ALLOWED_EMAILS:'invited@example.invalid,other@example.invalid',
  STAGING_ORGANIZER_EMAILS:'organizer@example.invalid',STAGING_REVIEWER_EMAILS:'reviewer@example.invalid',
  STAGING_EMAIL_PROVIDER:'resend',STAGING_RESEND_VERIFIED_DOMAIN:'mail.example.invalid',STAGING_FROM_EMAIL:'verify@mail.example.invalid',
  STAGING_RESEND_API_KEY:'re_'+'x'.repeat(32),STAGING_TURNSTILE_SITE_KEY:'0x'+'A'.repeat(30),STAGING_TURNSTILE_SECRET_KEY:'0x'+'B'.repeat(30)};
 for(const key of ['invited','public','password','unproven','other','organizer','reviewer']){
  const role=['organizer','reviewer'].includes(key)?key:'member';
  db.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(key,hash('email:'+key+'@example.invalid'),'fixture',role,1,1);
  db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash((role==='member'?'session:':'staff-session:')+hash(key)),key,4102444800,1);
 }
 db.prepare('INSERT INTO e2e_public_signup_accounts VALUES(?,?)').run('public',hash('mailbox:public@example.invalid'));
 db.prepare('INSERT INTO e2e_password_accounts VALUES(?,?,?,?,?,0,0,?)').run('password',hash('username'),hash('salt'),hash('password'),hash('recovery'),1);
 const call=(key,path,body)=>handleE2E(new Request(origin+'/api/e2e/'+path,{method:body?'POST':'GET',headers:{Origin:origin,
  ...(key?{Cookie:'__Host-ghv-e2e='+hash(key)}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
 return {db,env,call,close:()=>db.close()};
}

for(const identity of ['invited','public','password'])test(identity+' member can enter, save five demos, read and correct own private contact without staff privileges',async()=>{
 const f=fixture();try{
  const me=await (await f.call(identity,'me')).json();
  assert.equal(me.account.role,'member');assert.equal(me.muse_form_enabled,true,'all authenticated member identities need the same contact capability');
  const created=await f.call(identity,'applications',entry);assert.equal(created.status,201,await created.clone().text());
  const {application_id:id}=await created.json();
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos WHERE application_id=?').get(id).n,5);
  const own=(await (await f.call(identity,'applications')).json()).applications[0];
  for(const k of MUSE_FIELDS)assert.equal(own[k],contact[k],k);
  const changed={...contact,city:'TEST Corrected City',application_id:id,stage_name:entry.stage_name,song_title:entry.song_title,original_artist:entry.original_artist,demo_url:entry.demo_url};
  assert.equal((await f.call('other','update-application',changed)).status,404);
  const updated=await f.call(identity,'update-application',changed);assert.equal(updated.status,200,await updated.clone().text());
  assert.equal(f.db.prepare('SELECT city FROM e2e_muse_audition_details WHERE application_id=?').get(id).city,changed.city);
  assert.equal((await (await f.call('other','applications')).json()).applications.length,0);
  for(const actor of [identity,'other','reviewer'])assert.equal((await f.call(actor,'organizer-contact?id='+id+'&section=contact')).status,403);
  assert.equal((await f.call(null,'organizer-contact?id='+id+'&section=contact')).status,401);
  const queue=(await (await f.call('organizer','organizer-queue')).json()).applications;
  for(const key of MUSE_FIELDS)assert.equal(Object.hasOwn(queue[0],key),false);
  const section=await f.call('organizer','organizer-contact?id='+id+'&section=contact');assert.equal(section.status,200);
  const sectionData=await section.json();assert.equal(sectionData.contact.contact_email,contact.contact_email);assert.equal(sectionData.contact.street_address,undefined);
  const audit=(await (await f.call('organizer','organizer-registration-audit?id='+id)).json()).events;
  assert(audit.some(x=>x.result==='success'&&x.diff?.section==='contact'));
  assert.doesNotMatch(JSON.stringify(audit),/contact@example|9800000000|TEST Private Legal Name/);
  f.db.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,?)').run(id,'organizer',1);
  assert.equal((await f.call(identity,'update-application',{...changed,city:'Should stay locked'})).status,409);
  assert.equal(f.db.prepare('SELECT city FROM e2e_muse_audition_details WHERE application_id=?').get(id).city,changed.city);
 }finally{f.close()}
});

for(const closed of ['flag','schema'])test('contact input and writes stay closed when private storage '+closed+' is unavailable',async()=>{
 const f=fixture();try{
  if(closed==='flag')f.env.STAGING_MUSE_AUDITION_ENABLED='false';else f.db.exec('DROP TABLE e2e_muse_audition_details');
  assert.notEqual((await (await f.call('public','me')).json()).muse_form_enabled,true);
  const r=await f.call('public','applications',entry);assert.equal(r.status,503);assert.equal((await r.json()).error,'muse_fields_not_enabled');
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,0);
 }finally{f.close()}
});

test('missing identity proof, anonymous requests and staff cannot use member contact writes',async()=>{
 const f=fixture();try{
  for(const key of [null,'unproven']){assert.equal((await f.call(key,'me')).status,401);assert.equal((await f.call(key,'applications',entry)).status,401)}
  for(const key of ['reviewer','organizer']){assert.notEqual((await (await f.call(key,'me')).json()).muse_form_enabled,true);assert.equal((await f.call(key,'applications',entry)).status,403)}
  assert.equal((await f.call('public','applications',{...entry,contact_email:'invalid'})).status,422);
  assert.equal((await f.call('public','applications',{...entry,contact_phone:'invalid'})).status,422);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM e2e_applications').get().n,0);
 }finally{f.close()}
});
