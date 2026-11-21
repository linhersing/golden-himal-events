import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname,join,resolve,sep} from 'node:path';

const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.ico':'image/x-icon'};
const stages = ['demo','qualifier','final'];
const fixtureRole = ['organizer','reviewer','reviewer-two','member'];
const mail = user => user+'@example.invalid';
const numericId = (kind,index) => '01000000-0000-4000-'+kind+'-'+String(index).padStart(12,'0');
const mailForIndex = index => mail('contestant-'+String(index).padStart(2,'0'));
export const fixtures=Array.from({length:20},(_,index)=>{
 const count=index+1,phase=count>=19?stages[count-18]:stages[0],demos=phase==='demo'?[1,3,5][index%3]:1;
 return {id:numericId('8000',count),memberId:numericId('9000',count),email:mailForIndex(count),
  stageName:count<=2?'TEST Same stage name':count===18?'TEST Very long performer name — ठूलो परीक्षण प्रतियोगी परीक्षण प्रतियोगी':'TEST Singer '+String(count).padStart(2,'0'),
  language:count>=19?'Nepali':(index%2?'Mandarin':'Nepali'),number:count,phase,demos,
  region:index%2?'B':'A',approved:count%7!==0,submittedStatus:count%7===0?'needs_info':'submitted'};
});
export async function isolatedStaffRuntime(repo,dependencies,assets=join(repo,'dist'),options={}){
 const require=createRequire(join(dependencies,'staff-local-loader.cjs'));
 const {build}=require('esbuild');
 const {Miniflare,Response,convertV4MiniflareOptions}=require('miniflare');
 const {unstable_splitSqlQuery}=require('wrangler');
 const [{text:script}]=(await build({absWorkingDir:repo,entryPoints:['backend/staging-registration-worker.js'],bundle:true,platform:'neutral',format:'esm',write:false})).outputFiles;
 const state=await mkdtemp(join(tmpdir(),'ghv-staff-d1-'));
 const removeState=async()=>{
  const prefix=join(resolve(tmpdir()),'ghv-staff-d1-');
  if(!state.startsWith(prefix))throw Error('Disposable database path is outside the TEST directory.');
  await rm(state,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 };
 const identity=randomBytes(32).toString('hex'),tokens=Object.fromEntries([...fixtureRole,...(options.publicMember?['public-member']:[])].map(role=>[role,randomBytes(32).toString('hex')]));
 const hmac=value=>createHmac('sha256',identity).update(value).digest('hex');
 const dist=resolve(assets);
 const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',resourcePersistencePath:state,enableDevRegistry:false,workers:[{
  modules:true,script,compatibilityDate:'2026-10-28',d1Databases:{E2E_DB:'staff-workspace-fictional-only'},
  bindings:{STAGING_ONLINE_JUDGING_MODE:options.judgingMode||'final_only',STAGING_IDENTITY_SECRET:identity,STAGING_E2E_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',
   STAGING_PASSWORD_SIGNUP_ENABLED:'true',STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_ADMIN_MANAGEMENT_ENABLED:'true',
   STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_FRONTLINE_2027_ENABLED:'true',STAGING_FIVE_DEMO_REHEARSAL:'true',
   STAGING_MUSE_AUDITION_ENABLED:'true',STAGING_PROFILE_URLS_ENABLED:'true',
   STAGING_ALLOWED_EMAILS:fixtures.map(row=>row.email).join(','),STAGING_ORGANIZER_EMAILS:mail('organizer'),
   STAGING_REVIEWER_EMAILS:[mail('reviewer'),mail('reviewer-two')].join(','),
   ...(options.publicMember?{STAGING_PUBLIC_SIGNUP_ENABLED:'true',STAGING_EMAIL_PROVIDER:'resend',
    STAGING_RESEND_API_KEY:'re_'+'x'.repeat(32),STAGING_FROM_EMAIL:'verify@mail.example.invalid',STAGING_RESEND_VERIFIED_DOMAIN:'mail.example.invalid'}:{}),
   STAGING_TURNSTILE_SITE_KEY:'0xfictionalstaffchallenge',STAGING_TURNSTILE_SECRET_KEY:'0xfictionalstaffsecret'},
  outboundService:()=>new Response(null,{status:403}),
  serviceBindings:{ASSETS:async request=>{
   const path=new URL(request.url).pathname;
   const item=path==='/'?'/index.html':!extname(path)?path+'.html':path;
   const file=resolve(dist,'.'+item);
   if(!file.startsWith(dist+sep))return new Response(null,{status:404});
   try{return new Response(await readFile(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}})}
   catch{return new Response(null,{status:404})}
  }}
 }]}));
 try{
  const db=await mf.getD1Database('E2E_DB');
  const migrations=join(repo,'backend','migrations');
  const names=(await readdir(migrations)).filter(name=>/^10(?:00|03|04|05|07|09|10|11|12|13|14|15|16|17|18|19)_.*\.sql$/.test(name)).sort();
  for(const name of names){
   const statements=unstable_splitSqlQuery(await readFile(join(migrations,name),'utf8'));
   await db.batch(statements.map(sql=>db.prepare(sql)));
  }
  const now=Date.now()/1000|0;
  const account=(id,email,role)=>db.prepare('INSERT INTO e2e_accounts(id,email_fingerprint,email_hint,role,verified_at,created_at) VALUES(?,?,?,?,?,?)')
   .bind(id,hmac('email:'+email),'fictional-testing',role,now,now);
  const organizer=numericId('a000',1),reviewer=numericId('a000',2),reviewerTwo=numericId('a000',3);
  const staff=[[organizer,'organizer','organizer'],[reviewer,'reviewer','reviewer'],[reviewerTwo,'reviewer-two','reviewer']];
  await db.batch(staff.map(([id,key,role])=>account(id,mail(key),role)));
  for(const item of fixtures){
   const {id,number,region,email,memberId,stageName,phase,demos,language,approved,submittedStatus}=item;
   const title='TEST Song '+number+' / 1',performer='TEST Artist '+number,video=position=>'https://youtu.be/'+String(number).padStart(7,'0')+'TEST'.slice(0,3)+position;
   const rows=[account(memberId,email,'member'),db.prepare('INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,phase,status,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,memberId,phase==='final'?'2027-04':'2027-01','university','bagmati','residence','TEST College',stageName,title,performer,language,'Unknown',video(1),phase,submittedStatus,phase==='demo'?'unpaid':'simulated_paid',now-20+number,now-20+number),
    db.prepare('INSERT INTO e2e_frontline_2027_registration VALUES(?,?,?,?)').bind(id,region,'graduated',now),
    db.prepare('INSERT INTO e2e_application_locations VALUES(?,?,?)').bind(id,region==='A'?'lumbini':'bagmati','TEST Location '+number),
    db.prepare('INSERT INTO e2e_muse_audition_details(application_id,full_name,contact_phone,contact_email,city,street_address,educational_background,short_description,musical_training,updated_at,contact_handle) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
     .bind(id,'TEST Legal Name '+number,'+977 98000000'+String(number).padStart(2,'0'),email,'TEST City '+number,'TEST Street '+number,'TEST Education '+number,'TEST Description '+number,'TEST Training '+number,now,'test-handle-'+number)];
   if(number===3)rows.push(db.prepare('INSERT INTO e2e_application_profiles(application_id,gender,photo_url_1,consent_at,updated_at) VALUES(?,?,?,?,?)')
    .bind(id,'prefer_not_say','https://example.invalid/fictional-profile-03.jpg',now,now));
   if(approved)rows.push(db.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,?)').bind(id,organizer,now));
   if(phase==='demo')for(let position=1;position<=demos;position++){
    rows.push(db.prepare('INSERT INTO e2e_demo_2027_videos VALUES(?,?,?,?,?,?,?)')
     .bind(id,position,'TEST Song '+number+' / '+position,performer,language,video(position),now));
   }
   await db.batch(rows);
  }
  await db.batch([...staff.map(([id,key])=>[id,key,true]),[fixtures[0].memberId,'member',false]].map(([id,key,isStaff])=>
   db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').bind(hmac((isStaff?'staff-session:':'session:')+tokens[key]),id,now+5400,now)));
  // A verified public member is intentionally NOT in STAGING_ALLOWED_EMAILS.
  // Seed only its identity proof/session, never a CAPTCHA or OTP bypass route.
  const publicMemberId=numericId('9000',21);
  if(options.publicMember)await db.batch([
   account(publicMemberId,mail('public-member'),'member'),
   db.prepare('INSERT INTO e2e_public_signup_accounts VALUES(?,?)').bind(publicMemberId,hmac('mailbox:'+mail('public-member'))),
   db.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').bind(hmac('session:'+tokens['public-member']),publicMemberId,now+5400,now)
  ]);
  const origin=(await mf.ready).origin;
  async function fetchFor(role,path,body){
   const headers={Origin:origin};
   if(tokens[role])headers.Cookie='__Host-ghv-e2e='+tokens[role];
   if(body)headers['Content-Type']='application/json';
   const result=await fetch(origin+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
   return {status:result.status,cache:result.headers.get('Cache-Control'),data:await result.json()};
  }
  async function injectContext(browser,role,options={}){
   const context=await browser.newContext(options);
   if(tokens[role])await context.addCookies([{name:'__Host-ghv-e2e',value:tokens[role],domain:'127.0.0.1',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
   // Requests from page code must stay on the disposable worker. The Worker itself denies outbound.
   await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   return context;
  }
  return {origin,db,fetchFor,injectContext,migrations:names,reviewer,publicMemberId,close:async()=>{await mf.dispose();await removeState()}};
 }catch(error){await mf.dispose();await removeState();throw error;}
}

export async function checkCore(runtime){
 const {fetchFor,db,reviewer}=runtime;
 const organizer=await fetchFor('organizer','/api/e2e/organizer-queue');
 assert.equal(organizer.status,200);
 assert.equal(organizer.data.applications.length,20);
 assert.equal(organizer.data.applications.filter(row=>row.stage_name==='TEST Same stage name').length,2);
 assert.equal(organizer.data.applications.some(row=>row.contact_phone||row.contact_email||row.full_name),false);
 const sizes=Object.fromEntries([1,3,5].map(n=>[n,organizer.data.applications.filter(row=>row.demo_entries?.length===n).length]));
 for(const n of [1,3,5])assert(sizes[n]>0);
 const demo=fixtures[2],qualifier=fixtures[18],final=fixtures[19],contactPath='/api/e2e/organizer-contact?id='+demo.id;
 for(const [role,status] of [['reviewer',403],['member',403],['guest',401]])assert.equal((await fetchFor(role,contactPath)).status,status);
 // The old no-section route cannot return all personal fields without a section.
 const unscoped=await fetchFor('organizer',contactPath);
 assert.equal(unscoped.status,422);
 assert.equal(unscoped.data.contact,undefined);
 const contact=await fetchFor('organizer',contactPath+'&section=identity');
 assert.equal(contact.status,200);
 assert.match(contact.cache,/no-store/);
 assert.equal(contact.data.contact.full_name,'TEST Legal Name 3');
 const scopes={
  identity:['full_name'],contact:['contact_email','contact_handle','contact_phone'],
  address:['city','street_address'],background:['educational_background','musical_training','short_description']
 };
 for(const [section,keys] of Object.entries(scopes)){
  const response=await fetchFor('organizer',contactPath+'&section='+section);
  assert.equal(response.status,200);
  assert.match(response.cache,/no-store/);
  assert.deepEqual(Object.keys(response.data.contact).sort(),keys);
 }
 assert.equal((await fetchFor('reviewer',contactPath+'&section=contact')).status,403);
 const history=(await fetchFor('organizer','/api/e2e/organizer-registration-audit?id='+demo.id)).data.events;
 assert(history.some(x=>x.diff?.section==='identity'&&x.result==='success'));
 assert(history.some(x=>x.diff?.section==='contact'&&x.result==='success'));
 assert.doesNotMatch(JSON.stringify(history),/TEST Legal Name|example\.invalid|98000000/);
 const auditCounts=(await db.prepare("SELECT result,COUNT(*) AS n FROM e2e_staff_audit WHERE json_extract(diff,'$.access')='organizer_contact' GROUP BY result ORDER BY result").all()).results;
 assert(auditCounts.some(x=>x.result==='denied'&&x.n>=1));
 assert(auditCounts.some(x=>x.result==='success'&&x.n>=4));
 const search='/api/e2e/organizer-registrations?state=all&q='+encodeURIComponent(fixtures[0].id);
 const action='/api/e2e/organizer-registration-action';
 const safeId=fixtures[0].id;
 let row=(await fetchFor('organizer',search)).data.registrations[0];
 for(const state of ['disable','restore','delete','restore']){
  const before={id:safeId,version:row.version,updated_at:row.updated_at,action:state};
  const actual=await fetchFor('organizer',action,before);
  assert.equal(actual.status,200);
  row=actual.data.registration;
  assert.equal(row.state,({disable:'disabled',delete:'deleted',restore:'active'})[state]);
 }
 const persisted=await db.prepare('SELECT state,version,protected FROM e2e_admin_registrations WHERE id=?').bind(safeId).first();
 assert.deepEqual(persisted,{state:'active',version:4,protected:0});
 assert.equal((await fetchFor('member',search)).status,403);

 const queue=(await fetchFor('reviewer','/api/e2e/reviewer-queue')).data.queue;
 assert.equal(queue.find(row=>row.id===demo.id).demo_entries.length,5);
 assert.equal(queue.some(row=>row.contact_phone||row.contact_email||row.full_name),false);
 assert.equal(queue.some(row=>row.id===fixtures[6].id),false);
 const perVideo={application_id:demo.id,position:2,technique:54,interpretation:38,no_conflict:true};
 assert.equal((await fetchFor('organizer','/api/e2e/january-video-score',perVideo)).status,403);
 assert.equal((await fetchFor('reviewer','/api/e2e/january-video-score',{...perVideo,technique:61})).status,422);
 assert.equal((await fetchFor('reviewer','/api/e2e/january-video-score',perVideo)).status,201);
 assert.equal((await fetchFor('reviewer','/api/e2e/january-video-score',{...perVideo,technique:1})).status,409);
 const fresh=(await fetchFor('reviewer','/api/e2e/reviewer-queue')).data.queue.find(row=>row.id===demo.id);
 assert.deepEqual(fresh.demo_entries[1].my_score,{technique:54,interpretation:38});
 assert.equal(fresh.demo_entries[0].my_score,undefined);
 assert.equal((await fetchFor('reviewer-two','/api/e2e/reviewer-queue')).data.queue.find(row=>row.id===demo.id).demo_entries[1].my_score,undefined);
 const demoRows=(await db.prepare('SELECT application_id,position,reviewer_id,technique,interpretation FROM e2e_demo_2027_scores').all()).results;
 assert.deepEqual(demoRows,[{application_id:demo.id,position:2,reviewer_id:reviewer,technique:54,interpretation:38}]);
 for(const fixture of [qualifier,final]){
  const expected={application_id:fixture.id,phase:fixture.phase,technique:38,interpretation:28,stage_presence:16,appearance:9,no_conflict:true};
  assert.equal((await fetchFor('reviewer','/api/e2e/score',{...expected,technique:41})).status,422);
  assert.equal((await fetchFor('reviewer','/api/e2e/score',{...expected,phase:'demo'})).status,409);
  assert.equal((await fetchFor('reviewer','/api/e2e/score',expected)).status,200);
  const readback=(await fetchFor('reviewer','/api/e2e/reviewer-queue')).data.queue.find(row=>row.id===fixture.id);
  assert.equal(readback.live_technique,38);
  assert.equal(readback.live_interpretation,28);
  assert.equal(readback.stage_presence,16);
  assert.equal(readback.appearance,9);
 }
 const liveRows=(await db.prepare('SELECT stage,technique,interpretation,stage_presence,appearance FROM e2e_live_scores ORDER BY stage').all()).results;
 assert.deepEqual(liveRows,['final','qualifier'].map(stage=>({stage,technique:38,interpretation:28,stage_presence:16,appearance:9})));
 return {result:'PASS',environment:'Cloudflare workerd with disposable local D1',organizerEntries:20,reviewerEntries:queue.length,demoSizes:sizes,sameNameRows:2,
  contactAuthorization:'organizer only; no-store; no private fields in queues',demoScoreRows:demoRows.length,liveStageRows:liveRows.length,deniedDuplicate:true,reviewerOwnership:true,
  entriesRedacted:true,contactScopes:Object.keys(scopes).length,auditCounts,managedChangesPersisted:persisted.version};
}
