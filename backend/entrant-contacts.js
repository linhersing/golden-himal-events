/* TEST-only contact details, separate from scoring data.
 * OFF until a backed-up migration 1008 has been applied to the isolated E2E_DB
 * and an operator explicitly sets STAGING_CONTACT_FIELDS_ENABLED=true.
 * Never expose contacts to judges or public APIs.
 */
import {emailAddress} from './staging-mail.js';

export async function contactReady(env){
 if(env.STAGING_CONTACT_FIELDS_ENABLED!=='true'||!env.DB?.prepare)return false;
 try {
  const row=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='e2e_application_contacts'").first();
  return row?.name==='e2e_application_contacts';
 }catch{return false}
}
export function parseContact(body){
 const email=String(body.contact_email??'').trim().toLowerCase();
 const phone=String(body.contact_phone??'').trim();
 if(!emailAddress(email)||email.length>250)return {error:'contact_email_invalid'};
 // E.164 international number or a Nepal local number with common separators.
 if(phone.length<8||phone.length>30||!/^[+0-9 ()-]+$/.test(phone)||!/^\+?[0-9]/.test(phone)||
    (phone.match(/\d/g)||[]).length<8||(phone.match(/\d/g)||[]).length>15)return {error:'contact_phone_invalid'};
 if(body.contact_consent!==true)return {error:'contact_consent_required'};
 return {contact:{contact_email:email,contact_phone:phone}};
}
export function contactInsert(db,id,data,now){
 return db.prepare('INSERT INTO e2e_application_contacts(application_id,contact_email,contact_phone,consent_at,updated_at) VALUES(?,?,?,?,?)')
  .bind(id,data.contact_email,data.contact_phone,now,now);
}
// Matches the parent application's ownership and pre-scoring edit guard.
export function contactUpsert(db,id,ownerId,data,now,guard=''){
 const where=`p.id=? AND p.account_id=? AND p.phase='demo'
 AND p.status IN ('submitted','under_review') AND p.payment_status IN ('unpaid','simulated_paid')
 AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)${guard}`;
 return db.prepare(`INSERT INTO e2e_application_contacts
 (application_id,contact_email,contact_phone,consent_at,updated_at)
 SELECT ?,?,?,?,? FROM e2e_applications p WHERE ${where}
 ON CONFLICT(application_id) DO UPDATE SET contact_email=excluded.contact_email,
 contact_phone=excluded.contact_phone,consent_at=excluded.consent_at,updated_at=excluded.updated_at
 WHERE EXISTS(SELECT 1 FROM e2e_applications p WHERE ${where})`)
 .bind(id,data.contact_email,data.contact_phone,now,now,id,ownerId,id,ownerId);
}
export async function attachContacts(env,rows){
 if(!rows?.length||!await contactReady(env))return rows;
 const lookup=new Map();
 for(let i=0;i<rows.length;i+=70){
  const ids=rows.slice(i,i+70).map(row=>row.id);
  const found=await env.DB.prepare('SELECT application_id,contact_email,contact_phone FROM e2e_application_contacts WHERE application_id IN ('+ids.map(()=>'?').join(',')+')').bind(...ids).all();
  for(const c of found.results||[])lookup.set(c.application_id,c);
 }
 return rows.map(row=>({...row,contact_email:lookup.get(row.id)?.contact_email??null,
  contact_phone:lookup.get(row.id)?.contact_phone??null}));
}
