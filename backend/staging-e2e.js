import {mailProviderReady,mailSenderReady,sendTestEmail} from './staging-mail.js';
import {validPerformanceLink} from '../public/performance-link.js';
import {handleV2Route} from './staging-v2-flow.js';
/* Golden Himal Voice: real D1-backed, test-only acceptance API.
 * Explicit opt-in and allowlisted emails. No production applicants, actual payments,
 * public registration, raw passwords, magic-code shortcuts or exposed R2 URLs.
 */
const COOKIE='__Host-ghv-e2e';
const MAX_AGE=12*3600;
const NOW=()=>Math.floor(Date.now()/1000);
const secureHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{...secureHeaders,...headers}});
const deny=(code,status=400)=>json({ok:false,error:code},status);
const uuid=()=>crypto.randomUUID();
const encode=u=>Array.from(u,b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>crypto.getRandomValues(new Uint8Array(32));
async function sign(env,message){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STAGING_IDENTITY_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return encode(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))));
}
const norm=s=>String(s||'').trim().toLowerCase();
function emails(env,name){return String(env[name]||'').split(',').map(norm).filter(Boolean)}
function hint(email){const [name,domain]=email.split('@');return (name.slice(0,2)||'*')+'***@'+domain}
function emailAllowed(email,env,role){
 const list=emails(env,role==='organizer'?'STAGING_ORGANIZER_EMAILS':role==='reviewer'?'STAGING_REVIEWER_EMAILS':'STAGING_ALLOWED_EMAILS');
 return list.includes(email);
}
function configured(env){
 return env.STAGING_E2E_ENABLED==='true'&&env.DB&&mailProviderReady(env)&&mailSenderReady(env)&&
 typeof env.STAGING_IDENTITY_SECRET==='string'&&env.STAGING_IDENTITY_SECRET.length>=32&&
 emails(env,'STAGING_ALLOWED_EMAILS').length>0;
}
function cookie(token,age=MAX_AGE){return COOKIE+'='+token+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax'}
async function bodyJSON(request,max=2600){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return null;
 if(Number(request.headers.get('content-length')||0)>max)return null;
 const raw=await request.text();if(raw.length>max)return null;
 try{const value=JSON.parse(raw);return value&&typeof value==='object'&&!Array.isArray(value)?value:null}catch{return null}
}
async function account(request,env){
 const match=request.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+COOKIE+'=([a-f0-9]{64})(?:;|$)'));
 if(!match)return null;
 const fingerprint=await sign(env,'session:'+match[1]);
 return await env.DB.prepare('SELECT a.id,a.role,a.email_hint FROM e2e_sessions s JOIN e2e_accounts a ON a.id=s.account_id WHERE s.session_fingerprint=? AND s.expires_at>?').bind(fingerprint,NOW()).first();
}
const sameOrigin=request=>request.headers.get('Origin')===new URL(request.url).origin;
function requireRole(a,role){return a&&a.role===role}
function selectApplication(db,id,userId){
 return db.prepare('SELECT * FROM e2e_applications WHERE id=? AND account_id=?').bind(id,userId).first();
}
async function requestCode(request,env){
 const b=await bodyJSON(request);if(!b)return deny('invalid_json');
 const email=norm(b.email),role=['member','reviewer','organizer'].includes(b.role)?b.role:'member';
 if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)||email.length>250)return deny('invalid_email');
 if(!emailAllowed(email,env,role))return deny('not_on_test_allowlist',403);
 const fingerprint=await sign(env,'email:'+email);
 const period=NOW()-600;
 const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM e2e_email_challenges WHERE email_fingerprint=? AND created_at>?').bind(fingerprint,period).first();
 if(Number(recent?.n||0)>=3)return deny('too_many_code_requests',429);
 const id=uuid(),digits=new Uint32Array(1);crypto.getRandomValues(digits);
 const code=String(digits[0]%1000000).padStart(6,'0');
 const hashed=await sign(env,'challenge:'+id+':'+code);
 await env.DB.prepare('INSERT INTO e2e_email_challenges(id,email_fingerprint,code_fingerprint,kind,expires_at,created_at) VALUES(?,?,?,?,?,?)')
 .bind(id,fingerprint,hashed,role,NOW()+600,NOW()).run();
 try{
  await sendTestEmail(env,{from:env.STAGING_FROM_EMAIL,to:email,
   subject:'Golden Himal Voice TEST ['+role+'] — request '+id.slice(0,8),
   text:'Golden Himal Voice STAGING ONLY. Your one-time verification code is '+code+
        '. It expires in 10 minutes. Request reference: '+id.slice(0,8)+'. Role: '+role+'. If you did not request it, ignore this message. No payments are being collected.',
   html:'<p><strong>Golden Himal Voice — TEST ONLY</strong></p><p>Your one-time verification code is <strong>'+code+
        '</strong>. Valid for 10 minutes.</p><p>Request reference: '+id.slice(0,8)+' · Role: '+role+'</p><p>No real payment or public registration is enabled.</p>'});
 }catch{
  await env.DB.prepare('UPDATE e2e_email_challenges SET used_at=? WHERE id=?').bind(NOW(),id).run();
  return deny('test_email_service_unavailable',503)
 }
 return json({ok:true,challenge_id:id,request_ref:id.slice(0,8),resend_after:60,message:'Check the allowlisted test mailbox. Code expires in 10 minutes.'});
}
async function verifyCode(request,env){
 const b=await bodyJSON(request);if(!b||!/^\d{6}$/.test(String(b.code||''))||!/^[-a-f0-9]{36}$/i.test(String(b.challenge_id||'')))return deny('invalid_challenge');
 const challenge=await env.DB.prepare('SELECT * FROM e2e_email_challenges WHERE id=?').bind(b.challenge_id).first();
 if(!challenge||challenge.used_at||challenge.expires_at<=NOW()||challenge.attempts>=5)return deny('expired_or_invalid_code',401);
 const attempt=await env.DB.prepare('UPDATE e2e_email_challenges SET attempts=attempts+1 WHERE id=? AND used_at IS NULL AND expires_at>? AND attempts<5').bind(challenge.id,NOW()).run();
 // Attempts can race: only a successfully incremented slot may test a code.
 if(!attempt.meta?.changes)return deny('expired_or_invalid_code',401);
 const hash=await sign(env,'challenge:'+challenge.id+':'+b.code);
 if(hash!==challenge.code_fingerprint)return deny('expired_or_invalid_code',401);
 const used=await env.DB.prepare('UPDATE e2e_email_challenges SET used_at=? WHERE id=? AND used_at IS NULL AND expires_at>? AND attempts<=5').bind(NOW(),challenge.id,NOW()).run();
 if(!used.meta?.changes)return deny('expired_or_invalid_code',401);
 let a=await env.DB.prepare('SELECT id,role FROM e2e_accounts WHERE email_fingerprint=?').bind(challenge.email_fingerprint).first();
 if(!a){
  // Role is derived from a server-only allowlist at time of initial challenge, not browser-supplied at verify.
  const aid=uuid(),role=challenge.kind;
  const hintValue='verified-test-mailbox';
  await env.DB.prepare('INSERT OR IGNORE INTO e2e_accounts(id,email_fingerprint,email_hint,role,verified_at,created_at) VALUES(?,?,?,?,?,?)')
   .bind(aid,challenge.email_fingerprint,hintValue,role,NOW(),NOW()).run();
  a=await env.DB.prepare('SELECT id,role FROM e2e_accounts WHERE email_fingerprint=?').bind(challenge.email_fingerprint).first();
 }
 if(a.role!==challenge.kind)return deny('wrong_account_role',403);
 const token=encode(random()),sessionHash=await sign(env,'session:'+token);
 await env.DB.prepare('INSERT INTO e2e_sessions(session_fingerprint,account_id,expires_at,created_at) VALUES(?,?,?,?)')
 .bind(sessionHash,a.id,NOW()+MAX_AGE,NOW()).run();
 return json({ok:true,role:a.role,account_id:a.id},200, {'Set-Cookie':cookie(token)});
}
async function logout(request,env,a){
 const match=request.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+COOKIE+'=([a-f0-9]{64})(?:;|$)'));
 if(match)await env.DB.prepare('DELETE FROM e2e_sessions WHERE session_fingerprint=?').bind(await sign(env,'session:'+match[1])).run();
 return json({ok:true},200,{'Set-Cookie':cookie('',0)});
}
async function applications(a,env){
 const rows=await env.DB.prepare('SELECT id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,media_key IS NOT NULL AS has_uploaded_file,eligibility_key IS NOT NULL AS has_eligibility_file,receipt_key IS NOT NULL AS has_receipt_file,phase,status,payment_status,created_at FROM e2e_applications WHERE account_id=? ORDER BY created_at DESC').bind(a.id).all();
 return json({ok:true,account:{id:a.id,role:a.role},applications:rows.results||[],testOnly:true});
}
async function submitApplication(request,env,a){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const b=await bodyJSON(request,4500);if(!b)return deny('invalid_json');
 if(!['2027-01','2027-04'].includes(b.round_code))return deny('invalid_audition_window');
 if(!['university','community'].includes(b.category))return deny('invalid_category');
 if(!['bagmati','gandaki'].includes(b.province))return deny('invalid_province');
 if(!['residence','study','work'].includes(b.location_basis))return deny('invalid_location_basis');
 // V2 only explicitly sets the 18+ cut-off for the community group.
 // This TEST checkbox is self-attestation, not proof of real eligibility.
 if(b.category==='community'&&b.adult_confirmed!==true)return deny('community_age_confirmation_required',422);
 if(b.category==='university'&&b.student_confirmed!==true)return deny('university_student_confirmation_required',422);
 if(b.no_exclusive_contract!==true)return deny('contract_declaration_required',422);
 const fields=['stage_name','affiliation','song_title','original_artist','song_language','song_key'];
 const values=fields.map(k=>String(b[k]||'').trim());
 if(values.some(x=>x.length<1||x.length>100)||values[0].length<2)return deny('missing_song_or_identity_test_fields',422);
 const url=String(b.demo_url||'').trim();
 if((env.STAGING_SUBMISSION_MODE==='links'&&!url)||(url&&!validPerformanceLink(url)))return deny('invalid_demo_url',422);
 const prior=await env.DB.prepare('SELECT category,phase FROM e2e_applications WHERE account_id=? LIMIT 1').bind(a.id).first();
 if(prior&&prior.category!==b.category)return deny('annual_category_locked',409);
 const finalist=await env.DB.prepare("SELECT id FROM e2e_applications WHERE account_id=? AND phase='final' LIMIT 1").bind(a.id).first();
 if(finalist)return deny('already_finalist',409);
 const id=uuid();
 try{
  await env.DB.prepare('INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .bind(id,a.id,b.round_code,b.category,b.province,b.location_basis,...values.slice(1,2),values[0],...values.slice(2),url||null,NOW(),NOW()).run();
 }catch{return deny('duplicate_round_or_database_rejected',409)}
 return json({ok:true,application_id:id,phase:'demo',status:'submitted',source:'cloudflare-d1-staging',testOnly:true},201);
}
async function mockPayment(request,env,a){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const b=await bodyJSON(request);if(!b)return deny('invalid_json');
 const app=await selectApplication(env.DB,b.application_id,a.id);if(!app)return deny('application_not_found',404);
 if(app.payment_status==='simulated_paid')return json({ok:true,status:'simulated_paid',amount_npr:500,already:true});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO e2e_payment_events(id,application_id,event_type,created_at) VALUES(?,?,'SIMULATED_PAYMENT',?)").bind(uuid(),app.id,NOW()).run();
 await env.DB.prepare("UPDATE e2e_applications SET payment_status='simulated_paid', status='under_review',updated_at=? WHERE id=? AND account_id=? AND status='submitted'").bind(NOW(),app.id,a.id).run();
 return json({ok:true,status:'simulated_paid',amount_npr:500,testOnly:true,realCharge:false});
}
// Demo media and private eligibility/TEST receipt evidence share private R2, not URLs.
// Judge access is limited to performance media, never eligibility/receipt documents.
async function mediaUpload(request,env,a){
 if(!requireRole(a,'member'))return deny('member_only',403);
 if(env.STAGING_SUBMISSION_MODE==='links')return deny('link_submission_only',409);
 if(!env.STAGING_MEDIA)return deny('r2_bucket_not_configured',503);
 const url=new URL(request.url);
 const app=await selectApplication(env.DB,url.searchParams.get('application'),a.id);
 if(!app||app.status==='withdrawn')return deny('application_not_found',404);
 const kind=url.searchParams.get('kind')||'demo';
 if(!['demo','eligibility','receipt'].includes(kind))return deny('upload_kind_not_allowed',422);
 const type=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 const allowed=kind==='demo'?['video/mp4','video/webm']:['application/pdf','image/png','image/jpeg'];
 if(!allowed.includes(type))return deny('media_type_not_allowed',415);
 const max=(kind==='demo'?20:5)*1024*1024;
 if(Number(request.headers.get('content-length')||0)>max)return deny('file_too_large',413);
 const data=await request.arrayBuffer();
 if(data.byteLength<100||data.byteLength>max)return deny('invalid_file_size',413);
 const column=kind==='demo'?'media_key':kind==='eligibility'?'eligibility_key':'receipt_key';
 const key='e2e/'+app.account_id+'/'+app.id+'/'+kind+'/'+uuid();
 await env.STAGING_MEDIA.put(key,data,{httpMetadata:{contentType:type},customMetadata:{applicationId:app.id,kind}});
 try{await env.DB.prepare('UPDATE e2e_applications SET '+column+'=?,updated_at=? WHERE id=? AND account_id=?')
   .bind(key,NOW(),app.id,a.id).run()}
 catch{await env.STAGING_MEDIA.delete(key);return deny('database_unavailable',503)}
 if(app[column])await env.STAGING_MEDIA.delete(app[column]);
 return json({ok:true,stored:true,kind,application_id:app.id,bytes:data.byteLength,private:true,testOnly:true});
}
async function streamMedia(request,env,a){
 if(!a)return deny('login_required',401);
 if(!env.STAGING_MEDIA)return deny('r2_bucket_not_configured',503);
 const url=new URL(request.url),kind=url.searchParams.get('kind')||'demo';
 if(!['demo','eligibility','receipt'].includes(kind))return deny('not_found',404);
 const column=kind==='demo'?'media_key':kind==='eligibility'?'eligibility_key':'receipt_key';
 const app=await env.DB.prepare('SELECT id,account_id,'+column+' AS asset_key FROM e2e_applications WHERE id=?').bind(url.searchParams.get('application')).first();
 if(!app||!app.asset_key)return deny('not_found',404);
 if(app.account_id!==a.id&&a.role!=='organizer'&&!(a.role==='reviewer'&&kind==='demo'))return deny('not_found',404);
 const obj=await env.STAGING_MEDIA.get(app.asset_key);if(!obj)return deny('not_found',404);
 return new Response(obj.body,{headers:{...secureHeaders,'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':'attachment; filename="staging-'+kind+'"','Content-Security-Policy':'sandbox'}});
}
async function judgeQueue(env,a){
 if(!requireRole(a,'reviewer'))return deny('reviewer_only',403);
 const rows=await env.DB.prepare("SELECT p.id,p.round_code,p.category,p.stage_name,p.demo_url,p.media_key IS NOT NULL AS has_uploaded_file,p.status,p.payment_status,s.technique,s.interpretation FROM e2e_applications p LEFT JOIN e2e_judge_scores s ON s.application_id=p.id AND s.reviewer_id=? WHERE p.payment_status='simulated_paid' AND p.status<>'withdrawn' ORDER BY p.created_at DESC LIMIT 100").bind(a.id).all();
 return json({ok:true,queue:rows.results||[],role:'reviewer',testOnly:true});
}
async function submitScore(request,env,a){
 if(!requireRole(a,'reviewer'))return deny('reviewer_only',403);
 const b=await bodyJSON(request);if(!b)return deny('invalid_json');
 if(!Number.isInteger(b.technique)||b.technique<0||b.technique>60||
    !Number.isInteger(b.interpretation)||b.interpretation<0||b.interpretation>40||
    b.no_conflict!==true)return deny('invalid_score_or_conflict_declaration',422);
 const app=await env.DB.prepare('SELECT id FROM e2e_applications WHERE id=? AND payment_status=? AND status NOT IN (?,?)')
  .bind(b.application_id,'simulated_paid','withdrawn','rejected').first();
 if(!app)return deny('not_reviewable',409);
 try{await env.DB.prepare('INSERT INTO e2e_judge_scores(application_id,reviewer_id,technique,interpretation,conflict_checked,created_at) VALUES(?,?,?,?,1,?)')
 .bind(app.id,a.id,b.technique,b.interpretation,NOW()).run()}
 catch{return deny('already_scored_or_unavailable',409)}
 await env.DB.prepare("UPDATE e2e_applications SET status='scored',updated_at=? WHERE id=? AND status='under_review'").bind(NOW(),app.id).run();
 return json({ok:true,score:b.technique+b.interpretation,storedIn:'cloudflare-d1-staging',testOnly:true});
}
async function eraseMember(env,a){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const rows=await env.DB.prepare('SELECT media_key,eligibility_key,receipt_key FROM e2e_applications WHERE account_id=?').bind(a.id).all();
 if(rows.results?.some(x=>x.media_key||x.eligibility_key||x.receipt_key)&&!env.STAGING_MEDIA)return deny('r2_cleanup_unavailable',503);
 for(const row of rows.results||[])for(const key of [row.media_key,row.eligibility_key,row.receipt_key])if(key)await env.STAGING_MEDIA.delete(key);
 // Remove pending verification challenges too. Otherwise an unused emailed OTP
 // could recreate the just-deleted TEST member until its expiry.
 await env.DB.prepare('DELETE FROM e2e_email_challenges WHERE email_fingerprint=(SELECT email_fingerprint FROM e2e_accounts WHERE id=?)').bind(a.id).run();
 await env.DB.prepare('DELETE FROM e2e_accounts WHERE id=?').bind(a.id).run();
 return json({ok:true,deletedTestData:true},200,{'Set-Cookie':cookie('',0)});
}
export async function handleE2E(request,env){
 if(!configured(env))return deny('e2e_not_configured',503);
 const {pathname}=new URL(request.url);
 const isPost=request.method==='POST';
 if(isPost&&!sameOrigin(request))return deny('origin_not_allowed',403);
 if(!['GET','POST'].includes(request.method))return deny('method_not_allowed',405);
 try{
  if(pathname==='/api/e2e/request-code'&&isPost)return await requestCode(request,env);
  if(pathname==='/api/e2e/verify-code'&&isPost)return await verifyCode(request,env);
  const a=await account(request,env);
  if(!a)return deny('login_required',401);
  const v2=await handleV2Route(request,env,a,{json,deny,uuid,NOW,bodyJSON});
  if(v2)return v2;
  if(pathname==='/api/e2e/logout'&&isPost)return await logout(request,env,a);
  if(pathname==='/api/e2e/me'&&!isPost)return json({ok:true,account:a,testOnly:true});
  if(pathname==='/api/e2e/applications'&&!isPost)return await applications(a,env);
  if(pathname==='/api/e2e/applications'&&isPost)return await submitApplication(request,env,a);
  if(pathname==='/api/e2e/mock-payment'&&isPost)return await mockPayment(request,env,a);
  if(pathname==='/api/e2e/demo-upload'&&isPost)return await mediaUpload(request,env,a);
  if(pathname==='/api/e2e/demo-download'&&!isPost)return await streamMedia(request,env,a);
  if(pathname==='/api/e2e/reviewer-queue'&&!isPost)return await judgeQueue(env,a);
  if(pathname==='/api/e2e/score'&&isPost)return await submitScore(request,env,a);
  if(pathname==='/api/e2e/delete-my-data'&&isPost)return await eraseMember(env,a);
  return deny('not_found',404);
 }catch{return deny('temporary_service_error',503)}
}
