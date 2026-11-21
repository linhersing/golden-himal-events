import {test,expect} from '@playwright/test';

const reviewer={id:'qa-judge',role:'reviewer',available_roles:['reviewer']};
const widths=[280,320,360,375,390,412,430,480,768,1280];
const formSelector='#judge-queue form[data-demo-position]';

function sampleEntry(){
 return {
  id:'QA-MOBILE-VARIABLE-5',stage_name:'SYNTHETIC TEST PERFORMER',
  song_title:'TEST TRACK 1',song_language:'Nepali',round_code:'2027-01',
  category:'community',phase:'demo',per_video_scoring:true,
  demo_entries:Array.from({length:5},(_,i)=>({
   position:i+1,song_title:i===4?'TEST TRACK 5 ' + 'असाधारणसाङ्गीतिकशीर्षक'.repeat(8):'TEST TRACK '+(i+1),
   original_artist:'FAKE ARTIST '+(i+1),song_language:i===4?'Hindi':'Nepali',
   demo_url:'https://example.org/qa-track-'+(i+1),my_score:null
  }))
 };
}

async function mockJudge(page,{entry=sampleEntry(),otherEntries=[],action}={}){
 const posts=[],readback={count:0},privacyRequests=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  if(key==='me')return route.fulfill({json:{ok:true,judging_policy:{mode:'all_stages_test'},account:reviewer}});
  if(key==='reviewer-queue'){
   readback.count++;
   return route.fulfill({json:{ok:true,queue:[entry,...otherEntries]}});
  }
  if(key==='organizer-contact'){
   privacyRequests.push(route.request().url());
   return route.fulfill({status:403,json:{ok:false,error:'organizer_only'}});
  }
  if(['january-video-score','score'].includes(key)){
   const payload=route.request().postDataJSON();
   posts.push(payload);
   if(action)return action({route,entry,payload});
   if(key==='january-video-score'){
    const work=entry.demo_entries.find(candidate=>candidate.position===payload.position);
    work.my_score={technique:payload.technique,interpretation:payload.interpretation,scored_at:1700000000};
   }else{
    for(const [key,value] of Object.entries(payload).filter(([key])=>['technique','interpretation','stage_presence','appearance'].includes(key))){
     entry[key==='technique'||key==='interpretation'?'live_'+key:key]=value;
    }
   }
   return route.fulfill({json:{ok:true,position:payload.position,phase:payload.phase,score:payload.technique+payload.interpretation+(payload.stage_presence||0)+(payload.appearance||0)}});
  }
  return route.fulfill({json:{ok:true}});
 });
 await page.goto('/backoffice.html');
 return {entry,posts,readback,privacyRequests};
}

async function openSong(page,position=1){
 await page.locator('#judge-list .roster-entry').first().click();
 await page.locator('#judge-queue [data-song-position="'+position+'"]').click();
}
function noHorizontalOverflow(page){
 return page.evaluate(()=>{
  const detail=document.querySelector('#judge-detail');
  return {page:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   detail:detail.scrollWidth-detail.clientWidth};
 });
}
async function enterScore(form,technique,interpretation){
 await form.locator('[name=technique]').fill(String(technique));
 await form.locator('[name=interpretation]').fill(String(interpretation));
 await form.locator('[type=checkbox]').check();
}

test('mobile scoring stays usable from 280 to 768 CSS px, desktop, landscape and 200% text',async({page})=>{
 await mockJudge(page);
 await openSong(page,5);
 const form=page.locator(formSelector);
 await expect(form).toHaveCount(1);
 await expect(form).toBeVisible();
 await expect(form).toHaveAttribute('data-demo-position','5');
 for(const width of widths){
  await page.setViewportSize({width,height:740});
  const overflow=await noHorizontalOverflow(page);
  for(const [area,pixels] of Object.entries(overflow))expect(pixels,area+' @ '+width).toBeLessThanOrEqual(1);
  const geometry=await form.evaluate(element=>({
   inputs:[...element.querySelectorAll('input[type=number]')].map(input=>({height:input.getBoundingClientRect().height,mode:input.inputMode,font:parseFloat(getComputedStyle(input).fontSize)})),
   button:element.querySelector('button[type=submit]').getBoundingClientRect().height
  }));
  expect(geometry.inputs).toHaveLength(2);
  for(const input of geometry.inputs){
   expect(input.height).toBeGreaterThanOrEqual(48);
   expect(input.mode).toBe('numeric');
   expect(input.font).toBeGreaterThanOrEqual(16);
  }
  expect(geometry.button).toBeGreaterThanOrEqual(48);
 }
 for(const width of [320,390,480]){
  await page.setViewportSize({width,height:740});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  expect((await noHorizontalOverflow(page)).page,'200% @ '+width).toBeLessThanOrEqual(1);
  await page.evaluate(()=>document.documentElement.style.fontSize='');
 }
 await page.setViewportSize({width:740,height:360});
 expect((await noHorizontalOverflow(page)).page).toBeLessThanOrEqual(1);
 await expect(form.locator('button[type=submit]')).toBeVisible();
 for(const [device,width,height] of [['desktop',1280,850],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.screenshot({path:'test-results/ghv-staff-workspaces/reviewer-'+device+'.png',fullPage:true});
 }
});

test('mobile offline scoring retains inputs and makes no submission',async({page,context})=>{
 const {posts}=await mockJudge(page);
 await page.setViewportSize({width:320,height:700});
 await openSong(page);
 const form=page.locator(formSelector);
 await enterScore(form,46,32);
 await context.setOffline(true);
 await form.locator('button[type=submit]').click();
 await expect(page.locator('#judge-queue')).toContainText('離線');
 await expect(form.locator('[name=technique]')).toHaveValue('46');
 expect(posts).toHaveLength(0);
 await context.setOffline(false);
});

test('a slow score stays locked until the server reads back the exact song and values',async({page})=>{
 let release;
 const waitForWrite=new Promise(resolve=>{release=resolve});
 const {posts,readback}=await mockJudge(page,{action:async({route,entry,payload})=>{
  await waitForWrite;
  entry.demo_entries[4].my_score={technique:payload.technique,interpretation:payload.interpretation,scored_at:1700000000};
  return route.fulfill({json:{ok:true,position:payload.position,score:84}});
 }});
 await page.setViewportSize({width:390,height:790});
 await openSong(page,5);
 const form=page.locator(formSelector);
 await enterScore(form,50,34);
 const button=form.locator('button[type=submit]');
 await button.click();
 await expect(button).toBeDisabled();
 await expect(form.locator('[name=technique]')).toBeDisabled();
 await expect(form.locator('[name=interpretation]')).toBeDisabled();
 await expect(form.locator('[type=checkbox]')).toBeDisabled();
 await expect(page.locator('#judge-queue')).toContainText('正在');
 await button.evaluate(el=>el.click());
 expect(posts.length).toBeLessThanOrEqual(1);
 await expect(page.locator('.judge-saved-confirmation')).toHaveCount(0);
 release();
 await expect(page.locator('#judge-queue')).toContainText(/84\s*分/);
 expect(readback.count).toBeGreaterThanOrEqual(2);
 expect(posts).toEqual([{application_id:'QA-MOBILE-VARIABLE-5',position:5,no_conflict:true,technique:50,interpretation:34}]);
 await page.locator('#judge-back-step').click();
 await expect(page.locator('#judge-queue [data-song-position="5"]')).toContainText('已評');
 await expect(page.locator('#judge-queue [data-song-position="1"]')).toContainText('待評');
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
});

test('an acknowledged result for the wrong song cannot falsely mark a score as saved',async({page})=>{
 const {posts}=await mockJudge(page,{action:({route,entry,payload})=>{
  entry.demo_entries[0].my_score={technique:payload.technique,interpretation:payload.interpretation};
  return route.fulfill({json:{ok:true,position:payload.position,score:71}});
 }});
 await openSong(page,3);
 const form=page.locator(formSelector);
 await enterScore(form,43,28);
 await form.locator('button[type=submit]').click();
 await expect(page.locator('#judge-queue')).toContainText(/無法確認|尚未確認|未確認/);
 await expect(page.locator('.judge-saved-confirmation')).toHaveCount(0);
 await expect(form.locator('[name=technique]')).toHaveValue('43');
 expect(posts).toHaveLength(1);
});

test('when the score response is lost, read-only reconciliation confirms it without reposting',async({page})=>{
 const {posts}=await mockJudge(page,{action:({route,entry,payload})=>{
  entry.demo_entries[2].my_score={technique:payload.technique,interpretation:payload.interpretation};
  return route.abort('failed');
 }});
 await openSong(page,3);
 const form=page.locator(formSelector);
 await enterScore(form,43,28);
 await form.locator('button[type=submit]').click();
 const check=page.locator('.judge-score-check');
 await expect(check).toBeVisible();
 await expect(form.locator('[name=technique]')).toHaveValue('43');
 await expect(form.locator('button[type=submit]')).toBeDisabled();
 await check.click();
 await expect(page.locator('#judge-queue')).toContainText(/71\s*分/);
 expect(posts).toHaveLength(1);
});

test('a rejected score is retained and is never automatically posted twice',async({page})=>{
 const {posts}=await mockJudge(page,{action:({route})=>route.fulfill({status:503,json:{ok:false,error:'temporarily_unavailable'}})});
 await openSong(page,2);
 const form=page.locator(formSelector);
 await enterScore(form,43,28);
 await form.locator('button[type=submit]').click();
 await expect(page.locator('#judge-queue')).toContainText(/無法確認|尚未確認|未確認/);
 await expect(form.locator('[name=interpretation]')).toHaveValue('28');
 await expect(page.locator('.judge-saved-confirmation')).toHaveCount(0);
 expect(posts).toHaveLength(1);
});

test('judge Back and Forward keep the active applicant and an unsaved song draft in memory',async({page})=>{
 const another={...sampleEntry(),id:'QA-ANOTHER-SINGER',stage_name:'ANOTHER SYNTHETIC SINGER'};
 const otherEntries=[another,...Array.from({length:18},(_,i)=>({...another,id:'QA-EXTRA-'+i,stage_name:'EXTRA SYNTHETIC SINGER '+i,demo_entries:another.demo_entries.slice(0,i%2?1:3)}))];
 const {posts,privacyRequests}=await mockJudge(page,{otherEntries});
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('#judge-count')).toContainText('20');
 await openSong(page,5);
 const form=page.locator(formSelector);
 await enterScore(form,47,34);
 await page.goBack();
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
 await page.goForward();
 await expect(form.locator('[name=technique]')).toHaveValue('47');
 await expect(form).toHaveAttribute('data-demo-position','5');
 await page.locator('#judge-back-list').click();
 await page.locator('#judge-list .roster-entry').nth(1).click();
 await page.locator('#judge-queue [data-song-position="5"]').click();
 await expect(form.locator('[name=technique]')).toHaveValue('');
 await expect(page.locator('#judge-detail')).toContainText('ANOTHER SYNTHETIC SINGER');
 expect(posts).toHaveLength(0);
 expect(privacyRequests).toHaveLength(0);
});

for(const phase of ['qualifier','final']){
 test(phase+' uses four on-site criteria and confirms one score for the same stage',async({page})=>{
  const entry={id:'FAKE-'+phase,stage_name:'SYNTHETIC ONSITE ENTRANT',song_title:'FAKE LIVE SONG',
   song_language:'Nepali',round_code:'2027-02',category:'community',phase,demo_url:'https://example.org/qa-live-song'};
  const {posts,readback}=await mockJudge(page,{entry});
  await page.setViewportSize({width:320,height:700});
  await openSong(page);
  const form=page.locator('#judge-queue form');
  for(const [name,value,max] of [['technique','35','40'],['interpretation','25','30'],['stage_presence','16','20'],['appearance','7','10']]){
   const input=form.locator('[name='+name+']');
   await expect(input).toHaveAttribute('max',max);
   expect(await input.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
   await input.fill(value);
  }
  await form.locator('[type=checkbox]').check();
  await form.locator('button[type=submit]').click();
  await expect(page.locator('#judge-queue')).toContainText(/83\s*分/);
  expect(posts).toEqual([{application_id:entry.id,phase,no_conflict:true,technique:35,interpretation:25,stage_presence:16,appearance:7}]);
  expect(readback.count).toBeGreaterThanOrEqual(2);
  expect((await noHorizontalOverflow(page)).page).toBeLessThanOrEqual(1);
 });
}

test('judge roster and current score action read in Chinese, English and Nepali',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mockJudge(page);
 for(const [locale,expectedList,expectedAction] of [
  ['en','Judging roster','Save score'],
  ['ne','मूल्याङ्कन सूची','अङ्क सुरक्षित गर्नुहोस्'],
  ['zh','評審名冊','儲存評分']
 ]){
  await page.locator('.staff-languages [data-lang="'+locale+'"]').click();
  await expect(page.locator('#judge-roster-panel h2')).toHaveText(expectedList);
  await openSong(page,2);
  await expect(page.locator('#judge-queue button[type=submit]')).toHaveText(expectedAction);
  await page.locator('#judge-back-list').click();
  await expect(page.locator('#judge-roster-panel')).toBeVisible();
 }
});

// Current policy acceptance is independent of the explicit legacy restoration cases above.
async function finalOnlyPolicy(page,role='reviewer'){
 const entries=Array.from({length:20},(_,i)=>({id:'POLICY-'+i,stage_name:'TEST Policy Singer '+i,round_code:i===19?'2027-04':'2027-01',phase:i===19?'final':i===18?'qualifier':'demo',category:'single',status:'submitted',approval_state:'approved',demo_judges:0,live_judges:0,demo_url:'https://example.invalid/TEST/video'+i,song_title:'TEST Track '+i,original_artist:'TEST Artist',song_language:'Nepali'})),policy={mode:'final_only',earlier_stages:'frontline_managed',official:false};
 await page.route('**/api/e2e/**',route=>{const key=new URL(route.request().url()).pathname.split('/').at(-1);return route.fulfill({json:key==='me'?{ok:true,account:{id:role,role,available_roles:[role]},judging_policy:policy}:key==='reviewer-queue'?{ok:true,queue:entries,judging_policy:policy}:key==='organizer-queue'?{ok:true,applications:entries,judging_policy:policy,january_roster_enabled:true}:key==='organizer-corrections'?{ok:true,enabled:false}:{ok:true}})});
 return entries;
}
test('current final-only policy hides all earlier scorecards and preserves the final desktop/mobile workspace',async({page})=>{
 await finalOnlyPolicy(page);for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/backoffice.html');await expect(page.locator('#staff-judging-notice')).toContainText('由前線自行評選');await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);await expect(page.locator('#judge-list')).toContainText('TEST Policy Singer 19');await expect(page.locator('[data-role-tab=reviewer]')).toHaveText('決賽評審（TEST）');
  await page.locator('#judge-list .roster-entry').click();await page.locator('#judge-queue [data-song-position]').click();await expect(page.locator('#judge-queue input[type=number]')).toHaveCount(4);await expect(page.locator('#judge-queue [name=technique]')).toHaveAttribute('max','40');
  await page.screenshot({path:'test-results/ghv-final-only/reviewer-final-'+width+'.png',fullPage:true});
 }
});
test('current organizer policy keeps20registrations and takes down score-driven January tools and filters',async({page})=>{
 await finalOnlyPolicy(page,'organizer');await page.setViewportSize({width:390,height:844});await page.goto('/backoffice.html');await expect(page.locator('#organizer-count')).toContainText('20');await expect(page.locator('#january-roster-tools')).toBeHidden();await expect(page.locator('#scores-count').locator('..')).toBeHidden();await expect(page.locator('#organizer-status option[value=scored]')).toHaveJSProperty('disabled',true);await expect(page.locator('#admin-apps .organizer-record-open')).toHaveCount(12);
 await page.locator('.staff-languages [data-lang=en]').click();await expect(page.locator('#staff-judging-notice')).toContainText('frontline');await page.locator('.staff-languages [data-lang=ne]').click();await expect(page.locator('#staff-judging-notice')).toContainText('प्लेटफर्म बाहिर');await page.screenshot({path:'test-results/ghv-final-only/organizer-mobile.png',fullPage:true});
});
test('old reviewer URL follows final-only policy instead of displaying earlier-stage scorecards',async({page})=>{
 await finalOnlyPolicy(page);await page.goto('/judge-stage.html');await expect(page.locator('#queue .entry')).toHaveCount(1);await expect(page.locator('#queue')).toContainText('TEST Policy Singer 19');await expect(page.locator('[data-i18n=reviewIntro]')).toContainText('outside the platform');
});
