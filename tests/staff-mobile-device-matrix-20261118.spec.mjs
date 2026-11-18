import {test,expect} from '@playwright/test';

const simulatedEntry=()=>({
 id:'QA-MOBILE-VARIABLE-5',stage_name:'SYNTHETIC TEST PERFORMER',
 song_title:'DEMO TEST 1',song_language:'Nepali',
 round_code:'2027-01',category:'community',phase:'demo',
 per_video_scoring:true,
 demo_entries:Array.from({length:5},(_,i)=>({
  position:i+1,song_title:'TEST TRACK '+(i+1),
  original_artist:'FAKE ARTIST '+(i+1),song_language:i===4?'Hindi':'Nepali',
  demo_url:'https://example.org/qa-track-'+(i+1),my_score:null
 }))
});
async function mockJudge(page,scoreAction){
 const entry=simulatedEntry();
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  if(key==='me')return route.fulfill({status:200,json:{
   ok:true,account:{id:'qa-judge',role:'reviewer',available_roles:['reviewer']}
  }});
  if(key==='reviewer-queue')return route.fulfill({status:200,json:{ok:true,queue:[entry]}});
  if(key==='january-video-score')return scoreAction(route);
  return route.fulfill({status:200,json:{ok:true}});
 });
 await page.goto('/backoffice.html');
 await page.locator('#judge-list .roster-entry').click();
 return entry;
}
function noHorizontalOverflow(page){
 return page.evaluate(()=>({
  doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  content:document.querySelector('#judge-detail')?.scrollWidth-document.querySelector('#judge-detail')?.clientWidth
 }));
}

test('mobile device matrix and font zoom keep scoring view usable',async({page})=>{
 await mockJudge(page,route=>route.fulfill({json:{ok:true,score:80}}));
 const chooser=page.locator('.judge-demo-chooser select');
 await expect(chooser).toBeVisible();
 for(const width of [280,320,360,375,390,412,430,480,768]){
  await page.setViewportSize({width,height:740});
  const overflow=await noHorizontalOverflow(page);
  expect(overflow.doc, 'page viewport '+width).toBeLessThanOrEqual(1);
  expect(overflow.content,'detail viewport '+width).toBeLessThanOrEqual(1);
  const dims=await page.locator('.judge-score-form').evaluate(form=>({
   inputs:[...form.querySelectorAll('input[type=number]')].map(el=>el.getBoundingClientRect().height),
   button:form.querySelector('button[type=submit]')?.getBoundingClientRect().height,
   font:parseFloat(getComputedStyle(form.querySelector('input[type=number]')).fontSize)
  }));
  expect(dims.inputs.length).toBe(2);
  expect(dims.inputs.every(n=>n>=48)).toBe(true);
  expect(dims.button).toBeGreaterThanOrEqual(48);
  expect(dims.font).toBeGreaterThanOrEqual(16);
 }
 for(const width of [320,390,480]){
  await page.setViewportSize({width,height:740});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const overflow=await noHorizontalOverflow(page);
  expect(overflow.doc,'200% text zoom @'+width).toBeLessThanOrEqual(1);
  await page.evaluate(()=>document.documentElement.style.fontSize='');
 }
 await page.setViewportSize({width:740,height:360}); // landscape low-height handset
 expect((await noHorizontalOverflow(page)).doc).toBeLessThanOrEqual(1);
 await expect(chooser).toBeVisible();
});

test('offline mobile judge keeps entered scores and does not send',async({page,context})=>{
 const posts=[];
 await mockJudge(page,route=>{
  posts.push(route.request().postDataJSON());
  return route.fulfill({json:{ok:true,score:80}});
 });
 await page.setViewportSize({width:320,height:700});
 const form=page.locator('.judge-demo-switcher .staff-demo-list>li:visible form');
 await form.locator('[name=technique]').fill('46');
 await form.locator('[name=interpretation]').fill('32');
 await form.locator('[type=checkbox]').check();
 await context.setOffline(true);
 await form.locator('[type=submit]').click();
 await expect(form.locator('.judge-save-feedback')).toContainText('離線');
 await expect(form.locator('[name=technique]')).toHaveValue('46');
 expect(posts).toHaveLength(0);
 await context.setOffline(false);
});

test('slow reply disables repeated taps and confirms one song only',async({page})=>{
 const posts=[];
 await mockJudge(page,async route=>{
  posts.push(route.request().postDataJSON());
  await new Promise(resolve=>setTimeout(resolve,350));
  return route.fulfill({status:200,json:{ok:true,score:84}});
 });
 await page.setViewportSize({width:390,height:790});
 const form=page.locator('.judge-demo-switcher .staff-demo-list>li:visible form');
 await form.locator('[name=technique]').fill('50');
 await form.locator('[name=interpretation]').fill('34');
 await form.locator('[type=checkbox]').check();
 const button=form.locator('button[type=submit]');
 await button.click();
 await expect(button).toBeDisabled();
 await expect(form.locator('.judge-save-feedback')).toContainText('正在連線');
 await button.evaluate(el=>el.click()); // disabled control must not issue a second POST
 await expect(page.locator('.judge-saved-confirmation')).toContainText('84 分');
 expect(posts).toHaveLength(1);
 expect(posts[0]).toMatchObject({application_id:'QA-MOBILE-VARIABLE-5',position:1});
});

test('failed or uncertain server response never erases entered scores or claims saved',async({page})=>{
 let attempts=0;
 await mockJudge(page,route=>{
  attempts++;
  return route.fulfill({status:503,json:{ok:false,error:'temporarily_unavailable'}});
 });
 const form=page.locator('.judge-demo-switcher .staff-demo-list>li:visible form');
 await form.locator('[name=technique]').fill('43');
 await form.locator('[name=interpretation]').fill('28');
 await form.locator('[type=checkbox]').check();
 await form.locator('button[type=submit]').click();
 await expect(form.locator('.judge-save-feedback')).toContainText('無法確認是否儲存成功');
 await expect(form.locator('[name=technique]')).toHaveValue('43');
 await expect(form.locator('[name=interpretation]')).toHaveValue('28');
 await expect(form.locator('button[type=submit]')).toBeEnabled();
 await expect(page.locator('.judge-saved-confirmation')).toHaveCount(0);
 expect(attempts).toBe(1);
});


test('onsite qualifier scoring has four large controls and one confirmed submission',async({page})=>{
 const posts=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').at(-1);
  if(key==='me')return route.fulfill({json:{ok:true,account:{
   id:'mobile-live-judge',role:'reviewer',available_roles:['reviewer']
  }}});
  if(key==='reviewer-queue')return route.fulfill({json:{ok:true,queue:[{
   id:'FAKE-QUALIFIER-01',stage_name:'SYNTHETIC QUALIFIER',
   song_title:'FAKE LIVE SONG',song_language:'Nepali',
   round_code:'2027-02',category:'community',phase:'qualifier',
   demo_url:'https://example.org/qa-live-song'
  }]}});
  if(key==='score'){posts.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:{ok:true}});
 });
 await page.setViewportSize({width:320,height:700});
 await page.goto('/backoffice.html');
 await page.locator('#judge-list .roster-entry').click();
 const form=page.locator('#judge-queue form');
 for(const [name,value] of [['technique','35'],['interpretation','25'],['stage_presence','16'],['appearance','7']]){
  const input=form.locator('[name='+name+']');
  await expect(input).toBeVisible();
  expect(await input.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  await input.fill(value);
 }
 await form.locator('[name=conflict]').check();
 const submit=form.locator('button[type=submit]');
 expect(await submit.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
 await submit.click();
 await expect.poll(()=>posts.length).toBe(1);
 expect(posts[0]).toMatchObject({
  application_id:'FAKE-QUALIFIER-01',phase:'qualifier',no_conflict:true,
  technique:35,interpretation:25,stage_presence:16,appearance:7
 });
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))
  .toBeLessThanOrEqual(1);
});
