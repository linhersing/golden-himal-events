import {validPerformanceLink} from '../public/performance-link.js';
const cookieName='__Host-ghv-practice';
const hour=3600,day=86400;
const now=()=>Math.floor(Date.now()/1000);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const reply=(body,status=200,headers={})=>Response.json({testOnly:true,emailVerified:false,official:false,...body},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin',...headers}});
const deny=(error,status=400)=>reply({ok:false,error},status);
const cookie=(value,age=12*hour)=>`${cookieName}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
const actorInfo=a=>({workspace_id:a.workspace_id,actor_id:a.actor_id,role:a.role,expires_at:a.workspace_expires});
async function jsonBody(request){
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')||Number(request.headers.get('Content-Length')||0)>4000)return null;
 const text=await request.text();if(text.length>4000)return null;
 try{const b=JSON.parse(text);return b&&typeof b==='object'&&!Array.isArray(b)?b:null}catch{return null}
}
async function schemaReady(db){const r=await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('ghv_practice_workspaces','ghv_practice_actors','ghv_practice_sessions','ghv_practice_applications','ghv_practice_scores','ghv_practice_votes','ghv_practice_events')").first();return Number(r?.n)===7;}
async function session(db,request){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-ghv-practice=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;return db.prepare(`SELECT a.workspace_id,a.actor_id,a.role,w.expires_at AS workspace_expires,s.session_hash FROM ghv_practice_sessions s JOIN ghv_practice_actors a ON a.workspace_id=s.workspace_id AND a.actor_id=s.actor_id JOIN ghv_practice_workspaces w ON w.id=a.workspace_id WHERE s.session_hash=? AND s.expires_at>? AND w.expires_at>?`).bind(await hash(token),now(),now()).first();}
async function startSession(db,a){const token=random(),fingerprint=await hash(token);const result=await db.prepare(`INSERT INTO ghv_practice_sessions(session_hash,workspace_id,actor_id,expires_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM ghv_practice_sessions WHERE workspace_id=? AND actor_id=? AND expires_at>?)<6`).bind(fingerprint,a.workspace_id,a.actor_id,now()+12*hour,a.workspace_id,a.actor_id,now()).run();return result.meta?.changes?token:null;}
async function view(db,a){
 const args=a.role==='member'?[a.workspace_id,a.actor_id]:[a.workspace_id];
 const applications=(await db.prepare('SELECT id,actor_id,stage_name,round_code,category,province,song_title,original_artist,work_url,phase,fee_status,created_at FROM ghv_practice_applications WHERE workspace_id=?'+(a.role==='member'?' AND actor_id=?':'')+' ORDER BY created_at,id').bind(...args).all()).results||[];
 const scores=a.role==='member'?[]:(await db.prepare('SELECT application_id,judge_id,phase,technique,interpretation,stage_presence,appearance FROM ghv_practice_scores WHERE workspace_id=?'+(a.role==='judge'?' AND judge_id=?':'')+' ORDER BY application_id,phase,judge_id').bind(...(a.role==='judge'?[a.workspace_id,a.actor_id]:[a.workspace_id])).all()).results||[];
 const finalists=a.role==='member'?(await db.prepare("SELECT id,stage_name,category,round_code FROM ghv_practice_applications WHERE workspace_id=? AND phase='final' AND actor_id!=?").bind(a.workspace_id,a.actor_id).all()).results||[]:[];
 const voted=a.role==='member'?await db.prepare('SELECT application_id FROM ghv_practice_votes WHERE workspace_id=? AND voter_id=?').bind(a.workspace_id,a.actor_id).first():null;
 let standings=[];
 if(a.role==='organizer'){
  const finals=applications.filter(x=>x.phase==='final');
  const votes=(await db.prepare('SELECT application_id,COUNT(*) AS n FROM ghv_practice_votes WHERE workspace_id=? GROUP BY application_id').bind(a.workspace_id).all()).results||[];
  const max={};for(const p of finals)max[p.category]=Math.max(max[p.category]||0,Number(votes.find(v=>v.application_id===p.id)?.n||0));
  standings=finals.map(p=>{const ss=scores.filter(s=>s.application_id===p.id&&s.phase==='final'),count=ss.length,mean=count?ss.reduce((n,s)=>n+s.technique+s.interpretation+s.stage_presence+s.appearance,0)/count:null,v=Number(votes.find(v=>v.application_id===p.id)?.n||0),voteScore=max[p.category]?v/max[p.category]*100:0;return {id:p.id,stage_name:p.stage_name,category:p.category,votes:v,judges_count:count,judges_mean:mean,vote_score:voteScore,total_score:count===3?Number((voteScore*.51+mean*.49).toFixed(2)):null,official:false}});
 }
 return reply({ok:true,actor:actorInfo(a),applications,scores,finalists,voted,standings,source:'cloudflare-d1-private-practice'});
}
export async function handlePractice(request,env){
 if(env.STAGING_PRACTICE_ENABLED!=='true'||!env.E2E_DB)return deny('practice_not_configured',503);
 const db=env.E2E_DB,path=new URL(request.url).pathname.split('/').pop(),post=request.method==='POST';
 if(!['GET','POST'].includes(request.method))return deny('method_not_allowed',405);
 if(post&&request.headers.get('Origin')!==new URL(request.url).origin)return deny('same_origin_required',403);
 try{
  if(!await schemaReady(db))return deny('practice_schema_not_ready',503);
  if(path==='readiness'&&!post)return reply({ok:true,ready:true,source:'cloudflare-d1-private-practice',emailDeferred:true,feeDeferred:true});
  const body=post?await jsonBody(request):null;if(post&&!body)return deny('invalid_json');
  if(path==='create'&&post){
   if(body.synthetic!==true)return deny('synthetic_acknowledgement_required',422);
   const id=crypto.randomUUID(),time=now(),roles=[['member-a','member'],['member-b','member'],['judge-1','judge'],['judge-2','judge'],['judge-3','judge'],['organizer','organizer']];
   const passes=roles.map(([actor_id,role])=>({actor_id,role,pass:random()}));
   const inserts=[db.prepare('INSERT INTO ghv_practice_workspaces(id,created_at,expires_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM ghv_practice_workspaces)<20').bind(id,time,time+30*day)];
   for(const p of passes)inserts.push(db.prepare('INSERT INTO ghv_practice_actors(workspace_id,actor_id,role,recovery_hash) VALUES(?,?,?,?)').bind(id,p.actor_id,p.role,await hash(p.pass)));
   try{await db.batch(inserts)}catch{return deny('practice_capacity_reached',409)}
   const a={workspace_id:id,actor_id:'member-a',role:'member',workspace_expires:time+30*day};
   const token=await startSession(db,a);if(!token)return deny('practice_session_unavailable',503);
   return reply({ok:true,actor:actorInfo(a),passes,source:'cloudflare-d1-private-practice'},201,{'Set-Cookie':cookie(token)});
  }
  if(path==='login'&&post){
   if(!/^[a-f0-9]{64}$/.test(String(body.pass||'')))return deny('invalid_practice_pass',401);
   const a=await db.prepare('SELECT a.workspace_id,a.actor_id,a.role,w.expires_at AS workspace_expires FROM ghv_practice_actors a JOIN ghv_practice_workspaces w ON w.id=a.workspace_id WHERE a.recovery_hash=? AND w.expires_at>?').bind(await hash(body.pass),now()).first();
   if(!a)return deny('invalid_practice_pass',401);
   const token=await startSession(db,a);if(!token)return deny('too_many_practice_sessions',429);
   return reply({ok:true,actor:actorInfo(a)},200,{'Set-Cookie':cookie(token)});
  }
  const a=await session(db,request);if(!a)return deny('practice_login_required',401);
  if(path==='logout'&&post){await db.prepare('DELETE FROM ghv_practice_sessions WHERE session_hash=?').bind(a.session_hash).run();return reply({ok:true},200,{'Set-Cookie':cookie('',0)});}
  if(path==='me'&&!post)return view(db,a);
  if(!post)return deny('not_found',404);
  const ws=a.workspace_id,id=String(body.application_id||'');
  if(path==='application'){
   if(a.role!=='member')return deny('member_only',403);
   const keys=['synthetic','stage_name','round_code','category','province','song_title','original_artist','work_url'];
   if(Object.keys(body).some(k=>!keys.includes(k))||body.synthetic!==true)return deny('synthetic_fields_only',422);
   const clean=k=>typeof body[k]==='string'?body[k].trim():'';
   const stage=clean('stage_name'),song=clean('song_title'),artist=clean('original_artist'),province=clean('province'),link=clean('work_url');
   if(!stage||stage.length>60||!song||song.length>100||!artist||artist.length>100||!['koshi','madhesh','bagmati','gandaki','lumbini','karnali','sudurpashchim'].includes(province)||!['2027-01','2027-04'].includes(body.round_code)||!['university','community'].includes(body.category)||!validPerformanceLink(link))return deny('invalid_practice_application',422);
   const appId='GHV-TEST-'+crypto.randomUUID();
   try{await db.prepare('INSERT INTO ghv_practice_applications(id,workspace_id,actor_id,stage_name,round_code,category,province,song_title,original_artist,work_url,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(appId,ws,a.actor_id,stage,body.round_code,body.category,province,song,artist,link,now()).run()}catch{return deny('one_practice_entry_per_member',409)}
   const application=await db.prepare('SELECT id,stage_name,round_code,category,province,song_title,original_artist,work_url,phase,fee_status FROM ghv_practice_applications WHERE id=? AND workspace_id=?').bind(appId,ws).first();
   return reply({ok:true,application,source:'cloudflare-d1-private-practice'},201);
  }
  if(path==='simulate-fee'){
   if(a.role!=='member')return deny('member_only',403);
   const own=await db.prepare('SELECT id FROM ghv_practice_applications WHERE id=? AND workspace_id=? AND actor_id=?').bind(id,ws,a.actor_id).first();if(!own)return deny('application_not_found',404);
   await db.batch([db.prepare("UPDATE ghv_practice_applications SET fee_status='simulation_only' WHERE id=? AND workspace_id=? AND actor_id=?").bind(id,ws,a.actor_id),db.prepare("INSERT OR IGNORE INTO ghv_practice_events(workspace_id,application_id,kind,phase,created_at) VALUES(?,?,'fee_simulation','none',?)").bind(ws,id,now())]);
   return reply({ok:true,amount_npr:500,charged:false,redeemable:false,fee_status:'simulation_only'});
  }
  if(path==='score'){
   if(a.role!=='judge')return deny('judge_only',403);
   if(body.no_conflict!==true)return deny('conflict_declaration_required',422);
   if(!['demo','qualifier','final'].includes(body.phase))return deny('invalid_phase',422);
   const caps=body.phase==='demo'?[60,40,0,0]:[40,30,20,10];
   const values=[body.technique,body.interpretation,body.stage_presence??0,body.appearance??0];
   if(values.some((v,i)=>!Number.isInteger(v)||v<0||v>caps[i]))return deny('invalid_stage_scores',422);
   try{const result=await db.prepare(`INSERT INTO ghv_practice_scores(workspace_id,application_id,judge_id,phase,technique,interpretation,stage_presence,appearance,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ghv_practice_applications WHERE id=? AND workspace_id=? AND phase=?)`).bind(ws,id,a.actor_id,body.phase,...values,now(),id,ws,body.phase).run();if(!result.meta?.changes)return deny('stale_phase_or_application',409)}catch{return deny('already_scored_or_stale_phase',409)}
   return reply({ok:true,total:values.reduce((x,y)=>x+y,0),phase:body.phase,source:'cloudflare-d1-private-practice'},201);
  }
  if(path==='promote'){
   if(a.role!=='organizer')return deny('organizer_only',403);
   const next=body.phase==='demo'?'qualifier':body.phase==='qualifier'?'final':null;if(!next)return deny('invalid_stage_transition',409);
   try{const result=await db.prepare('UPDATE ghv_practice_applications SET phase=? WHERE id=? AND workspace_id=? AND phase=?').bind(next,id,ws,body.phase).run();if(!result.meta?.changes)return deny('stale_phase_or_application',409)}catch{return deny('three_distinct_judges_required',409)}
   return reply({ok:true,phase:next});
  }
  if(path==='vote'){
   if(a.role!=='member')return deny('member_only',403);
   const app=await db.prepare("SELECT actor_id FROM ghv_practice_applications WHERE id=? AND workspace_id=? AND phase='final'").bind(id,ws).first();if(!app)return deny('not_practice_finalist',404);if(app.actor_id===a.actor_id)return deny('test_self_vote_disallowed',403);
   try{await db.prepare('INSERT INTO ghv_practice_votes(workspace_id,voter_id,application_id,created_at) VALUES(?,?,?,?)').bind(ws,a.actor_id,id,now()).run()}catch{return deny('already_voted_in_practice',409)}
   return reply({ok:true,testRestriction:'one_vote_per_synthetic_actor_not_official_policy'},201);
  }
  if(path==='cleanup'){
   if(a.role!=='organizer')return deny('organizer_only',403);
   if(body.confirmation!=='DELETE PRACTICE')return deny('cleanup_confirmation_required',422);
   await db.prepare('DELETE FROM ghv_practice_workspaces WHERE id=?').bind(ws).run();
   return reply({ok:true,deleted_workspace:ws},200,{'Set-Cookie':cookie('',0)});
  }
  return deny('not_found',404);
 }catch{return deny('practice_database_unavailable',503)}
}
