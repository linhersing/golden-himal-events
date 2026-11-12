import {humanSignupSource,publicSignupReady,publicSignupChecklist,reservePublicSend} from './staging-public-signup.js';
import {passwordModeReady,passwordIdentity,passwordRequest} from './staging-password-auth.js';
import {emailAddress,mailProviderReady,mailSenderReady,sendTestEmail} from './staging-mail.js';
import {validPerformanceLink} from '../public/performance-link.js';
import {handleV2Route} from './staging-v2-flow.js';
import {parseProfileInput,profileReady,attachProfiles,profileInsert,profileUpsert} from './entrant-profile.js';
import {approvalRequired,approvalSchemaReady,approvalColumn,approvalGuard,pendingGuard} from './test-application-approval.js';
import {handleVideoSupplement,supplementColumns,supplementGuard,supplementJoin,videoSupplementsReady} from './test-video-supplement.js';
/* Golden Himal Voice: real D1-backed, test-only acceptance API.
 * Invited staff and an opt-in, protected self-service path for test singers.
 * No official entries, actual payments, or exposed R2 URLs.
 */
const COOKIE='__Host-ghv-e2e';
const MAX_AGE=12*3600;
const NOW=()=>Math.floor(Date.now()/1000);
const otpTrace=(stage)=>console.info(JSON.stringify({event:'staging_otp_flow',stage}));
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
const ROLES=['member','reviewer','organizer'];
function grantedRoles(email,env){return ROLES.filter(role=>emailAllowed(email,env,role))}
async function emailForFingerprint(env,fingerprint,role){
 const list=emails(env,role==='organizer'?'STAGING_ORGANIZER_EMAILS':role==='reviewer'?'STAGING_REVIEWER_EMAILS':'STAGING_ALLOWED_EMAILS');
 for(const email of list){
  if(fingerprint===await sign(env,'email:'+email)||fingerprint===await sign(env,'role-account:'+role+':'+email))return email;
 }
 return null;
}
async function roleAccount(env,email,role){
 // Preserve legacy IDs (and applications/scores). Extra roles get separate,
 // deterministic HMAC identities; no schema change or account-role overwrite.
 const legacy=await sign(env,'email:'+email);
 const scoped=await sign(env,'role-account:'+role+':'+email);
 const existing=await env.DB.prepare('SELECT id,role FROM e2e_accounts WHERE email_fingerprint=?').bind(scoped).first();
 if(existing?.role===role)return existing;
 let a=await env.DB.prepare('SELECT id,role FROM e2e_accounts WHERE email_fingerprint=?').bind(legacy).first();
 if(a?.role===role)return a;
 const fingerprint=a?scoped:legacy;
 await env.DB.prepare('INSERT OR IGNORE INTO e2e_accounts(id,email_fingerprint,email_hint,role,verified_at,created_at) VALUES(?,?,?,?,?,?)')
  .bind(uuid(),fingerprint,'verified-test-mailbox',role,NOW(),NOW()).run();
 a=await env.DB.prepare('SELECT id,role FROM e2e_accounts WHERE email_fingerprint=?').bind(fingerprint).first();
 // Another role may have claimed the legacy row concurrently.
 if(a?.role!==role&&fingerprint===legacy)return roleAccount(env,email,role);
 return a?.role===role?a:null;
}
async function newSession(env,a){
 const token=encode(random()),sessionHash=await sign(env,'session:'+token);
 await env.DB.prepare('INSERT INTO e2e_sessions(session_fingerprint,account_id,expires_at,created_at) VALUES(?,?,?,?)')
  .bind(sessionHash,a.id,NOW()+MAX_AGE,NOW()).run();
 return token;
}
function publicAccount(a,env){return {id:a.id,role:a.role,available_roles:a.email?grantedRoles(a.email,env):['member']}}
async function ownsApplication(env,a,ownerId){
 if(a.usernameAccount)return a.id===ownerId;
 const owner=await env.DB.prepare('SELECT email_fingerprint FROM e2e_accounts WHERE id=?').bind(ownerId).first();
 if(!owner)return false;
 return owner.email_fingerprint===await sign(env,'email:'+a.email)||owner.email_fingerprint===await sign(env,'role-account:member:'+a.email);
}
function configured(env){
 return env.STAGING_E2E_ENABLED==='true'&&env.DB&&
 typeof env.STAGING_IDENTITY_SECRET==='string'&&env.STAGING_IDENTITY_SECRET.length>=32&&
 ((mailProviderReady(env)&&mailSenderReady(env)&&
   (env.STAGING_PUBLIC_SIGNUP_ENABLED==='true'||emails(env,'STAGING_ALLOWED_EMAILS').length>0))||
  env.STAGING_PASSWORD_SIGNUP_ENABLED==='true');
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
 const a=await env.DB.prepare('SELECT a.id,a.role,a.email_fingerprint FROM e2e_sessions s JOIN e2e_accounts a ON a.id=s.account_id WHERE s.session_fingerprint=? AND s.expires_at>?').bind(fingerprint,NOW()).first();
 if(!a||!ROLES.includes(a.role))return null;
 const email=await emailForFingerprint(env,a.email_fingerprint,a.role);
 if(email)return {id:a.id,role:a.role,email};
 if(a.role==='member'&&await passwordIdentity(env,a.id))return {id:a.id,role:'member',usernameAccount:true};
 if(a.role!=='member'||!await publicSignupReady(env))return null;
 const proof=await env.DB.prepare('SELECT mailbox_fingerprint FROM e2e_public_signup_accounts WHERE account_id=?').bind(a.id).first();
 return proof?{id:a.id,role:a.role,mailboxFingerprint:proof.mailbox_fingerprint}:null;
}
const sameOrigin=request=>request.headers.get('Origin')===new URL(request.url).origin;
function requireRole(a,role){return a&&a.role===role}
function selectApplication(db,id,userId){
 return db.prepare('SELECT * FROM e2e_applications WHERE id=? AND account_id=?').bind(id,userId).first();
}
async function requestCode(request,env){
 const b=await bodyJSON(request);if(!b)return deny('invalid_json');
 const email=norm(b.email);
 const role=b.role==='staff'?(emailAllowed(email,env,'organizer')?'organizer':'reviewer'):(ROLES.includes(b.role)?b.role:'member');
 if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)||email.length>250)return deny('invalid_email');
 const invited=emailAllowed(email,env,role);
 const publicTest=!invited&&role==='member'&&await publicSignupReady(env);
 if(!invited&&!publicTest)return deny('not_on_test_allowlist',403);
 if(publicTest&&!emailAddress(email))return deny('invalid_email');
 let source;
 if(publicTest){
  source=await humanSignupSource(request,env,b.turnstile_token);
  if(!source)return deny('human_check_required',403);
 }
 otpTrace(publicTest?'human_check_passed':'allowlist_passed');
 const fingerprint=await sign(env,'email:'+email);
 const period=NOW()-600;
 const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM e2e_email_challenges WHERE email_fingerprint=? AND created_at>?').bind(fingerprint,period).first();
 if(Number(recent?.n||0)>=3)return deny('too_many_code_requests',429);
 const id=uuid(),digits=new Uint32Array(1);crypto.getRandomValues(digits);
 const code=String(digits[0]%1000000).padStart(6,'0');
 if(source&&!await reservePublicSend(env.DB,id,await sign(env,'signup-source:'+source),NOW()))
  return deny('too_many_code_requests',429);
 const hashed=await sign(env,'challenge:'+id+':'+code);
 // D1 executes this single write atomically: parallel requests may all pass
 // the early read, but only three may reserve a send slot across all roles.
 const reserved=await env.DB.prepare('INSERT INTO e2e_email_challenges(id,email_fingerprint,code_fingerprint,kind,expires_at,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM e2e_email_challenges WHERE email_fingerprint=? AND created_at>?)<3')
 .bind(id,fingerprint,hashed,role,NOW()+600,NOW(),fingerprint,period).run();
 if(!reserved.meta?.changes)return deny('too_many_code_requests',429);
 otpTrace('challenge_saved');
 try{
  await sendTestEmail(env,{from:env.STAGING_FROM_EMAIL,to:email,
   subject:'Golden Himal Voice TEST ['+role+'] — request '+id.slice(0,8),
   text:'Golden Himal Voice STAGING ONLY. Your one-time verification code is '+code+
        '. It expires in 10 minutes. Request reference: '+id.slice(0,8)+'. Role: '+role+'. If you did not request it, ignore this message. No payments are being collected.',
   html:'<p><strong>Golden Himal Voice — TEST ONLY</strong></p><p>Your one-time verification code is <strong>'+code+
        '</strong>. Valid for 10 minutes.</p><p>Request reference: '+id.slice(0,8)+' · Role: '+role+'</p><p>No real payment or official registration is enabled.</p>'});
  otpTrace('provider_accepted');
 }catch{
  otpTrace('send_failed');
  await env.DB.prepare('UPDATE e2e_email_challenges SET used_at=? WHERE id=?').bind(NOW(),id).run();
  return deny('test_email_service_unavailable',503)
 }
 return json({ok:true,challenge_id:id,request_ref:id.slice(0,8),resend_after:60,message:'Check your test mailbox. Code expires in 10 minutes.'});
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
 if(!ROLES.includes(challenge.kind))return deny('not_on_test_allowlist',403);
 const invitedEmail=await emailForFingerprint(env,challenge.email_fingerprint,challenge.kind);
 let email=invitedEmail;
 if(!email){
  if(challenge.kind!=='member'||!await publicSignupReady(env))return deny('not_on_test_allowlist',403);
  email=norm(b.email);
  if(email.length>250||!emailAddress(email)||await sign(env,'email:'+email)!==challenge.email_fingerprint)
   return deny('expired_or_invalid_code',401);
  const reserved=await env.DB.prepare('SELECT challenge_id FROM e2e_public_signup_attempts WHERE challenge_id=?').bind(challenge.id).first();
  if(!reserved)return deny('not_on_test_allowlist',403);
 }
 const used=await env.DB.prepare('UPDATE e2e_email_challenges SET used_at=? WHERE id=? AND used_at IS NULL AND expires_at>? AND attempts<=5').bind(NOW(),challenge.id,NOW()).run();
 if(!used.meta?.changes)return deny('expired_or_invalid_code',401);
 const a=await roleAccount(env,email,challenge.kind);
 if(!a)return deny('wrong_account_role',403);
 if(!invitedEmail){
  await env.DB.prepare('INSERT OR IGNORE INTO e2e_public_signup_accounts(account_id,mailbox_fingerprint) VALUES(?,?)')
   .bind(a.id,challenge.email_fingerprint).run();
 }
 const token=await newSession(env,a);
 return json({ok:true,role:a.role,account_id:a.id,available_roles:publicAccount({...a,email:invitedEmail},env).available_roles},200, {'Set-Cookie':cookie(token)});
}
async function switchRole(request,env,a){
 const b=await bodyJSON(request);
 if(!b||!ROLES.includes(b.role))return deny('invalid_role');
 if(!a.email||!emailAllowed(a.email,env,b.role))return deny('not_on_test_allowlist',403);
 const target=await roleAccount(env,a.email,b.role);
 if(!target)return deny('wrong_account_role',403);
 const token=await newSession(env,target);
 await logout(request,env,a);
 return json({ok:true,account:publicAccount({...target,email:a.email},env),testOnly:true},200,{'Set-Cookie':cookie(token)});
}
async function logout(request,env,a){
 const match=request.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)'+COOKIE+'=([a-f0-9]{64})(?:;|$)'));
 if(match)await env.DB.prepare('DELETE FROM e2e_sessions WHERE session_fingerprint=?').bind(await sign(env,'session:'+match[1])).run();
 return json({ok:true},200,{'Set-Cookie':cookie('',0)});
}
async function applications(a,env,supplements){
 const approval=approvalRequired(env);
 const rows=await env.DB.prepare(`SELECT p.id,p.round_code,p.category,p.province,p.location_basis,p.affiliation,p.stage_name,p.song_title,p.original_artist,p.song_language,p.song_key,p.demo_url,
 p.media_key IS NOT NULL AS has_uploaded_file,p.eligibility_key IS NOT NULL AS has_eligibility_file,p.receipt_key IS NOT NULL AS has_receipt_file,
 p.phase,p.status,p.payment_status,p.created_at,p.updated_at,
 CASE WHEN p.phase='demo' AND p.status IN ('submitted','under_review') AND p.payment_status IN ('unpaid','simulated_paid')
 AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)${pendingGuard(approval,'p')}${supplementGuard(supplements,'p')}
 THEN 1 ELSE 0 END AS can_edit${approvalColumn(approval)}${supplementColumns(supplements)}
 FROM e2e_applications p${supplementJoin(supplements)} WHERE p.account_id=? ORDER BY p.created_at DESC,p.round_code DESC`).bind(a.id).all();
 const entries=rows.results||[];
 const nextRound=entries.some(row=>row.round_code==='2027-01')&&
  !entries.some(row=>row.round_code==='2027-04'||row.phase==='final')?'2027-04':null;
 return json({ok:true,account:{id:a.id,role:a.role},applications:await attachProfiles(env,entries),next_audition_round:nextRound,testOnly:true});
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
 // A self-declared filming checklist is not automatic inspection of an external video.
 if(Object.hasOwn(b,'video_confirmed')&&b.video_confirmed!==true)return deny('video_self_recording_confirmation_required',422);
 const fields=['stage_name','affiliation','song_title','original_artist','song_language','song_key'];
 const values=fields.map(k=>String(b[k]||'').trim());
 if(values.some(x=>x.length<1||x.length>100)||values[0].length<2)return deny('missing_song_or_identity_test_fields',422);
 const url=String(b.demo_url||'').trim();
 if((env.STAGING_SUBMISSION_MODE==='links'&&!url)||(url&&!validPerformanceLink(url)))return deny('invalid_demo_url',422);
 const parsed=parseProfileInput(b);
 if(parsed.error)return deny(parsed.error,422);
 const profile=parsed.profile;
 if(profile&&!(await profileReady(env)))return deny('profile_not_enabled',503);
 const prior=await env.DB.prepare('SELECT category,phase FROM e2e_applications WHERE account_id=? LIMIT 1').bind(a.id).first();
 if(prior&&prior.category!==b.category)return deny('annual_category_locked',409);
 const finalist=await env.DB.prepare("SELECT id FROM e2e_applications WHERE account_id=? AND phase='final' LIMIT 1").bind(a.id).first();
 if(finalist)return deny('already_finalist',409);
 const id=uuid(),now=NOW();
 try{
  const createApp=env.DB.prepare('INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .bind(id,a.id,b.round_code,b.category,b.province,b.location_basis,...values.slice(1,2),values[0],...values.slice(2),url||null,now,now);
  // D1 batch is atomic. A profile write failure must NOT leave a half-created entry.
  if(profile){
   if(typeof env.DB.batch!=='function')return deny('profile_storage_unavailable',503);
   await env.DB.batch([createApp,profileInsert(env.DB,id,profile,now)]);
  }else await createApp.run();
 }catch{return deny(profile?'profile_database_error':'duplicate_round_or_database_rejected',profile?503:409)}
 return json({ok:true,application_id:id,phase:'demo',status:'submitted',source:'cloudflare-d1-staging',testOnly:true,
  ...(approvalRequired(env)?{approval_state:'pending'}:{})},201);
}
// An invited member may correct an unscored, unpromoted TEST application (including simulated-paid).
// Deletion stays limited to unpaid entries; neither operation affects real payment or grading.
// These routes do not change the payment state and cannot update another account.
async function updateApplication(request,env,a,supplements){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const b=await bodyJSON(request,2500);if(!b)return deny('invalid_json');
 const profileFields=['gender','photo_url_1','photo_url_2','photo_url_3','profile_consent'];
 const allowed=['application_id','stage_name','song_title','original_artist','song_language','demo_url',...profileFields];
 if(Object.keys(b).some(k=>!allowed.includes(k)))return deny('update_fields_only',422);
 const id=String(b.application_id||'');
 const values=['stage_name','song_title','original_artist','demo_url'].map(k=>typeof b[k]==='string'?b[k].trim():'');
 if(values.some((v,i)=>!v||v.length>(i===3?1000:100))||values[0].length<2||!validPerformanceLink(values[3]))
   return deny('invalid_demo_url_or_fields',422);
 const editingProfile=profileFields.some(key=>Object.hasOwn(b,key));
 const parsed=editingProfile?parseProfileInput(b):{profile:null};
 if(parsed.error)return deny(parsed.error,422);
 if(editingProfile&&!(await profileReady(env)))return deny('profile_not_enabled',503);
 const app=await selectApplication(env.DB,id,a.id);
 if(!app)return deny('application_not_found',404);
 const songLanguage=b.song_language===undefined?app.song_language:String(b.song_language).trim();
 if(!['Nepali','English','Hindi','Maithili','Bhojpuri','Tamang','Chinese','Other'].includes(songLanguage))return deny('invalid_song_language',422);
 if(!['unpaid','simulated_paid'].includes(app.payment_status)||!['submitted','under_review'].includes(app.status)||app.phase!=='demo')
   return deny('update_locked',409);
 const anyScores=await env.DB.prepare("SELECT EXISTS(SELECT 1 FROM e2e_judge_scores WHERE application_id=?) + EXISTS(SELECT 1 FROM e2e_live_scores WHERE application_id=?) + EXISTS(SELECT 1 FROM e2e_promotion_events WHERE application_id=?) AS n").bind(id,id,id).first();
 if(Number(anyScores?.n||0)>0)return deny('update_locked',409);
 const approval=approvalRequired(env),pendingProfile=pendingGuard(approval,'p')+supplementGuard(supplements,'p');
 const updateStmt=env.DB.prepare(`UPDATE e2e_applications SET stage_name=?,song_title=?,original_artist=?,song_language=?,demo_url=?,updated_at=? WHERE id=? AND account_id=? AND payment_status IN ('unpaid','simulated_paid') AND status IN ('submitted','under_review') AND phase='demo'
  AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=e2e_applications.id)
  AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=e2e_applications.id)
  AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=e2e_applications.id)${pendingGuard(approval,'e2e_applications')}${supplementGuard(supplements,'e2e_applications')}`)
  .bind(...values.slice(0,3),songLanguage,values[3],NOW(),id,a.id);
 let affected=0;
 try {
  if(editingProfile){
   if(typeof env.DB.batch!=='function')return deny('profile_storage_unavailable',503);
   const profileStmt=parsed.profile?
    profileUpsert(env.DB,id,a.id,parsed.profile,NOW(),pendingProfile):
    env.DB.prepare(`DELETE FROM e2e_application_profiles WHERE application_id=? AND EXISTS(SELECT 1 FROM e2e_applications p
    WHERE p.id=? AND p.account_id=? AND p.phase='demo' AND p.status IN ('submitted','under_review')
    AND p.payment_status IN ('unpaid','simulated_paid')
    AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)${pendingProfile})`).bind(id,id,a.id);
   const result=await env.DB.batch([updateStmt,profileStmt]);
   affected=Number(result?.[0]?.meta?.changes||0);
  }else{
   const result=await updateStmt.run();
   affected=Number(result?.meta?.changes||0);
  }
 }catch{return deny(editingProfile?'profile_database_error':'update_locked',editingProfile?503:409)}
 if(!affected)return deny('update_locked',409);
 const result=await selectApplication(env.DB,id,a.id);
 return json({ok:true,application_id:result.id,stage_name:result.stage_name,song_title:result.song_title,original_artist:result.original_artist,song_language:result.song_language,demo_url:result.demo_url,testOnly:true});
}
async function deleteApplication(request,env,a,supplements){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const b=await bodyJSON(request);if(!b||Object.keys(b).some(k=>k!=='application_id'))
   return deny('invalid_json',422);
 const id=String(b.application_id||'');
 const app=await selectApplication(env.DB,id,a.id);
 if(!app)return deny('application_not_found',404);
 if(app.payment_status!=='unpaid'||app.status!=='submitted'||app.phase!=='demo'||app.media_key||app.eligibility_key||app.receipt_key)
   return deny('delete_locked',409);
 const changed=await env.DB.prepare(`DELETE FROM e2e_applications WHERE id=? AND account_id=? AND payment_status='unpaid' AND status='submitted' AND phase='demo' AND media_key IS NULL AND eligibility_key IS NULL AND receipt_key IS NULL${pendingGuard(approvalRequired(env),'e2e_applications')}${supplementGuard(supplements,'e2e_applications')}`)
  .bind(id,a.id).run();
 if(!changed.meta?.changes)return deny('delete_locked',409);
 return json({ok:true,deleted_application_id:id,testOnly:true});
}
async function mockPayment(request,env,a){
 if(!requireRole(a,'member'))return deny('member_only',403);
 const b=await bodyJSON(request);if(!b)return deny('invalid_json');
 const db=env.DB;
 const app=await selectApplication(db,b.application_id,a.id);if(!app)return deny('application_not_found',404);
 const paid={ok:true,status:'simulated_paid',amount_npr:500,testOnly:true,realCharge:false};
 if(app.payment_status==='simulated_paid')return json({...paid,already:true});
 if(app.status!=='submitted'||app.phase!=='demo')return deny('mock_payment_not_allowed',409);
 const payable="id=? AND account_id=? AND phase='demo' AND status='submitted' AND payment_status='unpaid'";
 const now=NOW();
 // Commit the event and application state together, with the owner rechecked inside both writes.
 const [,changed]=await db.batch([
  db.prepare(`INSERT INTO e2e_payment_events(id,application_id,event_type,created_at)
   SELECT ?,id,'SIMULATED_PAYMENT',? FROM e2e_applications WHERE ${payable}
   ON CONFLICT(application_id) DO NOTHING`).bind(uuid(),now,app.id,a.id),
  db.prepare(`UPDATE e2e_applications SET payment_status='simulated_paid',status='under_review',updated_at=?
   WHERE ${payable}`).bind(now,app.id,a.id)
 ]);
 if(changed.meta?.changes)return json(paid);
 const current=await selectApplication(db,app.id,a.id);
 if(!current)return deny('application_not_found',404);
 if(current.payment_status==='simulated_paid')return json({...paid,already:true});
 return deny('mock_payment_not_allowed',409);
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
 try{
  const approval=approvalRequired(env);
  const changed=await env.DB.prepare(`UPDATE e2e_applications SET ${column}=?,updated_at=? WHERE id=? AND account_id=?${pendingGuard(approval,'e2e_applications')}`)
   .bind(key,NOW(),app.id,a.id).run();
  if(approval&&!changed.meta?.changes){await env.STAGING_MEDIA.delete(key);return deny('update_locked',409)}
 }
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
 const reviewerGate=approvalRequired(env)&&a.role==='reviewer';
 const app=await env.DB.prepare(`SELECT p.id,p.account_id,p.${column} AS asset_key FROM e2e_applications p WHERE p.id=?${approvalGuard(reviewerGate,'p')}${reviewerGate?" AND p.payment_status='simulated_paid' AND p.status NOT IN ('withdrawn','rejected')":''}`).bind(url.searchParams.get('application')).first();
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
 const app=await env.DB.prepare('SELECT id,account_id FROM e2e_applications WHERE id=? AND payment_status=? AND status NOT IN (?,?)')
  .bind(b.application_id,'simulated_paid','withdrawn','rejected').first();
 if(!app)return deny('not_reviewable',409);
 if(await ownsApplication(env,a,app.account_id))return deny('self_review_disallowed',403);
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
 if(a.mailboxFingerprint||a.email)await env.DB.prepare("DELETE FROM e2e_email_challenges WHERE email_fingerprint=? AND kind='member'").bind(a.mailboxFingerprint||await sign(env,'email:'+a.email)).run();
 await env.DB.prepare('DELETE FROM e2e_accounts WHERE id=?').bind(a.id).run();
 return json({ok:true,deletedTestData:true},200,{'Set-Cookie':cookie('',0)});
}
export async function handleE2E(request,env){
 if(!configured(env)){
  if(new URL(request.url).pathname==='/api/e2e/request-code')otpTrace('configuration_blocked');
  return deny('e2e_not_configured',503);
 }
 const {pathname}=new URL(request.url);
 const isPost=request.method==='POST';
 if(isPost&&!sameOrigin(request))return deny('origin_not_allowed',403);
 if(!['GET','POST'].includes(request.method))return deny('method_not_allowed',405);
 try{
  if(pathname==='/api/e2e/signup-config'&&!isPost){
   const ready=await publicSignupReady(env);
   return json(ready?{ok:true,testOnly:true,mode:'public_test',siteKey:env.STAGING_TURNSTILE_SITE_KEY}:
    {ok:true,testOnly:true,mode:'invited'});
  }
  if(pathname==='/api/e2e/password-config'&&!isPost){const ready=await passwordModeReady(env);return json(ready?{ok:true,enabled:true,siteKey:env.STAGING_TURNSTILE_SITE_KEY,testOnly:true}:{ok:true,enabled:false,testOnly:true});}
  if(['/api/e2e/password-register','/api/e2e/password-login','/api/e2e/password-recover'].includes(pathname)&&isPost)
   return await passwordRequest(request,env,{json,deny,uuid,NOW,bodyJSON,sign,newSession,cookie});
  if(pathname==='/api/e2e/request-code'&&isPost)return await requestCode(request,env);
  if(pathname==='/api/e2e/verify-code'&&isPost)return await verifyCode(request,env);
  const a=await account(request,env);
  if(!a)return deny('login_required',401);
  if(pathname==='/api/e2e/organizer-signup-readiness'&&!isPost){
   if(a.role!=='organizer')return deny('organizer_only',403);
   const report=await publicSignupChecklist(env);
   return json({ok:true,testOnly:true,...report,
    note:'TEST configuration only. Ready does not prove email delivery, login or official registration.'});
  }
  if(pathname==='/api/e2e/logout'&&isPost)return await logout(request,env,a);
  if(pathname==='/api/e2e/switch-role'&&isPost)return await switchRole(request,env,a);
  const approval=approvalRequired(env);
  if(approval&&!await approvalSchemaReady(env))return deny('test_approval_schema_unavailable',503);
   const supplements=await videoSupplementsReady(env,approval);
   if(supplements&&isPost&&['/api/e2e/request-video-supplement','/api/e2e/submit-video-supplement'].includes(pathname))
    return await handleVideoSupplement(pathname,request,env,a,{json,deny,NOW,bodyJSON});
  if(!a.email&&['/api/e2e/finalists','/api/e2e/test-vote'].includes(pathname))return deny('not_on_test_allowlist',403);
   const v2=await handleV2Route(request,env,a,{json,deny,uuid,NOW,bodyJSON,ownsApplication,attachProfiles,approval,supplements});
  if(v2)return v2;
  if(pathname==='/api/e2e/me'&&!isPost)return json({ok:true,account:publicAccount(a,env),profile_enabled:await profileReady(env),testOnly:true,...(approval?{approval_enabled:true}:{})});
   if(pathname==='/api/e2e/applications'&&!isPost)return await applications(a,env,supplements);
  if(pathname==='/api/e2e/applications'&&isPost)return await submitApplication(request,env,a);
    if(pathname==='/api/e2e/update-application'&&isPost)return await updateApplication(request,env,a,supplements);
    if(pathname==='/api/e2e/delete-application'&&isPost)return await deleteApplication(request,env,a,supplements);
  if(pathname==='/api/e2e/mock-payment'&&isPost)return await mockPayment(request,env,a);
  if(pathname==='/api/e2e/demo-upload'&&isPost)return await mediaUpload(request,env,a);
  if(pathname==='/api/e2e/demo-download'&&!isPost)return await streamMedia(request,env,a);
  if(pathname==='/api/e2e/reviewer-queue'&&!isPost)return await judgeQueue(env,a);
  if(pathname==='/api/e2e/score'&&isPost)return await submitScore(request,env,a);
  if(pathname==='/api/e2e/delete-my-data'&&isPost)return await eraseMember(env,a);
  return deny('not_found',404);
 }catch{return deny('temporary_service_error',503)}
}
