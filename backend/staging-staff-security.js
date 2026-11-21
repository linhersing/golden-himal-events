const staffRoles=new Set(['organizer','reviewer']);
const keyReady=key=>typeof key==='string'&&/^0x[A-Za-z0-9_-]{16,}$/.test(key);
const budgets={request:12,verify:24};

export function staffProtection(env,role){
 return env.STAGING_STAFF_TURNSTILE_REQUIRED==='true'&&staffRoles.has(role);
}
export function staffSource(request){
 const source=request.headers.get('CF-Connecting-IP');
 return source&&/^[a-f0-9:.]{3,45}$/i.test(source)?source:null;
}
export async function staffLoginConfig(env){
 const required=staffProtection(env,'organizer');
 if(!required||!keyReady(env.STAGING_TURNSTILE_SITE_KEY)||!keyReady(env.STAGING_TURNSTILE_SECRET_KEY))return {required};
 try{
  await env.DB.prepare('SELECT kind,source_fingerprint,created_at FROM e2e_staff_auth_attempts LIMIT 0').all();
  return {required,siteKey:env.STAGING_TURNSTILE_SITE_KEY};
 }catch{return {required}}
}
export async function reserveStaffAttempt(db,kind,sourceFingerprint,now){
 await db.prepare('DELETE FROM e2e_staff_auth_attempts WHERE created_at<=?').bind(now-600).run();
 // The predicate and insert execute atomically even when requests arrive together.
 const inserted=await db.prepare(`INSERT INTO e2e_staff_auth_attempts(kind,source_fingerprint,created_at)
  SELECT ?,?,? WHERE (SELECT COUNT(*) FROM e2e_staff_auth_attempts
   WHERE kind=? AND source_fingerprint=? AND created_at>?)<?`)
  .bind(kind,sourceFingerprint,now,kind,sourceFingerprint,now-600,budgets[kind]).run();
 return Boolean(inserted.meta?.changes);
}
