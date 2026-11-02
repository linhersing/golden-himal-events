// Real remote HTTP/D1 acceptance. Credentials stay in memory and never enter output/artifacts.
import assert from 'node:assert/strict';
const expectedRevision=process.env.GHV_EXPECTED_REVISION||process.env.GITHUB_SHA||'';
if(!/^[a-f0-9]{40}$/.test(expectedRevision)){console.log('BLOCKED: an expected revision is required before remote acceptance.');process.exit(2)}
const base='https://golden-himal-voice-preview.linhersing.workers.dev';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function call(path,body,cookie=''){
 const r=await fetch(base+'/api/staging/practice/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 let data;try{data=await r.json()}catch{throw Error('Non-JSON remote response at '+path+' status '+r.status)}
 return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
function ok(result,expected=200){assert.equal(result.status,expected,'Unexpected remote status '+result.status+' / '+(result.data.error||'no-error'));assert.equal(result.data.ok,true);return result;}
let ready=false,buildEvidence=null;
for(let n=0;n<24;n++){
 try{const build=await fetch(base+'/practice-build.json?revision='+expectedRevision,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(build.ok){const info=await build.json();if(info.revision===expectedRevision){buildEvidence=info;if(info.status==='BLOCKED'){console.log('BLOCKED: expected Cloudflare revision provision evidence '+JSON.stringify(info));break}if(info.status==='PASS'){const r=await call('readiness');if(r.status===200&&r.data.ready===true){ready=true;break}}}}}catch{}
 if(n%3===0)console.log('WAITING: Cloudflare practice deployment/schema (not a PASS).');
 await delay(10000);
}
if(!ready){console.log('BLOCKED: remote practice readiness did not become available; no synthetic data created.');process.exitCode=1;}
else{
 let created,adminCookie='',cleaned=false;
 try{
  assert.equal(buildEvidence.revision,expectedRevision);assert.equal(buildEvidence.status,'PASS');console.log('Remote build/provision evidence: '+JSON.stringify(buildEvidence));
  created=ok(await call('create',{synthetic:true}),201);
  const role=id=>created.data.passes.find(p=>p.actor_id===id).pass;
  adminCookie=ok(await call('login',{pass:role('organizer')})).cookie;
  const emptyStats=ok(await call('stats',undefined,adminCookie)).data;
  assert.equal(emptyStats.scope,'single_synthetic_workspace_only');
  assert.equal(emptyStats.stats.application_count,0);
  assert.equal(emptyStats.stats.applicant_count,0);
  assert.equal((await call('stats',undefined,created.cookie)).status,403,'member cannot read organizer counts');
  console.log('PASS: live Cloudflare D1 private organizer stats are initially zero, member access rejected.');
  const row={synthetic:true,stage_name:'TEST HTTP ACCEPTANCE',round_code:'2027-01',category:'community',province:'bagmati',song_title:'TEST SONG',original_artist:'TEST ARTIST',work_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',contact_phone:'+9770000000000',contact_handle:'TEST contact',birth_date:'2000-01-01',affiliation:'TEST occupation',song_language:'Nepali',song_key:'C',priority_ack:true,media_ack:true};
  const invalid=await call('application',{...row,contact_phone:'0966'},created.cookie);
  assert.equal(invalid.status,422);assert.deepEqual(invalid.data.fieldErrors,{contact_phone:'phoneFormat'});
  assert.equal(ok(await call('me',undefined,created.cookie)).data.applications.length,0);
  console.log('PASS: screenshot short phone gives a field-specific422 and writes no application.');
  const saved=ok(await call('application',row,created.cookie),201),id=saved.data.application.id;
  const confirmed=ok(await call('me',undefined,created.cookie)).data.applications.find(a=>a.id===id);
  for(const key of ['stage_name','round_code','category','province','song_title','original_artist','work_url','contact_phone','contact_handle','birth_date','affiliation','song_language','song_key'])assert.equal(confirmed[key],row[key]);
  assert.equal(confirmed.priority_ack,1);assert.equal(confirmed.media_ack,1);
  assert.equal((await call('application',{...row,stage_name:'TEST DUPLICATE MUST NOT OVERWRITE'},created.cookie)).status,409);
  assert.equal(ok(await call('me',undefined,created.cookie)).data.applications[0].stage_name,row.stage_name);
  console.log('PASS: actual saved ID and all submitted fields match a separate cloud readback; duplicate does not overwrite.');
  const requested=ok(await call('supplement-request',{application_id:id,reason:'TEST acceptance manual notice',notified_manually:true},adminCookie),201);
  assert.equal(requested.data.emailSent,false);assert.equal(requested.data.supplement.deadline_at-requested.data.supplement.requested_at,172800);
  assert.equal((await call('supplement-request',{application_id:id,reason:'TEST duplicate',notified_manually:true},adminCookie)).status,409);
  const earlyJudge=ok(await call('login',{pass:role('judge-1')})).cookie;
  assert.equal((await call('score',{application_id:id,phase:'demo',technique:54,interpretation:36,no_conflict:true},earlyJudge)).status,409);
  const corrected={work_url:'https://drive.google.com/file/d/test-remote-correction/view',contact_phone:row.contact_phone,contact_handle:row.contact_handle,affiliation:row.affiliation};
  ok(await call('supplement',{application_id:id,...corrected},created.cookie));
  assert.equal((await call('supplement',{application_id:id,...corrected},created.cookie)).status,409);
  const audit=ok(await call('me',undefined,adminCookie)).data;
  assert.equal(audit.supplements[0].status,'completed');assert.equal(JSON.parse(audit.supplements[0].original_values).work_url,row.work_url);
  assert.equal(audit.applications[0].work_url,corrected.work_url);row.work_url=corrected.work_url;
  console.log('PASS: live D1 manual 48h request, pending judging lock, one correction, immutable before/after readback; no email sent.');
  const counts=ok(await call('stats',undefined,adminCookie)).data;
  assert.equal(counts.stats.applicant_count,1);
  assert.equal(counts.stats.application_count,1);
  assert.equal(counts.stats.january_count,1);
  assert.equal(counts.stats.university_count,0);
  assert.equal(counts.stats.community_count,1);
  assert.equal(counts.stats.bagmati_count,1);
  assert.equal(counts.stats.demo_count,1);
  assert(!JSON.stringify(counts).includes(row.contact_phone));
  console.log('PASS: live D1 organizer read-only stats reflect one submitted synthetic application, no contact data exposed.');
  assert.equal((await call('promote',{application_id:id,phase:'demo'},created.cookie)).status,403);
  ok(await call('logout',{},created.cookie));assert.equal((await call('me',undefined,created.cookie)).status,401);
  const member=ok(await call('login',{pass:role('member-a')})).cookie;
  const me=ok(await call('me',undefined,member));assert.equal(me.data.applications[0].id,id);assert.equal(me.data.applications[0].work_url,row.work_url);
  console.log('PASS: real remote submission, logout/recovery login and same application/link readback; id='+id);
  ok(await call('simulate-fee',{application_id:id},member));
  const voucher=ok(await call('voucher',{application_id:id,eligibility_confirmed:true},adminCookie),201);assert.equal(voucher.data.voucher.redeemable,false);
  const judges=[];for(let i=1;i<=3;i++)judges.push(ok(await call('login',{pass:role('judge-'+i)})).cookie);
  for(const phase of ['demo','qualifier','final']){
   for(let i=0;i<3;i++){
    const b={application_id:id,phase,no_conflict:true,technique:phase==='demo'?54-i*6:36-i*4,interpretation:phase==='demo'?36-i*4:27-i*3,...(phase==='demo'?{}:{stage_presence:18-i*2,appearance:9-i})};
    ok(await call('score',b,judges[i]),201);assert.equal((await call('score',b,judges[i])).status,409);
    const mine=ok(await call('me',undefined,judges[i])).data;assert(mine.scores.every(s=>s.judge_id==='judge-'+(i+1)));assert.equal(mine.applications[0].contact_phone,undefined);
   }
   if(phase!=='final'){ok(await call('promote',{application_id:id,phase},adminCookie));assert.equal((await call('score',{application_id:id,phase,no_conflict:true,technique:1,interpretation:1},judges[0])).status,409);}
  }
  const voter=ok(await call('login',{pass:role('member-b')})).cookie;
  ok(await call('vote',{application_id:id},voter),201);assert.equal((await call('vote',{application_id:id},voter)).status,409);
  const standings=ok(await call('me',undefined,adminCookie)).data.standings;assert.equal(standings[0].judges_mean,80);assert.equal(standings[0].total_score,90.2);
  console.log('PASS: three remote judge identities × three stages, organizer advancement, duplicate/stale protections and51/49 total90.2.');
  const finalStats=ok(await call('stats',undefined,adminCookie)).data.stats;
  assert.equal(finalStats.applicant_count,1);
  assert.equal(finalStats.application_count,1);
  assert.equal(finalStats.finalist_count,1);
  assert.equal(finalStats.mock_fee_count,1);
  assert.equal(finalStats.score_count,9);
  assert.equal(finalStats.vote_count,1);
  assert.equal(finalStats.voucher_count,1);
  console.log('PASS: live D1 metrics capture mock fees, 3 judges x 3 stages, votes, non-redeemable voucher; temporary workspace will be deleted.');
  // Separate April group exercises new admission without replacing legacy checks.
  const attendance=ok(await call('application',{...row,round_code:'2027-04',stage_name:'TEST ATTENDANCE HTTP'},voter),201).data.application.id;
  for(const phase of ['demo','qualifier']){
   for(const judge of judges)ok(await call('score',{application_id:attendance,phase,no_conflict:true,technique:phase==='demo'?54:36,interpretation:phase==='demo'?36:27,...(phase==='demo'?{}:{stage_presence:18,appearance:9})},judge),201);
   const before=Math.floor(Date.now()/1000),published=ok(await call('admission-publish',{source_phase:phase,round_code:'2027-04',category:'community',event_at:before+30*86400,notified_manually:true},adminCookie),201);
   assert.equal(published.data.emailSent,false);assert.equal(published.data.pool.primary_limit,phase==='demo'?25:8);assert.equal(published.data.pool.reserve_limit,phase==='demo'?5:2);
   assert.equal((await call('promote',{application_id:attendance,phase},adminCookie)).status,409);
   const privateView=ok(await call('me',undefined,voter)).data,slot=privateView.admission_slots.find(s=>s.pool_id===published.data.pool.id);
   assert.equal(slot.deadline_at-slot.notified_at,172800);assert(privateView.admission_slots.every(s=>s.application_id===attendance));assert.equal(privateView.tie_ballots.length,0);
   assert.equal((await call('admission-respond',{pool_id:slot.pool_id,application_id:attendance,response:'confirm'},member)).status,404);
   ok(await call('admission-respond',{pool_id:slot.pool_id,application_id:attendance,response:'confirm'},voter));
   ok(await call('admission-respond',{pool_id:slot.pool_id,application_id:attendance,response:'confirm'},voter));
   const readback=ok(await call('me',undefined,voter)).data;assert.equal(readback.applications.find(a=>a.id===attendance).phase,phase==='demo'?'qualifier':'final');assert.equal(readback.admission_slots.find(s=>s.pool_id===slot.pool_id).status,'confirmed');
  }
  console.log('PASS: live D1 Demo25+5 / qualifier8+2 primary48h, owner-only idempotent attendance confirmation, automatic advancement and manual bypass rejection; no email sent.');
 }finally{
  if(created){if(!adminCookie)adminCookie=ok(await call('login',{pass:created.data.passes.find(p=>p.actor_id==='organizer').pass})).cookie;
   const cleanup=ok(await call('cleanup',{confirmation:'DELETE PRACTICE'},adminCookie));cleaned=cleanup.data.deleted_workspace===created.data.actor.workspace_id;
   assert(cleaned);assert.equal((await call('me',undefined,adminCookie)).status,401);
   console.log('PASS: only this HTTP acceptance workspace deleted, credentials revoked; no real records or external files touched.');}
 }
}
