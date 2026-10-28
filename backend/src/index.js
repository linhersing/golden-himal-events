import { normalizedEmail, getSecureCode, hmacHex, publicFailure, isActive } from './vote-core.js';

// This draft is intentionally NOT deployed and fails closed by default.
// Requires a verified email provider, Turnstile widget, D1, and secure secrets.
const reply=(data,status=200,origin)=>Response.json(data,{status,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})
}});
const live=env=>env.VOTING_ENABLED==='true'&&Boolean(env.DB&&env.OTP_PEPPER&&env.IDENTITY_PEPPER&&env.TURNSTILE_SECRET&&env.ALLOWED_ORIGIN&&env.TURNSTILE_HOSTNAME&&env.EMAIL_PROVIDER_KEY&&env.EMAIL_FROM&&env.API_RATE_LIMITER);
const now=()=>Math.floor(Date.now()/1000);
async function getBody(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))return null;
  if(Number(request.headers.get('content-length')||0)>4096)return null;
  const raw=await request.text();
  if(raw.length>4096)return null;
  try{return JSON.parse(raw)}catch{return null}
}
async function checkTurnstile(token,env){
  if(typeof token!=='string'||!token||token.length>2048)return false;
  try{
    const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}),
      signal:AbortSignal.timeout(7000)
    });
    if(!res.ok)return false;
    const v=await res.json();
    return v.success===true&&v.hostname===env.TURNSTILE_HOSTNAME&&v.action==='ghv_vote';
  }catch{return false}
}
async function sendCode(email,code,env){
  const res=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:'Bearer '+env.EMAIL_PROVIDER_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.EMAIL_FROM,to:[email],
      subject:'Golden Himal Voice - Verify your vote',
      text:'Your one-time code is '+code+'. It expires in 10 minutes. Ignore if unsolicited.'}),
    signal:AbortSignal.timeout(9000)
  });
  return res.ok;
}
async function requestVote(data,env){
  const email=normalizedEmail(data.email);
  const validId=s=>typeof s==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(s);
  if(!email||!validId(data.contestantId)||!validId(data.roundId))
    return {status:400,data:{ok:false,error:'invalid_input'}};
  if(!await checkTurnstile(data.turnstileToken,env))
    return {status:403,data:{ok:false,error:'verification_required'}};
  const voterHash=await hmacHex(env.IDENTITY_PEPPER,email);
  // Soft per-identity throttling; SQL uniqueness is the strict guarantee.
  const rate=await env.API_RATE_LIMITER.limit({key:'voter:'+voterHash});
  if(!rate.success)return {status:429,data:{ok:false,error:'try_later'}};
  const time=now();
  const candidate=await env.DB.prepare(
    'SELECT c.id,r.state,r.opens_at,r.closes_at FROM contestants c JOIN rounds r ON r.id=c.round_id WHERE c.id=? AND c.round_id=? AND c.approved=1'
  ).bind(data.contestantId,data.roundId).first();
  if(!isActive(candidate,time))return {status:409,data:{ok:false,error:'voting_not_open'}};
  const existing=await env.DB.prepare('SELECT id FROM votes WHERE round_id=? AND voter_hash=? LIMIT 1').bind(data.roundId,voterHash).first();
  if(existing)return {status:409,data:{ok:false,error:'already_voted'}};
  const recent=await env.DB.prepare('SELECT COUNT(*) total FROM challenges WHERE round_id=? AND voter_hash=? AND created_at>?')
    .bind(data.roundId,voterHash,time-3600).first();
  if((recent?.total??0)>=3)return {status:429,data:{ok:false,error:'too_many_codes'}};
  const challengeId=crypto.randomUUID(),code=getSecureCode();
  const codeHash=await hmacHex(env.OTP_PEPPER,challengeId+':'+code);
  await env.DB.prepare('INSERT INTO challenges(id,round_id,voter_hash,code_hash,contestant_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?)')
    .bind(challengeId,data.roundId,voterHash,codeHash,data.contestantId,time,time+600).run();
  let sent=false;
  try{sent=await sendCode(email,code,env)}catch{sent=false}
  if(!sent){
    await env.DB.prepare('DELETE FROM challenges WHERE id=?').bind(challengeId).run();
    return {status:503,data:{ok:false,error:'delivery_unavailable'}};
  }
  return {status:202,data:{ok:true,challengeId,expiresInSeconds:600}};
}
async function confirmVote(data,env){
  if(typeof data.challengeId!=='string'||!/^[-a-f0-9]{36}$/.test(data.challengeId)
     ||typeof data.code!=='string'||!/^[0-9]{6}$/.test(data.code))
    return {status:400,data:{ok:false,error:'invalid_input'}};
  const time=now();
  const attempt=await env.DB.prepare(
    'UPDATE challenges SET attempts=attempts+1 WHERE id=? AND attempts<5 AND consumed_at IS NULL AND expires_at>? RETURNING id'
  ).bind(data.challengeId,time).first();
  if(!attempt)return {status:409,data:{ok:false,error:'expired_or_locked'}};
  const codeHash=await hmacHex(env.OTP_PEPPER,data.challengeId+':'+data.code);
  const voteId=crypto.randomUUID();
  try{
    // D1 batch is transactional. UNIQUE(round_id,voter_hash) prevents duplicates
    // even when parallel requests reach different Workers and locations.
    const results=await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO votes(id,round_id,contestant_id,voter_hash,created_at,challenge_id) '+
        'SELECT ?,ch.round_id,ch.contestant_id,ch.voter_hash,?,ch.id '+
        'FROM challenges ch JOIN rounds r ON ch.round_id=r.id '+
        'JOIN contestants c ON c.id=ch.contestant_id AND c.round_id=ch.round_id '+
        'WHERE ch.id=? AND ch.code_hash=? AND ch.consumed_at IS NULL AND ch.attempts<=5 AND ch.expires_at>? '+
        "AND r.state='open' AND r.opens_at<=? AND r.closes_at>? AND c.approved=1"
      ).bind(voteId,time,data.challengeId,codeHash,time,time,time),
      env.DB.prepare(
        'UPDATE challenges SET consumed_at=? WHERE id=? AND EXISTS(SELECT 1 FROM votes WHERE challenge_id=?)'
      ).bind(time,data.challengeId,data.challengeId),
      env.DB.prepare(
        "INSERT INTO audit_events(id,created_at,event,ref_id) SELECT ?,?,'vote_accepted',id FROM votes WHERE id=?"
      ).bind(crypto.randomUUID(),time,voteId)
    ]);
    if(results[0]?.meta?.changes===1)return {status:201,data:{ok:true,receipt:voteId}};
    return {status:409,data:{ok:false,error:'invalid_or_expired_code'}};
  }catch{
    return {status:409,data:{ok:false,error:'vote_not_accepted'}};
  }
}
export default {
  async fetch(request,env){
    const pathname=new URL(request.url).pathname;
    if(request.method==='GET'&&pathname==='/health')return reply({service:'golden-himal-vote-api',live:live(env)});
    if(!live(env))return publicFailure('service_not_live',503);
    const origin=request.headers.get('origin');
    if(origin!==env.ALLOWED_ORIGIN)return publicFailure('origin_not_allowed',403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
      'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'
    }});
    if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405,origin);
    const body=await getBody(request);
    if(!body||Array.isArray(body))return reply({ok:false,error:'invalid_json'},400,origin);
    let outcome;
    try{
      if(pathname==='/api/v1/vote/request')outcome=await requestVote(body,env);
      else if(pathname==='/api/v1/vote/confirm')outcome=await confirmVote(body,env);
      else outcome={status:404,data:{ok:false,error:'not_found'}};
    }catch{
      outcome={status:503,data:{ok:false,error:'temporarily_unavailable'}};
    }
    return reply(outcome.data,outcome.status,origin);
  }
};
