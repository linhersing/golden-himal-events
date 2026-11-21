// Muse / user decision 2026-11-21: earlier stages are handled by the
// frontline, not by online scorecards. Retain the old TEST implementation.
export function onlineJudgingPolicy(env={}){
 const restored=env.STAGING_E2E_ENABLED==='true'&&env.STAGING_ONLINE_JUDGING_MODE==='all_stages_test';
 return {mode:restored?'all_stages_test':'final_only',earlier_stages:restored?'online_test':'frontline_managed',final_stage:'invited_test_pending_approval',official:false};
}
export const earlierOnlineJudging=env=>onlineJudgingPolicy(env).mode==='all_stages_test';
export const onlineStageAllowed=(env,phase)=>phase==='final'||(earlierOnlineJudging(env)&&['demo','qualifier','audition','qualifier_one','qualifier_two','regional_pk'].includes(phase));
export const judgingPhaseGuard=(env,alias='p')=>earlierOnlineJudging(env)?'':` AND ${alias}.phase='final'`;
