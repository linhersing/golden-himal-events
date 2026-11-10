export const approvalRequired=env=>env.STAGING_TEST_APPROVAL_ENABLED==='true';

export async function approvalSchemaReady(env){
 try{
  await env.DB.prepare('SELECT application_id,approved_by,approved_at FROM e2e_test_application_approvals LIMIT 0').first();
  return true;
 }catch{return false}
}

// The caller supplies a literal application table alias, never request data.
export const hasTestApproval=alias=>`EXISTS(SELECT 1 FROM e2e_test_application_approvals approval WHERE approval.application_id=${alias}.id)`;
export const approvalColumn=enabled=>enabled?`, CASE WHEN ${hasTestApproval('p')} THEN 'approved' ELSE 'pending' END AS approval_state`:'';
export const approvalGuard=(enabled,alias)=>enabled?` AND ${hasTestApproval(alias)}`:'';
export const pendingGuard=(enabled,alias)=>enabled?` AND NOT ${hasTestApproval(alias)}`:'';

export async function approveTestApplication(request,db,organizer,{json,deny,NOW,bodyJSON}){
 const body=await bodyJSON(request);
 if(!body||Object.keys(body).length!==1||typeof body.application_id!=='string'||!body.application_id||body.application_id.length>100)
  return deny('invalid_application_id',422);
 const id=body.application_id;
 const result=await db.prepare(`INSERT INTO e2e_test_application_approvals(application_id,approved_by,approved_at)
  SELECT p.id,?,? FROM e2e_applications p WHERE p.id=? AND p.status NOT IN ('withdrawn','rejected')
  ON CONFLICT(application_id) DO NOTHING`).bind(organizer.id,NOW(),id).run();
 const approved={ok:true,application_id:id,approval_state:'approved',testOnly:true};
 if(result.meta?.changes)return json(approved);
 const existing=await db.prepare(`SELECT p.status${approvalColumn(true)} FROM e2e_applications p WHERE p.id=?`).bind(id).first();
 if(!existing)return deny('application_not_found',404);
 if(['withdrawn','rejected'].includes(existing.status))return deny('test_approval_not_allowed',409);
 if(existing.approval_state==='approved')return json({...approved,already:true});
 return deny('test_approval_unavailable',503);
}
