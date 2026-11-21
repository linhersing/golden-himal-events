// Dedicated entrypoint for a NEW fictional TEST Worker only. Not imported by
// staging-registration-worker.js, not deployed by the brand build configuration.
import {handleE2E,account,ownsApplication} from './staging-e2e.js';
import {stageLedger} from './stage-test-ledger.js';
import {handleVoteTest} from './final-vote-test-http.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const permittedHost=host=>['127.0.0.1','localhost'].includes(host)||/^ghv-stage-test-[a-z0-9-]+\.linhersing\.workers\.dev$/.test(host);
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(env.STAGING_STAGE_REHEARSAL_ENABLED!=='true'||!permittedHost(url.hostname)||!env.E2E_DB)return json({ok:false,error:'isolated_test_unavailable'},404);
 try{
  if(!await env.E2E_DB.prepare("SELECT scope FROM stage_test_scope WHERE scope='FICTIONAL_STAGE_TEST_ONLY'").first())return json({ok:false,error:'isolated_test_unavailable'},404);
 }catch{return json({ok:false,error:'isolated_test_unavailable'},404)}
 if(url.pathname==='/api/vote-test')return handleVoteTest(request,env);
 if(url.pathname!=='/api/stage-test')return env.ASSETS.fetch(request);
 if(!['GET','POST'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({ok:false,error:'origin_not_allowed'},403);
 // Validate the SAME staff/member cookie namespaces and invited roles as the
 // existing app. No header-supplied role, special pass or auth bypass is added.
 const auth=await handleE2E(new Request(new URL('/api/e2e/me',url),{headers:request.headers}),{...env,DB:env.E2E_DB});
 if(!auth.ok)return auth;
 const me=await auth.json();
 if(!['organizer','reviewer'].includes(me.account?.role))return json({ok:false,error:'staff_only'},403);
 let body;
 try{
  if(request.method==='GET')body={operation:'read',stage:url.searchParams.get('stage')||'audition'};
  else{if(Number(request.headers.get('Content-Length')||0)>12000)return json({ok:false,error:'request_too_large'},413);const raw=await request.text();if(new TextEncoder().encode(raw).length>12000)return json({ok:false,error:'request_too_large'},413);body=JSON.parse(raw);}
 }catch{return json({ok:false,error:'invalid_json'},422)}
 try{
  const current=await account(request,{...env,DB:env.E2E_DB});
  if(!current||current.id!==me.account.id||current.role!==me.account.role)return json({ok:false,error:'login_required'},401);
  return json({...await stageLedger(env.E2E_DB,current,body,{ownsApplication:ownerId=>ownsApplication({...env,DB:env.E2E_DB},current,ownerId)}),actor:{id:current.id,role:current.role}});
 }
 catch(error){
  const code=error?.message||'';
  const known=/^(staff_only|reviewer_only|organizer_only|unassigned_judge|self_review_disallowed|stage_locked|stale_stage_version|already_scored|idempotency_conflict|request_id_required|invalid_[a-z_]+|scores_incomplete|quota_pending|team_[a-z_]+|cross_region_[a-z_]+|regional_ten_[a-z_]+|pk_pairing_incomplete|named_panel_ballot_required|unequal_judge_coverage|cutoff_tie|no_candidates|next_stage_not_locked|final_vote_lifecycle_pending|training_has_no_score|finalist_required|stage_configuration_locked)$/;
  return json({ok:false,error:known.test(code)?code:'stage_service_unavailable'},known.test(code)?403:503);
 }
}};
