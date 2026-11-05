import {test,expect} from '@playwright/test';

function fakeQueue(n=135){
 return Array.from({length:n},(_,i)=>({
  id:'SYNTH-'+String(i+1).padStart(3,'0'),stage_name:'EXAMPLE Singer '+String(i+1).padStart(3,'0'),
  song_title:i%2?'English song':'Nepali song',song_language:i%2?'English':'Nepali',
  category:i%2?'university':'community',round_code:'2027-01',
  demo_url:'https://youtu.be/example',phase:'demo',payment_status:'simulated_paid',
  demo_technique:null,demo_interpretation:null
 }));
}
test('reviewer can page through 135 synthetic entries, open one form and score only that entry',async({page})=>{
 const entries=fakeQueue();const posts=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  let response={ok:true};
  if(key==='me')response={ok:true,account:{id:'reviewer-1',role:'reviewer',available_roles:['reviewer']}};
  else if(key==='reviewer-queue')response={ok:true,queue:entries};
  else if(key==='score'){const data=route.request().postDataJSON();posts.push(data);const a=entries.find(x=>x.id===data.application_id);a.demo_technique=data.technique;a.demo_interpretation=data.interpretation;response={ok:true,score:data.technique+data.interpretation};}
  await route.fulfill({status:200,json:response});
 });
 await page.setViewportSize({width:1280,height:900});await page.goto('/backoffice.html');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(10);
 await expect(page.locator('#judge-count')).toContainText('135');
 await expect(page.locator('#judge-detail')).toBeHidden();
 await page.screenshot({path:'test-results/ghv-staff-roster/reviewer-desktop-list.png',fullPage:true});
 await page.locator('#judge-pagination button').last().click();
 await expect(page.locator('#judge-pagination')).toContainText('2 / 14');
 await page.locator('#judge-search').fill('EXAMPLE Singer 125');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-roster-panel')).toBeHidden();
 await expect(page.locator('#judge-queue form')).toBeVisible();
 await page.locator('#judge-queue [name=technique]').fill('50');
 await page.locator('#judge-queue [name=interpretation]').fill('35');
 await page.locator('#judge-queue [name=conflict]').check();
 await page.locator('#judge-queue button[type=submit]').click();
 await expect(page.locator('#judge-roster-panel')).toBeVisible();
 expect(posts).toHaveLength(1);
 expect(posts[0]).toMatchObject({application_id:'SYNTH-125',technique:50,interpretation:35,no_conflict:true});
 await page.locator('#judge-status').selectOption('scored');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await expect(page.locator('#judge-list')).toContainText('已評分');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
 await page.locator('#judge-back-list').click();
 for(const width of [320,375]){
  await page.setViewportSize({width,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-staff-roster/reviewer-mobile-375.png',fullPage:true});
});
test('organizer filters language, category and scoring with 133 synthetic entries',async({page})=>{
 const entries=Array.from({length:133},(_,i)=>({
  id:'ENTRY-'+String(i+1).padStart(3,'0'),stage_name:'Singer '+String(i+1).padStart(3,'0'),
  song_title:'Song '+String(i+1),song_language:i%2?'English':'Nepali',
  category:i%2?'university':'community',round_code:'2027-01',
  status:'submitted',payment_status:i%3===0?'simulated_paid':'unpaid',
  demo_judges:i%4===0?1:0,live_judges:0,demo_mean:null
 }));
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  const data=key==='me'?{ok:true,account:{id:'organizer-1',role:'organizer',available_roles:['organizer']}}:
  key==='organizer-queue'?{ok:true,applications:entries}:{ok:true};
  await route.fulfill({status:200,json:data});
 });
 await page.setViewportSize({width:1280,height:900});await page.goto('/backoffice.html');
 await expect(page.locator('#organizer-dashboard')).toBeVisible();
 await expect(page.locator('#pending-count')).toHaveText('133');
 await expect(page.locator('#paid-count')).toHaveText('0');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(12);
 await page.locator('#organizer-language').selectOption('English');
 await expect(page.locator('#organizer-count')).toContainText('66 筆');
 await page.locator('#organizer-category').selectOption('university');
 await expect(page.locator('#organizer-count')).toContainText('66 筆');
 await page.locator('#organizer-search').fill('ENTRY-120');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(1);
 await expect(page.locator('#admin-apps')).toContainText('ENTRY-120');
 await page.screenshot({path:'test-results/ghv-staff-roster/organizer-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:850});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 await page.screenshot({path:'test-results/ghv-staff-roster/organizer-mobile-375.png',fullPage:true});
});
