// Real remote HTTP/D1 acceptance. Credentials stay in memory and never enter output/artifacts.
import assert from 'node:assert/strict';
const base='https://golden-himal-voice-preview.linhersing.workers.dev';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function call(path,body,cookie=''){
 const r=await fetch(base+'/api/staging/practice/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 let data;try{data=await r.json()}catch{throw Error('Non-JSON remote response at '+path+' status '+r.status)}
 return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
function ok(result,expected=200){assert.equal(result.status,expected,'Unexpected remote status '+result.status+' / '+(result.data.error||'no-error'));assert.equal(result.data.ok,true);return result;}
let ready=false;
for(let n=0;n<24;n++){
 try{const r=await call('readiness');if(r.status===200&&r.data.ready===true){ready=true;break}}catch{}
 if(n%3===0)console.log('WAITING: Cloudflare practice deployment/schema (not a PASS).');
 await delay(10000);
}
if(!ready){console.log('BLOCKED: remote practice readiness did not become available; no synthetic data created.');process.exitCode=1;}
else{
 let created,adminCookie='',cleaned=false;
 try{
  const build=await fetch(base+'/practice-build.json',{signal:AbortSignal.timeout(15000)});if(build.ok){const info=await build.json();console.log('Remote build/provision evidence: '+JSON.stringify(info));}
  created=ok(await call('create',{synthetic:true}),201);
  const role=id=>created.data.passes.find(p=>p.actor_id===id).pass;
  adminCookie=ok(await call('login',{pass:role('organizer')})).cookie;
  const row={synthetic:true,stage_name:'TEST HTTP ACCEPTANCE',round_code:'2027-01',category:'community',province:'bagmati',song_title:'TEST SONG',original_artist:'TEST ARTIST',work_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',contact_phone:'+9770000000000',contact_handle:'TEST contact',birth_date:'2000-01-01',affiliation:'TEST occupation',song_language:'Nepali',song_key:'C',priority_ack:true,media_ack:true};
  const saved=ok(await call('application',row,created.cookie),201),id=saved.data.application.id;
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
 }finally{
  if(created){if(!adminCookie)adminCookie=ok(await call('login',{pass:created.data.passes.find(p=>p.actor_id==='organizer').pass})).cookie;
   const cleanup=ok(await call('cleanup',{confirmation:'DELETE PRACTICE'},adminCookie));cleaned=cleanup.data.deleted_workspace===created.data.actor.workspace_id;
   assert(cleaned);assert.equal((await call('me',undefined,created.cookie)).status,401);
   console.log('PASS: only this HTTP acceptance workspace deleted, credentials revoked; no real records or external files touched.');}
 }
}
