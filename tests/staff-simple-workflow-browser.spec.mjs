import {test,expect} from '@playwright/test';

test('two TEST registrations show organizer next-steps, approval readback and one-entry detail',async({page})=>{
 let approval='pending';
 const entries=[
  {id:'TEST-ONE',stage_name:'TEST Singer One',song_title:'Test Song One',song_language:'Nepali',
   category:'community',round_code:'2027-01',status:'under_review',payment_status:'simulated_paid',approval_state:'pending',demo_judges:0,live_judges:0,demo_url:'https://youtu.be/test-one'},
  {id:'TEST-TWO',stage_name:'TEST Singer Two',song_title:'Test Song Two',song_language:'English',
   category:'university',round_code:'2027-04',status:'submitted',payment_status:'unpaid',approval_state:'pending',demo_judges:0,live_judges:0,demo_url:'https://youtu.be/test-two'}
 ];
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  if(path==='me')return route.fulfill({json:{ok:true,account:{id:'TEST-ORGANIZER',role:'organizer',available_roles:['organizer']}}});
  if(path==='organizer-queue')return route.fulfill({json:{ok:true,applications:entries.map(x=>({...x,approval_state:x.id==='TEST-ONE'?approval:x.approval_state}))}});
  if(path==='approve-test-application'){expect(route.request().postDataJSON().application_id).toBe('TEST-ONE');approval='approved';return route.fulfill({json:{ok:true,approval_state:approval,testOnly:true}});}
  return route.fulfill({json:{ok:true}});
 });
 await page.setViewportSize({width:375,height:820});await page.goto('/backoffice.html');
 await expect(page.locator('#pending-count')).toHaveText('2');
 await expect(page.locator('#org-pending-review')).toHaveText('2');
 await expect(page.locator('#org-wait-payment')).toHaveText('1');
 await expect(page.locator('#org-ready-review')).toHaveText('0');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(2);
 await expect(page.locator('.staff-advanced-filters')).not.toHaveAttribute('open');
 await page.locator('#organizer-search').fill('Singer One');
 await expect(page.locator('#admin-apps .roster-entry')).toHaveCount(1);
 await page.locator('#admin-apps .roster-entry button').filter({hasText:'查看資料與下一步'}).click();
 await expect(page.locator('#organizer-roster-panel')).toBeHidden();
 await expect(page.locator('#organizer-detail')).toContainText('TEST Singer One');
 await expect(page.locator('#organizer-detail')).toContainText('評審可見');
 page.once('dialog',d=>d.accept());
 await page.locator('#organizer-detail button').filter({hasText:'核准測試報名'}).click();
 await expect(page.locator('#organizer-roster-panel')).toBeVisible();
 await expect(page.locator('#org-ready-review')).toHaveText('1');
 await expect(page.locator('#org-pending-review')).toHaveText('1');
 await expect(page.locator('#admin-apps')).toContainText('主辦已核准');
 for(const width of [320,375,390]){
  await page.setViewportSize({width,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
 await page.screenshot({path:'test-results/ghv-staff-simple/organizer-mobile.png',fullPage:true});
});

test('reviewer sees actionable empty-state until a TEST entry becomes eligible',async({page})=>{
 let eligible=false;
 const row={id:'TEST-SINGER',stage_name:'TEST Judge Singer',song_title:'Test Song',song_language:'Nepali',
  category:'university',round_code:'2027-01',phase:'demo',status:'under_review',
  payment_status:'simulated_paid',demo_url:'https://youtu.be/test-eligible',demo_technique:null,demo_interpretation:null};
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  const data=path==='me'?{ok:true,account:{id:'TEST-JUDGE',role:'reviewer',available_roles:['reviewer']}}:
   path==='reviewer-queue'?{ok:true,queue:eligible?[row]:[]}:{ok:true};
  return route.fulfill({json:data});
 });
 await page.goto('/backoffice.html');
 await expect(page.locator('#judge-unscored-total')).toHaveText('0');
 await expect(page.locator('#judge-list')).toContainText('主辦方已核准');
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
 eligible=true;
 await page.locator('#judge-list button').filter({hasText:'重新整理評審名單'}).click();
 await expect(page.locator('#judge-list .roster-entry')).toHaveCount(1);
 await expect(page.locator('#judge-unscored-total')).toHaveText('1');
});

test('reviewer single-entry score has live 60/40 total and server readback after submit',async({page})=>{
 let saved=null,requests=0;
 const entry={id:'SYNTH-REVIEW',stage_name:'TEST Performer',song_title:'TEST Original',round_code:'2027-01',
  category:'community',song_language:'Nepali',phase:'demo',demo_url:'https://youtu.be/test-song',demo_technique:null,demo_interpretation:null};
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  if(path==='me')return route.fulfill({json:{ok:true,account:{id:'TEST-REVIEWER',role:'reviewer',available_roles:['reviewer']}}});
  if(path==='reviewer-queue')return route.fulfill({json:{ok:true,queue:[{...entry,demo_technique:saved?.technique??null,demo_interpretation:saved?.interpretation??null}]}});
  if(path==='score'){requests++;saved=route.request().postDataJSON();return route.fulfill({json:{ok:true,score:saved.technique+saved.interpretation}});}
  return route.fulfill({json:{ok:true}});
 });
 await page.setViewportSize({width:375,height:820});await page.goto('/backoffice.html');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-score-total')).toHaveCount(0);
 await expect(page.locator('.staff-score-total')).toContainText('2 項');
 await page.locator('#judge-queue [name=technique]').fill('49');
 await page.locator('#judge-queue [name=interpretation]').fill('32');
 await expect(page.locator('.staff-score-total')).toContainText('81／100');
 await page.locator('#judge-queue [name=conflict]').check();
 await page.screenshot({path:'test-results/ghv-staff-simple/judge-score-mobile.png',fullPage:true});
 await page.locator('#judge-queue button[type=submit]').click();
 await expect(page.locator('#judge-roster-panel')).toBeVisible();
 await expect(page.locator('#judge-scored-total')).toHaveText('1');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-queue')).toContainText('此階段已評分：81 分');
 await expect(page.locator('#judge-queue form')).toHaveCount(0);
 expect(requests).toBe(1);
 expect(saved).toMatchObject({technique:49,interpretation:32,phase:'demo',no_conflict:true});
 for(const width of [320,375]){
  await page.setViewportSize({width,height:820});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 }
});

test('uploaded-only performance remains scoreable through authenticated video download',async({page})=>{
 const item={id:'SYNTH-UPLOAD',stage_name:'TEST Uploaded Singer',song_title:'TEST Audio Video',
  round_code:'2027-01',category:'community',phase:'demo',has_uploaded_file:true,demo_url:null,
  demo_technique:null,demo_interpretation:null,gender:'female'};
 await page.route('**/api/e2e/**',async route=>{
  const routeName=new URL(route.request().url()).pathname.split('/').pop();
  const response=routeName==='me'?{ok:true,account:{id:'TEST-REVIEWER',role:'reviewer',available_roles:['reviewer']}}:
   routeName==='reviewer-queue'?{ok:true,queue:[item]}:{ok:true};
  await route.fulfill({json:response});
 });
 await page.goto('/backoffice.html');
 await page.locator('#judge-list .roster-entry').click();
 await expect(page.locator('#judge-detail')).toContainText('女');
 await expect(page.locator('#judge-queue a.staff-video-link')).toHaveAttribute('href','/api/e2e/demo-download?application=SYNTH-UPLOAD');
 await expect(page.locator('#judge-queue button[type=submit]')).toBeEnabled();
});
