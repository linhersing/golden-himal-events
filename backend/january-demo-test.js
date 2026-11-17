import {hasTestApproval} from './test-application-approval.js';

const limitFor = (env,region) => {
 const raw=env['STAGING_JANUARY_TEST_SEATS_'+region];
 return /^[1-9]\d{0,2}$/.test(raw||'')?Number(raw):null;
};
export const januaryDemoPanel = env => {
 const size=Number(env.STAGING_JANUARY_TEST_PANEL_SIZE??3);
 return Number.isInteger(size)&&size>=3&&size<=5?size:null;
};
export async function januaryDemoReady(env){
 try{
  const row=await env.DB.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('e2e_frontline_2027_registration','e2e_january_demo_test_rosters')").first();
  return Number(row?.n)===2&&januaryDemoPanel(env)!==null;
 }catch{return false}
}
export const januaryDemoEligible = alias => `${alias}.round_code='2027-01' AND ${alias}.phase='demo'
 AND ${alias}.status NOT IN ('withdrawn','rejected') AND ${hasTestApproval(alias)}`;

export async function attachJanuaryScores(env,rows,reviewerId){
 const active=rows.filter(row=>row.round_code==='2027-01'&&row.phase==='demo'&&row.demo_entries?.length);
 for(let i=0;i<active.length;i+=75){
  const chunk=active.slice(i,i+75),byId=new Map(chunk.map(row=>[row.id,row]));
  const r=await env.DB.prepare(`SELECT application_id,position,technique,interpretation
   FROM e2e_demo_2027_scores WHERE reviewer_id=? AND application_id IN (${chunk.map(()=>'?').join(',')})`)
   .bind(reviewerId,...byId.keys()).all();
  for(const row of chunk)row.per_video_scoring=true;
  for(const score of r.results||[]){
   const demo=byId.get(score.application_id)?.demo_entries[score.position-1];
   if(demo)demo.my_score={technique:score.technique,interpretation:score.interpretation};
  }
 }
 return rows;
}
export async function submitJanuaryScore(request,env,reviewer,context){
 const {json,deny,NOW,bodyJSON,ownsApplication}=context;
 const b=await bodyJSON(request);
 if(!b||typeof b.application_id!=='string'||b.application_id.length>100||!Number.isInteger(b.position)||b.position<1||b.position>5||
    b.no_conflict!==true||!Number.isInteger(b.technique)||b.technique<0||b.technique>60||
    !Number.isInteger(b.interpretation)||b.interpretation<0||b.interpretation>40)return deny('invalid_video_score',422);
 const db=env.DB;
 const owner=await db.prepare('SELECT account_id FROM e2e_applications WHERE id=?').bind(b.application_id).first();
 if(!owner)return deny('not_reviewable',409);
 if(await ownsApplication(env,reviewer,owner.account_id))return deny('self_review_disallowed',403);
 const result=await db.prepare(`INSERT INTO e2e_demo_2027_scores(application_id,position,reviewer_id,technique,interpretation,created_at)
  SELECT p.id,v.position,?,?,?,? FROM e2e_applications p
  JOIN e2e_demo_2027_videos v ON v.application_id=p.id
  LEFT JOIN e2e_frontline_2027_registration f ON f.application_id=p.id
  WHERE p.id=? AND p.account_id=? AND v.position=? AND ${januaryDemoEligible('p')}
  AND NOT EXISTS(SELECT 1 FROM e2e_january_demo_test_rosters r WHERE r.region=f.competition_region)
  AND (SELECT COUNT(*) FROM e2e_demo_2027_scores s WHERE s.application_id=p.id AND s.position=v.position)<?
  ON CONFLICT(application_id,position,reviewer_id) DO NOTHING`)
  .bind(reviewer.id,b.technique,b.interpretation,NOW(),b.application_id,owner.account_id,b.position,januaryDemoPanel(env)).run();
 if(!result.meta?.changes)return deny('video_already_scored_or_closed',409);
 return json({ok:true,position:b.position,score:b.technique+b.interpretation,testOnly:true},201);
}

const applicantScores=`SELECT p.id,p.account_id,p.stage_name,f.competition_region AS region,v.position,
 COUNT(s.reviewer_id) AS judges,COALESCE(SUM(s.technique+s.interpretation),0) AS points
 FROM e2e_applications p JOIN e2e_frontline_2027_registration f ON f.application_id=p.id
 JOIN e2e_demo_2027_videos v ON v.application_id=p.id
 LEFT JOIN e2e_demo_2027_scores s ON s.application_id=p.id AND s.position=v.position
 WHERE ${januaryDemoEligible('p')} AND f.competition_region=?
 GROUP BY p.id,v.position ORDER BY p.id,v.position`;
const signature=`SELECT COALESCE(group_concat(id||':'||position||':'||judges||':'||points,'|'),'') FROM (${applicantScores})`;
const compare=(a,b)=>b.points*a.judges-a.points*b.judges;
function rank(rows,panel){
 const entries=new Map();
 for(const row of rows){
  if(!entries.has(row.id))entries.set(row.id,{application_id:row.id,stage_name:row.stage_name,account_id:row.account_id,videos:[]});
  entries.get(row.id).videos.push({position:row.position,judges:Number(row.judges),points:Number(row.points)});
 }
 const incomplete=[],bestByAccount=new Map();
 for(const entry of entries.values()){
  const {videos,account_id, ...identity}=entry;
  if(videos.some(v=>v.judges!==panel)){incomplete.push({...identity,videos});continue}
  const best=[...videos].sort(compare)[0];
  const candidate={...identity,...best,average:Math.round(best.points/best.judges*100)/100,videos};
  const prior=bestByAccount.get(account_id);
  if(!prior||compare(candidate,prior)<0)bestByAccount.set(account_id,candidate);
 }
 return {ranked:[...bestByAccount.values()].sort(compare),incomplete};
}
export async function januaryRoster(request,env,organizer,context){
 const {json,deny,NOW,bodyJSON}=context;
 const post=request.method==='POST',db=env.DB;
 const body=post?await bodyJSON(request):null;
 const regions=post?[body?.region]:['A','B'];
 if(regions.some(region=>!['A','B'].includes(region)))return deny('invalid_region',422);
 const results=[];
 for(const region of regions){
  const seats=limitFor(env,region),panel=januaryDemoPanel(env);
  const stored=await db.prepare('SELECT roster,published_at,seat_limit FROM e2e_january_demo_test_rosters WHERE region=?').bind(region).first();
  if(stored){
   if(post)return deny('january_roster_already_recorded',409);
   results.push({region,seats:stored.seat_limit,panel,selected:JSON.parse(stored.roster),published_at:stored.published_at});continue;
  }
  const rows=(await db.prepare(applicantScores).bind(region).all()).results||[];
  const {ranked,incomplete}=rank(rows,panel);
  const cutoffTie=!!(seats&&ranked.length>seats&&compare(ranked[seats-1],ranked[seats])===0);
  const blocker=!seats?'seat_limit_pending':incomplete.length?'scores_incomplete':cutoffTie?'cutoff_tie_pending':!ranked.length?'no_candidates':null;
  if(!post){results.push({region,seats,panel,ranked,incomplete,blocker});continue;}
  if(blocker)return deny(blocker,409);
  const fingerprint=rows.map(r=>[r.id,r.position,r.judges,r.points].join(':')).join('|');
  const selected=ranked.slice(0,seats);
  const result=await db.prepare(`INSERT INTO e2e_january_demo_test_rosters(region,organizer_id,published_at,seat_limit,roster)
   SELECT ?,?,?,?,? WHERE (${signature})=? ON CONFLICT(region) DO NOTHING`)
   .bind(region,organizer.id,NOW(),seats,JSON.stringify(selected),region,fingerprint).run();
  if(!result.meta?.changes)return deny('january_roster_changed_reload',409);
  return json({ok:true,region,selected,testOnly:true},201);
 }
 return json({ok:true,regions:results,testOnly:true});
}
