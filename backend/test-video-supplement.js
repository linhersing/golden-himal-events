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
 const url=typeof body.demo_url==='string'?body.demo_url.trim():'';
 if(!url||url.length>1000||!validPerformanceLink(url))return deny('invalid_demo_url',422);
 const [result]=await db.batch([
  db.prepare(`UPDATE ${table} SET submitted_at=? WHERE application_id=? AND submitted_at IS NULL
   AND requested_at<=? AND requested_at+${duration}>? AND EXISTS(SELECT 1 FROM e2e_applications p
   WHERE p.id=? AND p.account_id=? AND ${eligible})`).bind(now,id,now,now,id,account.id),
  db.prepare('UPDATE e2e_applications SET demo_url=?,updated_at=? WHERE id=? AND account_id=? AND changes()=1')
   .bind(url,now,id,account.id)
 ]);
 if(!result.meta?.changes)return deny('video_supplement_unavailable',409);
 return json({ok:true,application_id:id,demo_url:url,testOnly:true});
}
