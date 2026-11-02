import {practiceRankings,comparePracticeRankings} from './practice-ranking.js';
const time=()=>Math.floor(Date.now()/1000);
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
const fingerprint=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const judges=['judge-1','judge-2','judge-3'];
function validOrder(order,ids){return Array.isArray(order)&&order.length===ids.length&&new Set(order).size===ids.length&&order.every(id=>ids.includes(id));}
async function context(db,ws){
 const applications=await all(db,'SELECT id,actor_id,stage_name,phase,round_code,category FROM ghv_practice_applications WHERE workspace_id=? ORDER BY id',ws);
 const scores=await all(db,'SELECT application_id,judge_id,phase,technique,interpretation,stage_presence,appearance,recused FROM ghv_practice_scores WHERE workspace_id=? ORDER BY application_id,phase,judge_id',ws);
 const votes=await all(db,'SELECT application_id,COUNT(*) AS n FROM ghv_practice_votes WHERE workspace_id=? GROUP BY application_id',ws);
 const ballots=await all(db,'SELECT id,tie_key,source_phase,round_code,category,judge_id,ordering_json,created_at FROM ghv_practice_tie_ballots WHERE workspace_id=? ORDER BY id',ws);
 const pools=await all(db,'SELECT * FROM ghv_practice_admission_pools WHERE workspace_id=? ORDER BY published_at,id',ws);
 const rankings=practiceRankings(applications,scores,votes),ties=[];
 for(let start=0;start<rankings.length;){
  let end=start+1;const first=rankings[start];while(end<rankings.length&&rankings[end].group_key===first.group_key&&first.ready&&comparePracticeRankings(first,rankings[end])===0)end++;
  const cohort=rankings.slice(start,end);if(first.ready&&cohort.length>1){
   const ids=cohort.map(x=>x.id).sort(),panel=scores.filter(s=>ids.includes(s.application_id)&&s.phase===first.phase);
   const key=await fingerprint(JSON.stringify([first.group_key,ids,panel,first.phase==='final'?votes.filter(v=>ids.includes(v.application_id)):[]]));
   const latest=new Map();for(const b of ballots.filter(b=>b.tie_key===key))latest.set(b.judge_id,b);
   const conflict=panel.some(s=>s.recused),counts=new Map();
   for(const judge of judges){const vote=latest.get(judge);if(!vote)continue;let order;try{order=JSON.parse(vote.ordering_json)}catch{continue}if(validOrder(order,ids))counts.set(JSON.stringify(order),(counts.get(JSON.stringify(order))||0)+1);}
   const consensus=!conflict&&judges.every(j=>latest.has(j))?[...counts].find(([,n])=>n>=2)?.[0]:null;
   const round=first.phase==='final'?'all':first.round_code;
   const locked=pools.some(p=>p.source_phase===first.phase&&p.round_code===round&&p.category===first.category);
   const tie={tie_key:key,source_phase:first.phase,round_code:round,category:first.category,candidates:cohort.map(x=>({id:x.id,stage_name:x.stage_name})),ballots_count:judges.filter(j=>latest.has(j)).length,resolved:!!consensus,conflict,locked};
   if(consensus){const baseRank=first.rank,byId=new Map(cohort.map(r=>[r.id,r]));const ordered=JSON.parse(consensus).map(id=>byId.get(id));ordered.forEach((r,i)=>{r.rank=baseRank+i;r.tie_pending=false;r.named_decision=true});rankings.splice(start,cohort.length,...ordered);}
   ties.push(tie);
  }start=end;
 }
 return {applications,scores,ballots,pools,rankings,ties};
}
export async function reconcileAdmissions(db,workspaceId){
 const pools=await all(db,'SELECT p.* FROM ghv_practice_admission_pools p JOIN ghv_practice_workspaces w ON w.id=p.workspace_id WHERE w.expires_at>unixepoch()'+(workspaceId?' AND p.workspace_id=?':''),...(workspaceId?[workspaceId]:[]));
 for(const p of pools){
  await db.prepare("UPDATE ghv_practice_admission_slots SET status='expired',response_at=unixepoch() WHERE pool_id=? AND status='offered' AND deadline_at<=unixepoch()").bind(p.id).run();
  for(let n=0;n<p.target_count;n++){
   const next=await db.prepare("SELECT application_id FROM ghv_practice_admission_slots WHERE pool_id=? AND status='waiting' ORDER BY merit_order LIMIT 1").bind(p.id).first();if(!next)break;
   try{const r=await db.prepare("UPDATE ghv_practice_admission_slots SET status='awaiting_notice' WHERE pool_id=? AND application_id=? AND status='waiting' AND EXISTS(SELECT 1 FROM ghv_practice_admission_pools p WHERE p.id=? AND unixepoch()+86400<=p.lock_at AND (SELECT COUNT(*) FROM ghv_practice_admission_slots s WHERE s.pool_id=p.id AND s.status IN ('offered','awaiting_notice','confirmed'))<p.target_count)").bind(p.id,next.application_id,p.id).run();if(!r.meta?.changes)break;}catch(e){if(String(e.message).includes('admission_transition_locked'))break;throw e}
  }
 }
 return {processed_pools:pools.length};
}
export async function admissionView(db,actor){
 const c=await context(db,actor.workspace_id),own=new Set(c.applications.filter(a=>a.actor_id===actor.actor_id).map(a=>a.id));
 const slots=await all(db,'SELECT * FROM ghv_practice_admission_slots WHERE workspace_id=? ORDER BY pool_id,merit_order',actor.workspace_id);
 const visible=actor.role==='organizer'?slots:actor.role==='member'?slots.filter(s=>own.has(s.application_id)):[];
 const poolIds=new Set(visible.map(s=>s.pool_id));
 return {
  admission_pools:c.pools.filter(p=>actor.role==='organizer'||poolIds.has(p.id)).map(p=>({id:p.id,source_phase:p.source_phase,round_code:p.round_code,category:p.category,primary_limit:p.primary_limit,reserve_limit:p.reserve_limit,target_count:p.target_count,published_at:p.published_at,event_at:p.event_at,lock_at:p.lock_at,locked:time()>=p.lock_at})),
  admission_slots:visible,
  admission_ties:actor.role==='member'?[]:c.ties,
  tie_ballots:actor.role==='organizer'?c.ballots:actor.role==='judge'?c.ballots.filter(b=>b.judge_id===actor.actor_id):[],
  resolved_rankings:actor.role==='organizer'?c.rankings:[]
 };
}
export async function handleAdmission(path,body,db,a,{reply,deny}){
 const ws=a.workspace_id;
 if(path==='tie-ballot'){
  if(a.role!=='judge'||!judges.includes(a.actor_id))return deny('judge_only',403);
  if(Object.keys(body).some(k=>!['tie_key','order'].includes(k)))return deny('invalid_tie_order',422);
  const c=await context(db,ws),tie=c.ties.find(t=>t.tie_key===body.tie_key);if(!tie)return deny('stale_tie',409);if(tie.locked||tie.conflict)return deny('tie_decision_locked',409);
  if(!validOrder(body.order,tie.candidates.map(x=>x.id)))return deny('invalid_tie_order',422);
  try{await db.prepare('INSERT INTO ghv_practice_tie_ballots(workspace_id,tie_key,source_phase,round_code,category,judge_id,ordering_json,created_at) VALUES(?,?,?,?,?,?,?,unixepoch())').bind(ws,tie.tie_key,tie.source_phase,tie.round_code,tie.category,a.actor_id,JSON.stringify(body.order)).run()}catch{return deny('tie_decision_locked',409)}
  return reply({ok:true},201);
 }
 if(path==='admission-publish'){
  if(a.role!=='organizer')return deny('organizer_only',403);
  const keys=['source_phase','round_code','category','event_at','notified_manually'];
  if(Object.keys(body).some(k=>!keys.includes(k))||!['demo','qualifier'].includes(body.source_phase)||!['2027-01','2027-04'].includes(body.round_code)||!['university','community'].includes(body.category)||body.notified_manually!==true||!Number.isSafeInteger(body.event_at)||body.event_at>time()+730*86400)return deny('invalid_admission_publication',422);
  const lock=body.event_at-(body.source_phase==='qualifier'?7*86400:0);if(time()+172800>lock)return deny('admission_full_window_required',422);
  const c=await context(db,ws),apps=c.applications.filter(x=>x.phase===body.source_phase&&x.round_code===body.round_code&&x.category===body.category&&!c.applications.some(f=>f.actor_id===x.actor_id&&f.phase==='final'&&f.id!==x.id));
  if(c.pools.some(p=>p.source_phase===body.source_phase&&p.round_code===body.round_code&&p.category===body.category))return deny('admission_already_published',409);
  if(!apps.length)return deny('admission_no_candidates',422);
  const ids=new Set(apps.map(x=>x.id)),ranked=c.rankings.filter(r=>ids.has(r.id));
  const incomplete=await db.prepare('SELECT COUNT(*) n FROM ghv_practice_supplements WHERE workspace_id=? AND completed_at IS NULL AND application_id IN (SELECT id FROM ghv_practice_applications WHERE workspace_id=? AND phase=? AND round_code=? AND category=?)').bind(ws,ws,body.source_phase,body.round_code,body.category).first();
  if(ranked.some(r=>!r.ready||r.tie_pending)||Number(incomplete.n)>0)return deny('admission_scores_or_ties_pending',409);
  const limit=body.source_phase==='demo'?25:8,reserve=body.source_phase==='demo'?5:2,target=Math.min(limit,ranked.length),id=crypto.randomUUID();
  const revision=Math.max(0,...c.ballots.filter(b=>b.source_phase===body.source_phase&&b.round_code===body.round_code&&b.category===body.category).map(b=>b.id));
  const commands=[db.prepare('INSERT INTO ghv_practice_admission_pools(id,workspace_id,source_phase,round_code,category,primary_limit,reserve_limit,target_count,published_by,published_at,event_at,lock_at,candidate_ids,ballot_revision) VALUES(?,?,?,?,?,?,?,?,?,unixepoch(),?,?,?,?)').bind(id,ws,body.source_phase,body.round_code,body.category,limit,reserve,target,a.actor_id,body.event_at,lock,JSON.stringify([...ids].sort()),revision)];
  ranked.slice(0,limit+reserve).forEach((row,i)=>commands.push(db.prepare("INSERT INTO ghv_practice_admission_slots(pool_id,workspace_id,application_id,source_phase,merit_order,initial_kind,status,notified_at,deadline_at,notice_by) SELECT id,workspace_id,?,source_phase,?,?,?,CASE WHEN ? THEN published_at ELSE NULL END,CASE WHEN ? THEN published_at+172800 ELSE NULL END,CASE WHEN ? THEN published_by ELSE NULL END FROM ghv_practice_admission_pools WHERE id=? AND workspace_id=?").bind(row.id,i+1,i<target?'primary':'reserve',i<target?'offered':'waiting',i<target?1:0,i<target?1:0,i<target?1:0,id,ws)));
  try{await db.batch(commands)}catch{return deny('admission_publication_changed',409)}
  return reply({ok:true,emailSent:false,pool:{id,lock_at:lock,target_count:target,primary_limit:limit,reserve_limit:reserve}},201);
 }
 if(path==='admission-notify'){
  if(a.role!=='organizer')return deny('organizer_only',403);
  if(Object.keys(body).some(k=>!['pool_id','application_id','notified_manually'].includes(k))||body.notified_manually!==true)return deny('manual_admission_notice_required',422);
  const row=await db.prepare('SELECT * FROM ghv_practice_admission_slots WHERE pool_id=? AND application_id=? AND workspace_id=?').bind(String(body.pool_id||''),String(body.application_id||''),ws).first();if(!row)return deny('admission_not_found',404);
  if(row.status==='offered')return reply({ok:true,emailSent:false});
  try{const r=await db.prepare("UPDATE ghv_practice_admission_slots SET status='offered',notified_at=unixepoch(),deadline_at=unixepoch()+86400,notice_by=? WHERE pool_id=? AND application_id=? AND workspace_id=? AND status='awaiting_notice'").bind(a.actor_id,row.pool_id,row.application_id,ws).run();if(!r.meta?.changes)return deny('admission_notice_locked',409)}catch{return deny('admission_notice_locked',409)}
  return reply({ok:true,emailSent:false});
 }
 if(path==='admission-respond'){
  if(a.role!=='member')return deny('member_only',403);
  if(Object.keys(body).some(k=>!['pool_id','application_id','response'].includes(k))||!['confirm','decline'].includes(body.response))return deny('invalid_admission_response',422);
  const row=await db.prepare('SELECT s.* FROM ghv_practice_admission_slots s JOIN ghv_practice_applications a ON a.id=s.application_id AND a.workspace_id=s.workspace_id WHERE s.pool_id=? AND s.application_id=? AND s.workspace_id=? AND a.actor_id=?').bind(String(body.pool_id||''),String(body.application_id||''),ws,a.actor_id).first();if(!row)return deny('admission_not_found',404);
  if(row.status==='confirmed'&&body.response==='confirm')return reply({ok:true,alreadyConfirmed:true});
  try{const r=await db.prepare("UPDATE ghv_practice_admission_slots SET status=?,responded_by=?,response_at=unixepoch() WHERE pool_id=? AND application_id=? AND workspace_id=? AND status='offered'").bind(body.response==='confirm'?'confirmed':'declined',a.actor_id,row.pool_id,row.application_id,ws).run();if(!r.meta?.changes)return deny('admission_response_locked',409)}catch{return deny('admission_response_locked',409)}
  await reconcileAdmissions(db,ws);return reply({ok:true});
 }
 return null;
}
