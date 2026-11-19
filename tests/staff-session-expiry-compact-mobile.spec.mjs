import {test,expect} from '@playwright/test';

const account={id:'synthetic-organizer-session',role:'organizer',available_roles:['organizer']};
async function mock(page,options={}){
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  const data=path==='me' ? options.initial401
    ?{status:401,json:{ok:false,error:'login_required'}}
    :{status:200,json:{ok:true,account,session_expires_in_seconds:options.ttl??7200,session_expires_at:1893456000}}
    :path==='organizer-queue'
     ?options.queue401
       ?{status:401,json:{ok:false,error:'login_required'}}
       :{status:200,json:{ok:true,applications:[]}}
     :{status:200,json:{ok:true,required:false}};
  await route.fulfill(data);
 });
 await page.goto('/backoffice.html');
}

test('staff nearing expiry sees an explicit reminder without losing roster access',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await mock(page,{ttl:480});
 await expect(page.locator('#back-dashboard')).toBeVisible();
 await expect(page.locator('#staff-session-warning')).toBeVisible();
 await expect(page.locator('#staff-session-warning-text')).toContainText('8 分鐘');
 await expect(page.locator('#staff-session-expired')).toBeHidden();
});
test('expired authentication produces re-login CTA not a broken-contact-data message',async({page})=>{
 await mock(page,{queue401:true});
 await expect(page.locator('#staff-session-expired')).toBeVisible();
 await expect(page.locator('#staff-session-expired')).toContainText('登入有效時間結束');
 await expect(page.locator('#staff-session-relogin')).toBeVisible();
 await expect(page.locator('#back-dashboard')).toBeHidden();
 await expect(page.locator('#back-signin')).toBeVisible();
});
test('first time staff visitor has a normal login form, not an expired-session warning',async({page})=>{
 await mock(page,{initial401:true});
 await expect(page.locator('#back-signin')).toBeVisible();
 await expect(page.locator('#staff-session-expired')).toBeHidden();
});
test('mobile organizer preview packs search and filters into one line and two-column advanced grid',async({page})=>{
 await mock(page);
 for(const width of [280,320,375,390,430,768]){
  await page.setViewportSize({width,height:760});
  const summary=page.locator('.staff-mobile-summary');
  await expect(summary.locator('.dash-stat')).toHaveCount(2);
  const cards=await summary.locator('.dash-stat').evaluateAll(els=>els.map(el=>el.getBoundingClientRect()));
  expect(Math.abs(cards[0].top-cards[1].top),'stats side by side at '+width).toBeLessThan(2);
  const search=page.locator('#organizer-search');
  const filters=page.locator('.organizer-filter-panel');
  await expect(search).toBeVisible();await expect(filters).toBeVisible();
  const searchTop=await search.evaluate(el=>el.getBoundingClientRect().top);
  const filterTop=await filters.evaluate(el=>el.getBoundingClientRect().top);
  expect(Math.abs(searchTop-filterTop),'search and filter close at '+width).toBeLessThan(65);
  await filters.evaluate(el=>{el.open=true});
  const fields=await page.locator('.organizer-filter-grid .roster-field').evaluateAll(els=>els.map(el=>el.getBoundingClientRect()));
  if(width>=320)expect(Math.abs(fields[0].top-fields[1].top),'two filters in row at '+width).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),'no horizontal scrolling '+width).toBeLessThanOrEqual(1);
  await filters.evaluate(el=>{el.open=false});
 }
});
