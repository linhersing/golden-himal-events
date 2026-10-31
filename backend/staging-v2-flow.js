// Alan V2 competition logic, STAGING ONLY. Called only after verified session,
// same-origin checks and configured() gate in staging-e2e.js.
export async function handleV2Route(request,env,a,{json,deny,uuid,NOW,bodyJSON}){
 const path=new URL(request.url).pathname,post=request.method==='POST';
 const db=env.DB;
 // Explicit closed rehearsal: link evidence is not identity or payment verification.
 const links=env.STAGING_SUBMISSION_MODE==='links';
 const evidence=links?"p.demo_url IS NOT NULL AND length(trim(p.demo_url))>0":
  "p.eligibility_key IS NOT NULL AND p.receipt_key IS NOT NULL AND (p.media_key IS NOT NULL OR p.demo_url IS NOT NULL)";
 const forbidden=role=>a?.role!==role?deny(role+'_only',403):null;
 if(path==='/api/e2e/reviewer-queue'&&!post){
  if(forbidden('reviewer'))return forbidden('reviewer');
  const r=await db.prepare(`SELECT p.id,p.round_code,p.category,p.stage_name,p.song_title,p.original_artist,p.demo_url,p.phase,
   p.media_key IS NOT NULL AS has_uploaded_file,p.status,p.payment_status,
   d.technique AS demo_technique,d.interpretation AS demo_interpretation,
   l.technique AS live_technique,l.interpretation AS live_interpretation,l.stage_presence,l.appearance
   FROM e2e_applications p
   LEFT JOIN e2e_judge_scores d ON d.application_id=p.id AND d.reviewer_id=?
   LEFT JOIN e2e_live_scores l ON l.application_id=p.id AND l.reviewer_id=? AND l.stage=p.phase
   WHERE p.payment_status='simulated_paid' AND ${evidence}
    AND p.status NOT IN ('withdrawn','rejected')
   ORDER BY p.created_at DESC LIMIT 100`).bind(a.id,a.id).all();
  return json({ok:true,queue:r.results||[],testOnly:true});
 }
 if(path==='/api/e2e/score'&&post){
  if(forbidden('reviewer'))return forbidden('reviewer');
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  if(b.no_conflict!==true)return deny('conflict_declaration_required',422);
  const app=await db.prepare(`SELECT p.id,p.phase FROM e2e_applications p WHERE p.id=?
   AND p.payment_status='simulated_paid' AND ${evidence}
   AND p.status NOT IN ('withdrawn','rejected')`).bind(b.application_id).first();
  if(!app)return deny('not_reviewable',409);
  if(b.phase!==app.phase)return deny('stale_reviewer_stage_reload_required',409);
  const demo=app.phase==='demo',caps=demo?[60,40]:[40,30,20,10];
  const inputs=demo?[b.technique,b.interpretation]:[b.technique,b.interpretation,b.stage_presence,b.appearance];
  if(inputs.some((v,i)=>!Number.isInteger(v)||v<0||v>caps[i]))return deny('invalid_stage_scores',422);
  try{
   if(demo)await db.prepare('INSERT INTO e2e_judge_scores(application_id,reviewer_id,technique,interpretation,conflict_checked,created_at) VALUES(?,?,?,?,1,?)')
    .bind(app.id,a.id,...inputs,NOW()).run();
   else await db.prepare('INSERT INTO e2e_live_scores(application_id,reviewer_id,stage,technique,interpretation,stage_presence,appearance,conflict_checked,created_at) VALUES(?,?,?,?,?,?,?,1,?)')
    .bind(app.id,a.id,app.phase,...inputs,NOW()).run();
  }catch{return deny('already_scored_or_unavailable',409)}
  await db.prepare("UPDATE e2e_applications SET status='scored',updated_at=? WHERE id=? AND phase=? AND status NOT IN ('withdrawn','rejected')")
   .bind(NOW(),app.id,app.phase).run();
  return json({ok:true,phase:app.phase,score:inputs.reduce((x,y)=>x+y,0),storedIn:'cloudflare-d1-staging',official:false});
 }
 if(path==='/api/e2e/organizer-queue'&&!post){
  if(forbidden('organizer'))return forbidden('organizer');
  const r=await db.prepare(`SELECT p.id,p.round_code,p.category,p.stage_name,p.song_title,p.demo_url,p.phase,p.status,p.payment_status,
   p.media_key IS NOT NULL AS has_uploaded_file,p.eligibility_key IS NOT NULL AS has_eligibility_file,
   p.receipt_key IS NOT NULL AS has_receipt_file,
   (SELECT COUNT(*) FROM e2e_judge_scores d WHERE d.application_id=p.id) AS demo_judges,
   (SELECT ROUND(AVG(technique+interpretation),2) FROM e2e_judge_scores d WHERE d.application_id=p.id) AS demo_mean,
   (SELECT COUNT(*) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage=p.phase) AS live_judges,
   (SELECT ROUND(AVG(technique+interpretation+stage_presence+appearance),2) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage=p.phase) AS live_mean
   FROM e2e_applications p ORDER BY p.created_at ASC LIMIT 200`).all();
  return json({ok:true,applications:r.results||[],testOnly:true});
 }
 if(path==='/api/e2e/organizer-promote'&&post){
  if(forbidden('organizer'))return forbidden('organizer');
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  const app=await db.prepare('SELECT id,phase,round_code,category,payment_status FROM e2e_applications WHERE id=?').bind(b.application_id).first();
  if(!app)return deny('application_not_found',404);
  const next=app.phase==='demo'?'qualifier':app.phase==='qualifier'?'final':null;
  if(!next||b.to_phase!==next)return deny('invalid_stage_transition',409);
  if(app.payment_status!=='simulated_paid')return deny('mock_payment_required',409);
  const scored=app.phase==='demo'
    ?await db.prepare('SELECT COUNT(*) AS n FROM e2e_judge_scores WHERE application_id=?').bind(app.id).first()
    :await db.prepare('SELECT COUNT(*) AS n FROM e2e_live_scores WHERE application_id=? AND stage=?').bind(app.id,app.phase).first();
  if(Number(scored?.n||0)<3)return deny('three_judges_required_for_test',409);
  try{
   const updated=await db.prepare("UPDATE e2e_applications SET phase=?,status='shortlisted',updated_at=? WHERE id=? AND phase=?")
    .bind(next,NOW(),app.id,app.phase).run();
   if(!updated.meta?.changes)return deny('stale_stage',409);
   await db.prepare('INSERT INTO e2e_promotion_events(id,application_id,organizer_id,from_phase,to_phase,created_at) VALUES(?,?,?,?,?,?)')
    .bind(uuid(),app.id,a.id,app.phase,next,NOW()).run();
  }catch{return deny('quota_reached_or_transition_blocked',409)}
  return json({ok:true,phase:next,official:false,message:'ORGANIZER TEST PROMOTION, NOT OFFICIAL ENTRY'});
 }
 if(path==='/api/e2e/finalists'&&!post){
  if(forbidden('member'))return forbidden('member');
  const r=await db.prepare(`SELECT id,category,round_code,stage_name,song_title FROM e2e_applications
   WHERE phase='final' AND payment_status='simulated_paid' AND status NOT IN ('withdrawn','rejected')
   ORDER BY category,round_code,stage_name`).all();
  return json({ok:true,finalists:r.results||[],testOnly:true});
 }
 if(path==='/api/e2e/test-vote'&&post){
  if(forbidden('member'))return forbidden('member');
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  const app=await db.prepare("SELECT id,account_id FROM e2e_applications WHERE id=? AND phase='final' AND payment_status='simulated_paid' AND status NOT IN ('withdrawn','rejected')")
   .bind(b.application_id).first();
  if(!app)return deny('not_test_finalist',404);
  if(app.account_id===a.id)return deny('test_self_vote_disallowed',403);
  try{await db.prepare('INSERT INTO e2e_final_votes(voter_id,application_id,created_at) VALUES(?,?,?)')
   .bind(a.id,app.id,NOW()).run()}
  catch{return deny('already_voted_in_test_season',409)}
  return json({ok:true,official:false,storedIn:'cloudflare-d1-staging'});
 }
 if(path==='/api/e2e/standings'&&!post){
  if(forbidden('organizer'))return forbidden('organizer');
  const rows=await db.prepare(`SELECT p.id,p.category,p.round_code,p.stage_name,
    (SELECT COUNT(*) FROM e2e_final_votes v WHERE v.application_id=p.id) AS votes,
    (SELECT ROUND(AVG(l.technique+l.interpretation+l.stage_presence+l.appearance),4)
     FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage='final') AS judges_mean,
    (SELECT COUNT(*) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage='final') AS judges_count
    FROM e2e_applications p WHERE p.phase='final' AND p.status NOT IN ('withdrawn','rejected')
    ORDER BY p.category,p.round_code,p.stage_name`).all();
  const all=rows.results||[],max={university:0,community:0};
  for(const x of all)max[x.category]=Math.max(max[x.category]||0,Number(x.votes));
  return json({ok:true,standings:all.map(x=>{
    const voteScore=max[x.category]?Number(x.votes)/max[x.category]*100:0;
    const judged=x.judges_mean===null?null:Number(x.judges_mean);
    const complete=Number(x.judges_count)>=3;
    return {...x,vote_score:Number(voteScore.toFixed(4)),
     total_score:complete?Number((voteScore*.51+judged*.49).toFixed(2)):null,
     ready:complete,official:false};
   }),weights:{vote:51,judge:49},testOnly:true});
 }
 return null;
}
