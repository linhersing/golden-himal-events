import {test,expect} from '@playwright/test';

test('frontline organizers and purpose appear in the second-layer Voice home',async({page})=>{
 for(const width of [320,375,390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/voice.html');
  await expect(page.locator('.event-credits')).toContainText('Golden Himal Palace');
  await expect(page.locator('.event-credits')).toContainText('Synergy FM');
  await expect(page.locator('.event-credits')).toContainText('Kalika FM');
  await expect(page.locator('.mission-intro')).toContainText('帶動尼泊爾音樂發展');
  await expect(page.locator('.front-actions .choice')).toHaveCount(3);
  const footer=page.locator('footer .test-site-footer');
  await expect(footer).toContainText('TEST MODE');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator('.masthead + .event-credits')).toBeVisible();
 }
});

test('frontline schedule stays readable with English, Nepali and Chinese; April link is not offered',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/news.html');
 await expect(page.locator('.news-row').first()).not.toHaveAttribute('open','');
 await expect(page.locator('.news-schedule li')).toHaveCount(5);
 await expect(page.locator('.news-schedule')).toContainText('2027年1月1日至1月31日');
 await expect(page.locator('.news-schedule')).toContainText('2027年4月1日至4月30日');
 await expect(page.locator('.test-site-footer')).toBeVisible();
 await expect(page.locator('.news-board a[href*="2027-04"]')).toHaveCount(0);
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.news-schedule')).toContainText('January 1–31, 2027');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.news-schedule')).toContainText('जनवरी');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('.news-schedule')).toContainText('海選一');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('qualification requirements are informational and cannot leak identity documents through public URLs',async({page})=>{
 await page.route('**/api/e2e/**',route=>route.fulfill({status:503,json:{ok:false,error:'e2e_not_configured'}}));
 await page.goto('/member.html#register');
 await expect(page.locator('.test-site-footer')).toContainText('TEST MODE');
 await expect(page.locator('.evidence-plan')).toBeAttached();
 await page.locator('.evidence-plan summary').click();
 await expect(page.locator('.evidence-plan')).toContainText('有效學生證');
 await expect(page.locator('.evidence-plan')).toContainText('安全');
 await expect(page.locator('.evidence-plan input[type=file]')).toHaveCount(0);
 await expect(page.locator('#application-form input[name=demo_url]')).toHaveAttribute('type','url');
});


test('frontline awards and quick rules are clear, actionable and mobile-readable in three languages',async({page})=>{
 for(const width of [320,375,390,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/news.html#rules-awards');
  await page.locator('[data-lang=zh]').click();
  const award=page.locator('#rules-awards');
  await expect(award).toHaveAttribute('open','');
  await expect(page.locator('.news-quick-grid a')).toHaveCount(5);
  await expect(award.locator('.award-overview')).toContainText('每組9人，共18人');
  await expect(award.locator('.award-overview')).toContainText('每位');
  const rows=award.locator('.prize-table [role=listitem]');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('NPR 45,000');
  await expect(rows.nth(1)).toContainText('NPR 22,000');
  await expect(rows.nth(2)).toContainText('NPR 11,000');
  for(let i=0;i<3;i++)await expect(rows.nth(i)).toContainText('每位');
  await expect(award.locator('.voucher-heading')).toContainText('不是現金獎金');
  await expect(award.locator('.voucher-notice')).toContainText('NPR 10,000');
  await expect(award.locator('.award-faq-list>div')).toHaveCount(3);
  await expect(award.locator('.award-faq-list')).toContainText('NPR 500');
  await expect(award.locator('.news-fineprint')).toContainText('尚未開放');
  await expect(page.locator('.news-quick-grid a[href="#rules-awards"]')).toHaveCount(1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await award.locator('.award-followups a[href="#rules-selection"]').click();
  await expect(page.locator('#rules-selection')).toHaveAttribute('open','');
  await page.locator('.news-quick-grid a[href="#rules-eligibility"]').click();
  await expect(page.locator('#rules-eligibility')).toHaveAttribute('open','');
 }
 await page.goto('/news.html#rules-awards');
 await page.locator('[data-lang=en]').click();
 await expect(page.locator('.news-quick-guide h2')).toHaveText('Five things to know before entering');
 await expect(page.locator('#rules-awards .award-overview')).toContainText('18 total');
 await expect(page.locator('#rules-awards .voucher-heading')).toContainText('not cash');
 await page.locator('[data-lang=ne]').click();
 await expect(page.locator('.news-quick-guide h2')).toContainText('भाग लिनुअघि');
 await expect(page.locator('#rules-awards .award-faq-list')).toContainText('NPR ५००');
 await expect(page.locator('.news-quick-grid a[href="#rules-registration"]')).toHaveAttribute('href','#rules-registration');
});


test('public contestant pages never expose internal frontline or draft-version terminology',async({page})=>{
 for(const [path,label] of [['/news.html','news'],['/member.html','member'],['/voice.html','voice']]){
  await page.goto(path);
  for(const lang of ['en','zh','ne']){
   await page.locator('[data-lang="'+lang+'"]').click();
   const text=await page.locator('body').innerText();
   expect(text,{message:label+'/'+lang+' must use contestant-facing language'}).not.toMatch(/前線|\bV2\b|frontline|November 13|11月13日|內部資料/i);
  }
 }
 await page.goto('/news.html#rules-awards');
 await page.locator('[data-lang=zh]').click();
 await expect(page.locator('.news-quick-guide')).toContainText('參賽前，先看這5件事');
 await expect(page.locator('.news-registration-status')).toContainText('正式報名尚未開放');
 await expect(page.locator('#rules-awards')).toHaveAttribute('open','');
});


test('public printable summary explains participation without exposing team-only notes',async({page})=>{
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/print-brief.html');
  await expect(page.locator('h1')).toContainText('參賽資訊一頁看懂');
  await expect(page.locator('.feature')).toHaveCount(4);
  await expect(page.locator('.points')).toContainText('NPR 45,000');
  await expect(page.locator('.points')).toContainText('NPR 10,000');
  await expect(page.locator('.state')).toContainText('尚未開放正式報名');
  await expect(page.locator('.toolbar a[href="./"]')).toBeVisible();
  const content=await page.locator('body').innerText();
  expect(content).not.toMatch(/前線|V2|ALAN|王老師|技術驗收|D1|內部展示/i);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});


test('2027 rules use five full-width vertically scanned links, aligned down arrows and simple accordions',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:820});
  await page.goto('/news.html');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('.news-registration-status')).toContainText('正式報名尚未開放');
  await expect(page.locator('.news-quick-guide h2')).toHaveText('參賽前，先看這5件事');
  const links=page.locator('.news-quick-grid>a');
  await expect(links).toHaveCount(5);
  await expect(page.locator('.news-quick-grid .news-quick-chevron')).toHaveText(['↓','↓','↓','↓','↓']);
  await expect(page.locator('.news-board-heading')).toHaveText('完整參賽規則');
  await expect(page.locator('.news-board .news-copy small')).toHaveCount(0);
  await expect(page.locator('.news-board details[open]')).toHaveCount(0);
  const pos=await links.evaluateAll(nodes=>nodes.map(el=>{
   const row=el.getBoundingClientRect(),action=el.querySelector('.news-quick-action').getBoundingClientRect();
   return {width:row.width,left:row.left,top:row.top,bottom:row.bottom,height:row.height,right:row.right,
    arrowCenterY:action.top+action.height/2,rowCenterY:row.top+row.height/2,
    actionRight:action.right};
  }));
  for(let i=0;i<pos.length;i++){
   expect(pos[i].height).toBeGreaterThanOrEqual(73);
   expect(Math.abs(pos[i].rowCenterY-pos[i].arrowCenterY)).toBeLessThan(3);
   expect(Math.abs(pos[i].right-pos[0].right)).toBeLessThan(2);
   expect(Math.abs(pos[i].actionRight-pos[0].actionRight)).toBeLessThan(2);
   if(i>0)expect(pos[i].top).toBeGreaterThanOrEqual(pos[i-1].bottom+3);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await links.nth(2).click();
  await expect(page.locator('#rules-demo')).toHaveAttribute('open','');
  await expect(page.locator('#rules-demo')).toContainText('60');
 }
 await page.goto('/news.html#rules-awards');
 await expect(page.locator('#rules-awards')).toHaveAttribute('open','');
 await expect(page.locator('#rules-schedule')).not.toHaveAttribute('open','');
});


test('entrant guide title, fee section and readable action survive three-language switching',async({page})=>{
 await page.setViewportSize({width:375,height:820});
 await page.goto('/news.html');
 for(const [locale,title,fee] of [
  ['zh','2027 比賽規則與報名須知','報名費與報名方式'],
  ['en','2027 Competition Rules & Entry Guide','Entry fees and registration'],
  ['ne','२०२७ गायन प्रतियोगिता','दर्ता र शुल्क']
 ]){
  await page.locator('[data-lang='+locale+']').click();
  await expect(page.locator('h1')).toContainText(title);
  await expect(page.locator('#rules-registration summary [data-l=news04]')).toContainText(fee);
  await expect(page.locator('.news-quick-action')).toHaveCount(5);
  const accessible=await page.locator('.news-quick-grid>a').first().evaluate(el=>{
   const parts=[...el.querySelectorAll('[aria-hidden=true]')].map(n=>n.className||'');
   return {text:el.innerText,arrowHidden:parts.includes('news-quick-chevron')};
  });
  expect(accessible.text.length).toBeGreaterThan(10);
  expect(accessible.arrowHidden).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 }
 await page.locator('.news-quick-grid a[href="#rules-registration"]').click();
 await expect(page.locator('#rules-registration')).toHaveAttribute('open','');
});


test('official Golden Himal Palace phone contact is readable in mobile and desktop across five public pages',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:840});
  for(const pathname of ['/','/golden-himal.html','/voice.html','/news.html','/member.html']){
   await page.goto(pathname);
   const panel=page.locator('#contact');
   await expect(panel).toHaveCount(1);
   await expect(panel.locator('h2')).toBeVisible();
   const call=panel.locator('a.ghv-contact-call');
   await expect(call).toHaveAttribute('href','tel:+9779801199996');
   await expect(call).toContainText('+977 9801199996');
   const measures=await call.evaluate(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}));
   expect(measures.height).toBeGreaterThanOrEqual(44);
   expect(measures.width).toBeGreaterThan(180);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
   await page.locator('[data-lang=en]').click();
   await expect(panel.locator('h2')).toContainText('Questions about the contest?');
   await expect(call).toContainText('Call now');
   await page.locator('[data-lang=ne]').click();
   await expect(panel.locator('h2')).toContainText('प्रतियोगिताबारे');
   await page.locator('[data-lang=zh]').click();
   await expect(panel.locator('h2')).toContainText('有問題需要聯絡我們');
  }
 }
 await page.goto('/news.html');
 await page.locator('.quick-nav a[href="#contact"]').click();
 await expect(page).toHaveURL(/#contact$/);
 await expect(page.locator('#contact')).toBeInViewport();
 await page.goto('/member.html');
 await expect(page.locator('.quick-nav a[href="#contact"]')).toBeVisible();
 await page.goto('/voice.html');
 await expect(page.locator('.ghv-contact-shortcut a[href="#contact"]')).toBeVisible();
});


test('2027 rules require reading and updates stay separate, without fictional selections',async({page})=>{
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto('/news.html');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('h1')).toContainText('比賽規則與報名須知');
  await expect(page.locator('.contest-section-nav a[aria-current="page"]')).toContainText('比賽規則');
  await expect(page.locator('.news-heading .page-intro')).toContainText('報名前請仔細閱讀');
  await expect(page.locator('.news-row')).toHaveCount(8);
  await page.locator('.contest-section-nav a[href="./announcements.html"]').click();
  await expect(page).toHaveURL(/\/announcements\.html$/);
  await expect(page.locator('h1')).toHaveText('最新公告');
  await expect(page.locator('.contest-section-nav a[aria-current="page"]')).toHaveText('最新公告');
  await expect(page.locator('.announcement-empty h2')).toContainText('尚未公布入選名單');
  await expect(page.locator('.ghv-contact-call')).toHaveAttribute('href','tel:+9779801199996');
  await page.locator('.announcement-rules-link').click();
  await expect(page).toHaveURL(/\/news\.html$/);
  await page.goto('/member.html');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('.member-rules-prep')).toContainText('報名前請詳閱比賽規則');
  await expect(page.locator('.member-rules-prep a')).toHaveAttribute('href','./news.html');
  await page.goto('/voice.html');
  await page.locator('[data-lang=zh]').click();
  await expect(page.locator('h1')).toContainText('下一位歌唱新星');
  await expect(page.locator('.voice-talent-lead')).toContainText('社群創作者');
  await expect(page.locator('.front-actions .choice').last()).toContainText('比賽規則');
  await expect(page.locator('a[data-t=announcementsShortcut]')).toHaveAttribute('href','./announcements.html');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 }
 await page.goto('/announcements.html');
 for(const lang of ['en','ne','zh']){
  await page.locator('[data-lang="'+lang+'"]').click();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.announcement-empty h2')).toBeVisible();
  await expect(page.locator('.contest-section-nav a')).toHaveCount(2);
  await expect(page.locator('.announcement-rules-link')).toHaveAttribute('href','./news.html');
 }
});
