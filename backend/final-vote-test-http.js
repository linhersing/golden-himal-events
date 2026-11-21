// Dedicated fictional TEST entry only; this is not an official voting service.
import {handleE2E,account} from './staging-e2e.js';
import {voteLedger,voteHash} from './final-vote-ledger.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function verifyVoteProof(request,env,payload,fetcher=fetch){
 const token=payload?.turnstile_token,ip=request.headers.get('CF-Connecting-IP');
 if(typeof token!=='string'||token.length<1||token.length>2048||!ip||!/^[a-f0-9:.]{3,45}$/i.test(ip))return false;
 if(typeof env.FINAL_VOTE_TURNSTILE_SECRET!=='string'||env.FINAL_VOTE_TURNSTILE_SECRET.length<32)return false;
 const bucket=Math.floor(Date.now()/60000),secret=env.FINAL_VOTE_CREDENTIAL_SECRET;
 const keys=[await voteHash('rate-ip:'+ip,secret),await voteHash('rate-token:'+String(payload.credential),secret)];
 const limits=await env.E2E_DB.batch(keys.map(key=>env.E2E_DB.prepare('INSERT INTO vote_test_rate_limits VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET n=n+1 RETURNING n').bind(key,bucket)));
 if(limits.some((r,i)=>r.results?.[0]?.n>(i===0?60:10)))return false;
 await env.E2E_DB.prepare('DELETE FROM vote_test_rate_limits WHERE bucket<?').bind(bucket-2).run();
 try{
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.FINAL_VOTE_TURNSTILE_SECRET,response:token,remoteip:ip}),signal:AbortSignal.timeout(7000)});
  if(!response.ok)return false;const proof=await response.json();
  return proof.success===true&&proof.action==='ghv_final_vote'&&proof.hostname===new URL(request.url).hostname;
 }catch{return false}
}
export async function handleVoteTest(request,env){
 if(env.STAGING_FINAL_VOTE_REHEARSAL_ENABLED!=='true')return json({ok:false,error:'vote_test_unavailable'},404);
 const url=new URL(request.url);let body;
 if(!['GET','POST'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
 if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json')))return json({ok:false,error:'origin_or_type_not_allowed'},403);
 try{
  if(request.method==='GET')body={operation:'read'};
  else{
   if(Number(request.headers.get('Content-Length'))>12000)return json({ok:false,error:'request_too_large'},413);
   const reader=request.body?.getReader(),chunks=[];let length=0;
   if(reader)try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>12000){await reader.cancel();return json({ok:false,error:'request_too_large'},413)}chunks.push(part.value)}}finally{reader.releaseLock()}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}body=JSON.parse(new TextDecoder().decode(bytes));
  }
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error();
 }catch{return json({ok:false,error:'invalid_json'},422)}

 let actor=null;
 if(!['read','cast','receipt'].includes(body.operation)||request.headers.has('Cookie')){
  const auth=await handleE2E(new Request(new URL('/api/e2e/me',url),{headers:request.headers}),{...env,DB:env.E2E_DB});
  if(auth.ok)actor=await account(request,{...env,DB:env.E2E_DB});
  else if(!['read','cast','receipt'].includes(body.operation))return json({ok:false,error:'organizer_only'},403);
 }
 try{
  const verified=body.operation==='cast'?await verifyVoteProof(request,env,body):false;
  const value=await voteLedger(env.E2E_DB,actor,body,{secret:env.FINAL_VOTE_CREDENTIAL_SECRET,verified});
  return json({...value,...(body.operation==='read'?{turnstile_site_key:env.FINAL_VOTE_TURNSTILE_SITE_KEY||''}:{})});
 }catch(error){
  const known=/^(organizer_only|isolated_test_required|already_initialized|ten_finalists_required|voting_uninitialized|invalid_[a-z_]+|ineligible|voting_frozen|vote_conflict|human_verification_required|voting_closed|already_voted|ballot_conflict|fictional_person_required|already_issued|stale_vote_version|videos_not_ready|close_before_freeze|scores_incomplete|named_panel_ballot_required|final_stage_unavailable|vote_not_configured)$/;
  const code=known.test(error?.message)?error.message:'vote_service_unavailable';
  return json({ok:false,error:code},['organizer_only','human_verification_required'].includes(code)?403:code==='vote_service_unavailable'?503:409);
 }
}
