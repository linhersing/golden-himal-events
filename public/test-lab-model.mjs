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

// A fictional ballot belongs to one approved registration and one round.
// This intentionally simulates per-round vote isolation, NOT voter authentication.
export function reviewSynthetic(state,id,newStatus){
 if(!['pending','approved','rejected'].includes(newStatus))return false;
 const row=state.registrations.find(r=>r.id===id);
 if(!row)return false;
 row.status=newStatus;
 if(newStatus!=='approved')
   state.votes=state.votes.filter(v=>v.registrationId!==id);
 if(!state.registrations.some(r=>r.status==='approved'))state.published=false;
 return true;
}
export function castSyntheticVote(state,voter,registrationId) {
 if(!/^V00[1-4]$/.test(voter))return {error:'無效的測試投票識別'};
 const record=state.registrations.find(r=>r.id===registrationId && r.status==='approved');
 if(!record)return {error:'必須選擇已核准的虛構選手與場次。'};
 if(state.votes.some(v=>v.voter===voter && v.round===record.round))
   return {error:'此測試識別在本場次已投票，重複投票已拒絕'};
 state.votes.push({voter,registrationId:record.id,round:record.round});
 return {ok:true};
}
// Only for old browser-local mock data. The old format lacked a round; if a
// ballot is ambiguous, discard it instead of silently assigning it to a round.
export function migrateSyntheticVotes(state){
 if(!Array.isArray(state.votes)||!Array.isArray(state.registrations))return;
 const seen=new Set(),migrated=[];
 for(const old of state.votes){
  if(!/^V00[1-4]$/.test(old?.voter))continue;
  const possibilities=typeof old.registrationId==='string'
   ? state.registrations.filter(r=>r.id===old.registrationId && r.status==='approved')
   : state.registrations.filter(r=>r.person===old.person && r.status==='approved');
  if(possibilities.length!==1)continue;
  const candidate=possibilities[0],key=old.voter+':'+candidate.round;
  if(seen.has(key))continue;
  migrated.push({voter:old.voter,registrationId:candidate.id,round:candidate.round});
  seen.add(key);
 }
 state.votes=migrated;
}
