/* 2026-11-17 · TEST correction workflow for scored/locked applications.
 * Staff may accept changes to stage/affiliation display ONLY. Never alter songs,
 * performance URLs, grades, promotions, payment status or old TEST snapshots.
 * All operations require a server-authenticated session, private D1, and an
 * explicitly installed additive migration. Missing tables fail closed.
 */
const TABLE='e2e_member_correction_requests';
export async function correctionReady(db){
 try{return Boolean((await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(TABLE).first())?.name)}
 catch{return false}
}
const memberView="id,application_id,proposed_stage_name,proposed_affiliation,reason,state,created_at,reviewed_at";
export async function handleCorrectionRoute(request,env,account,{json,deny,bodyJSON,uuid,NOW}){
 const path=new URL(request.url).pathname,db=env.DB,isPost=request.method==='POST';
 const paths=['/api/e2e/member-corrections','/api/e2e/request-member-correction','/api/e2e/organizer-corrections','/api/e2e/decide-member-correction'];
 if(!paths.includes(path))return null;
 if(!await correctionReady(db)){
  if(!isPost)return json({ok:true,enabled:false,requests:[],testOnly:true});
  return deny('correction_schema_pending',503);
 }
 if(path==='/api/e2e/member-corrections'&&!isPost){
  if(account.role!=='member')return deny('member_only',403);
  const result=await db.prepare('SELECT '+memberView+' FROM '+TABLE+' WHERE account_id=? ORDER BY created_at DESC LIMIT 30').bind(account.id).all();
  return json({ok:true,enabled:true,requests:result.results||[],testOnly:true});
 }
 if(path==='/api/e2e/request-member-correction'&&isPost){
  if(account.role!=='member')return deny('member_only',403);
  const b=await bodyJSON(request,1800);
  if(!b||Object.keys(b).some(k=>!['application_id','stage_name','affiliation','reason'].includes(k)))return deny('correction_invalid_input',422);
  const id=String(b.application_id||'').trim();
  const stage=String(b.stage_name||'').trim(),affiliation=String(b.affiliation||'').trim(),reason=String(b.reason||'').trim();
  if(!id||stage.length<2||stage.length>60||!affiliation||affiliation.length>100||reason.length<8||reason.length>400)return deny('correction_invalid_input',422);
  const app=await db.prepare("SELECT id,stage_name,affiliation,phase,status FROM e2e_applications WHERE id=? AND account_id=?").bind(id,account.id).first();
  if(!app)return deny('application_not_found',404);
  // If no score/review exists, the normal member edit flow must be used.
  const hasScore=await db.prepare("SELECT (SELECT COUNT(*) FROM e2e_judge_scores WHERE application_id=?) + (SELECT COUNT(*) FROM e2e_live_scores WHERE application_id=?) + (SELECT COUNT(*) FROM e2e_promotion_events WHERE application_id=?) AS n")
   .bind(id,id,id).first();
  if(Number(hasScore?.n||0)===0&&['submitted','under_review'].includes(app.status)&&app.phase==='demo')return deny('correction_use_normal_edit',409);
  if(stage===app.stage_name&&affiliation===app.affiliation)return deny('correction_nothing_changed',422);
  const rid=uuid(),when=NOW();
  try{
   if(typeof db.batch!=='function')return deny('correction_transaction_unavailable',503);
   await db.batch([
    db.prepare('INSERT INTO '+TABLE+' (id,application_id,account_id,previous_stage_name,previous_affiliation,proposed_stage_name,proposed_affiliation,reason,state,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
     .bind(rid,id,account.id,app.stage_name,app.affiliation,stage,affiliation,reason,'pending',when),
    db.prepare('INSERT INTO e2e_member_correction_audit(id,correction_id,actor_account_id,action,occurred_at) VALUES(?,?,?,?,?)')
     .bind(uuid(),rid,account.id,'requested',when)
   ]);
  }catch{return deny('correction_pending_or_database_error',409)}
  const saved=await db.prepare('SELECT '+memberView+' FROM '+TABLE+' WHERE id=? AND account_id=?').bind(rid,account.id).first();
  if(!saved)return deny('correction_readback_failed',503);
  return json({ok:true,request:saved,testOnly:true},201);
 }
 if(path==='/api/e2e/organizer-corrections'&&!isPost){
  if(account.role!=='organizer')return deny('organizer_only',403);
  const result=await db.prepare('SELECT c.id,c.application_id,c.proposed_stage_name,c.proposed_affiliation,c.previous_stage_name,c.previous_affiliation,c.reason,c.state,c.created_at,c.reviewed_at,p.round_code,p.phase,p.status AS application_status FROM '+TABLE+' c JOIN e2e_applications p ON p.id=c.application_id ORDER BY CASE WHEN c.state=\'pending\' THEN 0 ELSE 1 END,c.created_at DESC LIMIT 50').all();
  return json({ok:true,enabled:true,requests:result.results||[],testOnly:true});
 }
 if(path==='/api/e2e/decide-member-correction'&&isPost){
  if(account.role!=='organizer')return deny('organizer_only',403);
  const b=await bodyJSON(request,600);
  if(!b||Object.keys(b).some(k=>!['request_id','decision'].includes(k))||!['accepted','declined'].includes(b.decision))return deny('correction_invalid_input',422);
  const rid=String(b.request_id||'').trim(),decision=b.decision;
  const req=await db.prepare('SELECT id,application_id,proposed_stage_name,proposed_affiliation,state FROM '+TABLE+' WHERE id=?').bind(rid).first();
  if(!req)return deny('correction_not_found',404);
  if(req.state!=='pending')return deny('correction_already_decided',409);
  const when=NOW();
  try{
   if(typeof db.batch!=='function')return deny('correction_transaction_unavailable',503);
   const mutations=[
    db.prepare('UPDATE '+TABLE+' SET state=?,reviewed_at=?,reviewed_by=? WHERE id=? AND state=\'pending\'')
     .bind(decision,when,account.id,rid)
   ];
   if(decision==='accepted')mutations.push(
    db.prepare("UPDATE e2e_applications SET stage_name=?,affiliation=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM "+TABLE+" WHERE id=? AND state='accepted' AND reviewed_by=?)")
     .bind(req.proposed_stage_name,req.proposed_affiliation,when,req.application_id,rid,account.id)
   );
   mutations.push(db.prepare("INSERT INTO e2e_member_correction_audit(id,correction_id,actor_account_id,action,occurred_at) SELECT ?,id,?, ?,? FROM "+TABLE+" WHERE id=? AND state=? AND reviewed_by=?")
    .bind(uuid(),account.id,decision,when,rid,decision,account.id));
   const results=await db.batch(mutations);
   if(Number(results?.[0]?.meta?.changes||0)!==1||Number(results?.at(-1)?.meta?.changes||0)!==1)return deny('correction_concurrent_change',409);
  }catch{return deny('correction_already_decided_or_unavailable',409)}
  const saved=await db.prepare('SELECT state,reviewed_at FROM '+TABLE+' WHERE id=?').bind(rid).first();
  if(saved?.state!==decision)return deny('correction_readback_failed',503);
  return json({ok:true,request_id:rid,decision:saved.state,reviewed_at:saved.reviewed_at,testOnly:true});
 }
 return deny('method_not_allowed',405);
}
