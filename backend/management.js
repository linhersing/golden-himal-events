// Golden Himal Voice — server-authorized read-only management for ALL synthetic
// test workspaces. This is deliberately distinct from self-issued practice role passes.
// Cloudflare Access must authenticate the exact Worker request (ctx.access).
// Do not add anonymous fallbacks or trust user-supplied email / role / headers.
import {entrantLocationsReady,entrantLocationFields,entrantLocationJoin} from './entrant-location.js';
const headers={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'Cross-Origin-Resource-Policy':'same-origin',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
};
const respond=(v,status=200)=>Response.json(v,{status,headers});
const denied=(error,status)=>respond({ok:false,error},status);
const count=x=>Number(x||0);
const allowedEmails=env=>String(env.GHV_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
const tokenCache={keys:null,until:0,domain:null};
function b64url(part){
 const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function safeTeam(value){
 const v=String(value||'').toLowerCase().replace(/\/$/,'');
 return /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(v)?v:null;
}
async function verifyAccessJwt(request,env){
 const raw=request.headers.get('Cf-Access-Jwt-Assertion');
 const domain=safeTeam(env.GHV_ADMIN_TEAM_DOMAIN);
 if(!domain||!raw||raw.length>12000)return null;
 const parts=raw.split('.');
 if(parts.length!==3||parts.some(x=>!x||x.length>10000))return null;
 let header,claims;
 try{header=JSON.parse(new TextDecoder().decode(b64url(parts[0])));
  claims=JSON.parse(new TextDecoder().decode(b64url(parts[1])))}catch{return null}
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>160||
  claims.iss!==domain||!Array.isArray(claims.aud)||
  !claims.aud.includes(env.GHV_ADMIN_ACCESS_AUD)||
  claims.type!=='app'||!Number.isFinite(claims.exp)||
  claims.exp<=Math.floor(Date.now()/1000)||!Number.isFinite(claims.iat)||
  claims.iat>Math.floor(Date.now()/1000)+60)return null;
 // Fetch signing keys only from the exact configured Access team hostname.
 let keys=tokenCache.keys;
 if(!keys||tokenCache.until<Date.now()||tokenCache.domain!==domain){
  try{
   const response=await fetch(domain+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(5000)});
   if(!response.ok)return null;
   const json=await response.json();keys=Array.isArray(json.keys)?json.keys:[];
   if(keys.length>8)return null;
   tokenCache.keys=keys;tokenCache.until=Date.now()+300000;tokenCache.domain=domain;
  }catch{return null}
 }
 const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(k.alg==='RS256'||!k.alg)&&
  k.use!=='enc');
 if(!jwk)return null;
 try{
  const publicKey=await crypto.subtle.importKey('jwk',jwk,
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,
   b64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  return valid?claims:null;
 }catch{return null}
}
async function privileged(request,env,ctx){
 const domain=safeTeam(env.GHV_ADMIN_TEAM_DOMAIN);
 if(env.GHV_MANAGEMENT_ENABLED!=='true'||!env.GHV_ADMIN_ACCESS_AUD||
  !domain||!allowedEmails(env).length)
  return {error:'admin_access_not_configured',status:503};
 // Native ctx.access (when provided) is already authenticated by Cloudflare.
 // Workers Static Assets may suppress ctx.access; the JWT verification below
 // provides a secure fallback, NEVER trust plain email/role request headers.
 try{
  if(ctx?.access&&ctx.access.aud===env.GHV_ADMIN_ACCESS_AUD){
   const identity=await ctx.access.getIdentity(),email=String(identity?.email||'').trim().toLowerCase();
   if(email&&allowedEmails(env).includes(email))return {ok:true};
   return {error:'not_an_event_administrator',status:403};
  }
 }catch{}
 const claims=await verifyAccessJwt(request,env);
 if(!claims)return {error:'cloudflare_access_required',status:403};
 const email=String(claims.email||'').trim().toLowerCase();
 if(!email||!allowedEmails(env).includes(email))
  return {error:'not_an_event_administrator',status:403};
 return {ok:true};
}
const privacy={testOnly:true,official:false,
 financialStatus:'NOT_CONNECTED_NO_REAL_PAYMENTS',
 scope:'ALL_ACTIVE_SYNTHETIC_WORKSPACES',
 explanation:'Synthetic Cloudflare D1 test data only. No official registration, no real money, no verified participants.'};
async function tables(db){
 const r=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ghv_practice_workspaces','ghv_practice_applications','ghv_practice_scores','ghv_practice_votes','ghv_practice_vouchers','e2e_accounts','e2e_applications','e2e_judge_scores','e2e_live_scores','e2e_payment_events')").all();
 return new Set((r.results||[]).map(x=>x.name));
}
const practiceTables=['ghv_practice_workspaces','ghv_practice_applications','ghv_practice_scores','ghv_practice_votes','ghv_practice_vouchers'];
const e2eTables=['e2e_accounts','e2e_applications','e2e_judge_scores','e2e_live_scores','e2e_payment_events'];
const numeric=o=>Object.fromEntries(Object.entries(o||{}).map(([k,v])=>[k,count(v)]));
async function practiceOverview(db){
 const now=Math.floor(Date.now()/1000);
 const row=await db.prepare(`SELECT
 COUNT(DISTINCT w.id) AS active_workspaces,
 COUNT(a.id) AS applications,
 COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN a.workspace_id || ':' || a.actor_id END) AS distinct_test_identities,
 SUM(CASE WHEN a.round_code='2027-01' THEN 1 ELSE 0 END) AS january,
 SUM(CASE WHEN a.round_code='2027-04' THEN 1 ELSE 0 END) AS april,
 SUM(CASE WHEN a.category='university' THEN 1 ELSE 0 END) AS university,
 SUM(CASE WHEN a.category='community' THEN 1 ELSE 0 END) AS community,
 SUM(CASE WHEN a.province='bagmati' THEN 1 ELSE 0 END) AS bagmati,
 SUM(CASE WHEN a.province='gandaki' THEN 1 ELSE 0 END) AS gandaki,
 SUM(CASE WHEN a.phase='demo' THEN 1 ELSE 0 END) AS demo,
 SUM(CASE WHEN a.phase='qualifier' THEN 1 ELSE 0 END) AS qualifier,
 SUM(CASE WHEN a.phase='final' THEN 1 ELSE 0 END) AS final,
 SUM(CASE WHEN a.fee_status='deferred' THEN 1 ELSE 0 END) AS mock_unpaid,
 SUM(CASE WHEN a.fee_status='simulation_only' THEN 1 ELSE 0 END) AS mock_paid
 FROM ghv_practice_workspaces w
 LEFT JOIN ghv_practice_applications a ON a.workspace_id=w.id
 WHERE w.expires_at>?`).bind(now).first();
 const more=await db.prepare(`SELECT
 (SELECT COUNT(*) FROM ghv_practice_scores s JOIN ghv_practice_workspaces w ON w.id=s.workspace_id WHERE w.expires_at>?) AS scorecards,
 (SELECT COUNT(*) FROM ghv_practice_votes v JOIN ghv_practice_workspaces w ON w.id=v.workspace_id WHERE w.expires_at>?) AS votes,
 (SELECT COUNT(*) FROM ghv_practice_vouchers v JOIN ghv_practice_workspaces w ON w.id=v.workspace_id WHERE w.expires_at>?) AS nonredeemable_vouchers`).bind(now,now,now).first();
 return {...numeric(row),...numeric(more)};
}
async function e2eOverview(db){
 const x=await db.prepare(`SELECT COUNT(*) AS applications,
 COUNT(DISTINCT account_id) AS distinct_test_identities,
 SUM(CASE WHEN round_code='2027-01' THEN 1 ELSE 0 END) AS january,
 SUM(CASE WHEN round_code='2027-04' THEN 1 ELSE 0 END) AS april,
 SUM(CASE WHEN category='university' THEN 1 ELSE 0 END) AS university,
 SUM(CASE WHEN category='community' THEN 1 ELSE 0 END) AS community,
 SUM(CASE WHEN phase='demo' THEN 1 ELSE 0 END) AS demo,
 SUM(CASE WHEN phase='qualifier' THEN 1 ELSE 0 END) AS qualifier,
 SUM(CASE WHEN phase='final' THEN 1 ELSE 0 END) AS final,
 SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) AS submitted,
 SUM(CASE WHEN status='needs_info' THEN 1 ELSE 0 END) AS needs_info,
 SUM(CASE WHEN status='under_review' THEN 1 ELSE 0 END) AS under_review,
 SUM(CASE WHEN status='scored' THEN 1 ELSE 0 END) AS scored,
 SUM(CASE WHEN status='shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
 SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected,
 SUM(CASE WHEN status='withdrawn' THEN 1 ELSE 0 END) AS withdrawn,
 SUM(CASE WHEN payment_status='unpaid' THEN 1 ELSE 0 END) AS mock_unpaid,
 SUM(CASE WHEN payment_status='simulated_paid' THEN 1 ELSE 0 END) AS mock_paid
 FROM e2e_applications`).first();
 const t=await db.prepare(`SELECT
 (SELECT COUNT(*) FROM e2e_judge_scores) AS demo_scorecards,
 (SELECT COUNT(*) FROM e2e_live_scores) AS live_scorecards,
 (SELECT COUNT(*) FROM e2e_payment_events) AS payment_simulation_events`).first();
 return {...numeric(x),...numeric(t),scorecards:count(t?.demo_scorecards)+count(t?.live_scorecards)};
}
async function rows(db,source,limit,offset){
 if(source==='practice'){
  const time=Math.floor(Date.now()/1000);
  const total=(await db.prepare(`SELECT COUNT(*) AS n FROM ghv_practice_applications a JOIN ghv_practice_workspaces w ON w.id=a.workspace_id WHERE w.expires_at>?`).bind(time).first())?.n||0;
  const rs=await db.prepare(`SELECT a.id,a.workspace_id,a.round_code,a.category,a.province,a.phase,a.fee_status,a.created_at,
  (SELECT COUNT(*) FROM ghv_practice_scores s WHERE s.workspace_id=a.workspace_id AND s.application_id=a.id AND s.phase=a.phase) AS scorecards,
  (SELECT ROUND(AVG(s.technique+s.interpretation+s.stage_presence+s.appearance),2) FROM ghv_practice_scores s WHERE s.workspace_id=a.workspace_id AND s.application_id=a.id AND s.phase=a.phase AND s.recused=0) AS score_mean,
  (SELECT COUNT(*) FROM ghv_practice_votes v WHERE v.workspace_id=a.workspace_id AND v.application_id=a.id) AS votes,
  (SELECT COUNT(*) FROM ghv_practice_vouchers v WHERE v.workspace_id=a.workspace_id AND v.application_id=a.id) AS test_vouchers
  FROM ghv_practice_applications a JOIN ghv_practice_workspaces w ON w.id=a.workspace_id WHERE w.expires_at>?
  ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`).bind(time,limit,offset).all();
  return {total:count(total),items:(rs.results||[]).map(r=>({record_id:r.id,scope:'practice',round_code:r.round_code,category:r.category,province:r.province,
   phase:r.phase,review_status:r.phase==='demo'?'demo':r.phase,
   payment_status:r.fee_status,amount_npr:null,real_payment:false,
   scorecards:count(r.scorecards),score_mean:r.score_mean===null?null:Number(r.score_mean),
   votes:count(r.votes),test_vouchers:count(r.test_vouchers),created_at:r.created_at}))};
 }
 const total=(await db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').first())?.n||0;
 const locations=await entrantLocationsReady(db);
 const rs=await db.prepare(`SELECT p.id,p.round_code,p.category,${entrantLocationFields(locations,false)},p.phase,p.status,p.payment_status,p.created_at,
  (SELECT COUNT(*) FROM e2e_judge_scores s WHERE s.application_id=p.id) AS demo_scorecards,
  (SELECT ROUND(AVG(s.technique+s.interpretation),2) FROM e2e_judge_scores s WHERE s.application_id=p.id) AS demo_mean,
  (SELECT COUNT(*) FROM e2e_live_scores s WHERE s.application_id=p.id AND s.stage=p.phase) AS live_scorecards,
  (SELECT ROUND(AVG(s.technique+s.interpretation+s.stage_presence+s.appearance),2) FROM e2e_live_scores s WHERE s.application_id=p.id AND s.stage=p.phase) AS live_mean
  FROM e2e_applications p${entrantLocationJoin(locations)} ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`).bind(limit,offset).all();
 return {total:count(total),items:(rs.results||[]).map(r=>({record_id:r.id,scope:'e2e',round_code:r.round_code,category:r.category,province:r.province,
  phase:r.phase,review_status:r.status,payment_status:r.payment_status,amount_npr:null,real_payment:false,
  scorecards:count(r.phase==='demo'?r.demo_scorecards:r.live_scorecards),
  score_mean:(r.phase==='demo'?r.demo_mean:r.live_mean)===null?null:Number(r.phase==='demo'?r.demo_mean:r.live_mean),
  created_at:r.created_at}))};
}
async function scores(db,source,limit,offset){
 if(source==='practice'){
  const now=Math.floor(Date.now()/1000);
  const total=await db.prepare(`SELECT COUNT(*) AS n FROM ghv_practice_scores s
   JOIN ghv_practice_workspaces w ON w.id=s.workspace_id WHERE w.expires_at>?`).bind(now).first();
  const result=await db.prepare(`SELECT s.application_id,s.judge_id,s.phase,
   s.technique,s.interpretation,s.stage_presence,s.appearance,s.recused,s.created_at
   FROM ghv_practice_scores s JOIN ghv_practice_workspaces w ON w.id=s.workspace_id
   WHERE w.expires_at>? ORDER BY s.created_at DESC,s.application_id,s.judge_id
   LIMIT ? OFFSET ?`).bind(now,limit,offset).all();
  return {total:count(total?.n),items:(result.results||[]).map(x=>({...x,
   total_score:x.recused?null:count(x.technique)+count(x.interpretation)+count(x.stage_presence)+count(x.appearance),
   role:'test_judge'}))};
 }
 const total=await db.prepare('SELECT (SELECT COUNT(*) FROM e2e_judge_scores)+(SELECT COUNT(*) FROM e2e_live_scores) AS n').first();
 const result=await db.prepare(`SELECT application_id,reviewer_id AS judge_id,'demo' AS phase,
  technique,interpretation,0 AS stage_presence,0 AS appearance,0 AS recused,created_at
  FROM e2e_judge_scores
  UNION ALL
  SELECT application_id,reviewer_id AS judge_id,stage AS phase,
  technique,interpretation,stage_presence,appearance,0 AS recused,created_at
  FROM e2e_live_scores
  ORDER BY created_at DESC,application_id,judge_id LIMIT ? OFFSET ?`).bind(limit,offset).all();
 return {total:count(total?.n),items:(result.results||[]).map(x=>({...x,
  total_score:count(x.technique)+count(x.interpretation)+count(x.stage_presence)+count(x.appearance),role:'test_reviewer'}))};
}
async function payments(db,source,limit,offset){
 if(source==='practice'){
  const time=Math.floor(Date.now()/1000);
  const total=await db.prepare(`SELECT COUNT(*) AS n FROM ghv_practice_applications a
   JOIN ghv_practice_workspaces w ON w.id=a.workspace_id WHERE w.expires_at>?`).bind(time).first();
  const result=await db.prepare(`SELECT a.id AS application_id,a.round_code,a.fee_status AS payment_status,
   a.created_at,(SELECT COUNT(*) FROM ghv_practice_events ev
   WHERE ev.workspace_id=a.workspace_id AND ev.application_id=a.id AND ev.kind='fee_simulation') AS mock_events
   FROM ghv_practice_applications a JOIN ghv_practice_workspaces w ON w.id=a.workspace_id
   WHERE w.expires_at>? ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`).bind(time,limit,offset).all();
  return {total:count(total?.n),items:(result.results||[]).map(x=>({
   ...x,mock_events:count(x.mock_events),real_paid:false,real_amount_npr:null,
   simulated_amount_npr:x.payment_status==='simulation_only'?500:null
  }))};
 }
 const total=await db.prepare('SELECT COUNT(*) AS n FROM e2e_applications').first();
 const result=await db.prepare(`SELECT a.id AS application_id,a.round_code,a.payment_status,a.created_at,
  pe.event_type,pe.amount_paisa
  FROM e2e_applications a LEFT JOIN e2e_payment_events pe ON pe.application_id=a.id
  ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`).bind(limit,offset).all();
 return {total:count(total?.n),items:(result.results||[]).map(x=>({
  ...x,real_paid:false,real_amount_npr:null,
  simulated_amount_npr:x.payment_status==='simulated_paid'&&x.event_type==='SIMULATED_PAYMENT'?
   count(x.amount_paisa)/100:null
 }))};
}

export async function handleManagement(request,env,ctx){
 if(request.method!=='GET')return denied('read_only_method_required',405);
 const auth=await privileged(request,env,ctx);
 if(!auth.ok)return denied(auth.error,auth.status);
 if(!env.E2E_DB)return denied('d1_not_bound',503);
 const url=new URL(request.url);
 const kind=url.pathname.split('/').pop();
 const source=url.searchParams.get('source')||'practice';
 if(!['practice','e2e'].includes(source))return denied('invalid_source',400);
 try{
  const db=env.E2E_DB,t=await tables(db);
  const practiceReady=practiceTables.every(x=>t.has(x)),e2eReady=e2eTables.every(x=>t.has(x));
  if(kind==='overview'){
   const practices=practiceReady?{status:'available',counts:await practiceOverview(db)}:{status:'not_configured',counts:null};
   const sandbox=e2eReady?{status:'available',counts:await e2eOverview(db)}:{status:'not_configured',counts:null};
   return respond({ok:true,...privacy,as_of:new Date().toISOString(),
    sources:{practice:practices,e2e:sandbox},
    actual_payments:{status:'NOT_CONNECTED',paid_count:null,received_npr:null},
    warning:'All payment statuses refer to simulations only; never aggregate mock paid statuses into real revenue.'});
  }
  if(['records','scores','payments'].includes(kind)){
   if((source==='practice'&&!practiceReady)||(source==='e2e'&&!e2eReady))
    return respond({ok:true,...privacy,source,status:'not_configured',total:null,items:[]});
   const p=Number(url.searchParams.get('page')||1);
   if(!Number.isSafeInteger(p)||p<1||p>1000)return denied('invalid_page',400);
   const limit=50;
   const result=kind==='records'?await rows(db,source,limit,(p-1)*limit):
    kind==='scores'?await scores(db,source,limit,(p-1)*limit):
    await payments(db,source,limit,(p-1)*limit);
   return respond({ok:true,...privacy,source,status:'available',page:p,page_size:limit,
    ...result,as_of:new Date().toISOString()});
  }
  return denied('not_found',404);
 }catch{return denied('management_database_unavailable',503)}
}
