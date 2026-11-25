export function overviewOf(applications){
 const status={pending:0,supplement:0,expired:0,approved:0,unverified:0};
 const regions={A:0,B:0,other:0};
 let scores=0;
 for(const row of applications){
  const supplement=row.video_supplement_state;
  status[supplement==='expired'?'expired':supplement==='pending'?'supplement':row.approval_state||'unverified']++;
  regions[['A','B'].includes(row.competition_region)?row.competition_region:'other']++;
  scores+=Number(row.demo_judges||0)+Number(row.live_judges||0);
 }
 return {total:applications.length,status,regions,scores};
}
