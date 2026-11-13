const provinces=['koshi','madhesh','bagmati','gandaki','lumbini','karnali','sudurpashchim'];
const legacyProvinces=['bagmati','gandaki'];

export function parseLocation(body){
 const province=body.province;
 if(!provinces.includes(province))return {error:'invalid_province',status:400};
 const legacy=legacyProvinces.includes(province);
 if(legacy&&body.location_detail===undefined)return {legacyProvince:province};
 const detail=typeof body.location_detail==='string'?body.location_detail.trim():'';
 if(detail.length<2||detail.length>120||/[\u0000-\u001f\u007f]/.test(detail))return {error:'invalid_location_detail',status:422};
 // This placeholder is private to the old schema. Every location read prefers the actual province.
 return {legacyProvince:legacy?province:'bagmati',location:{province,detail}};
}

export async function entrantLocationsReady(db){
 return Boolean(await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='e2e_application_locations'").first());
}

export const entrantLocationFields=(ready,includeDetail=true)=>ready?'COALESCE(loc.province,p.province) AS province'+(includeDetail?',loc.detail AS location_detail':''):'p.province';
export const entrantLocationJoin=ready=>ready?' LEFT JOIN e2e_application_locations loc ON loc.application_id=p.id':'';

export function insertEntrantLocation(db,id,{province,detail}){
 return db.prepare('INSERT INTO e2e_application_locations(application_id,province,detail) VALUES(?,?,?)').bind(id,province,detail);
}

export function updateEntrantLocation(db,id,{province,detail}){
 return db.prepare(`INSERT INTO e2e_application_locations(application_id,province,detail)
  SELECT ?,?,? WHERE changes()=1 ON CONFLICT(application_id) DO UPDATE SET province=excluded.province,detail=excluded.detail`)
  .bind(id,province,detail);
}
