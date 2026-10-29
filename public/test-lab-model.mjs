// GHV internal synthetic-only sandbox model: no real people or payments.
export const PEOPLE=Object.freeze({
 T001:'TEST-001｜山谷之聲',T002:'TEST-002｜晨曦之歌',
 T003:'TEST-003｜雪峰旋律',T004:'TEST-004｜河畔樂手',
 T005:'TEST-005｜星光演唱',T006:'TEST-006｜金色舞台'
});
export const blank=()=>({version:1,next:1,registrations:[],votes:[],published:false});
export function addSyntheticRegistration(state,person,round,category,demo,payment,created='2026-10-29T00:00:00Z'){
 if(!PEOPLE[person]||!['2027-03','2027-06','2027-09'].includes(round)||
   !['university','community'].includes(category)||
   !['demo-a','demo-b'].includes(demo)||
   !['mock-pending','mock-receipt'].includes(payment))
   return {error:'測試選項無效'};
 if(state.registrations.some(r=>r.person===person&&r.round===round))
   return {error:'此虛構人物在同一場次已報名，不能重複送件。'};
 if(state.registrations.length>=18)
   return {error:'已達沙盒上限（18筆）。請清空後重新測試。'};
 const record={
   id:'GHV-TEST-'+String(state.next++).padStart(4,'0'),person,round,
   category,demo,payment,status:'pending',created
 };
 state.registrations.push(record);
 return {record};
}
export function reviewSynthetic(state,id,newStatus){
 if(!['pending','approved','rejected'].includes(newStatus))return false;
 const row=state.registrations.find(r=>r.id===id);
 if(!row)return false;
 row.status=newStatus;
 if(newStatus!=='approved')state.votes=state.votes.filter(v=>v.person!==row.person);
 if(!state.registrations.some(r=>r.status==='approved'))state.published=false;
 return true;
}
export function castSyntheticVote(state,voter,person) {
 if(!/^V00[1-4]$/.test(voter))return {error:'無效的測試投票識別'};
 if(!state.registrations.some(r=>r.person===person&&r.status==='approved'))
   return {error:'必須選擇已核准的虛構選手。'};
 if(state.votes.some(v=>v.voter===voter))
   return {error:'重複投票已拒絕'};
 state.votes.push({voter,person});
 return {ok:true};
}
