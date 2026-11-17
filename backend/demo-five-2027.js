/* 2026-11-17 Nepal 2027 audition: up to five songs per singer.
 * All storage remains gated; per-video judging must be separately deployed.
 * The legacy single demo remains the only enabled TEST submission. */
export const FIVE_DEMO_LIMIT=5;
export const LANGUAGES=['Nepali','English','Hindi','Maithili','Bhojpuri','Tamang','Chinese','Other'];
export function parseFiveDemos(body,validLink){
 if(!Object.hasOwn(body||{},'demo_entries'))return {entries:null};
 const rows=body.demo_entries;
 if(!Array.isArray(rows)||rows.length<1||rows.length>FIVE_DEMO_LIMIT)return {error:'invalid_demo_count'};
 const result=[],urls=new Set();
 for(const r of rows){
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='demo_url,original_artist,song_language,song_title')
   return {error:'invalid_demo_fields'};
  const entry={};
  for(const k of ['song_title','original_artist','song_language','demo_url']){
   if(typeof r[k]!=='string')return {error:'invalid_demo_fields'};
   entry[k]=r[k].trim();
  }
  if(!entry.song_title||entry.song_title.length>100||!entry.original_artist||entry.original_artist.length>100
   ||!LANGUAGES.includes(entry.song_language)||entry.demo_url.length>1000||!validLink(entry.demo_url))
   return {error:'invalid_demo_fields'};
  const norm=entry.demo_url.toLowerCase();
  if(urls.has(norm))return {error:'duplicate_demo_url'};
  urls.add(norm);result.push(entry);
 }
 const first=result[0];
 for(const key of ['song_title','original_artist','song_language','demo_url']){
  if(first[key]!==String(body[key]||'').trim())return {error:'demo_first_mismatch'};
 }
 return {entries:result};
}
export async function fiveDemoReady(env){
 if(env.STAGING_FIVE_DEMO_ENABLED!=='true'||env.STAGING_PER_VIDEO_JUDGING_ENABLED!=='true'||!env.DB)return false;
 try{
  const tables=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('e2e_demo_2027_videos','e2e_demo_2027_scores')").all();
  return tables.results?.length===2;
 }catch{return false}
}
export function insertFiveDemos(db,id,rows,now){
 return rows.map((row,i)=>db.prepare(
  "INSERT INTO e2e_demo_2027_videos(application_id,position,song_title,original_artist,song_language,demo_url,updated_at) VALUES(?,?,?,?,?,?,?)"
 ).bind(id,i+1,row.song_title,row.original_artist,row.song_language,row.demo_url,now));
}
// Even a direct forged request cannot rewrite a scored / promoted / other-member entry.
const updateOwnerGate=(guard)=>` SELECT 1 FROM e2e_applications p
 WHERE p.id=? AND p.account_id=? AND p.phase='demo'
 AND p.status IN ('submitted','under_review') AND p.payment_status IN ('unpaid','simulated_paid')
 AND NOT EXISTS(SELECT 1 FROM e2e_judge_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_live_scores s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_promotion_events s WHERE s.application_id=p.id)
 AND NOT EXISTS(SELECT 1 FROM e2e_demo_2027_scores s WHERE s.application_id=p.id)
 ${guard}`;
export function replaceFiveDemos(db,id,owner,rows,now,guard=''){
 const where=updateOwnerGate(guard);
 const statements=[
  db.prepare(`DELETE FROM e2e_demo_2027_videos
   WHERE application_id=? AND EXISTS(${where})`).bind(id,id,owner)
 ];
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  statements.push(db.prepare(`INSERT INTO e2e_demo_2027_videos
   (application_id,position,song_title,original_artist,song_language,demo_url,updated_at)
   SELECT ?,?,?,?,?,?,? WHERE EXISTS(${where})`)
    .bind(id,i+1,r.song_title,r.original_artist,r.song_language,r.demo_url,now,id,owner));
 }
 return statements;
}
export async function attachFiveDemos(env,rows){
 if(!rows.length||!await fiveDemoReady(env))return rows;
 for(const row of rows){
  const links=await env.DB.prepare(
   "SELECT position,song_title,original_artist,song_language,demo_url FROM e2e_demo_2027_videos WHERE application_id=? ORDER BY position"
  ).bind(row.id).all();
  if(links.results?.length)row.demo_entries=links.results.map(({position,...rest})=>rest);
 }
 return rows;
}
