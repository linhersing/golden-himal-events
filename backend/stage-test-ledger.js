// Isolated fictional rehearsal only. No route is added to the brand Worker.
import {STAGES,summarizeScores,rankAudition,rankRegional,selectUnits,pkFinalists,rankFinal} from './frontline-stage-rules.js';
const codes=Object.keys(STAGES),fail=message=>{throw Error(message)};
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const fingerprint=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
async function load(db,stage){
 const round=await db.prepare('SELECT * FROM stage_test_rounds WHERE code=?').bind(stage).first();
 if(!round)fail('stage_not_found');
 const units=(await db.prepare('SELECT * FROM stage_test_units WHERE stage=? ORDER BY region,id').bind(stage).all()).results;
 const members=(await db.prepare('SELECT unit_id,application_id FROM stage_test_members WHERE stage=? ORDER BY application_id').bind(stage).all()).results;
 const scores=(await db.prepare('SELECT unit_id,position,judge_id,values_json FROM stage_test_scores WHERE stage=?').bind(stage).all()).results;
 const training=stage==='final'?(await db.prepare('SELECT application_id,opt_in FROM stage_test_training ORDER BY application_id').all()).results:[];
 return {...round,training,panel:JSON.parse(round.panel),config:JSON.parse(round.config),result:round.result?JSON.parse(round.result):null,units:units.map(unit=>({...unit,members:members.filter(m=>m.unit_id===unit.id).map(m=>m.application_id),scores:scores.filter(s=>s.unit_id===unit.id).map(s=>({...JSON.parse(s.values_json),judgeId:s.judge_id,position:s.position}))}))};
}
function preview(round){
 const entries=round.units;
 if(!entries.length)return {ready:false,blockers:['no_candidates']};
 if(round.code==='audition'){
  const ranked=rankAudition(entries.map(e=>({...e,demos:Array.from({length:e.positions},(_,i)=>({position:i+1,scores:e.scores.filter(s=>s.position===i+1)}))})),round.panel);
  return {ranked,...selectUnits(ranked,round.config.quotas)};
 }
 if(['qualifier_one','qualifier_two'].includes(round.code)){
  const ranked=rankRegional(round.code,entries,round.panel);
  return {ranked,...selectUnits(ranked,round.config.quotas,{maxTeamSize:round.config.maxTeamSize})};
 }
 if(round.code==='regional_pk')return pkFinalists(entries,round.config.pairs||[],round.panel);
 const calculated=rankFinal(entries,round.panel,{});
 return {...calculated,ready:false,blockers:[...new Set([...calculated.blockers,'final_vote_lifecycle_pending'])]};
}
function exposed(round,actor){
 return {code:round.code,status:round.status,version:round.version,panel:round.panel,config:round.config,
  units:round.units.map(u=>({...u,scores:actor.role==='organizer'?u.scores:u.scores.filter(s=>s.judgeId===actor.id)})),
  ...(actor.role==='organizer'?{preview:preview(round),result:round.result,training:round.training}:{})};
}
export async function stageLedger(db,actor,body,options={}){
 if(!actor||!['organizer','reviewer'].includes(actor.role))fail('staff_only');
 if(!(await db.prepare("SELECT scope FROM stage_test_scope WHERE scope='FICTIONAL_STAGE_TEST_ONLY'").first()))fail('isolated_fixture_scope_required');
 if(!body||!Object.hasOwn(STAGES,body.stage))fail('invalid_stage');
 const round=await load(db,body.stage);
 if(actor.role==='reviewer'&&!round.panel.includes(actor.id))fail('unassigned_judge');
 if(body.operation==='read')return {ok:true,testOnly:true,official:false,stage:round.code,...exposed(round,actor)};
 if(!['score','freeze','configure','groups','training'].includes(body.operation))fail('invalid_stage_operation');
 if(typeof body.request_id!=='string'||body.request_id.length<3||body.request_id.length>100)fail('request_id_required');
 const hash=await fingerprint(body),prior=await db.prepare('SELECT * FROM stage_test_audit WHERE actor_id=? AND request_id=?').bind(actor.id,body.request_id).first();
 if(prior){
  if(prior.payload_hash!==hash)fail('idempotency_conflict');
  const stored=await db.prepare('SELECT values_json FROM stage_test_scores WHERE event_id=?').bind(prior.id).first();
  return {ok:true,testOnly:true,official:false,audit_id:prior.id,replayed:true,...(stored?{score:JSON.parse(stored.values_json)}:prior.action==='training'?{training:JSON.parse(prior.detail)}:{result:round.result})};
 }
 if(body.operation==='score'&&actor.role!=='reviewer')fail('reviewer_only');
 if(body.operation!=='score'&&actor.role!=='organizer')fail('organizer_only');
 if(body.operation==='training'){
  if(actor.role!=='organizer')fail('organizer_only');
  if(Object.keys(body).some(k=>!['operation','stage','request_id','version','application_id','opt_in'].includes(k)))fail('training_has_no_score');
  if(typeof body.opt_in!=='boolean'||round.code!=='final'||!round.units.some(u=>u.members.length===1&&u.members[0]===body.application_id))fail('finalist_required');
  const event=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
  const result=await db.batch([
   db.prepare('INSERT INTO stage_test_audit VALUES(?,?,?,?,?,?,?,?,?,?)').bind(event,actor.id,actor.role,body.request_id,hash,'training','final','success',JSON.stringify({application_id:body.application_id,opt_in:body.opt_in}),now),
   db.prepare('INSERT INTO stage_test_training VALUES(?,?,?) ON CONFLICT(application_id) DO UPDATE SET opt_in=excluded.opt_in,last_event=excluded.last_event').bind(body.application_id,Number(body.opt_in),event),
   db.prepare('SELECT application_id,opt_in FROM stage_test_training WHERE last_event=?').bind(event)
  ]);
  const record=result.at(-1).results?.[0];if(!record)fail('stage_readback_unavailable');
  return {ok:true,testOnly:true,official:false,audit_id:event,training:record};
 }
 if(round.status!=='open')fail('stage_locked');
 if(body.version!==round.version)fail('stale_stage_version');
 const event=crypto.randomUUID(),now=Math.floor(Date.now()/1000),operation=body.operation;
 const audit=(detail,condition,bind)=>db.prepare(`INSERT INTO stage_test_audit(id,actor_id,actor_role,request_id,payload_hash,action,stage,result,detail,created_at)
  SELECT ?,?,?,?,?,?,?,'success',?,? WHERE ${condition}`).bind(event,actor.id,actor.role,body.request_id,hash,operation,body.stage,JSON.stringify(detail),now,...bind);
 const eventExists="EXISTS(SELECT 1 FROM stage_test_audit WHERE id=?)";
 let statements=[],result;
 if(operation==='score'){
  if(!round.panel.includes(actor.id))fail('unassigned_judge');
  const unit=round.units.find(u=>u.id===body.unit_id);
  if(!unit||!Number.isInteger(body.position)||body.position<1||body.position>unit.positions)fail('invalid_stage_unit');
  for(const appId of unit.members){const owner=await db.prepare('SELECT account_id FROM e2e_applications WHERE id=?').bind(appId).first();if(!owner||owner.account_id===actor.id||options.ownsApplication&&await options.ownsApplication(owner.account_id))fail('self_review_disallowed');}
  if(!body.values||typeof body.values!=='object'||Array.isArray(body.values)||Object.keys(body.values).some(k=>![...Object.keys(STAGES[round.code].caps),'recused','reason'].includes(k)))fail('invalid_score');
  summarizeScores(round.code,[{...body.values,judgeId:actor.id}],round.panel);
  if(unit.scores.some(s=>s.judgeId===actor.id&&s.position===body.position))fail('already_scored');
  statements.push(db.prepare(`INSERT INTO stage_test_scores(stage,unit_id,position,judge_id,values_json,event_id,created_at)
   SELECT ?,?,?,?,?,?,? FROM stage_test_rounds WHERE code=? AND status='open' AND version=?`).bind(round.code,unit.id,body.position,actor.id,JSON.stringify(body.values),event,now,round.code,round.version));
  statements.push(audit({unit_id:unit.id,position:body.position,criteria:Object.keys(body.values).filter(k=>k!=='reason'),recused:body.values.recused===true},'EXISTS(SELECT 1 FROM stage_test_scores WHERE event_id=?)',[event]));
  statements.push(db.prepare('SELECT values_json FROM stage_test_scores WHERE event_id=?').bind(event));
 }else{
  const scoreCount=round.units.reduce((count,u)=>count+u.scores.length,0);
  if(operation==='configure'||operation==='groups'){
   if(scoreCount)fail('stage_configuration_locked');
   let config={...round.config};
   if(operation==='configure'){
    if(!Array.isArray(body.panel)||body.panel.length<3||body.panel.length>5||new Set(body.panel).size!==body.panel.length)fail('invalid_panel');
    for(const member of body.panel)if(!(await db.prepare("SELECT id FROM e2e_accounts WHERE id=? AND role='reviewer'").bind(member).first()))fail('unassigned_judge');
    if(body.quotas!==undefined){if(!body.quotas||['A','B'].some(key=>!Number.isInteger(body.quotas[key])||body.quotas[key]<0||body.quotas[key]>100))fail('invalid_test_quotas');if(round.code==='qualifier_two'&&['A','B'].some(key=>body.quotas[key]!==10))fail('regional_ten_required');config.quotas={A:body.quotas.A,B:body.quotas.B};}
    if(body.maxTeamSize!==undefined){if(!Number.isInteger(body.maxTeamSize)||body.maxTeamSize<2||body.maxTeamSize>20)fail('invalid_test_team_limit');config.maxTeamSize=body.maxTeamSize;}
    if(body.pairs!==undefined){if(round.code!=='regional_pk')fail('invalid_pair_stage');const check=pkFinalists(round.units,body.pairs,body.panel);if(check.blockers.includes('pk_pairing_incomplete'))fail('pk_pairing_incomplete');config.pairs=body.pairs;}
    config.source='test_scenario';
    statements.push(db.prepare("UPDATE stage_test_rounds SET panel=?,config=?,version=version+1,last_event=? WHERE code=? AND version=? AND status='open' AND NOT EXISTS(SELECT 1 FROM stage_test_scores WHERE stage=?)").bind(JSON.stringify(body.panel),JSON.stringify(config),event,round.code,round.version,round.code));
   }else{
    if(round.code!=='qualifier_two'||!Number.isInteger(config.maxTeamSize))fail('team_size_policy_pending');
    const original=round.units.flatMap(u=>u.members),flat=Array.isArray(body.groups)?body.groups.flat():[];
    if(flat.length!==original.length||new Set(flat).size!==flat.length||flat.some(id=>!original.includes(id))||body.groups.some(group=>!Array.isArray(group)||!group.length||group.length>config.maxTeamSize))fail('invalid_team_partition');
    const grouped=body.groups.map(group=>{const first=round.units.find(u=>u.members.includes(group[0]));if(group.some(id=>round.units.find(u=>u.members.includes(id)).region!==first.region))fail('cross_region_team');return {id:crypto.randomUUID(),region:first.region,members:group,label:group.length===1?first.label:'TEST team '+first.region+' '+group.length};});
    statements.push(db.prepare("UPDATE stage_test_rounds SET version=version+1,last_event=? WHERE code=? AND version=? AND status='open' AND NOT EXISTS(SELECT 1 FROM stage_test_scores WHERE stage=?)").bind(event,round.code,round.version,round.code));
    statements.push(audit({groups:grouped.map(g=>g.members.length)},'EXISTS(SELECT 1 FROM stage_test_rounds WHERE code=? AND last_event=?)',[round.code,event]));
    statements.push(db.prepare(`DELETE FROM stage_test_members WHERE stage=? AND ${eventExists}`).bind(round.code,event));
    statements.push(db.prepare(`DELETE FROM stage_test_units WHERE stage=? AND ${eventExists}`).bind(round.code,event));
    for(const group of grouped){statements.push(db.prepare(`INSERT INTO stage_test_units SELECT ?,?,?,?,1 WHERE ${eventExists}`).bind(round.code,group.id,group.label,group.region,event));for(const member of group.members)statements.push(db.prepare(`INSERT INTO stage_test_members SELECT ?,?,? WHERE ${eventExists}`).bind(round.code,group.id,member,event));}
   }
  }else if(operation==='freeze'){
   result=preview(round);if(!result.ready)fail(result.blockers[0]||'stage_not_ready');
   const index=codes.indexOf(round.code),next=codes[index+1],selected=result.selected||result.finalists||[];
   if(next&&(await db.prepare('SELECT status FROM stage_test_rounds WHERE code=?').bind(next).first())?.status!=='locked')fail('next_stage_not_locked');
   statements.push(db.prepare("UPDATE stage_test_rounds SET status='frozen',result=?,version=version+1,last_event=? WHERE code=? AND status='open' AND version=?").bind(JSON.stringify(result),event,round.code,round.version));
   statements.push(audit({selected_count:selected.length,source_stage:round.code},'EXISTS(SELECT 1 FROM stage_test_rounds WHERE code=? AND last_event=?)',[round.code,event]));
   if(next){
    statements.push(db.prepare(`UPDATE stage_test_rounds SET status='open',version=version+1,last_event=? WHERE code=? AND status='locked' AND ${eventExists}`).bind(event,next,event));
    for(const appId of selected){
     const source=round.units.find(u=>u.members.includes(appId));if(!source)fail('advancement_source_missing');
     statements.push(db.prepare(`INSERT INTO stage_test_units SELECT ?,?,?,?,1 WHERE ${eventExists}`).bind(next,appId,source.label,source.region,event));
     statements.push(db.prepare(`INSERT INTO stage_test_members SELECT ?,?,? WHERE ${eventExists}`).bind(next,appId,appId,event));
    }
   }
  }else fail('training_lifecycle_pending');
  if(!['groups','freeze'].includes(operation))statements.push(audit({version_before:round.version,version_after:round.version+1,configuration:'fixture_only'},'EXISTS(SELECT 1 FROM stage_test_rounds WHERE code=? AND last_event=?)',[round.code,event]));
 }
 statements.push(db.prepare('SELECT id FROM stage_test_audit WHERE id=?').bind(event));
 const committed=await db.batch(statements);
 if(!committed.at(-1).results?.[0])fail('stale_stage_version');
 if(operation==='score'){
  const stored=committed.at(-2).results?.[0];if(!stored)fail('stage_readback_unavailable');
  return {ok:true,testOnly:true,official:false,audit_id:event,score:JSON.parse(stored.values_json)};
 }
 return {ok:true,testOnly:true,official:false,audit_id:event,result,stage:exposed(await load(db,round.code),actor)};
}
