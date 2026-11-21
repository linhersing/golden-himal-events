// Closed fictional rehearsal. No brand Worker imports this module.
// PR150 reviewed: retain independent eligibility, server-side human checks,
// strict origin, throttling, unique ballots and atomic audit; no blind merge.
import {rankFinal} from './frontline-stage-rules.js';
const fail=message=>{throw Error(message)},id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);
const encoder=new TextEncoder();
export async function voteHash(value,secret){
 if(typeof secret!=='string'||secret.length<32)fail('vote_not_configured');
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const uuid=()=>crypto.randomUUID();
async function credential(db,value,secret){
 if(typeof value!=='string'||!/^[a-f0-9]{96}$/.test(value))fail('invalid_credential');
 return await db.prepare('SELECT * FROM vote_test_eligibility WHERE credential_hash=?').bind(await voteHash('credential:'+value,secret)).first()||fail('ineligible');
}
const activeSql=`SELECT b.* FROM vote_test_ballots b JOIN vote_test_eligibility e ON e.id=b.eligibility_id
 WHERE e.revoked=0 AND COALESCE((SELECT verdict FROM vote_test_decisions d WHERE d.receipt=b.receipt ORDER BY seq DESC LIMIT 1),'reinstate')='reinstate'`;
async function result(db){
 const round=await db.prepare("SELECT * FROM stage_test_rounds WHERE code='final'").first();
 if(!round||round.status!=='open')fail('final_stage_unavailable');
 const candidates=(await db.prepare('SELECT * FROM vote_test_candidates ORDER BY public_id').all()).results;
 const scores=(await db.prepare("SELECT unit_id,position,judge_id,values_json FROM stage_test_scores WHERE stage='final'").all()).results;
 const votes=(await db.prepare(activeSql).all()).results;
 const counts=Object.fromEntries(candidates.map(c=>[c.application_id,votes.filter(v=>v.candidate_id===c.public_id).length]));
 const entries=candidates.map(c=>({id:c.application_id,region:'A',members:[c.application_id],scores:scores.filter(s=>s.unit_id===c.application_id&&s.position===1).map(s=>({...JSON.parse(s.values_json),judgeId:s.judge_id}))}));
 const ranked=rankFinal(entries,JSON.parse(round.panel),counts);
 if(!ranked.ready)fail(ranked.blockers[0]);
 return {ranked,scoreCount:scores.length,validBallots:votes.length};
}
export async function voteLedger(db,actor,body,options={}){
 const {now=Math.floor(Date.now()/1000),secret,verified=false}=options;
 if(!Number.isSafeInteger(now)||now<0)fail('invalid_time');
 if(!body||typeof body!=='object'||Array.isArray(body))fail('invalid_request');
 if(!await db.prepare("SELECT scope FROM stage_test_scope WHERE scope='FICTIONAL_STAGE_TEST_ONLY'").first())fail('isolated_test_required');
 const operation=body.operation;
 const organizer=actor?.role==='organizer';
 if(!['read','cast','receipt'].includes(operation)&&!organizer)fail('organizer_only');
 if(operation==='initialize'){
  if(await db.prepare('SELECT id FROM vote_test_round').first())fail('already_initialized');
  const members=(await db.prepare("SELECT u.id,u.label,m.application_id FROM stage_test_units u JOIN stage_test_members m ON m.stage=u.stage AND m.unit_id=u.id WHERE u.stage='final' ORDER BY u.id").all()).results;
  if(members.length!==10||new Set(members.map(m=>m.id)).size!==10||members.some(m=>m.id!==m.application_id||!m.label.startsWith('TEST ')))fail('ten_finalists_required');
  const event=uuid(),candidates=members.map(m=>({...m,publicId:crypto.randomUUID().replaceAll('-','').slice(0,12)}));
  await db.batch([db.prepare("INSERT INTO vote_test_round(id,state,last_event) VALUES(1,'draft',?)").bind(event),...candidates.map(m=>db.prepare('INSERT INTO vote_test_candidates(application_id,public_id,public_name,video_url) VALUES(?,?,?,?)').bind(m.id,m.publicId,m.label,'https://example.invalid/TEST/video/'+m.publicId)),db.prepare("INSERT INTO vote_test_audit VALUES(?,?,'initialize','TEST-final',?,?)").bind(event,actor.id,JSON.stringify({fictional:true,candidates:10}),now)]);
  return {ok:true,audit_id:event};
 }
 const round=await db.prepare('SELECT * FROM vote_test_round WHERE id=1').first()||fail('voting_uninitialized');
 if(operation==='read'){
  const candidates=(await db.prepare('SELECT public_id,public_name,video_url,ready FROM vote_test_candidates ORDER BY public_id').all()).results;
  const state={ok:true,testOnly:true,state:round.state,version:round.version,opens_at:round.opens_at,closes_at:round.closes_at,candidates:organizer||round.state!=='draft'?candidates:[]};
  if(organizer){state.actor={id:actor.id,role:actor.role};state.ballots=(await db.prepare('SELECT receipt,candidate_id,cast_at FROM vote_test_ballots ORDER BY cast_at,receipt').all()).results;state.validBallots=(await db.prepare(activeSql).all()).results.length;state.eligibilities=(await db.prepare('SELECT id,revoked FROM vote_test_eligibility ORDER BY id').all()).results;state.result=round.result?JSON.parse(round.result):null;}
  return state;
 }
 if(operation==='receipt'){
  const eligible=await credential(db,body.credential,secret),ballot=await db.prepare('SELECT receipt,candidate_id,cast_at FROM vote_test_ballots WHERE eligibility_id=?').bind(eligible.id).first();
  return {ok:true,receipt:ballot?.receipt||null,candidate_id:ballot?.candidate_id||null};
 }
 if(round.state==='frozen')fail('voting_frozen');
 const event=uuid();
 async function mutate(action,target,detail,sql,statements=[],extraWhere='',extraArgs=[],sqlArgs=[],optimistic=true){
  const response=await db.batch([db.prepare(`UPDATE vote_test_round SET version=version+1,last_event=?,${sql} WHERE id=1 ${optimistic?'AND version=?':''} AND state=? ${extraWhere}`).bind(event,...sqlArgs,...(optimistic?[round.version]:[]),round.state,...extraArgs),...statements.map(s=>s(event)),db.prepare('INSERT INTO vote_test_audit SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM vote_test_round WHERE id=1 AND last_event=?)').bind(event,actor?.id||'credential-holder',action,target,JSON.stringify(detail),now,event)]);
  if(response[0]?.meta?.changes!==1)fail('vote_conflict');
  return {ok:true,audit_id:event,version:round.version+1};
 }
 const scoped=(sql,args=[])=>e=>db.prepare(sql+' AND EXISTS(SELECT 1 FROM vote_test_round WHERE id=1 AND last_event=?)').bind(...args,e);
 if(operation==='cast'){
  if(!verified)fail('human_verification_required');
  if(round.state!=='open'||!(round.opens_at<=now&&now<round.closes_at))fail('voting_closed');
  if(!id(body.request_id)||!id(body.candidate_id))fail('invalid_ballot');
  const eligible=await credential(db,body.credential,secret);if(eligible.revoked)fail('ineligible');
  const candidate=await db.prepare('SELECT public_id FROM vote_test_candidates WHERE public_id=? AND ready=1').bind(body.candidate_id).first();if(!candidate)fail('invalid_candidate');
  const prior=await db.prepare('SELECT receipt,request_id,candidate_id FROM vote_test_ballots WHERE eligibility_id=?').bind(eligible.id).first();
  if(prior){if(prior.request_id!==body.request_id)fail('already_voted');if(prior.candidate_id!==body.candidate_id)fail('ballot_conflict');return {ok:true,receipt:prior.receipt,replayed:true};}
  const receipt=uuid(),hash=await voteHash(body.request_id+':'+body.candidate_id,secret);
  const r=await mutate('cast',receipt,{candidate:body.candidate_id},'state=state',[scoped('INSERT INTO vote_test_ballots SELECT ?,?,?,?,?,? WHERE 1=1',[receipt,eligible.id,body.candidate_id,body.request_id,hash,now])],'',[],[],false);
  return {ok:true,audit_id:r.audit_id,receipt};
 }
 if(operation==='issue'){
  if(!['draft','open'].includes(round.state))fail('voting_closed');
  if(typeof body.person_key!=='string'||!/^TEST-person-[a-zA-Z0-9_-]{1,50}$/.test(body.person_key))fail('fictional_person_required');
  if(!id(body.request_id))fail('invalid_request_id');
  const personHash=await voteHash('person:'+body.person_key,secret),delivery=actor.id+':'+body.request_id+':'+personHash;
  // Deterministic, secret-keyed delivery can be recovered by the same issuer and
  // exact request after a lost response. Only its HMAC is stored in D1.
  const token=((await voteHash('delivery-1:'+delivery,secret))+(await voteHash('delivery-2:'+delivery,secret))).slice(0,96);
  const prior=await db.prepare('SELECT * FROM vote_test_eligibility WHERE person_hash=?').bind(personHash).first();
  if(prior){if(prior.issuer_id!==actor.id||prior.issue_request_id!==body.request_id||prior.revoked)fail('already_issued');return {ok:true,audit_id:prior.issue_event,eligibility_id:prior.id,credential:token,replayed:true};}
  const eligibility=uuid(),hash=await voteHash('credential:'+token,secret);
  const r=await mutate('issue',eligibility,{method:'fictional_independent_person'},'state=state',[scoped('INSERT INTO vote_test_eligibility SELECT ?,?,?,?,?,?,0 WHERE 1=1',[eligibility,personHash,hash,actor.id,body.request_id,event])]);
  return {...r,eligibility_id:eligibility,credential:token};
 }
 if(operation==='revoke'){
  if(!id(body.eligibility_id)||!['evidence_review','operator_error','test_duplicate'].includes(body.reason))fail('invalid_decision');
  if(!await db.prepare('SELECT id FROM vote_test_eligibility WHERE id=? AND revoked=0').bind(body.eligibility_id).first())fail('ineligible');
  return mutate('revoke',body.eligibility_id,{reason:body.reason},'state=state',[scoped('UPDATE vote_test_eligibility SET revoked=1 WHERE id=?',[body.eligibility_id])]);
 }
 if(operation==='decide'){
  if(!id(body.receipt)||!['invalidate','reinstate'].includes(body.verdict)||!['evidence_review','operator_error','test_duplicate'].includes(body.reason))fail('invalid_decision');
  if(!await db.prepare('SELECT receipt FROM vote_test_ballots WHERE receipt=?').bind(body.receipt).first())fail('invalid_receipt');
  return mutate('decide',body.receipt,{verdict:body.verdict,reason:body.reason},'state=state',[scoped('INSERT INTO vote_test_decisions(receipt,verdict,reason,event_id) SELECT ?,?,?,? WHERE 1=1',[body.receipt,body.verdict,body.reason,event])]);
 }
 if(body.version!==round.version)fail('stale_vote_version');
 if(operation==='ready'){
  if(round.state!=='draft')fail('voting_closed');
  return mutate('ready','TEST-final',{fictionalVideos:10},'state=state',[scoped('UPDATE vote_test_candidates SET ready=1 WHERE 1=1')]);
 }
 if(operation==='open'){
  if(round.state!=='draft'||(await db.prepare('SELECT COUNT(*) n FROM vote_test_candidates WHERE ready=1').first()).n!==10)fail('videos_not_ready');
  if(!Number.isSafeInteger(body.opens_at)||!Number.isSafeInteger(body.closes_at)||body.opens_at>now||body.closes_at<=now||body.closes_at-body.opens_at>86400)fail('invalid_test_window');
  return mutate('open','TEST-final',{opens_at:body.opens_at,closes_at:body.closes_at},`state='open',opens_at=${body.opens_at},closes_at=${body.closes_at}`);
 }
 if(operation==='close'){
  if(round.state!=='open')fail('voting_closed');
  return mutate('close','TEST-final',{},"state='closed'");
 }
 if(operation==='freeze'){
  if(round.state!=='closed')fail('close_before_freeze');
  const calculated=await result(db),snapshot={...calculated.ranked,validBallots:calculated.validBallots,testOnly:true,closedAt:now},value=JSON.stringify(snapshot);
  // Version guards every ballot/decision/revocation; append-only score count
  // also guards a grade arriving between this read and the transaction.
  const r=await mutate('freeze','TEST-final',{validBallots:calculated.validBallots,grades:calculated.scoreCount},"state='frozen',result="+"?",[
   scoped("UPDATE stage_test_rounds SET status='frozen',result=?,last_event=? WHERE code='final' AND status='open'",[value,event]),
   scoped("INSERT INTO stage_test_audit SELECT ?,?,'organizer',?,'vote-snapshot','final_vote_freeze','final','success',?,? WHERE 1=1",[event,actor.id,event,JSON.stringify({validBallots:calculated.validBallots,scoreCount:calculated.scoreCount}),now])
  ],"AND (SELECT COUNT(*) FROM stage_test_scores WHERE stage='final')=? AND EXISTS(SELECT 1 FROM stage_test_rounds WHERE code='final' AND status='open')",[calculated.scoreCount],[value]);
  return {...r,result:snapshot};
 }
 fail('invalid_operation');
}
