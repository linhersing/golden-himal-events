// Fictional isolated stage Worker only. No production import or promotion.
import {previewFrontlineFinalists} from './frontline-finalist-preview.js';
const envelope={testOnly:true,official:false};
const error=(status,error)=>({...envelope,ok:false,status,error});
const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const receipt=row=>({id:row.id,source_reference:row.source_reference,preview_fingerprint:row.preview_fingerprint,
 created_at:row.created_at,member_count:JSON.parse(row.manifest).entries.length});
const fields=['round_code','phase','status','updated_at','competition_region','eligibility_basis','registration_state','registration_version','test_approval_state','test_approved_at'];
// Compared inside the write transaction, not merely before it. Source score and
// contact tables are deliberately absent. JSON nulls compare using SQLite IS.
const currentSource=`SELECT p.id AS application_id,p.account_id,p.round_code,p.phase,p.status,p.updated_at,
 f.competition_region,f.eligibility_basis,COALESCE(c.state,'active') AS registration_state,
 COALESCE(c.version,0) AS registration_version,
 CASE WHEN a.application_id IS NOT NULL THEN 'approved' ELSE 'pending' END AS test_approval_state,
 a.approved_at AS test_approved_at FROM e2e_applications p
 LEFT JOIN e2e_frontline_2027_registration f ON f.application_id=p.id
 LEFT JOIN e2e_registration_controls c ON c.application_id=p.id
 LEFT JOIN e2e_test_application_approvals a ON a.application_id=p.id`;

export async function frontlineHandoff(db,actor,body){
 if(!actor?.id)return error(401,'login_required');
 if(actor.role!=='organizer')return error(403,'organizer_only');
 if(!body||typeof body!=='object'||Array.isArray(body))return error(422,'invalid_handoff');
 try{
  if(!await db.prepare("SELECT scope FROM stage_test_scope WHERE scope='FICTIONAL_STAGE_TEST_ONLY'").first())return error(404,'isolated_test_required');
  const round=await db.prepare("SELECT * FROM stage_test_rounds WHERE code='final'").first();
  if(!round)return error(409,'final_not_configured');
  const access=async(action,count)=>{const id=crypto.randomUUID();await db.prepare("INSERT INTO stage_test_audit VALUES(?,?,?,?,?,?,'final','success',?,?)")
   .bind(id,actor.id,actor.role,id,'read-only',action,JSON.stringify({count}),Math.floor(Date.now()/1000)).run()};
  if(body.operation==='list'){
   if(Object.keys(body).some(k=>!['operation','page'].includes(k))||!Number.isSafeInteger(body.page)||body.page<0)return error(422,'invalid_page');
   const filter="p.round_code='2027-01' AND p.status NOT IN ('withdrawn','rejected') AND COALESCE(c.state,'active')='active' AND a.application_id IS NOT NULL";
   const tables=`FROM e2e_applications p JOIN e2e_frontline_2027_registration f ON f.application_id=p.id
    JOIN e2e_test_application_approvals a ON a.application_id=p.id LEFT JOIN e2e_registration_controls c ON c.application_id=p.id WHERE ${filter}`;
   const entries=(await db.prepare(`SELECT p.id AS application_id,p.stage_name,f.competition_region ${tables} ORDER BY p.id LIMIT 10 OFFSET ?`).bind(Math.min(body.page,1000000)*10).all()).results;
   const total=(await db.prepare(`SELECT COUNT(*) n ${tables}`).first()).n;
   await access('frontline_list_read',entries.length);
   return {...envelope,ok:true,status:200,entries,total,version:round.version,target_status:round.status};
  }
  if(body.operation==='current'){
   if(Object.keys(body).length!==1)return error(422,'invalid_handoff');
   const saved=await db.prepare("SELECT * FROM frontline_test_handoffs WHERE stage='final'").first();
   await access('frontline_receipt_read',saved?1:0);
   return {...envelope,ok:true,status:200,receipt:saved?receipt(saved):null};
  }
  if(body.operation==='receipt'){
   if(Object.keys(body).some(k=>!['operation','request_id'].includes(k))||typeof body.request_id!=='string'||!/^[A-Za-z0-9_-]{3,100}$/.test(body.request_id))return error(422,'invalid_request_id');
   const saved=await db.prepare('SELECT * FROM frontline_test_handoffs WHERE actor_id=? AND request_id=?').bind(actor.id,body.request_id).first();
   await access('frontline_receipt_read',saved?1:0);
   return {...envelope,ok:true,status:200,receipt:saved?receipt(saved):null};
  }
  if(!['preview','confirm'].includes(body.operation))return error(422,'invalid_operation');
  const keys=body.operation==='confirm'?['operation','application_ids','source_reference','preview_fingerprint','version','request_id','acknowledge_test']:['operation','application_ids','source_reference'];
  if(Object.keys(body).sort().join(',')!==keys.sort().join(','))return error(422,'invalid_handoff');
  if(body.operation==='confirm'&&(body.acknowledge_test!==true||!Number.isSafeInteger(body.version)||body.version<0||
   typeof body.request_id!=='string'||!/^[A-Za-z0-9_-]{3,100}$/.test(body.request_id)||typeof body.preview_fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(body.preview_fingerprint)))return error(422,'invalid_confirmation');
  const payloadHash=await sha(JSON.stringify({application_ids:Array.isArray(body.application_ids)?[...body.application_ids].sort():body.application_ids,
   source_reference:body.source_reference,preview_fingerprint:body.preview_fingerprint,version:body.version}));
  if(body.operation==='confirm'){
   const prior=await db.prepare('SELECT * FROM frontline_test_handoffs WHERE actor_id=? AND request_id=?').bind(actor.id,body.request_id).first();
   if(prior)return prior.payload_hash===payloadHash?{...envelope,ok:true,status:200,replayed:true,receipt:receipt(prior)}:error(409,'idempotency_conflict');
  }
  const preview=await previewFrontlineFinalists(db,actor,{application_ids:body.application_ids,source_reference:body.source_reference});
  if(!preview.ok)return preview;
  if(body.operation==='preview'){
   const display_entries=(await db.prepare('SELECT id AS application_id,stage_name FROM e2e_applications WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id').bind(JSON.stringify(body.application_ids)).all()).results;
   await access('frontline_preview_read',preview.manifest.entries.length);return {...preview,display_entries,version:round.version,target_status:round.status};
  }
  if(preview.blocked)return {...error(409,'frontline_roster_blocked'),blocking_reasons:preview.blocking_reasons};
  if(body.preview_fingerprint!==preview.fingerprint)return error(409,'stale_frontline_preview');
  if(round.status!=='locked'||round.version!==body.version)return error(409,'final_target_not_empty');
  if((await db.prepare("SELECT COUNT(*) n FROM stage_test_units WHERE stage='final'").first()).n||
   (await db.prepare("SELECT COUNT(*) n FROM stage_test_scores WHERE stage='final'").first()).n)return error(409,'final_target_not_empty');
  const panel=JSON.parse(round.panel);
  if(!Array.isArray(panel)||panel.length<3||panel.length>5||new Set(panel).size!==panel.length)return error(409,'final_panel_not_configured');
  for(const judge of panel)if(!await db.prepare("SELECT id FROM e2e_accounts WHERE id=? AND role='reviewer'").bind(judge).first())return error(409,'final_panel_not_configured');
  const id=crypto.randomUUID(),now=Math.floor(Date.now()/1000),entries=JSON.stringify(preview.manifest.entries),exists='EXISTS(SELECT 1 FROM frontline_test_handoffs WHERE id=?)';
  const sqlGuard=`NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN (${currentSource}) s ON s.application_id=json_extract(j.value,'$.application_id')
   WHERE s.application_id IS NULL OR ${fields.map(k=>`s.${k} IS NOT json_extract(j.value,'$.${k}')`).join(' OR ')})
   AND (SELECT COUNT(DISTINCT s.account_id) FROM (${currentSource}) s JOIN json_each(?) j ON s.application_id=json_extract(j.value,'$.application_id'))=10`;
  const statements=[db.prepare(`INSERT INTO frontline_test_handoffs
   SELECT ?,?,?,?,?,?,?,?,'final' WHERE EXISTS(SELECT 1 FROM stage_test_rounds WHERE code='final' AND status='locked' AND version=? AND panel=?)
   AND NOT EXISTS(SELECT 1 FROM stage_test_units WHERE stage='final') AND NOT EXISTS(SELECT 1 FROM stage_test_scores WHERE stage='final')
   AND NOT EXISTS(SELECT 1 FROM vote_test_round)
   AND NOT EXISTS(SELECT 1 FROM stage_test_rounds r JOIN json_each(r.panel) j LEFT JOIN e2e_accounts a ON a.id=j.value WHERE r.code='final' AND (a.id IS NULL OR a.role<>'reviewer')) AND ${sqlGuard}`)
   .bind(id,actor.id,body.request_id,payloadHash,body.source_reference,preview.fingerprint,JSON.stringify(preview.manifest),now,round.version,round.panel,entries,entries),
   db.prepare(`UPDATE stage_test_rounds SET status='open',version=version+1,last_event=? WHERE code='final' AND ${exists}`).bind(id,id),
   db.prepare(`INSERT INTO stage_test_audit SELECT ?,?,? ,?,?,'frontline_handoff','final','success',?,? WHERE ${exists}`)
    .bind(id,actor.id,actor.role,body.request_id,payloadHash,JSON.stringify({source_reference:body.source_reference,preview_fingerprint:preview.fingerprint,member_count:10,earlier_scores_carried:false}),now,id)];
  for(const entry of preview.manifest.entries){
   statements.push(db.prepare(`INSERT INTO stage_test_units SELECT 'final',p.id,p.stage_name,f.competition_region,1
    FROM e2e_applications p JOIN e2e_frontline_2027_registration f ON f.application_id=p.id WHERE p.id=? AND ${exists}`).bind(entry.application_id,id));
   // Values remain bound; no applicant IDs become SQL identifiers.
   statements.push(db.prepare(`INSERT INTO stage_test_members SELECT 'final',?,? WHERE ${exists}`).bind(entry.application_id,entry.application_id,id));
  }
  statements.push(db.prepare(`SELECT h.*,(SELECT COUNT(*) FROM stage_test_members WHERE stage='final') AS member_count,
   (SELECT COUNT(*) FROM stage_test_audit WHERE id=h.id) AS audit_count FROM frontline_test_handoffs h WHERE h.id=?`).bind(id));
  const committed=await db.batch(statements),saved=committed.at(-1).results?.[0];
  if(!saved)return error(409,'stale_frontline_preview');
  if(saved.member_count!==10||saved.audit_count!==1)return error(503,'handoff_readback_unavailable');
  return {...envelope,ok:true,status:200,receipt:receipt(saved)};
 }catch{return error(503,'frontline_handoff_unavailable')}
}
