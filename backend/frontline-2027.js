/* 2026-11-16 frontline rules / TEST extension only.
 * Keep physical competition region separate from residential province.
 * Preserve legacy records; all new entry writes fail closed when migration is absent.
 */
const REGIONS=['A','B'],ELIGIBILITY=['enrolled','graduated'];

export function parseFrontline2027(body){
 if(body?.frontline_2027!==true)return {entry:null};
 if(body.round_code!=='2027-01')return {error:'frontline_round_unavailable',status:422};
 const competition_region=body.competition_region;
 const eligibility_basis=body.eligibility_basis;
 if(!REGIONS.includes(competition_region))return {error:'invalid_competition_region',status:422};
 if(!ELIGIBILITY.includes(eligibility_basis))return {error:'invalid_eligibility_basis',status:422};
 // Compatibility guard only; it is NOT the public competition category.
 // All entrants compete together regardless of enrollment/graduation.
 const legacyCategory=eligibility_basis==='enrolled'?'university':'community';
 if(body.category!==legacyCategory)return {error:'legacy_eligibility_mismatch',status:422};
 return {entry:{competition_region,eligibility_basis}};
}

export async function frontline2027Ready(db){
 return Boolean(await db.prepare(
  "SELECT 1 FROM sqlite_master WHERE type='table' AND name='e2e_frontline_2027_registration'"
 ).first());
}

export function insertFrontline2027(db,id,{competition_region,eligibility_basis},now){
 return db.prepare('INSERT INTO e2e_frontline_2027_registration(application_id,competition_region,eligibility_basis,created_at) VALUES(?,?,?,?)')
  .bind(id,competition_region,eligibility_basis,now);
}

export const frontlineSelect=ready=>ready?',fr.competition_region,fr.eligibility_basis':',NULL AS competition_region,NULL AS eligibility_basis';
export const frontlineJoin=ready=>ready?' LEFT JOIN e2e_frontline_2027_registration fr ON fr.application_id=p.id':'';
