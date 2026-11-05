import {test,expect} from '@playwright/test';

// Strictly synthetic, no personal data and no actual Cloudflare/Resend calls.
const entries=Array.from({length:125},(_,i)=>{
 const number=i+1,id=String(number).padStart(3,'0'),song_language=number%2?'Nepali':'English';
 return {id:'FAKE-'+id,stage_name:'TEST Singer '+id,
  song_title:'TEST Song '+id,song_language,category:number%2?'community':'university',
  round_code:'2027-01',payment_status:'simulated_paid',
  photo_url_1:'https://images.example.org/ghv-'+id+'.jpg',
  photo_url_2:number%3===0?'https://images.example.org/ghv-'+id+'-2.jpg':null,
  photo_url_3:number%7===0?'https://images.example.org/ghv-'+id+'-3.jpg':null,
  gender:number%2?'female':'male',demo_url:'https://youtu.be/fictional-test-'+id,
  phase:'demo',status:'submitted',demo_judges:0,live_judges:0,
  demo_technique:null,demo_interpretation:null
 };
});
async function externalPhotos(page){
 await page.route('https://images.example.org/**',route=>route.fulfill({
  status:200,contentType:'image/svg+xml',
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#ddd"/></svg>'
 }));
}
test('125 photo-distinct reviewer entries paginate, filter and open only one scoring form (desktop/mobile)',async({page})=>{
 await externalPhotos(page);
 const scores=[];
 await page.route('**/api/e2e/**',route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop();
  let result={ok:true};
  if(action==='me')result={ok:true,account:{id:'FICTIONAL-JUDGE',role:'reviewer',available_roles:['reviewer']}};
  if(action==='reviewer-queue')result={ok:true,queue:entries};
  if(action==='score'){
   const payload=route.request().postDataJSON();
   scores.push(payload);const app=entries.find(x=>x.id===payload.application_id);
   if(app){app.demo_technique=payload.technique;app.demo_interpretation=payload.interpretation;}
   result={ok:true,score:payload.technique+payload.interpretation};
  }
  return route.fulfill({status:200,json:result});
 });
 await page.setViewportSize({width:1280,height:850});
 await page.goto('/backoffice.html');
 await expect(page.locator('#judge-count')).toContainText('125');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(10);
 await expect(page.locator('#judge-pagination')).toContainText('1 / 13');
 await expect(page.locator('#judge-queue form')).toHaveCount(0,'no eager 125 scoring forms');
 await page.screenshot({path:'test-results/ghv-125/reviewer-desktop.png',fullPage:true});
 for(let p=2;p<=13;p++){await page.locator('#judge-pagination button').last().click();}
 await expect(page.locator('#judge-pagination')).toContainText('13 / 13');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(5);
 await page.locator('#judge-search').fill('TEST Singer 125');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await expect(page.locator('#judge-list .roster-entry')).toContainText('125');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-detail .entrant-gallery-img')).toHaveCount(1);
 await expect(page.locator('#judge-detail .entrant-gallery-img')).toHaveAttribute('src','https://images.example.org/ghv-125.jpg');
 await expect(page.locator('#judge-detail')).not.toContainText('TEST Singer 124');
 await expect(page.locator('#judge-queue form')).toHaveCount(1);
 for(const width of [320,375,414]){
  await page.setViewportSize({width,height:840});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-125/reviewer-detail-mobile.png',fullPage:true});
 await page.locator('#judge-queue [name=technique]').fill('51');
 await page.locator('#judge-queue [name=interpretation]').fill('32');
 await page.locator('#judge-queue [name=conflict]').check();
 await page.locator('#judge-queue button[type=submit]').click();
 expect(scores).toHaveLength(1);
 expect(scores[0]).toMatchObject({application_id:'FAKE-125',technique:51,interpretation:32,no_conflict:true});
 await expect(page.locator('#judge-roster-panel')).toBeVisible();
 await page.locator('#judge-status').selectOption('scored');
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await expect(page.locator('#judge-list')).toContainText('已評分');
});
test('125 organizer entries filter 63 Nepali / 62 English, maintain payment 0 and mobile width',async({page})=>{
 await externalPhotos(page);
 await page.route('**/api/e2e/**',route=>{
  const action=new URL(route.request().url()).pathname.split('/').pop();
  const result=action==='me'?{ok:true,account:{id:'FICTIONAL-ORG',role:'organizer',available_roles:['organizer']}}:
   action==='organizer-queue'?{ok:true,applications:entries}:{ok:true};
  return route.fulfill({status:200,json:result});
 });
 await page.setViewportSize({width:1280,height:850});await page.goto('/backoffice.html');
 await expect(page.locator('#organizer-dashboard')).toBeVisible();
 await expect(page.locator('#pending-count')).toHaveText('125');
 await expect(page.locator('#paid-count')).toHaveText('0');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(12);
 await expect(page.locator('#organizer-pagination')).toContainText('1 / 11');
 await page.locator('#organizer-language').selectOption('Nepali');
 await expect(page.locator('#organizer-count')).toContainText('63 筆');
 await page.locator('#organizer-language').selectOption('English');
 await expect(page.locator('#organizer-count')).toContainText('62 筆');
 await page.locator('#organizer-search').fill('TEST Singer 124');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(1);
 await expect(page.locator('#admin-apps')).toContainText('FAKE-124');
 await page.screenshot({path:'test-results/ghv-125/organizer-desktop.png',fullPage:true});
 for(const width of [320,375,414]){
  await page.setViewportSize({width,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-125/organizer-mobile.png',fullPage:true});
});
