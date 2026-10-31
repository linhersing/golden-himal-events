// Public, read-only fictional fixture. Never queries member/session/payment/vote tables.
const fixture='architecture-20261031';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(data,status=200)=>Response.json(data,{status,headers});
export async function architecturePreview(request,env){
 if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 if(!env.E2E_DB)return reply({ok:false,error:'architecture_preview_not_configured'},503);
 try{
  const profiles=(await env.E2E_DB.prepare('SELECT id,role,display_name FROM architecture_preview_profiles WHERE fixture_set=? ORDER BY id LIMIT 6').bind(fixture).all()).results||[];
  const applications=(await env.E2E_DB.prepare('SELECT id,profile_id,round_code,category,province,song_title,original_artist,work_url,example_votes FROM architecture_preview_applications WHERE fixture_set=? ORDER BY id LIMIT 2').bind(fixture).all()).results||[];
  const scores=(await env.E2E_DB.prepare('SELECT application_id,judge_id,stage,technique,interpretation,stage_presence,appearance FROM architecture_preview_scores WHERE fixture_set=? ORDER BY application_id,stage,judge_id LIMIT 18').bind(fixture).all()).results||[];
  if(profiles.length!==6||applications.length!==2||scores.length!==18)return reply({ok:false,error:'architecture_preview_incomplete'},503);
  const maxima={};for(const app of applications)maxima[app.category]=Math.max(maxima[app.category]||0,app.example_votes);
  const standings=applications.map(app=>{
   const jury=scores.filter(s=>s.application_id===app.id&&s.stage==='final');
   const mean=jury.reduce((n,s)=>n+s.technique+s.interpretation+s.stage_presence+s.appearance,0)/jury.length;
   const votes=maxima[app.category]?app.example_votes/maxima[app.category]*100:0;
   return {id:app.id,judges_mean:mean,vote_score:votes,total_score:Number((votes*.51+mean*.49).toFixed(2)),official:false};
  });
  return reply({ok:true,testOnly:true,readOnly:true,source:'cloudflare-d1-fictional-preview',authenticated:false,registeredMembersCreated:false,
   deferred:{emailVerification:true,realRegistrationFee:true,officialRegistration:true},profiles,applications,scores,standings});
 }catch{return reply({ok:false,error:'architecture_preview_unavailable'},503)}
}
