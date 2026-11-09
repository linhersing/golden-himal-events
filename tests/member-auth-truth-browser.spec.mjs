import {test,expect} from '@playwright/test';
test('public homepage has no fake registration form or fake success message',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.front-actions .choice')).toHaveCount(3);
 await expect(page.locator('#registration-form')).toHaveCount(0);
 await expect(page.locator('.under-actions')).toContainText('尚未開放');
 const state=await page.evaluate(()=>localStorage.getItem('ghv_member_sandbox_v1'));
 expect(state).toBeNull();
});
test('member Email integration fails closed when not configured',async({page})=>{
 await page.route('**/api/e2e/**',async r=>r.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/member.html#register');
 await page.locator('[data-lang=en]').click();
 await page.locator('#member-email-form [name=email]').fill('fictional@example.invalid');
 await page.locator('#member-email-form button').click();
 await expect(page.locator('#member-status')).toContainText('Email login is not available yet');
 await expect(page.locator('#member-panel')).toBeHidden();
});
test('multi-round member dashboard opens correct unpaid application at checkout',async({page})=>{
 await page.goto('/member-login.html');
 await page.locator('#register-persona').selectOption('T001');
 await page.locator('#register-test').click();
 await page.goto('/member-portal.html?step=apply');
 await page.locator('#round').selectOption('2027-03');
 await page.locator('#apply').click();
 await page.locator('#order').click();
 await page.locator('#pay-success').click();
 await expect(page.locator('#checkout-card')).toContainText('模擬付款成功');
 await page.locator('#tab-apply').click();
 await page.locator('#round').selectOption('2027-06');
 await page.locator('#apply').click();
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('未建立訂單');
 await page.goto('/member-login.html');
 await expect(page.locator('#summary-payment')).toContainText('No test order');
 await expect(page.locator('#action-link')).toHaveAttribute('href','./member-portal.html?step=checkout&application=APP-TEST-0002');
 await page.locator('#action-link').click();
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('APP-TEST-0002');
 await expect(page.locator('#checkout-card')).toContainText('未建立訂單');
 // Unknown or different-account application selector must never override the session.
 await page.goto('/member-portal.html?step=checkout&application=APP-TEST-9999');
 await expect(page.locator('#pay-app')).toHaveValue('APP-TEST-0001');
});

/* UX screenshot evidence only. All API responses below are synthetic:
 * images verify layout and controls, NOT actual Gmail or live D1 state. */
test('Nepal singer onboarding CTA and category guidance work on mobile (synthetic UI screenshot)',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/e2e/**',async r=>{
  const endpoint=new URL(r.request().url()).pathname;
  const payload=endpoint.endsWith('/me')?{ok:true,account:{id:'synthetic-member',role:'member'}}:
   endpoint.endsWith('/applications')?{ok:true,applications:[]}:{ok:false,error:'not_found'};
  await r.fulfill({status:payload.ok?200:404,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await page.goto('/member.html#login');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('#member-panel')).toBeVisible();
 await expect(page.locator('#start-application')).toBeVisible();
 await expect(page.locator('#application-details')).not.toHaveAttribute('open','');
 const before=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(before).toBeLessThanOrEqual(0);
 await page.locator('#start-application').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/01-mobile-start-button.png'});
 await page.locator('#start-application').click();
 await expect(page.locator('#application-details')).toHaveAttribute('open','');
 await expect(page.locator('#start-application')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#university-statement')).toBeVisible();
 await expect(page.locator('#community-statement')).toBeHidden();
 await page.locator('#category').selectOption('community');
 await expect(page.locator('#community-statement')).toBeVisible();
 await expect(page.locator('#university-statement')).toBeHidden();
 await expect(page.locator('#application-form [name=adult_confirmed]')).toHaveAttribute('required','');
 await expect(page.locator('#application-form [name=song_language]')).toHaveValue('');
 await page.locator('#song-language').selectOption('Nepali');
 await page.locator('#song-key').selectOption('Unknown');
 await expect(page.locator('#song-language')).toHaveValue('Nepali');
 await expect(page.locator('#song-key')).toHaveValue('Unknown');
 await page.locator('#category').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/02-mobile-category-and-guidance.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
test('TEST payment state is displayed after explicit confirmation, never claimed as real payment (synthetic UI screenshot)',async({page})=>{
 let paid=false;
 await page.setViewportSize({width:1280,height:820});
 await page.route('**/api/e2e/**',async r=>{
  const u=new URL(r.request().url()),p=u.pathname;
  let payload;
  if(p.endsWith('/me'))payload={ok:true,account:{id:'synthetic-member',role:'member'}};
  else if(p.endsWith('/applications'))payload={ok:true,applications:[{id:'TEST-ENTRY-0001',stage_name:'TEST Singer',song_title:'Example Song',category:'university',round_code:'2027-01',status:paid?'under_review':'submitted',payment_status:paid?'simulated_paid':'unpaid',demo_url:'https://youtu.be/abcdef'}]};
  else if(p.endsWith('/mock-payment')){paid=true;payload={ok:true,status:'simulated_paid',testOnly:true,realCharge:false,amount_npr:500};}
  else payload={ok:false,error:'not_found'};
  await r.fulfill({status:payload.ok?200:404,contentType:'application/json',body:JSON.stringify(payload)});
 });
 page.on('dialog',d=>d.accept());
 await page.goto('/member.html#login');
 await page.locator('[data-lang=en]').click();
 await expect(page.getByText('Complete TEST checkout (no charge)')).toBeVisible();
 await page.getByText('Complete TEST checkout (no charge)').click();
 await expect(page.locator('#test-completion')).toBeVisible();
 await expect(page.locator('#test-completion')).toContainText('TEST REGISTRATION COMPLETE');
 await expect(page.locator('#test-completion')).toContainText('No payment charged');
 await expect(page.getByText('✓ TEST checkout complete')).toBeVisible();
 await page.locator('#test-completion').scrollIntoViewIfNeeded();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/03-desktop-mock-payment-receipt.png'});
});
test('latest news remains short expandable cards (synthetic UI screenshot)',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/news.html');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.news-row')).toHaveCount(4);
 await page.locator('.news-row').first().locator('summary').click();
 await expect(page.locator('.news-row').first()).toHaveAttribute('open','');
 await expect(page.getByText(/January 1–31/)).toBeVisible();
 await page.screenshot({path:'test-results/ghv-singer-ux-20261104/04-mobile-news-accordion.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('deleting a TEST entry requires confirmation and cancel leaves the record intact',async({page})=>{
 let deletes=0;
 await page.route('**/api/e2e/**',async r=>{
  const endpoint=new URL(r.request().url()).pathname;
  const entry={id:'TEST-DELETE-001',stage_name:'Synthetic Singer',song_title:'Sample',category:'community',round_code:'2027-01',status:'submitted',payment_status:'unpaid'};
  const data=endpoint.endsWith('/me')?{ok:true,account:{id:'synthetic-member',role:'member'}}:
   endpoint.endsWith('/applications')?{ok:true,applications:deletes?[]:[entry]}:
   endpoint.endsWith('/delete-application')?(deletes++,{ok:true,deleted_application_id:entry.id,testOnly:true}):{ok:false,error:'not_found'};
  await r.fulfill({status:data.ok?200:404,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('/member.html#login');
 await page.locator('[data-lang=en]').click();
 const del=page.getByText('Delete this TEST entry');
 await expect(del).toBeVisible();
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('cannot be undone');dialog.dismiss()});
 await del.click();
 expect(deletes).toBe(0);
 await expect(del).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await del.click();
 await expect(page.locator('#entries')).toContainText('No entries yet');
 expect(deletes).toBe(1);
});

/* Regression: homepage selection must carry to every participant page and survive refresh. */
test('Chinese selected on homepage remains Chinese through singer and news; language controls switch all three',async({page})=>{
 await page.goto('/');
 await page.locator('[data-lang=zh]').click();
 await page.locator('a.choice-main').click();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('h1')).toContainText('歌手報名');
 await expect(page.locator('#member-email-form button')).toContainText('寄送驗證碼');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await expect(page.locator('h1')).toContainText('गायक');
 await page.locator('a[href="./news.html"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ne');
 await expect(page.locator('h1')).toContainText('नयाँ');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('h1')).toContainText('最新消息');
 await expect(page.locator('.news-row').first().locator('strong')).toContainText('海選報名時間');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant');
 await expect(page.locator('h1')).toContainText('最新消息');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('h1')).toContainText('Latest updates');
 await expect(page.locator('.news-row')).toHaveCount(4);
 await page.screenshot({path:'test-results/ghv-trilingual/01-desktop-english-editorial-news.png'});
});
test('signed-in returning member sees existing entry, no new application panel, and can edit in Chinese',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const record={id:'SYNTHETIC-ENTRY-001',stage_name:'測試歌手',song_title:'示範歌曲',category:'university',round_code:'2027-01',status:'submitted',payment_status:'unpaid',demo_url:'https://youtu.be/abc123'};
 await page.route('**/api/e2e/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  const v=p.endsWith('/me')?{ok:true,account:{id:'synthetic',role:'member'}}:
   p.endsWith('/applications')?{ok:true,applications:[record]}:{ok:false,error:'not_found'};
  await route.fulfill({status:v.ok?200:404,json:v});
 });
 await page.goto('/');
 await page.locator('[data-lang=zh]').click();
 await page.goto('/member.html#register');
 await expect(page.locator('#member-panel')).toBeVisible();
 await expect(page.locator('#new-application-callout')).toBeHidden();
 await expect(page.locator('#application-details')).toBeHidden();
 await expect(page.locator('#entries')).toContainText('測試歌手');
 await expect(page.locator('#entries')).toContainText('修改資料');
 await page.getByText('修改資料').click();
 await expect(page.locator('[data-editing]')).toBeVisible();
 await expect(page.locator('[data-editing]')).toContainText('修改測試報名資料');
 await page.screenshot({path:'test-results/ghv-trilingual/02-mobile-registered-dashboard-zh.png'});
});
test('mobile news and member pages retain full Chinese layout without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');await page.locator('[data-lang=zh]').click();
 await page.goto('/member.html');
 await expect(page.locator('#member-email-form')).toBeVisible();
 await expect(page.locator('h1')).toContainText('歌手報名');
 await page.screenshot({path:'test-results/ghv-trilingual/03-mobile-member-login-zh.png'});
 await page.goto('/news.html');
 await expect(page.locator('.news-row')).toHaveCount(4);
 await expect(page.locator('h1')).toContainText('最新消息');
 await page.screenshot({path:'test-results/ghv-trilingual/04-mobile-news-zh.png'});
 const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 expect(dims.scroll).toBeLessThanOrEqual(dims.client);
});

test('switching English Nepali Chinese never discards an unsaved member edit draft',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const entry={id:'SYNTHETIC-KEEP-DRAFT',stage_name:'Original TEST singer',song_title:'Original TEST song',category:'university',round_code:'2027-01',status:'submitted',payment_status:'unpaid',demo_url:'https://youtu.be/abc123'};
 await page.route('**/api/e2e/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const payload=path.endsWith('/me')?{ok:true,account:{id:'synthetic',role:'member'}}:
   path.endsWith('/applications')?{ok:true,applications:[entry]}:{ok:false,error:'not_found'};
  await route.fulfill({status:payload.ok?200:404,json:payload});
 });
 await page.goto('/');await page.locator('[data-lang=zh]').click();
 await page.goto('/member.html#register');
 await expect(page.locator('#new-application-callout')).toBeHidden();
 await page.getByText('修改資料').click();
 const input=page.locator('[data-editing] [name=stage_name]');
 await input.fill('未儲存的重要內容 Test Draft');
 await page.locator('[data-lang=ne]').click();
 await expect(input).toHaveValue('未儲存的重要內容 Test Draft');
 await expect(page.locator('[data-editing] h3')).toContainText('परीक्षण');
 await page.locator('[data-lang=en]').click();
 await expect(input).toHaveValue('未儲存的重要內容 Test Draft');
 await expect(page.locator('[data-editing] h3')).toContainText('Edit your TEST entry');
 await page.locator('[data-lang=zh]').click();
 await page.locator('[data-lang=zh]').click();
 await expect(input).toHaveValue('未儲存的重要內容 Test Draft');
 await expect(page.locator('[data-editing] h3')).toContainText('修改測試報名資料');
 await page.screenshot({path:'test-results/ghv-trilingual/05-mobile-unsaved-draft-preserved-after-language-switch.png'});
 await page.locator('[data-editing] button[type=button]').click();
 await expect(page.locator('[data-editing]')).toHaveCount(0);
});

test('main member page sends a fresh Turnstile token and verifies the same mailbox',async({page})=>{
 let loggedIn=false;
 const requests=[];
 await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',r=>r.fulfill({
  contentType:'application/javascript',body:
   "window.turnstile={ready(fn){fn()},render(el,options){const button=document.createElement('button');"+
   "button.type='button';button.textContent='Solve test challenge';el.append(button);"+
   "button.onclick=()=>options.callback('synthetic-token');return 'synthetic-widget'},reset(){}}"
 }));
 await page.route('**/api/e2e/**',r=>{
  const endpoint=new URL(r.request().url()).pathname.split('/').at(-1);
  const send=(json,status=200)=>r.fulfill({status,json});
  if(endpoint==='signup-config')return send({ok:true,mode:'public_test',siteKey:'synthetic-site-key',testOnly:true});
  if(endpoint==='me'&&loggedIn)return send({ok:true,account:{role:'member',available_roles:['member']}});
  if(endpoint==='applications')return send({ok:true,applications:[]});
  if(endpoint==='request-code'||endpoint==='verify-code'){
   requests.push(r.request().postDataJSON());
   if(endpoint==='request-code')return send({ok:true,challenge_id:'synthetic-challenge'});
   loggedIn=true;
   return send({ok:true,role:'member'});
  }
  return send({ok:false,error:'login_required'},401);
 });
 await page.goto('/member.html#register');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('#signup-mode')).toContainText('Self-service test signup is open');
 await expect(page.getByText('No real payment.',{exact:false}).first()).toBeVisible();
 await page.locator('#member-email-form [name=email]').fill('singer@example.invalid');
 await page.locator('#member-email-form button[type=submit]').click();
 await expect(page.locator('#member-status')).toContainText('Complete the human verification');
 expect(requests).toHaveLength(0);
 await page.getByRole('button',{name:'Solve test challenge'}).click();
 await page.locator('#member-email-form button[type=submit]').click();
 await expect(page.locator('#member-status')).toContainText('Check your inbox and spam folder');
 await page.locator('#member-code-form [name=code]').fill('123456');
 await page.locator('#member-code-form button[type=submit]').click();
 await expect(page.locator('#start-application')).toBeVisible();
 expect(requests).toEqual([
  {email:'singer@example.invalid',role:'member',turnstile_token:'synthetic-token'},
  {email:'singer@example.invalid',challenge_id:'synthetic-challenge',code:'123456'}
 ]);
});
