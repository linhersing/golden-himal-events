/* Muse audition TEST fields, private and owner-only. Disabled until migration and flag. */
export const MUSE_FIELDS=["full_name","contact_phone","contact_email","contact_handle","city","street_address","educational_background","short_description","musical_training"];
const LIMITS={"full_name":120,"contact_phone":32,"contact_email":180,"contact_handle":160,"city":100,"street_address":160,"educational_background":400,"short_description":500,"musical_training":400};
export const museHasFields=b=>MUSE_FIELDS.some(k=>Object.hasOwn(b||{},k));
export function parseMuseAudition(b){
 if(!museHasFields(b))return {error:'muse_profile_missing'};
 const data={};
 for(const k of MUSE_FIELDS){
  if(typeof b[k]!=='string')return {error:'muse_profile_invalid'};
  data[k]=b[k].trim();
  if(data[k].length<2||data[k].length>LIMITS[k])return {error:'muse_profile_invalid'};
 }
 if(!/^\+?[0-9][0-9() +\-]{5,30}[0-9]$/.test(data.contact_phone))return {error:'muse_phone_invalid'};
 if(!/^[^\s@]{1,64}@[^\s@]{1,120}\.[a-z]{2,}$/i.test(data.contact_email))return {error:'muse_email_invalid'};
 return {profile:data};
}
export async function museAuditionReady(env){
 if(env.STAGING_MUSE_AUDITION_ENABLED!=='true'||!env.DB)return false;
 try{
  const table=await env.DB.prepare("SELECT 1 AS ready FROM sqlite_master WHERE type='table' AND name='e2e_muse_audition_details'").first();
  if(!table)return false;
  return Boolean(await env.DB.prepare("SELECT 1 AS ready FROM pragma_table_info('e2e_muse_audition_details') WHERE name='contact_handle'").first());
 }catch{return false}
}
export function insertMuseAudition(db,id,p,now){
 return db.prepare(`INSERT INTO e2e_muse_audition_details(application_id,${MUSE_FIELDS.join(',')},updated_at)
 VALUES(${Array(MUSE_FIELDS.length+2).fill('?').join(',')})`).bind(id,...MUSE_FIELDS.map(k=>p[k]),now);
}
export function updateMuseAudition(db,id,accountId,p,now,guard=''){
 // Application owner, status, unscored and pending-approval locks also guard private fields.
 const updates=MUSE_FIELDS.map(k=>k+'=excluded.'+k).join(',');
 return db.prepare(`INSERT INTO e2e_muse_audition_details(application_id,${MUSE_FIELDS.join(',')},updated_at)
 SELECT p.id,${MUSE_FIELDS.map(()=>'?').join(',')},? FROM e2e_applications p
 WHERE p.id=? AND p.account_id=? AND p.phase='demo'
 AND p.status IN ('submitted','under_review') AND p.payment_status IN ('unpaid','simulated_paid')
 AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)
 ${guard}
 ON CONFLICT(application_id) DO UPDATE SET ${updates},updated_at=excluded.updated_at`)
 .bind(...MUSE_FIELDS.map(k=>p[k]),now,id,accountId);
}
export async function attachMuseAudition(env,rows){
 if(!rows.length||!await museAuditionReady(env))return rows;
 for(const row of rows){
  const own=await env.DB.prepare('SELECT '+MUSE_FIELDS.join(',')+' FROM e2e_muse_audition_details WHERE application_id=?').bind(row.id).first();
  if(own)for(const key of MUSE_FIELDS)row[key]=own[key];
 }
 return rows;
}
