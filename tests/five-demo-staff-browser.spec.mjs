import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const demos=Array.from({length:5},(_,i)=>({song_title:'TEST Song '+(i+1),original_artist:'TEST Artist '+(i+1),song_language:['Nepali','English','Hindi','Maithili','Tamang'][i],demo_url:'https://youtu.be/TEST_Demo_'+(i+1)}));
test('staff see all five works after approval, reload and signing in again',async({page})=>{
 let role='organizer',signed=true,approved=false,score;
 const app={id:'TEST-5-DEMO',stage_name:'TEST Singer',round_code:'2027-01',category:'community',phase:'demo',payment_status:'unpaid',...demos[0],demo_entries:demos};
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  if(path==='me')return route.fulfill(signed?{json:{ok:true,account:{role,available_roles:[role]}}}:{status:401,json:{ok:false,error:'login_required'}});
  if(path==='organizer-queue')return route.fulfill({json:{ok:true,applications:[{...app,approval_state:approved?'approved':'pending'}],january_roster_enabled:true}});
  if(path==='reviewer-queue')return route.fulfill({json:{ok:true,queue:approved?[{...app,per_video_scoring:true,demo_entries:demos.map((d,i)=>i===0&&score?{...d,my_score:score}:d)}]:[]}});
  if(path==='january-test-roster')return route.fulfill({json:{ok:true,regions:[{region:'A',blocker:'seat_limit_pending',ranked:[]},{region:'B',blocker:'seat_limit_pending',ranked:[]}]}});
  if(path==='january-video-score'){score=route.request().postDataJSON();expect(score.position).toBe(1);return route.fulfill({json:{ok:true,score:90}});}
  if(path==='approve-test-application'){approved=true;return route.fulfill({json:{ok:true,testOnly:true,approval_state:'approved'}});}
  if(path==='staff-login-config')return route.fulfill({json:{ok:true,required:false}});
  if(path==='request-code')return route.fulfill({json:{ok:true,challenge_id:'fixture'}});
  if(path==='verify-code')signed=true;
  if(path==='logout')signed=false;
  return route.fulfill({json:{ok:true}});
 });
 const root=process.env.GHV_SCREENSHOT_DIR||'test-results';
 await mkdir(root,{recursive:true});
 await page.setViewportSize({width:1280,height:960});
 await page.goto('/backoffice.html');
 const list=page.locator('#admin-apps .staff-demo-list');
 await expect(list.locator('li')).toHaveCount(5);
 for(const [i,d] of demos.entries()){
  const item=list.locator('li').nth(i);
  await expect(item).toContainText((i+1)+'／5 · '+d.song_title);
  await expect(item).toContainText(d.original_artist+' · '+d.song_language);
  await expect(item.locator('a')).toHaveAttribute('href',d.demo_url);
 }
 await page.screenshot({path:root+'/five-demo-organizer-desktop.png',fullPage:true});
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'核准測試報名'}).click();
 await expect(page.locator('#admin-apps')).toContainText('主辦已核准');
 await page.reload();await expect(list.locator('li')).toHaveCount(5);
 await page.locator('#back-logout').click();
 await page.locator('#back-email-form [name=email]').fill('organizer@example.invalid');
 await page.locator('#back-email-form button').click();
 await page.locator('#back-code-form [name=code]').fill('123456');
 await page.locator('#back-code-form button[type=submit]').click();
 await expect(list.locator('li')).toHaveCount(5);
 await page.setViewportSize({width:375,height:850});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await page.screenshot({path:root+'/five-demo-organizer-mobile.png',fullPage:true});
 role='reviewer';await page.reload();
 await page.locator('#judge-list button').first().click();
 await expect(page.locator('#judge-queue .staff-demo-list li')).toHaveCount(5);
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:900});
  await expect(page.locator('#judge-queue form')).toHaveCount(5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:root+'/five-demo-reviewer-'+(width===375?'mobile':'desktop')+'.png',fullPage:true});
 }
 const first=page.locator('#judge-queue form').first();
 await first.locator('[name=technique]').fill('55');await first.locator('[name=interpretation]').fill('35');await first.locator('[type=checkbox]').check();
 await first.locator('[type=submit]').click();
 await expect(page.locator('#judge-queue')).toContainText('已儲存：90 分');
 await expect(page.locator('#judge-queue form')).toHaveCount(4);
});
