// 11/16 frontline rules. Pure arithmetic only: no deployment, payment, ballot
// authentication, old phase updates, or implied official publication approval.
const auditionCaps=Object.freeze({technique:60,interpretation:40});
const liveCaps=Object.freeze({technique:40,interpretation:30,stage_presence:20,appearance:10});
export const STAGES=Object.freeze(Object.fromEntries([
 ['audition',null,'mean',auditionCaps],['qualifier_one','2027-02-12','mean',liveCaps],
 ['qualifier_two','2027-03-05','sum',liveCaps],['regional_pk','2027-03-12','mean',liveCaps],
 ['final','2027-04-14','mean',liveCaps]
].map(([code,date,aggregation,caps])=>[code,Object.freeze({code,date,aggregation,caps,provisional:true,timeZone:'Asia/Kathmandu'})])));
const fail=code=>{throw Error(code)};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=100&&!/[\x00-\x1f\x7f]/.test(value);
const unique=values=>new Set(values).size===values.length;
const fractionCompare=(a,b)=>{const n=BigInt(a.sum)*BigInt(b.count)-BigInt(b.sum)*BigInt(a.count);return n>0n?1:n<0n?-1:0};
const assertPanel=panel=>{
 if(!Array.isArray(panel)||panel.length<3||panel.length>5||!panel.every(id)||!unique(panel))fail('invalid_panel');
};
function stageInfo(stage){return Object.hasOwn(STAGES,stage)?STAGES[stage]:fail('invalid_stage')}
function validateEntries(entries,individual=false){
 if(!Array.isArray(entries)||entries.length>500)fail('invalid_entries');
 const ids=new Set(),members=new Set();
 for(const e of entries){
  if(!id(e?.id)||ids.has(e.id))fail('invalid_or_duplicate_entry');ids.add(e.id);
  if(!['A','B'].includes(e.region)||!Array.isArray(e.members)||!e.members.length||e.members.length>100||!e.members.every(id))fail('invalid_unit');
  if(individual&&e.members.length!==1)fail('individual_required');
  for(const m of e.members){if(members.has(m))fail('duplicate_member');members.add(m)}
 }
}
export function summarizeScores(stage,rows,panel){
 const definition=stageInfo(stage);assertPanel(panel);
 if(!Array.isArray(rows)||rows.length>5)fail('invalid_scores');
 const seen=new Set(),criteria=Object.fromEntries(Object.keys(definition.caps).map(key=>[key,0]));
 let count=0,sum=0;
 for(const row of rows){
  if(!panel.includes(row?.judgeId))fail('unassigned_judge');
  if(seen.has(row.judgeId))fail('duplicate_score');seen.add(row.judgeId);
  if(row.recused===true){
   if(typeof row.reason!=='string'||!row.reason.trim()||row.reason.length>200||Object.keys(definition.caps).some(k=>Object.hasOwn(row,k)))fail('invalid_recusal');
   continue;
  }
  if(Object.hasOwn(row,'recused')&&row.recused!==false)fail('invalid_recusal');
  for(const [key,cap] of Object.entries(definition.caps)){
   if(!Number.isInteger(row[key])||row[key]<0||row[key]>cap)fail('invalid_score');
   criteria[key]+=row[key];sum+=row[key];
  }
  if(stage==='audition'&&['stage_presence','appearance'].some(k=>Object.hasOwn(row,k)))fail('invalid_score');
  count++;
 }
 const complete=seen.size===panel.length&&count>=3;
 return {stage,complete,count,sum,criteria,value:complete?(definition.aggregation==='sum'?sum:sum/count):null,aggregation:definition.aggregation};
}
function compareSummaries(a,b){
 if(!a.complete||!b.complete)return Number(a.complete)-Number(b.complete);
 let comparison=a.aggregation==='sum'?Math.sign(a.sum-b.sum):fractionCompare(a,b);
 if(comparison)return comparison;
 for(const key of Object.keys(stageInfo(a.stage).caps)){
  comparison=a.aggregation==='sum'?Math.sign(a.criteria[key]-b.criteria[key]):fractionCompare({sum:a.criteria[key],count:a.count},{sum:b.criteria[key],count:b.count});
  if(comparison)return comparison;
 }
 return 0;
}
function ordered(rows){
 return rows.sort((a,b)=>a.region.localeCompare(b.region)||-compareSummaries(a,b)||a.id.localeCompare(b.id));
}
export function rankAudition(entries,panel){
 validateEntries(entries,true);assertPanel(panel);
 return ordered(entries.map(e=>{
  if(!Array.isArray(e.demos)||e.demos.length<1||e.demos.length>5)fail('invalid_demo_count');
  const positions=new Set();
  const demos=e.demos.map(d=>{
   if(!Number.isInteger(d.position)||d.position<1||d.position>5||positions.has(d.position))fail('invalid_demo_position');positions.add(d.position);
   return {...summarizeScores('audition',d.scores,panel),position:d.position};
  });
  demos.sort((a,b)=>-compareSummaries(a,b)||a.position-b.position);
  const best=demos[0],complete=demos.every(d=>d.complete);
  return {id:e.id,region:e.region,members:[...e.members],...best,complete,value:complete?best.value:null};
 }));
}
export function rankRegional(stage,entries,panel){
 if(!['qualifier_one','qualifier_two'].includes(stage))fail('invalid_regional_stage');
 validateEntries(entries,stage!=='qualifier_two');
 return ordered(entries.map(e=>({id:e.id,region:e.region,members:[...e.members],...summarizeScores(stage,e.scores,panel)})));
}
export function selectUnits(rows,quotas,policy={}){
 const blockers=new Set(),preview=[];
 if(!Array.isArray(rows))fail('invalid_entries');
 const stage=rows[0]?.stage;
 if(!rows.length)blockers.add('no_candidates');
 else if(!['audition','qualifier_one','qualifier_two'].includes(stage)||rows.some(r=>r.stage!==stage))fail('invalid_selection_stage');
 validateEntries(rows,stage!=='qualifier_two');
 if(stage)for(const row of rows){
  const definition=stageInfo(stage);
  if(row.aggregation!==definition.aggregation||typeof row.complete!=='boolean'||!Number.isInteger(row.count)||row.count<0||row.count>5||!Number.isInteger(row.sum)||row.sum<0||row.sum>500||
   !row.criteria||Object.entries(definition.caps).some(([key,cap])=>!Number.isInteger(row.criteria[key])||row.criteria[key]<0||row.criteria[key]>cap*row.count)||
   Object.keys(definition.caps).reduce((sum,key)=>sum+row.criteria[key],0)!==row.sum||row.complete&&row.count<3)fail('invalid_summary');
 }
 for(const region of ['A','B']){
  const group=ordered(rows.filter(r=>r.region===region)),quota=quotas?.[region];
  if(!Number.isInteger(quota)||quota<0||quota>500){blockers.add('quota_pending');continue}
  if(group.some(r=>!r.complete))blockers.add('scores_incomplete');
  if(stage==='qualifier_two'&&quota!==10){blockers.add('regional_ten_required');continue}
  if(group.some(r=>r.aggregation==='sum')&&new Set(group.filter(r=>r.complete).map(r=>r.count)).size>1)blockers.add('unequal_judge_coverage');
  if(group.some(r=>r.members.length>1)){
   if(!Number.isInteger(policy.maxTeamSize)||policy.maxTeamSize<2||policy.maxTeamSize>100)blockers.add('team_size_policy_pending');
   else if(group.some(r=>r.members.length>policy.maxTeamSize))blockers.add('team_too_large');
  }
  let used=0;
  for(let i=0;i<group.length;i++){
   const row=group[i];if(!row.complete||used===quota)break;
   if(used+row.members.length>quota){blockers.add('team_overflow');break}
   if(used+row.members.length===quota&&group[i+1]&&compareSummaries(row,group[i+1])===0){blockers.add('cutoff_tie');break}
   preview.push(...row.members);used+=row.members.length;
  }
  if(stage==='qualifier_two'&&used!==10)blockers.add('regional_ten_not_filled');
 }
 return {ready:blockers.size===0,selected:blockers.size?[]:preview,preview,blockers:[...blockers]};
}
export function comparePk(left,right,panel){
 validateEntries([left,right],true);
 if(left.region!==right.region)fail('cross_region_pair');
 const a=summarizeScores('regional_pk',left.scores,panel),b=summarizeScores('regional_pk',right.scores,panel);
 if(!a.complete||!b.complete)return {winner:null,blocker:'scores_incomplete'};
 const comparison=compareSummaries(a,b);
 return comparison?{winner:comparison>0?left.members[0]:right.members[0],blocker:null}:{winner:null,blocker:'named_panel_ballot_required'};
}
export function pkFinalists(entries,pairs,panel){
 validateEntries(entries,true);assertPanel(panel);
 if(!Array.isArray(pairs)||pairs.length>20)fail('invalid_pairs');
 const used=new Set(),pairIds=new Set(),blockers=new Set(),preview=[];
 for(const pair of pairs){
  if(!id(pair?.id)||pairIds.has(pair.id)||!Array.isArray(pair.ids)||pair.ids.length!==2)fail('invalid_pair');pairIds.add(pair.id);
  const contestants=pair.ids.map(key=>{if(used.has(key))fail('duplicate_pair_member');used.add(key);return entries.find(e=>e.id===key)||fail('unknown_pair_member')});
  const result=comparePk(...contestants,panel);if(result.blocker)blockers.add(result.blocker);else preview.push(result.winner);
 }
 if(entries.length!==20||pairs.length!==10||used.size!==entries.length||['A','B'].some(r=>entries.filter(e=>e.region===r).length!==10))blockers.add('pk_pairing_incomplete');
 return {ready:!blockers.size,finalists:blockers.size?[]:preview,preview,blockers:[...blockers]};
}
const roundCents=(numerator,denominator)=>Number((numerator*200n+denominator)/(2n*denominator));
export function rankFinal(entries,panel,validVotes){
 validateEntries(entries,true);assertPanel(panel);
 if(entries.length!==10)fail('ten_finalists_required');
 if(!validVotes||typeof validVotes!=='object'||Array.isArray(validVotes))fail('invalid_votes');
 const known=new Set(entries.map(e=>e.id));
 for(const [key,count] of Object.entries(validVotes))if(!known.has(key)||!Number.isSafeInteger(count)||count<0||count>1e12)fail('invalid_votes');
 const votesFor=key=>Object.hasOwn(validVotes,key)?validVotes[key]:0;
 const max=Math.max(0,...entries.map(e=>votesFor(e.id))),blockers=new Set();
 const rows=entries.map(e=>{
  const summary=summarizeScores('final',e.scores,panel),votes=votesFor(e.id);
  if(!summary.complete)blockers.add('scores_incomplete');
  const numerator=max?5100n*BigInt(votes)*BigInt(summary.count)+49n*BigInt(summary.sum)*BigInt(max):49n*BigInt(summary.sum);
  const denominator=max?100n*BigInt(max)*BigInt(summary.count):100n*BigInt(summary.count);
  const cents=summary.complete?roundCents(numerator,denominator):null;
  return {id:e.id,region:e.region,members:[...e.members],...summary,votes,vote_score:max?votes/max*100:0,total_score:cents===null?null:cents/100,cents};
 });
 rows.sort((a,b)=>Number(b.complete)-Number(a.complete)||(b.cents??0)-(a.cents??0)||(a.complete&&b.complete?-fractionCompare(a,b):0)||a.id.localeCompare(b.id));
 for(let i=1;i<rows.length;i++)if(rows[i-1].complete&&rows[i].complete&&rows[i-1].cents===rows[i].cents&&fractionCompare(rows[i-1],rows[i])===0)blockers.add('named_panel_ballot_required');
 return {rows,ready:!blockers.size,blockers:[...blockers],weights:{vote:51,judge:49},group:'single',official:false};
}
export function updateTraining(eligible,records,change){
 if(!Array.isArray(eligible)||!eligible.includes(change?.id))fail('finalist_required');
 if(Object.keys(change).some(k=>!['id','optIn'].includes(k)))fail('training_has_no_score');
 if(typeof change.optIn!=='boolean'||!Array.isArray(records))fail('invalid_training');
 return [...records.filter(r=>r.id!==change.id).map(r=>({...r})),{id:change.id,optIn:change.optIn}];
}
