/* TEST ONLY: Golden Himal 2027 one entrant up to five demo links.
 * The first video remains the existing e2e_applications row (index=1);
 * additional 2–5 videos live in an isolated additive D1 table.
 * This module never modifies previously saved songs, judges or grades.
 */
import {validPerformanceLink} from '../public/performance-link.js';
const languages=new Set(['Nepali','English','Hindi','Maithili','Bhojpuri','Tamang','Chinese','Other']);
const allowed=new Set(['application_id','song_title','original_artist','song_language','demo_url','video_confirmed']);
export async function fiveDemoReady(db){
 try{
  const r=await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('e2e_demo_videos','e2e_extra_demo_scores')").first();
  return Number(r?.n)===2;
 }catch{return false;}
}
export async function getDemoVideos(db,applicationId,{reviewerId=null,includeScores=false}={}){
 const p=await db.prepare('SELECT id,round_code,song_title,original_artist,song_language,demo_url FROM e2e_applications WHERE id=?').bind(applicationId).first();
 if(!p)return [];
 const first={video_index:1,id:applicationId,application_id:applicationId,song_title:p.song_title,original_artist:p.original_artist,song_language:p.song_language,demo_url:p.demo_url};
 const extras=(await db.prepare('SELECT id,application_id,video_index,song_title,original_artist,song_language,demo_url FROM e2e_demo_videos WHERE application_id=? ORDER BY video_index').bind(applicationId).all()).results||[];
 const all=[first,...extras];
 if(!includeScores)return all;
 for(const v of all){
  const table=v.video_index===1?'e2e_judge_scores':'e2e_extra_demo_scores';
  const by=v.video_index===1?'application_id':'video_id';
  const scores=await db.prepare('SELECT COUNT(*) AS n,ROUND(AVG(technique+interpretation),2) AS mean FROM '+table+' WHERE '+by+'=?').bind(v.id).first();
  v.judges_count=Number(scores?.n||0);v.judges_mean=scores?.mean===null?null:Number(scores?.mean);
  if(reviewerId){
   const own=await db.prepare('SELECT technique,interpretation FROM '+table+' WHERE '+by+'=? AND reviewer_id=?').bind(v.id,reviewerId).first();
   v.reviewer_technique=own?.technique??null;v.reviewer_interpretation=own?.interpretation??null;
  }
 }
 return all;
}
export function bestDemo(videos,minJudges=3){
 const eligible=videos.filter(v=>Number(v.judges_count)>=minJudges&&Number.isFinite(v.judges_mean));
 if(!eligible.length)return null;
 const sorted=[...eligible].sort((a,b)=>b.judges_mean-a.judges_mean||a.video_index-b.video_index);
 return {video_index:sorted[0].video_index,mean:sorted[0].judges_mean,judges_count:sorted[0].judges_count};
}
export async function handleFiveDemoRoute(request,env,account,{json,deny,bodyJSON,uuid,NOW}){
 const pathname=new URL(request.url).pathname,post=request.method==='POST';
 if(!['/api/e2e/demo-videos','/api/e2e/add-demo-video','/api/e2e/organizer-demo-best'].includes(pathname))return null;
 if(env.STAGING_FIVE_DEMOS_ENABLED!=='true'||!await fiveDemoReady(env.DB)){
  if(!post)return json({ok:true,enabled:false,videos:[],testOnly:true});
  return deny('five_demo_schema_unavailable',503);
 }
 const db=env.DB;
 if(pathname==='/api/e2e/organizer-demo-best'&&!post){
  if(account.role!=='organizer')return deny('organizer_only',403);
  const appId=String(new URL(request.url).searchParams.get('application_id')||'');
  const app=await db.prepare('SELECT id FROM e2e_applications WHERE id=?').bind(appId).first();
  if(!app)return deny('application_not_found',404);
  const videos=await getDemoVideos(db,appId,{includeScores:true});
  return json({ok:true,application_id:appId,videos:videos.map(({demo_url,...v})=>v),
   best:bestDemo(videos),testOnly:true});
 }
 if(account.role!=='member')return deny('member_only',403);
 if(pathname==='/api/e2e/demo-videos'&&!post){
  const appId=String(new URL(request.url).searchParams.get('application_id')||'');
  const app=await db.prepare("SELECT id FROM e2e_applications WHERE id=? AND account_id=?").bind(appId,account.id).first();
  if(!app)return deny('application_not_found',404);
  const videos=await getDemoVideos(db,appId);
  return json({ok:true,enabled:true,application_id:appId,videos,max_videos:5,testOnly:true});
 }
 if(pathname==='/api/e2e/add-demo-video'&&post){
  const b=await bodyJSON(request,2400);
  if(!b||Object.keys(b).some(k=>!allowed.has(k)))return deny('invalid_extra_demo_fields',422);
  const appId=String(b.application_id||'').trim(),song=String(b.song_title||'').trim(),
   artist=String(b.original_artist||'').trim(),language=String(b.song_language||'').trim(),
   url=String(b.demo_url||'').trim();
  if(!appId||!song||song.length>100||!artist||artist.length>100||!languages.has(language)||
   url.length>1000||!validPerformanceLink(url)||b.video_confirmed!==true)return deny('invalid_extra_demo_fields',422);
  const app=await db.prepare("SELECT p.id,p.demo_url,p.round_code,p.phase,p.status,p.payment_status FROM e2e_applications p JOIN e2e_frontline_2027_registration f ON f.application_id=p.id WHERE p.id=? AND p.account_id=?").bind(appId,account.id).first();
  if(!app)return deny('application_not_found',404);
  if(app.round_code!=='2027-01'||app.phase!=='demo'||!['submitted','under_review'].includes(app.status))return deny('five_demo_locked',409);
  if(url===app.demo_url)return deny('duplicate_demo_url',409);
  const existing=(await db.prepare('SELECT video_index,demo_url FROM e2e_demo_videos WHERE application_id=? ORDER BY video_index').bind(appId).all()).results||[];
  if(existing.length>=4)return deny('five_demo_limit',409);
  if(existing.some(x=>x.demo_url===url))return deny('duplicate_demo_url',409);
  const graded=await db.prepare('SELECT (SELECT COUNT(*) FROM e2e_judge_scores WHERE application_id=?)+(SELECT COUNT(*) FROM e2e_promotion_events WHERE application_id=?)+(SELECT COUNT(*) FROM e2e_extra_demo_scores s JOIN e2e_demo_videos v ON v.id=s.video_id WHERE v.application_id=?) AS n').bind(appId,appId,appId).first();
  if(Number(graded?.n||0)>0)return deny('five_demo_locked',409);
  const index=existing.length?Math.max(...existing.map(x=>Number(x.video_index)))+1:2;
  if(index>5)return deny('five_demo_limit',409);
  const id=uuid();
  try{
   const res=await db.prepare('INSERT INTO e2e_demo_videos(id,application_id,video_index,song_title,original_artist,song_language,demo_url,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .bind(id,appId,index,song,artist,language,url,NOW()).run();
   if(Number(res?.meta?.changes||0)!==1)return deny('extra_demo_write_failed',503);
  }catch{return deny('extra_demo_conflict_or_locked',409)}
  const saved=await db.prepare('SELECT id,application_id,video_index,song_title,original_artist,song_language,demo_url FROM e2e_demo_videos WHERE id=? AND application_id=?').bind(id,appId).first();
  if(!saved||saved.demo_url!==url||saved.video_index!==index)return deny('extra_demo_readback_failed',503);
  return json({ok:true,video:saved,testOnly:true},201);
 }
 return deny('method_not_allowed',405);
}
