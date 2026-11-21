import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';

const [tools,evidence]=process.argv.slice(2);if(!tools||!evidence)throw Error('Runtime tools and evidence path required');
const runtime=await isolatedStaffRuntime(process.cwd(),tools,undefined,{publicMember:true});
const api=(actor,path,body)=>runtime.fetchFor(actor,'/api/e2e/'+path,body);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const baseline=async()=>({apps:(await runtime.db.prepare('SELECT id,phase,status,demo_url,song_title FROM e2e_applications ORDER BY id').all()).results,
 videos:(await runtime.db.prepare('SELECT * FROM e2e_demo_2027_videos ORDER BY application_id,position').all()).results});
try{
 await mkdir(evidence,{recursive:true});const before=await baseline();
 const demos=Array.from({length:5},(_,i)=>({song_title:'TEST Song '+(i+1),original_artist:'TEST Artist',song_language:'Nepali',demo_url:'https://youtu.be/TEST_SUPPL'+(i+1)}));
 const created=await api('public-member','applications',{frontline_2027:true,competition_region:'A',eligibility_basis:'graduated',round_code:'2027-01',category:'community',province:'lumbini',location_detail:'TEST District',location_basis:'residence',affiliation:'TEST School',stage_name:'TEST Supplement Singer',song_key:'Unknown',...demos[0],demo_entries:demos,no_exclusive_contract:true,video_confirmed:true,nonreligious_song_ack:true,
  full_name:'TEST Legal Name',contact_phone:'+977 9800000000',contact_email:'supplement@example.invalid',contact_handle:'TEST Contact',city:'TEST City',street_address:'TEST Tol',educational_background:'TEST Graduate',short_description:'TEST Description',musical_training:'TEST Training'});
 assert.equal(created.status,201,JSON.stringify(created.data));const id=created.data.application_id;
 assert.equal((await api('organizer','request-video-supplement',{application_id:id})).status,200);
 const corrected={application_id:id,demo_url:'https://youtu.be/TEST_REPLAC',song_title:'TEST Corrected Song',original_artist:'TEST Corrected Artist'};
 assert.equal((await api('member','submit-video-supplement',corrected)).status,409);
 assert.equal((await api('reviewer','submit-video-supplement',corrected)).status,403);
 const saved=await api('public-member','submit-video-supplement',corrected);assert.equal(saved.status,200,JSON.stringify(saved.data));
 const own=(await api('public-member','applications')).data.applications.find(row=>row.id===id);
 assert.equal(own.demo_url,corrected.demo_url);assert.equal(own.demo_entries[0].demo_url,corrected.demo_url);
 assert.equal(own.demo_entries[0].song_title,corrected.song_title);assert.equal(own.demo_entries[0].original_artist,corrected.original_artist);
 for(let i=1;i<5;i++)for(const key of Object.keys(demos[i]))assert.equal(own.demo_entries[i][key],demos[i][key]);
 const organizer=(await api('organizer','organizer-queue')).data.applications.find(row=>row.id===id);
 assert.equal(organizer.demo_entries[0].demo_url,corrected.demo_url);
 assert.equal((await api('public-member','submit-video-supplement',{...corrected,demo_url:'https://youtu.be/TEST_SECOND'})).status,409);
 assert.equal((await runtime.db.prepare('SELECT demo_url FROM e2e_demo_2027_videos WHERE application_id=? AND position=1').bind(id).first()).demo_url,corrected.demo_url);
 const after=await baseline(),oldApps=after.apps.filter(row=>row.id!==id),oldVideos=after.videos.filter(row=>row.application_id!==id);
 assert.deepEqual(oldApps,before.apps);assert.deepEqual(oldVideos,before.videos);
 const result={result:'PASS',runtime:'Cloudflare workerd and disposable D1, seeded verified public TEST session; not human OTP acceptance',
  correction:'main and canonical first demo match in member/organizer API and D1',otherDemosUnchanged:4,foreignMember:409,reviewer:403,secondSubmission:409,
  baselineApplications:before.apps.length,baselineVideos:before.videos.length,originalApplicationHash:digest(before.apps),originalVideoHash:digest(before.videos),originalsPreserved:true,
  addedFictionalApplications:after.apps.length-before.apps.length,addedFictionalVideos:after.videos.length-before.videos.length};
 await writeFile(join(evidence,'five-demo-supplement-workerd.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await runtime.close()}
