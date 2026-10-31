// Alan V2 stage-local equal-weight means; recusals never enter the denominator.
export function practiceRankings(applications,scores,votes){
 const max={};for(const app of applications.filter(a=>a.phase==='final'))max[app.category]=Math.max(max[app.category]||0,Number(votes.find(v=>v.application_id===app.id)?.n||0));
 const rows=applications.map(app=>{
  const responses=scores.filter(s=>s.application_id===app.id&&s.phase===app.phase),eligible=responses.filter(s=>!s.recused),n=eligible.length;
  const mean=key=>n?eligible.reduce((v,s)=>v+Number(s[key]),0)/n:null;
  const technique=mean('technique'),expression=mean('interpretation'),presence=mean('stage_presence'),appearance=mean('appearance');
  const jury=n?technique+expression+presence+appearance:null;
  const ready=responses.length===3&&n>0,v=Number(votes.find(v=>v.application_id===app.id)?.n||0),voteScore=max[app.category]?v/max[app.category]*100:0;
  return {id:app.id,stage_name:app.stage_name,category:app.category,round_code:app.round_code,phase:app.phase,group_key:app.phase+':'+app.category+(app.phase==='final'?'':':'+app.round_code),responses:responses.length,eligible_judges:n,judges_count:n,judges_mean:jury,technique_mean:technique,interpretation_mean:expression,stage_presence_mean:presence,votes:v,vote_score:voteScore,total_score:ready?(app.phase==='final'?Number((voteScore*.51+jury*.49).toFixed(2)):jury):null,ready,tie_pending:false,official:false};
 });
 const comparison=(a,b)=>{
  if(a.ready!==b.ready)return a.ready?-1:1;
  const keys=a.phase==='final'?['total_score','judges_mean','technique_mean','interpretation_mean','stage_presence_mean']:a.phase==='demo'?['total_score','technique_mean','interpretation_mean']:['total_score','technique_mean','interpretation_mean','stage_presence_mean'];
  for(const k of keys){const d=(b[k]??-1)-(a[k]??-1);if(Math.abs(d)>1e-8)return d}return 0;
 };
 rows.sort((a,b)=>a.group_key.localeCompare(b.group_key)||comparison(a,b));
 for(let i=0;i<rows.length;i++){const r=rows[i],previous=rows[i-1],next=rows[i+1],same=previous?.group_key===r.group_key;r.rank=!r.ready?null:same&&comparison(previous,r)===0?previous.rank:same?i-rows.findIndex(x=>x.group_key===r.group_key)+1:1;r.tie_pending=r.ready&&((same&&comparison(previous,r)===0)||(next?.group_key===r.group_key&&comparison(r,next)===0));}
 return rows;
}
