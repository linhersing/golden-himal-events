// Isolated read-only helper. This is not a route, result import or promotion.
const previewOnly={mode:'PREVIEW_ONLY',testOnly:true,mutation_allowed:false,qualification_established:false};
const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
// An opaque document reference, never a contact, private path or document body.
const validReference=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(value);
const reject=(status,error,reasons=[{code:error}])=>({...previewOnly,ok:false,blocked:true,status,error,blocking_reasons:reasons});

/** actor must come from the caller's authenticated, invited staff session. */
export async function previewFrontlineFinalists(db,actor,body){
 if(!actor||typeof actor.id!=='string'||!actor.id)return reject(401,'login_required');
 if(actor.role!=='organizer')return reject(403,'organizer_only');
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='application_ids,source_reference'||
  !Array.isArray(body.application_ids)||body.application_ids.length<1||body.application_ids.length>10||
  !body.application_ids.every(validId)||!validReference(body.source_reference))
  return reject(422,'invalid_frontline_preview');
 const ids=[...body.application_ids].sort(),duplicates=ids.filter((value,index)=>index>0&&value===ids[index-1]);
 if(duplicates.length)return reject(422,'duplicate_application_ids',
  [...new Set(duplicates)].map(application_id=>({code:'duplicate_application_id',application_id})));
 try{
  // One SELECT provides a coherent snapshot. Only bound placeholder count varies;
  // no request value is used as an identifier or SQL fragment. Never read scores.
  const selected=await db.prepare(`SELECT p.id,p.account_id,p.round_code,p.phase,p.status,p.updated_at,
   frontline.competition_region,frontline.eligibility_basis,
   COALESCE(controls.state,'active') AS registration_state,COALESCE(controls.version,0) AS registration_version,
   CASE WHEN approved.application_id IS NOT NULL THEN 'approved' ELSE 'pending' END AS test_approval_state,
   approved.approved_at AS test_approved_at
   FROM e2e_applications p
   LEFT JOIN e2e_frontline_2027_registration frontline ON frontline.application_id=p.id
   LEFT JOIN e2e_test_application_approvals approved ON approved.application_id=p.id
   LEFT JOIN e2e_registration_controls controls ON controls.application_id=p.id
   WHERE p.id IN (${ids.map(()=>'?').join(',')}) ORDER BY p.id`).bind(...ids).all();
  if(!Array.isArray(selected.results))throw Error('preview_read_unavailable');
  const byId=new Map(selected.results.map(row=>[row.id,row])),entrants=new Map();
  const reasons=[],counts={A:0,B:0},entries=[];
  for(const application_id of ids){
   const row=byId.get(application_id);
   if(!row){entries.push({application_id,found:false});reasons.push({code:'application_missing',application_id});continue;}
   const {account_id,...state}=row;
   delete state.id;
   entries.push({application_id,found:true,...state});
   const sameEntrant=entrants.get(account_id)||[];sameEntrant.push(application_id);entrants.set(account_id,sameEntrant);
   // This paper preview concerns January registration sources only; it does
   // not define eligibility or re-entry policy for any future quarter.
   if(row.round_code!=='2027-01')reasons.push({code:'registration_round_conflict',application_id,expected:'2027-01',actual:row.round_code});
   if(row.registration_state!=='active')reasons.push({code:'registration_inactive',application_id,state:row.registration_state});
   if(['withdrawn','rejected'].includes(row.status))reasons.push({code:'application_'+row.status,application_id});
   if(row.test_approval_state!=='approved')reasons.push({code:'test_approval_missing',application_id});
   if(row.competition_region==='A'||row.competition_region==='B')counts[row.competition_region]++;
   else reasons.push({code:'competition_region_missing',application_id});
  }
  for(const application_ids of entrants.values())if(application_ids.length>1)reasons.push({code:'duplicate_entrant',application_ids});
  if(ids.length!==10)reasons.push({code:'selected_count_conflict',expected:10,actual:ids.length});
  for(const competition_region of ['A','B'])if(counts[competition_region]!==5)
   reasons.push({code:'region_count_conflict',competition_region,expected:5,actual:counts[competition_region]});
  const manifest={version:1,mode:'PREVIEW_ONLY',source_reference:body.source_reference,
   registration_round_scope:'2027-01',
   eligibility_scope:'existing_test_approval_only',qualification_established:false,
   paper_rule:{total:10,regions:{A:5,B:5}},entries,blocking_reasons:reasons};
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(manifest)));
  const fingerprint=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
  return {...previewOnly,ok:true,status:200,blocked:reasons.length>0,region_counts:counts,
   blocking_reasons:reasons,manifest,fingerprint};
 }catch{return reject(503,'frontline_preview_unavailable');}
}
