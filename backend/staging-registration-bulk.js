// TEST-only recycling. A persisted preview fixes the target set; batches never
// physically DELETE applications, accounts, works, scores, or audit history.
const scope='test_registration_bulk',chunkSize=10,limit=500,lifetime=600;
const validId=id=>typeof id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id);
const stateFor=action=>action==='delete'?'deleted':'active';

export async function handleRegistrationBulk(request,env,actor,{json,deny,NOW,uuid,bodyJSON,writeEvent,changeRegistration}){
 const db=env.DB;
 if(env.STAGING_E2E_ENABLED!=='true'||env.STAGING_TEST_APPROVAL_ENABLED!=='true'||env.STAGING_SUBMISSION_MODE!=='links'||typeof db.batch!=='function')return deny('admin_bulk_unavailable',503);
 const body=await bodyJSON(request);
 if(!body||!['preview','preview_restore','apply','status','recent'].includes(body.operation))return deny('invalid_bulk_action',422);
 async function load(id){
  if(!validId(id))return null;
  const row=await db.prepare("SELECT id,occurred_at,diff FROM e2e_staff_audit WHERE id=? AND actor_id=? AND actor_role='organizer' AND action='search' AND result='success' AND target_id IS NULL").bind(id,actor.id).first();
  if(!row)return null;
  const plan=JSON.parse(row.diff||'null');
  if(plan?.access!==scope||!['delete','restore'].includes(plan.action)||!Array.isArray(plan.targets)||!plan.targets.length||plan.targets.length>limit||!Number.isSafeInteger(plan.expires_at)||plan.targets.some(t=>!validId(t.id)||!Number.isSafeInteger(t.version)||!Number.isSafeInteger(t.updated_at)))return null;
  return {...plan,batch_id:id,created_at:row.occurred_at};
 }
 async function status(plan){
  const rows=await db.prepare(`SELECT json_extract(t.value,'$.id') AS id,e.result,
   CASE WHEN e.result='success' AND c.last_event_id=?||':'||json_extract(t.value,'$.id') AND c.state=? THEN 1 ELSE 0 END AS current_applied
   FROM json_each(?) t LEFT JOIN e2e_staff_audit e ON e.id=?||':'||json_extract(t.value,'$.id')
   LEFT JOIN e2e_registration_controls c ON c.application_id=json_extract(t.value,'$.id')`).bind(plan.batch_id,stateFor(plan.action),JSON.stringify(plan.targets),plan.batch_id).all();
  if(rows.results?.length!==plan.targets.length)throw Error('bulk_readback_failed');
  const counts={success:0,conflict:0,protected:0,missing:0,pending:0,current_applied:0};
  for(const row of rows.results){
   if(row.result===null)counts.pending++;
   else if(Object.hasOwn(counts,row.result)&&row.result!=='pending'&&row.result!=='current_applied')counts[row.result]++;
   else throw Error('invalid_bulk_result');
   counts.current_applied+=row.current_applied;
  }
  const first=rows.results.findIndex(row=>row.result===null);
  return {ok:true,testOnly:true,batch_id:plan.batch_id,action:plan.action,total:plan.targets.length,protected_count:plan.protected_count,remaining_count:plan.remaining_count,expires_at:plan.expires_at,chunk_size:chunkSize,...counts,next_offset:first<0?null:Math.floor(first/chunkSize)*chunkSize};
 }
 try{
  if(body.operation==='recent'){
   const rows=await db.prepare(`SELECT id AS batch_id,occurred_at AS created_at,json_extract(diff,'$.action') AS action,json_array_length(json_extract(diff,'$.targets')) AS total
    FROM e2e_staff_audit WHERE actor_id=? AND actor_role='organizer' AND action='search' AND result='success' AND target_id IS NULL
    AND json_extract(diff,'$.access')=? ORDER BY occurred_at DESC,rowid DESC LIMIT 5`).bind(actor.id,scope).all();
   await writeEvent(db,actor,{id:uuid(),time:NOW(),target:null,action:'search',result:'success',detail:{access:'test_bulk_recent'}});
   return json({ok:true,testOnly:true,batches:rows.results});
  }
  if(body.operation==='preview'||body.operation==='preview_restore'){
   let candidates,protectedCount=0,source,eligibleCount,explicitAction;
   const selected=body.operation==='preview'&&body.ids!==undefined;
   if(selected){
    // A user's selection is never permission to delete arbitrary IDs.
    // Only a short, unique, current list can create an audited batch preview.
    if(!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>25||
       !['delete','restore'].includes(body.action)||
       new Set(body.ids).size!==body.ids.length||body.ids.some(id=>!validId(id)))
      return deny('invalid_bulk_selection',422);
    const placeholders=body.ids.map(()=>'?').join(',');
    const found=await db.prepare(`SELECT r.id,r.version,r.updated_at,r.state,CASE WHEN r.protected=1 OR EXISTS(SELECT 1 FROM e2e_staff_audit e WHERE e.target_id=r.id AND e.actor_role='member' AND e.result='success' AND json_extract(e.diff,'$.member_withdrawal')=1) THEN 1 ELSE 0 END AS protected FROM e2e_admin_registrations r WHERE r.id IN (`+placeholders+')')
     .bind(...body.ids).all();
    const byId=new Map(found.results.map(row=>[row.id,row]));
    const matched=body.ids.map(id=>byId.get(id));
    if(matched.some(row=>!row||body.action==='delete'&&row.state==='deleted'||
       body.action==='restore'&&row.state!=='deleted'))return deny('admin_bulk_stale_selection',409);
    candidates={results:matched};
    protectedCount=matched.filter(row=>row.protected).length;
    eligibleCount=matched.length-protectedCount;
    explicitAction=body.action;
   }else if(body.operation==='preview_restore'){
    source=await load(body.batch_id);
    if(!source||source.action!=='delete')return deny('admin_bulk_not_found',404);
    candidates=await db.prepare(`SELECT a.id,a.version,a.updated_at,a.protected FROM json_each(?) t
     JOIN e2e_admin_registrations a ON a.id=json_extract(t.value,'$.id') JOIN e2e_registration_controls c ON c.application_id=a.id
     WHERE c.state='deleted' AND c.last_event_id=?||':'||a.id ORDER BY a.id`).bind(JSON.stringify(source.targets),source.batch_id).all();
   }else{
    // No contacts or performance URLs are loaded into the plan or its audit.
    const counts=await db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(protected),0) AS protected_count FROM e2e_admin_registrations WHERE state<>'deleted'").first();
    protectedCount=counts.protected_count;eligibleCount=counts.total-protectedCount;
    candidates=await db.prepare("SELECT id,version,updated_at,protected FROM e2e_admin_registrations WHERE state<>'deleted' AND protected=0 ORDER BY id LIMIT 500").all();
   }
   if(source)protectedCount=candidates.results.filter(r=>r.protected).length;
   const eligible=candidates.results.filter(r=>!r.protected),targets=eligible.slice(0,limit).map(({id,version,updated_at})=>({id,version,updated_at}));
   const action=explicitAction||(source?'restore':'delete'),expires_at=NOW()+lifetime,remaining_count=Math.max(0,(eligibleCount??eligible.length)-limit);
   const batch_id=targets.length?uuid():null;
   if(batch_id)await writeEvent(db,actor,{id:batch_id,time:NOW(),target:null,action:'search',result:'success',detail:{access:scope,action,expires_at,targets,protected_count:protectedCount,remaining_count,...(source?{source_batch_id:source.batch_id}:{})}});
   return json({ok:true,testOnly:true,batch_id,action,total:targets.length,protected_count:protectedCount,remaining_count,expires_at,chunk_size:chunkSize});
  }
  const plan=await load(body.batch_id);
  if(!plan)return deny('admin_bulk_not_found',404);
  if(body.operation==='status'){
   const checked=await status(plan);
   await writeEvent(db,actor,{id:uuid(),time:NOW(),target:null,action:'search',result:'success',detail:{access:'test_bulk_status',batch_id:plan.batch_id}});
   return json(checked);
  }
  if(NOW()>=plan.expires_at)return deny('admin_bulk_expired',410);
  if(body.confirmation!==(plan.action==='delete'?'DELETE TEST':'RESTORE TEST')||!Number.isInteger(body.offset)||body.offset<0||body.offset>=plan.targets.length||body.offset%chunkSize!==0)return deny('invalid_bulk_confirmation',422);
  for(const target of plan.targets.slice(body.offset,body.offset+chunkSize)){
   const eventId=plan.batch_id+':'+target.id;
   const recorded=await db.prepare('SELECT result FROM e2e_staff_audit WHERE id=?').bind(eventId).first();
   // A retry reports the original decision, including after a later restoration.
   // Concurrent attempts share a unique event ID and cannot commit twice.
   if(recorded)continue;
   await changeRegistration(db,actor,{...target,action:plan.action},{id:eventId,time:NOW()});
  }
  return json(await status(plan));
 }catch{
  // Some chunks may have committed. Query status; never presume all-or-nothing
  // for a multi-request batch or automatically replay with a new plan.
  return deny('admin_bulk_readback_unavailable',503);
 }
}
