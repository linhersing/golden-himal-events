import {museAuditionReady} from './muse-audition.js';
import {handleRegistrationBulk} from './staging-registration-bulk.js';

const searchPath='/api/e2e/organizer-registrations';
const actionPath='/api/e2e/organizer-registration-action';
const auditPath='/api/e2e/organizer-registration-audit';
const bulkPath='/api/e2e/organizer-registration-bulk';
const routes=new Map([[searchPath,'search'],[actionPath,'edit'],[auditPath,'audit_read'],[bulkPath,'search']]);
const transitions={disable:'disabled',delete:'deleted',restore:'active',edit:'active'};
const results={conflict:409,missing:404,protected:409,invalid:422,failed:503};
const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const safeValue=value=>typeof value==='string'&&value.trim().length>0&&value.length<=120&&!/[\x00-\x1f\x7f]/.test(value);
const writeEvent=(db,actor,entry)=>db.prepare(
 'INSERT INTO e2e_staff_audit(id,actor_id,actor_role,target_id,action,result,occurred_at,diff) VALUES(?,?,?,?,?,?,?,?)'
).bind(entry.id,actor.id,actor.role,entry.target,entry.action,entry.result,entry.time,entry.detail?JSON.stringify(entry.detail):null).run();

export async function adminManagementReady(env){
 if(env.STAGING_ADMIN_MANAGEMENT_ENABLED!=='true'||env.STAGING_STAFF_TURNSTILE_REQUIRED!=='true')return false;
 try{
  await env.DB.prepare('SELECT id,state,protected FROM e2e_admin_registrations LIMIT 0').all();
  await env.DB.prepare('SELECT id,actor_id,occurred_at FROM e2e_staff_audit LIMIT 0').all();
  return true;
 }catch{return false;}
}


const contactFields=new Map([
 ['identity',['full_name']],
 ['contact',['contact_phone','contact_email','contact_handle']],
 ['address',['city','street_address']],
 ['background',['educational_background','short_description','musical_training']],
]);

export async function handleOrganizerContact(request,env,actor,{json,deny,NOW,uuid}){
 const params=new URL(request.url).searchParams;
 const section=params.get('section');
 const db=env.DB;
 if(actor.role!=='organizer'){
  const fields=contactFields.get(section);
  if(fields&&await adminManagementReady(env)){
   try{await writeEvent(db,actor,{
    id:uuid(),target:null,time:NOW(),action:'audit_read',result:'denied',
    detail:{access:'organizer_contact',section},
   })}catch{} // Access is denied even if an audit of the attempt cannot be recorded.
  }
  return deny('organizer_only',403);
 }
 const id=params.get('id');
 if(!validId(id))return deny('invalid_application_id',422);
 // A legacy unscoped request must never export the entire private record.
 // Require the caller to choose one explicit, audited section.
 const fields=contactFields.get(section);
 if(!fields)return deny('invalid_contact_section',422);
 if(!await museAuditionReady(env))return deny('contact_storage_unavailable',503);
 if(!await adminManagementReady(env)||typeof db.batch!=='function')return deny('contact_audit_unavailable',503);
 try{
  const detail=JSON.stringify({access:'organizer_contact',section});
  const event=db.prepare(`INSERT INTO e2e_staff_audit(id,actor_id,actor_role,target_id,action,result,occurred_at,diff)
   VALUES(?,?,?,?,'audit_read',CASE WHEN EXISTS(SELECT 1 FROM e2e_muse_audition_details WHERE application_id=?)
    THEN 'success' ELSE 'missing' END,?,?)`).bind(uuid(),actor.id,actor.role,id,id,NOW(),detail);
  const read=db.prepare(`SELECT ${fields.join(',')} FROM e2e_muse_audition_details WHERE application_id=?`).bind(id);
  const [recorded,selected]=await db.batch([event,read]);
  if(recorded.meta?.changes!==1||!Array.isArray(selected.results))return deny('contact_audit_unavailable',503);
  const contact=selected.results[0];
  return contact?json({ok:true,contact,section,testOnly:true}):deny('contact_not_found',404);
 }catch{return deny('contact_audit_unavailable',503);}
}

async function changeRegistration(db,actor,body,event){
 const {id:target,action,version,updated_at:updatedAt}=body;
 const name=action==='edit'?body.stage_name.trim():null;
 const affiliation=action==='edit'?body.affiliation.trim():null;
 const next=transitions[action];
 // All checks, the masked audit, the update and the readback share a D1 transaction.
 const decision=db.prepare(`INSERT INTO e2e_staff_audit
 (id,actor_id,actor_role,target_id,action,occurred_at,result,diff)
 WITH requested(action,version,updated_at,name,affiliation) AS (VALUES(?,?,?,?,?)),
 classified AS (
  SELECT a.*,r.action,r.name,r.affiliation AS new_affiliation,
   CASE WHEN a.id IS NULL THEN 'missing'
    WHEN a.protected=1 THEN 'protected'
    WHEN a.version<>r.version OR a.updated_at<>r.updated_at THEN 'conflict'
    WHEN r.action IN ('edit','disable') AND a.state<>'active' THEN 'conflict'
    WHEN r.action='delete' AND a.state='deleted' THEN 'conflict'
    WHEN r.action='restore' AND a.state='active' THEN 'conflict'
    WHEN r.action='edit' AND a.stage_name=r.name AND a.affiliation=r.affiliation THEN 'conflict'
    ELSE 'success' END AS result
  FROM requested r LEFT JOIN e2e_admin_registrations a ON a.id=?
 )
 SELECT ?,?,?,?,?,?,result,CASE
  WHEN result<>'success' THEN NULL
  WHEN action='edit' THEN json_patch(
   CASE WHEN stage_name<>name THEN json_object('stage_name',json_array('[redacted]','[redacted]')) ELSE '{}' END,
   CASE WHEN affiliation<>new_affiliation THEN json_object('affiliation',json_array('[redacted]','[redacted]')) ELSE '{}' END
  )
  ELSE json_object('state',json_array(state,?),'status',json_array(status,CASE WHEN action='restore'
   THEN (SELECT previous_status FROM e2e_registration_controls WHERE application_id=classified.id) ELSE 'withdrawn' END))
 END FROM classified`)
 .bind(action,version,updatedAt,name,affiliation,target,event.id,actor.id,actor.role,target,action,event.time,next);
 const store=db.prepare(`INSERT INTO e2e_registration_controls(application_id,state,previous_status,version,last_event_id)
  SELECT a.id,?,a.status,a.version+1,? FROM e2e_admin_registrations a
  JOIN e2e_staff_audit e ON e.id=? AND e.target_id=a.id AND e.result='success'
  ON CONFLICT(application_id) DO UPDATE SET state=excluded.state,version=excluded.version,
   previous_status=CASE WHEN e2e_registration_controls.state='active' THEN excluded.previous_status ELSE e2e_registration_controls.previous_status END,
   last_event_id=excluded.last_event_id`).bind(next,event.id,event.id);
 const apply=db.prepare(`UPDATE e2e_applications SET stage_name=COALESCE(?,stage_name),affiliation=COALESCE(?,affiliation),
  status=CASE WHEN ?='edit' THEN status WHEN ?='restore' THEN
   (SELECT previous_status FROM e2e_registration_controls WHERE application_id=e2e_applications.id)
   ELSE 'withdrawn' END,
  updated_at=MAX(updated_at+1,?) WHERE id=? AND EXISTS(SELECT 1 FROM e2e_registration_controls c
   WHERE c.application_id=e2e_applications.id AND c.last_event_id=?)`).bind(name,affiliation,action,action,event.time,target,event.id);
 const verify=db.prepare(`SELECT e.result,a.id,a.state,a.version,a.updated_at,a.stage_name,a.affiliation,a.status
  FROM e2e_staff_audit e LEFT JOIN e2e_admin_registrations a ON a.id=e.target_id WHERE e.id=?`).bind(event.id);
 const [, , updated, checked]=await db.batch([decision,store,apply,verify]);
 const row=checked.results?.[0];
 if(!row||row.result==='success'&&updated.meta?.changes!==1)throw Error('staff_admin_readback_failed');
 return row;
}

export async function handleAdminRegistration(request,env,actor,{json,deny,NOW,uuid,bodyJSON}){
 const url=new URL(request.url),path=url.pathname;
 if(!routes.has(path))return null;
 const mutating=path===actionPath||path===bulkPath;
 if(request.method!==(mutating?'POST':'GET'))return deny('method_not_allowed',405);
 const enabled=await adminManagementReady(env);
 if(!enabled)return deny('admin_registration_unavailable',503);
 const db=env.DB, event={id:uuid(),time:NOW(),target:null,action:routes.get(path)};
 if(actor.role!=='organizer'){
  // Keep the published target and payload opaque to actors without permission.
  await writeEvent(db,actor,{...event,result:'denied'});
  return deny('organizer_only',403);
 }
 if(path===bulkPath)return handleRegistrationBulk(request,env,actor,{json,deny,NOW,uuid,bodyJSON,writeEvent,changeRegistration});
 if(path===searchPath){
  const search=(url.searchParams.get('q')||'').trim(),state=url.searchParams.get('state')||'active';
  const offset=Number(url.searchParams.get('offset')||0);
  if(search.length>100||!['active','disabled','deleted','all'].includes(state)||!Number.isInteger(offset)||offset<0||offset>10000)
   return deny('invalid_admin_filter',422);
  const rows=await db.prepare(`SELECT * FROM e2e_admin_registrations WHERE (?='all' OR state=?)
   AND (?='' OR instr(lower(stage_name),lower(?))>0 OR instr(lower(song_title),lower(?))>0 OR instr(id,lower(?))>0)
   ORDER BY updated_at DESC,id ASC LIMIT 26 OFFSET ?`).bind(state,state,search,search,search,search,offset).all();
  await writeEvent(db,actor,{...event,result:'success'});
  return json({ok:true,testOnly:true,registrations:rows.results.slice(0,25),next_offset:rows.results.length>25?offset+25:null});
 }
 if(path===auditPath){
  const id=url.searchParams.get('id');
  if(!validId(id))return deny('invalid_registration_id',422);
  const rows=await db.prepare(`SELECT actor_id,actor_role,target_id,action,result,occurred_at,diff
   FROM e2e_staff_audit WHERE target_id=? AND (action<>'audit_read' OR json_extract(diff,'$.access')='organizer_contact') ORDER BY occurred_at DESC,rowid DESC LIMIT 25`).bind(id).all();
  await writeEvent(db,actor,{...event,target:id,result:'success'});
  return json({ok:true,testOnly:true,events:rows.results.map(row=>({...row,diff:row.diff?JSON.parse(row.diff):null}))});
 }
 const body=await bodyJSON(request);
 if(!body||!Object.hasOwn(transitions,body.action)||!validId(body.id)||!Number.isSafeInteger(body.version)||body.version<0||
  !Number.isSafeInteger(body.updated_at)||body.updated_at<0||
  (body.action==='edit'&&(!safeValue(body.stage_name)||!safeValue(body.affiliation)))){
  await writeEvent(db,actor,{...event,result:'invalid'});
  return deny('invalid_registration_action',422);
 }
 event.action=body.action;event.target=body.id;
 try{
  const {result,...registration}=await changeRegistration(db,actor,body,event);
  if(result!=='success')return deny('admin_registration_'+result,results[result]);
  return json({ok:true,testOnly:true,registration,audit_id:event.id});
 }catch{
  // A thrown D1 batch rolls back the mutation and its audit row together.
  // A readback/network failure can have an unknown commit outcome.
  return deny('admin_registration_readback_unavailable',503);
 }
}

export async function managedEraseAvailable(db){
 const found=await db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='e2e_removed_member_media'").first();
 return Boolean(found);
}
export async function drainRemovedMemberMedia(db,bucket){
 if(!db||!bucket||!await managedEraseAvailable(db))return;
 const keys=await db.prepare('SELECT object_key FROM e2e_removed_member_media ORDER BY queued_at LIMIT 50').all();
 for(const {object_key:key} of keys.results){
  try{await bucket.delete(key)}catch{continue}
  await db.prepare('DELETE FROM e2e_removed_member_media WHERE object_key=?').bind(key).run();
 }
}
