/* Opt-in staging contestant profile URLs. Only application IDs, never a browser-wide localStorage identity. */
const validGenders=new Set(['male','female','other','prefer_not_say','']);
export function safePhotoUrl(value){
 if(value===undefined||value===null||String(value).trim()==='')return null;
 const str=String(value).trim();if(str.length>600)return null;
 try {
  const u=new URL(str),h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!h.includes('.')||
   h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||
   h.endsWith('.test')||h.endsWith('.invalid')||/^[0-9.]+$/.test(h)||h.startsWith('['))return null;
  return u.href;
 }catch{return null}
}
export function parseProfileInput(body){
 const fields=['photo_url_1','photo_url_2','photo_url_3'];
 const gender=String(body.gender??'').trim();
 if(!validGenders.has(gender))return {error:'invalid_gender'};
 const urls={};
 for(const field of fields){
  const raw=String(body[field]??'').trim();
  const url=raw?safePhotoUrl(raw):null;
  if(raw&&!url)return {error:'invalid_public_photo_url'};
  urls[field]=url;
 }
 if((urls.photo_url_2||urls.photo_url_3)&&!urls.photo_url_1)return {error:'main_photo_required'};
 const hasData=Boolean(gender||urls.photo_url_1||urls.photo_url_2||urls.photo_url_3);
 if(hasData&&body.profile_consent!==true)return {error:'profile_consent_required'};
 if(!hasData)return {profile:null};
 return {profile:{gender:gender||null,...urls}};
}
export async function profileReady(env){
 if(env.STAGING_PROFILE_URLS_ENABLED!=='true'||!env.DB?.prepare)return false;
 try{
  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='e2e_application_profiles'").first();
  return r?.name==='e2e_application_profiles';
 }catch{return false}
}
export async function attachProfiles(env,rows){
 if(!rows?.length||!await profileReady(env))return rows;
 const byId=new Map();
 for(let i=0;i<rows.length;i+=70){
  const ids=rows.slice(i,i+70).map(x=>x.id).filter(x=>typeof x==='string');
  if(!ids.length)continue;
  const records=await env.DB.prepare('SELECT application_id,gender,photo_url_1,photo_url_2,photo_url_3 FROM e2e_application_profiles WHERE application_id IN ('+ids.map(()=>'?').join(',')+')').bind(...ids).all();
  for(const p of records.results||[])byId.set(p.application_id,p);
 }
 return rows.map(row=>{const p=byId.get(row.id);return {...row,gender:p?.gender??null,photo_url_1:p?.photo_url_1??null,photo_url_2:p?.photo_url_2??null,photo_url_3:p?.photo_url_3??null};});
}
export function profileInsert(db,id,data,now){
 return db.prepare('INSERT INTO e2e_application_profiles(application_id,gender,photo_url_1,photo_url_2,photo_url_3,consent_at,updated_at) VALUES(?,?,?,?,?,?,?)')
  .bind(id,data.gender,data.photo_url_1,data.photo_url_2,data.photo_url_3,now,now);
}
// Check the app owner AND the same pre-score correction rules before modifying profile URLs.
export function profileUpsert(db,id,ownerId,data,now){
 const guard=`p.id=? AND p.account_id=? AND p.phase='demo'
  AND p.status IN ('submitted','under_review') AND p.payment_status IN ('unpaid','simulated_paid')
  AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
  AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
  AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)`;
 return db.prepare(`INSERT INTO e2e_application_profiles
  (application_id,gender,photo_url_1,photo_url_2,photo_url_3,consent_at,updated_at)
  SELECT ?,?,?,?,?,?,? FROM e2e_applications p WHERE ${guard}
  ON CONFLICT(application_id) DO UPDATE SET gender=excluded.gender,photo_url_1=excluded.photo_url_1,
  photo_url_2=excluded.photo_url_2,photo_url_3=excluded.photo_url_3,
  consent_at=excluded.consent_at,updated_at=excluded.updated_at
  WHERE EXISTS(SELECT 1 FROM e2e_applications p WHERE ${guard})`)
 .bind(id,data.gender,data.photo_url_1,data.photo_url_2,data.photo_url_3,now,now,id,ownerId,id,ownerId);
}
