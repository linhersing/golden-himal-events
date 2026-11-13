import {validPerformanceLink} from '../public/performance-link.js';
import {pendingGuard} from './test-application-approval.js';

const table='e2e_test_video_supplements';
const duration=48*3600;
const eligible=`p.phase='demo' AND p.status IN ('submitted','under_review')
 AND p.demo_url IS NOT NULL${pendingGuard(true,'p')}`;

export async function videoSupplementsReady(env,approval){
 if(!approval||env.STAGING_SUBMISSION_MODE!=='links')return false;
 return Boolean(await env.DB.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').bind('table',table).first());
}

export function supplementGuard(enabled,alias,unsubmittedOnly=false){
 return enabled?` AND NOT EXISTS(SELECT 1 FROM ${table} s WHERE s.application_id=${alias}.id${unsubmittedOnly?' AND s.submitted_at IS NULL':''})`:'';
}

export const supplementColumns=enabled=>enabled?`, s.requested_at AS video_supplement_requested_at,
 s.requested_at+${duration} AS video_supplement_deadline,
 CASE WHEN s.submitted_at IS NOT NULL THEN 'submitted'
      WHEN s.requested_at+${duration}<=unixepoch() THEN 'expired'
      WHEN s.application_id IS NOT NULL THEN 'pending' END AS video_supplement_state,
 CASE WHEN s.application_id IS NULL AND ${eligible} THEN 1 ELSE 0 END AS video_supplement_available`:'';
export const supplementJoin=enabled=>enabled?` LEFT JOIN ${table} s ON s.application_id=p.id`:'';

export async function handleVideoSupplement(path,request,env,account,{json,deny,NOW,bodyJSON}){
 const requesting=path==='/api/e2e/request-video-supplement';
 if(account.role!==(requesting?'organizer':'member'))return deny('video_supplement_forbidden',403);
 const body=await bodyJSON(request);
 if(typeof body?.application_id!=='string'||!body.application_id||body.application_id.length>100)return deny('invalid_application_id',422);
 const id=body.application_id,now=NOW(),db=env.DB;
 if(requesting){
  const result=await db.prepare(`INSERT INTO ${table}(application_id,requested_by,requested_at)
   SELECT p.id,?,? FROM e2e_applications p WHERE p.id=? AND ${eligible}
   ON CONFLICT(application_id) DO NOTHING`).bind(account.id,now,id).run();
  if(!result.meta?.changes)return deny('video_supplement_unavailable',409);
  return json({ok:true,deadline:now+duration,testOnly:true});
 }
 const fields=['demo_url','stage_name','affiliation','song_title','original_artist','song_key'];
 if(Object.keys(body).some(key=>key!=='application_id'&&!fields.includes(key)))return deny('update_fields_only',422);
 const values=fields.map(key=>Object.hasOwn(body,key)?(typeof body[key]==='string'?body[key].trim():''):null);
 if(values.every(value=>value===null)||values.some((value,i)=>value!==null&&(value.length<(i===1?2:1)||value.length>(i===0?1000:100))))
  return deny('invalid_demo_url_or_fields',422);
 if(values[0]!==null&&!validPerformanceLink(values[0]))return deny('invalid_demo_url',422);
 const [result]=await db.batch([
  db.prepare(`UPDATE ${table} SET submitted_at=? WHERE application_id=? AND submitted_at IS NULL
   AND requested_at<=? AND requested_at+${duration}>? AND EXISTS(SELECT 1 FROM e2e_applications p
   WHERE p.id=? AND p.account_id=? AND ${eligible})`).bind(now,id,now,now,id,account.id),
  db.prepare(`UPDATE e2e_applications SET demo_url=COALESCE(?,demo_url),stage_name=COALESCE(?,stage_name),
   affiliation=COALESCE(?,affiliation),song_title=COALESCE(?,song_title),original_artist=COALESCE(?,original_artist),
   song_key=COALESCE(?,song_key),updated_at=? WHERE id=? AND account_id=? AND changes()=1`)
   .bind(...values,now,id,account.id)
 ]);
 if(!result.meta?.changes)return deny('video_supplement_unavailable',409);
 return json({ok:true,application_id:id,demo_url:values[0],testOnly:true});
}
