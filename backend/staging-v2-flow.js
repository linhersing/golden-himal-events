import {MUSE_FIELDS,museAuditionReady} from './muse-audition.js';
import {buildStaffWorkbook} from './staff-xlsx.js';
import {profileReady} from './entrant-profile.js';
import {adminManagementReady} from './staging-admin-registration.js';
import {attachJanuaryScores,januaryDemoReady,januaryRoster,submitJanuaryScore} from './january-demo-test.js';
import {attachFiveDemos,fiveDemoReady,fiveDemoRehearsal} from './demo-five-2027.js';
import {approvalColumn,approvalGuard,hasTestApproval,approveTestApplication} from './test-application-approval.js';
import {entrantLocationsReady,entrantLocationFields,entrantLocationJoin} from './entrant-location.js';
import {frontline2027Ready,frontlineJoin} from './frontline-2027.js';
import {supplementColumns,supplementGuard,supplementJoin,supplementState} from './test-video-supplement.js';
import {onlineJudgingPolicy,earlierOnlineJudging,onlineStageAllowed,judgingPhaseGuard} from './online-judging-policy.js';

const workbenchRegionColumn=ready=>ready?',fr.competition_region':',NULL AS competition_region';
const validApplicationId=id=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id||'');
const exportLimit=2000;

async function staffExcel(db,actor,entries,{deny,NOW,uuid,locale}){
 const time=NOW();
 const bytes=buildStaffWorkbook({role:actor.role,entries,exportedAt:time,locale});
 const audit=await db.prepare(`INSERT INTO e2e_staff_audit(id,actor_id,actor_role,target_id,action,result,occurred_at,diff)
  VALUES(?,?,?,NULL,'audit_read','success',?,?)`)
  .bind(uuid(),actor.id,actor.role,time,JSON.stringify({access:'staff_excel_export',entries:entries.length})).run();
 if(audit.meta?.changes!==1)return deny('staff_excel_export_unavailable',503);
 return new Response(bytes,{headers:{
  'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition':`attachment; filename="Golden-Himal-Voice-${actor.role}.xlsx"`,
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
 }});
}

// Alan V2 competition logic, STAGING ONLY. Called only after verified session,
// same-origin checks and configured() gate in staging-e2e.js.
export async function handleV2Route(request,env,a,{json,deny,uuid,NOW,bodyJSON,ownsApplication,attachProfiles,approval=false,supplements=false}){
 const url=new URL(request.url),path=url.pathname,post=request.method==='POST';
 const view=url.searchParams.get('view');
 const organizerExport=path==='/api/e2e/organizer-export'&&post;
 const reviewerExport=path==='/api/e2e/reviewer-export'&&post;
 const excelContext={deny,NOW,uuid,locale:url.searchParams.get('lang')};
 const db=env.DB;
 // Explicit closed rehearsal: link evidence is not identity or payment verification.
 const links=env.STAGING_SUBMISSION_MODE==='links';
 const evidence=links?"p.demo_url IS NOT NULL AND length(trim(p.demo_url))>0":
  "p.eligibility_key IS NOT NULL AND p.receipt_key IS NOT NULL AND (p.media_key IS NOT NULL OR p.demo_url IS NOT NULL)";
 const forbidden=role=>a?.role!==role?deny(role+'_only',403):null;
 const approved=approvalGuard(approval,'p');
 const freeJanuary=approval&&fiveDemoRehearsal(env)&&await fiveDemoReady(env);
 const perVideo=freeJanuary&&await januaryDemoReady(env);
 const context={json,deny,NOW,bodyJSON,ownsApplication};
 if(path==='/api/e2e/january-video-score'&&post){
  if(forbidden('reviewer'))return forbidden('reviewer');
  if(!earlierOnlineJudging(env))return deny('online_judging_frontline_managed',403);
  if(!perVideo)return deny('january_video_scoring_unavailable',503);
  return submitJanuaryScore(request,env,a,context);
 }
 if(path==='/api/e2e/january-test-roster'){
  if(forbidden('organizer'))return forbidden('organizer');
  if(!earlierOnlineJudging(env))return deny('frontline_results_required',409);
  if(!perVideo)return deny('january_video_scoring_unavailable',503);
  return januaryRoster(request,env,a,context);
 }
 const reviewablePayment=freeJanuary
  ? `(p.payment_status='simulated_paid' OR (p.phase='demo' AND p.round_code='2027-01' AND p.payment_status='unpaid'
     AND EXISTS(SELECT 1 FROM e2e_demo_2027_videos v WHERE v.application_id=p.id)))`
  : "p.payment_status='simulated_paid'";
 if(path==='/api/e2e/approve-test-application'&&post&&approval){
  if(forbidden('organizer'))return forbidden('organizer');
  const rosterGuard=perVideo?` AND NOT EXISTS(SELECT 1 FROM e2e_january_demo_test_rosters r
   JOIN e2e_frontline_2027_registration f ON f.competition_region=r.region
   WHERE f.application_id=p.id AND p.round_code='2027-01' AND p.phase='demo')`:'';
  return approveTestApplication(request,db,a,{json,deny,NOW,bodyJSON},supplementGuard(supplements,'p',true)+rosterGuard);
 }
 if(reviewerExport||(path==='/api/e2e/reviewer-queue'&&!post)){
  if(forbidden('reviewer'))return forbidden('reviewer');
  if(reviewerExport&&!await adminManagementReady(env))return deny('staff_excel_export_unavailable',503);
  const workbench=reviewerExport||view==='workbench';
  const id=workbench&&!reviewerExport?url.searchParams.get('id'):null;
  if(id!==null&&!validApplicationId(id))return deny('invalid_application_id',422);
  const frontline=workbench&&await frontline2027Ready(db);
  const r=await db.prepare(`SELECT p.id,p.round_code,p.category,p.stage_name,p.song_title,p.song_language,p.original_artist,p.demo_url,p.phase,
   p.media_key IS NOT NULL AS has_uploaded_file,p.status,p.payment_status,
   d.technique AS demo_technique,d.interpretation AS demo_interpretation,
   l.technique AS live_technique,l.interpretation AS live_interpretation,l.stage_presence,l.appearance${workbench?workbenchRegionColumn(frontline):''}
   FROM e2e_applications p${frontlineJoin(frontline)}
   LEFT JOIN e2e_judge_scores d ON d.application_id=p.id AND d.reviewer_id=?
   LEFT JOIN e2e_live_scores l ON l.application_id=p.id AND l.reviewer_id=? AND l.stage=p.phase
   WHERE ${reviewablePayment} AND ${evidence}${approved}
    AND p.status NOT IN ('withdrawn','rejected')${judgingPhaseGuard(env)}${id?' AND p.id=?':''}
   ORDER BY p.created_at DESC,p.id DESC LIMIT ${reviewerExport?exportLimit+1:500}`).bind(a.id,a.id,...(id?[id]:[])).all();
  const entries=r.results||[];
  if(reviewerExport&&entries.length>exportLimit)return deny('staff_excel_export_too_large',413);
  const queue=await attachFiveDemos(env,workbench?entries:await attachProfiles(env,entries),workbench);
  const ownScores=perVideo?await attachJanuaryScores(env,queue,a.id,reviewerExport):queue;
  if(reviewerExport)return staffExcel(db,a,ownScores,excelContext);
  return json({ok:true,queue:ownScores,judging_policy:onlineJudgingPolicy(env),testOnly:true});
 }
 if(path==='/api/e2e/score'&&post){
  if(forbidden('reviewer'))return forbidden('reviewer');
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  if(b.no_conflict!==true)return deny('conflict_declaration_required',422);
  const app=await db.prepare(`SELECT p.id,p.phase,p.account_id FROM e2e_applications p WHERE p.id=?
   AND ${reviewablePayment} AND ${evidence}${approved}
   AND p.status NOT IN ('withdrawn','rejected')`).bind(b.application_id).first();
  if(!app)return deny('not_reviewable',409);
  if(!onlineStageAllowed(env,app.phase))return deny('online_judging_frontline_managed',403);
  if(await ownsApplication(env,a,app.account_id))return deny('self_review_disallowed',403);
  if(app.phase==='demo'&&await fiveDemoReady(env)){
   const videos=await db.prepare('SELECT COUNT(*) AS n FROM e2e_demo_2027_videos WHERE application_id=?').bind(app.id).first();
   if(Number(videos?.n)>(perVideo?0:1))return deny('per_video_scoring_unavailable',409);
  }
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
 if(organizerExport||(path==='/api/e2e/organizer-queue'&&!post)){
  if(forbidden('organizer'))return forbidden('organizer');
  const locations=await entrantLocationsReady(db);
  const registrationManagement=await adminManagementReady(env);
  const workbench=organizerExport||view==='workbench';
  const frontline=(workbench||view==='profile')&&await frontline2027Ready(db);
  const contacts=organizerExport&&await museAuditionReady(env);
  const profiles=organizerExport&&await profileReady(env);
  if(organizerExport&&(!registrationManagement||(env.STAGING_MUSE_AUDITION_ENABLED==='true'&&!contacts)
    ||(env.STAGING_PROFILE_URLS_ENABLED==='true'&&!profiles))){
   return deny('staff_excel_export_unavailable',503);
  }
  const active=registrationManagement
   ? "NOT EXISTS(SELECT 1 FROM e2e_registration_controls c WHERE c.application_id=p.id AND c.state<>'active')"
   : '1=1';
  if(!organizerExport&&view==='profile'){
   const id=url.searchParams.get('id');
   if(!validApplicationId(id))return deny('invalid_application_id',422);
   const entry=await db.prepare(`SELECT p.id,p.stage_name,p.round_code,p.category,${entrantLocationFields(locations,false)}${workbenchRegionColumn(frontline)}
    FROM e2e_applications p${entrantLocationJoin(locations)}${frontlineJoin(frontline)} WHERE p.id=? AND ${active}`).bind(id).first();
   if(!entry)return deny('application_not_found',404);
   const [profile]=await attachProfiles(env,[entry]);
   const {photo_url_1,photo_url_2,photo_url_3}=profile;
   return json({ok:true,profile:{...entry,photo_url_1,photo_url_2,photo_url_3},testOnly:true});
  }
  const statuses=['pending','supplement','expired','approved','unverified'];
  const filter=workbench&&!organizerExport?url.searchParams.get('status')||'':'';
  const id=workbench&&!organizerExport?url.searchParams.get('id'):null;
  const offset=workbench&&!organizerExport?Number(url.searchParams.get('offset')||0):0;
  if((filter&&!statuses.includes(filter))||(id!==null&&!validApplicationId(id))||
     !Number.isSafeInteger(offset)||offset<0)return deny('invalid_roster_filter',422);
  const reviewState=`CASE (${supplementState(supplements)})
   WHEN 'expired' THEN 'expired' WHEN 'pending' THEN 'supplement'
   ELSE ${approval?`CASE WHEN ${hasTestApproval('p')} THEN 'approved' ELSE 'pending' END`:"'unverified'"} END`;
  const overview=workbench&&!organizerExport&&id===null?await db.prepare(`SELECT COUNT(*) AS total,
   ${statuses.map(state=>`COUNT(CASE WHEN review_state='${state}' THEN 1 END) AS ${state}`).join(',')},
   COUNT(CASE WHEN region='A' THEN 1 END) AS a,
   COUNT(CASE WHEN region='B' THEN 1 END) AS b,COALESCE(SUM(scores),0) AS scores
   FROM (SELECT ${reviewState} AS review_state,${frontline?'fr.competition_region':'NULL'} AS region,
         ${earlierOnlineJudging(env)?`(SELECT COUNT(*) FROM e2e_judge_scores d WHERE d.application_id=p.id)
          +(SELECT COUNT(*) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage=p.phase)`:'0'} AS scores
         FROM e2e_applications p${supplementJoin(supplements)}${frontlineJoin(frontline)} WHERE ${active})`).first():null;
  const exportFields=organizerExport?',p.affiliation,p.song_key,p.created_at'+(frontline?',fr.eligibility_basis':''):'';
  const privateFields=contacts?','+MUSE_FIELDS.map(field=>'m.'+field).join(','):'';
  const profileFields=profiles?',ep.gender,ep.photo_url_1,ep.photo_url_2,ep.photo_url_3,ep.consent_at AS photo_consent_at':'';
  const r=await db.prepare(`SELECT p.id,p.round_code,p.category,p.stage_name,p.song_title,p.song_language,p.original_artist,p.demo_url,p.phase,p.status,p.payment_status,${entrantLocationFields(locations,!workbench||organizerExport)},p.location_basis,
   p.media_key IS NOT NULL AS has_uploaded_file,p.eligibility_key IS NOT NULL AS has_eligibility_file,
   p.receipt_key IS NOT NULL AS has_receipt_file,
   (SELECT COUNT(*) FROM e2e_judge_scores d WHERE d.application_id=p.id) AS demo_judges,
   (SELECT ROUND(AVG(technique+interpretation),2) FROM e2e_judge_scores d WHERE d.application_id=p.id) AS demo_mean,
   (SELECT COUNT(*) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage=p.phase) AS live_judges,
   (SELECT ROUND(AVG(technique+interpretation+stage_presence+appearance),2) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage=p.phase) AS live_mean${approvalColumn(approval)}${supplementColumns(supplements)}${workbench?workbenchRegionColumn(frontline):''}${exportFields}${privateFields}${profileFields}
   FROM e2e_applications p${entrantLocationJoin(locations)}${supplementJoin(supplements)}${frontlineJoin(frontline)}
   ${contacts?'LEFT JOIN e2e_muse_audition_details m ON m.application_id=p.id':''}
   ${profiles?'LEFT JOIN e2e_application_profiles ep ON ep.application_id=p.id':''}
   WHERE ${active}${filter?` AND (${reviewState})=?`:''}${id?' AND p.id=?':''}
   ORDER BY p.created_at ASC,p.id ASC LIMIT ${organizerExport?exportLimit+1:500} OFFSET ?`).bind(...(filter?[filter]:[]),...(id?[id]:[]),offset).all();
  const entries=r.results||[];
  if(organizerExport){
   if(entries.length>exportLimit)return deny('staff_excel_export_too_large',413);
   return staffExcel(db,a,await attachFiveDemos(env,entries,true),excelContext);
  }
  const totals=overview?{total:overview.total,scores:overview.scores,status:Object.fromEntries(statuses.map(state=>[state,overview[state]])),
   regions:{A:overview.a,B:overview.b,other:overview.total-overview.a-overview.b}}:null;
  return json({ok:true,...(totals?{overview:totals}:{}),applications:await attachFiveDemos(env,workbench?entries:await attachProfiles(env,entries),workbench),judging_policy:onlineJudgingPolicy(env),january_roster_enabled:perVideo&&earlierOnlineJudging(env),registration_management_enabled:registrationManagement,contact_storage_enabled:await museAuditionReady(env),testOnly:true});
 }
 if(path==='/api/e2e/organizer-promote'&&post){
  if(forbidden('organizer'))return forbidden('organizer');
  if(!earlierOnlineJudging(env))return deny('frontline_results_required',409);
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  const app=await db.prepare(`SELECT p.id,p.phase,p.round_code,p.category,p.payment_status${approvalColumn(approval)} FROM e2e_applications p WHERE p.id=? AND p.status NOT IN ('withdrawn','rejected')`).bind(b.application_id).first();
  if(!app)return deny('application_not_found',404);
  if(approval&&app.approval_state!=='approved')return deny('test_approval_required',409);
  if(app.round_code==='2027-01'&&app.phase==='demo'&&freeJanuary&&await db.prepare('SELECT 1 FROM e2e_demo_2027_videos WHERE application_id=? LIMIT 1').bind(app.id).first())
   return deny('use_january_test_roster',409);
  const next=app.phase==='demo'?'qualifier':app.phase==='qualifier'?'final':null;
  if(!next||b.to_phase!==next)return deny('invalid_stage_transition',409);
  if(app.payment_status!=='simulated_paid')return deny('mock_payment_required',409);
  const scored=app.phase==='demo'
    ?await db.prepare('SELECT COUNT(*) AS n FROM e2e_judge_scores WHERE application_id=?').bind(app.id).first()
    :await db.prepare('SELECT COUNT(*) AS n FROM e2e_live_scores WHERE application_id=? AND stage=?').bind(app.id,app.phase).first();
  if(Number(scored?.n||0)<3)return deny('three_judges_required_for_test',409);
  try{
   const updated=await db.prepare(`UPDATE e2e_applications SET phase=?,status='shortlisted',updated_at=? WHERE id=? AND phase=? AND status NOT IN ('withdrawn','rejected')${approvalGuard(approval,'e2e_applications')}`)
    .bind(next,NOW(),app.id,app.phase).run();
   if(!updated.meta?.changes)return deny('stale_stage',409);
   await db.prepare('INSERT INTO e2e_promotion_events(id,application_id,organizer_id,from_phase,to_phase,created_at) VALUES(?,?,?,?,?,?)')
    .bind(uuid(),app.id,a.id,app.phase,next,NOW()).run();
  }catch{return deny('quota_reached_or_transition_blocked',409)}
  return json({ok:true,phase:next,official:false,message:'ORGANIZER TEST PROMOTION, NOT OFFICIAL ENTRY'});
 }
 if(path==='/api/e2e/finalists'&&!post){
  if(forbidden('member'))return forbidden('member');
  const r=await db.prepare(`SELECT p.id,p.category,p.round_code,p.stage_name,p.song_title FROM e2e_applications p
   WHERE p.phase='final' AND p.payment_status='simulated_paid' AND p.status NOT IN ('withdrawn','rejected')${approved}
   ORDER BY category,round_code,stage_name`).all();
  return json({ok:true,finalists:r.results||[],testOnly:true});
 }
 if(path==='/api/e2e/test-vote'&&post){
  if(forbidden('member'))return forbidden('member');
  const b=await bodyJSON(request);if(!b)return deny('invalid_json');
  const app=await db.prepare(`SELECT p.id,p.account_id FROM e2e_applications p WHERE p.id=? AND p.phase='final' AND p.payment_status='simulated_paid' AND p.status NOT IN ('withdrawn','rejected')${approved}`)
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
    (SELECT AVG(l.technique+l.interpretation+l.stage_presence+l.appearance)
     FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage='final') AS judges_mean,
    (SELECT COUNT(*) FROM e2e_live_scores l WHERE l.application_id=p.id AND l.stage='final') AS judges_count
    FROM e2e_applications p WHERE p.phase='final' AND p.status NOT IN ('withdrawn','rejected')${approved}
    ORDER BY p.category,p.round_code,p.stage_name`).all();
  const all=rows.results||[],max={university:0,community:0};
  for(const x of all)max[x.category]=Math.max(max[x.category]||0,Number(x.votes));
  return json({ok:true,standings:all.map(x=>{
    const voteScore=max[x.category]?Number(x.votes)/max[x.category]*100:0;
    const judged=x.judges_mean===null?null:Number(x.judges_mean);
    const complete=Number(x.judges_count)>=3;
    return {...x,judges_mean:judged===null?null:Number(judged.toFixed(4)),vote_score:Number(voteScore.toFixed(4)),
     total_score:complete?Number((voteScore*.51+judged*.49).toFixed(2)):null,
     ready:complete,official:false};
   }),weights:{vote:51,judge:49},testOnly:true});
 }
 return null;
}
