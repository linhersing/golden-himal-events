import {test,expect} from '@playwright/test';

const visitorRoutes=[
 {url:'/golden-himal.html',active:'about'},
 {url:'/voice.html',active:'voice'},
 {url:'/news.html',active:'rules'},
 {url:'/announcements.html',active:null},
 {url:'/member.html',active:null}
];
const targets=['./','./golden-himal.html','./voice.html','./news.html'];

test('approved Palace homepage identity is shared across five public entry pages',async({page})=>{
 for(const width of [320,375,390,414,650,768,900,981,1280]){
  await page.setViewportSize({width,height:900});
  for(const route of visitorRoutes){
   await page.goto(route.url);
   const logo=page.locator('.ghp-shared-header .ghp-shared-logo img');
   const menu=page.locator('.ghp-shared-header .ghp-shared-nav');
   await expect(logo,route.url).toBeVisible();
   await expect(logo).toHaveAttribute('src','./images/ghp-clean-official-logo-20261116.png');
   await expect.poll(()=>logo.evaluate(el=>el.complete&&el.naturalWidth===2048)).toBeTruthy();
   await expect(menu.locator('a')).toHaveCount(4);
   for(const [i,href] of targets.entries())
    await expect(menu.locator('a').nth(i)).toHaveAttribute('href',href);
   const chosen=menu.locator('[aria-current="page"]');
   if(route.active){
    await expect(chosen).toHaveCount(1);
    await expect(chosen).toHaveAttribute('data-ghp-nav',route.active);
   }else await expect(chosen).toHaveCount(0);
   const mark=await logo.boundingBox(),bar=await menu.boundingBox();
   for(const [label,bounds] of [['logo',mark],['menu',bar]])
    expect(Math.abs(bounds.x+bounds.width/2-width/2),route.url+' '+label+' at '+width).toBeLessThanOrEqual(2);
   expect(bar.y,route.url).toBeGreaterThanOrEqual(mark.y+mark.height-1);
   const flags=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    bg:getComputedStyle(document.querySelector('.ghp-shared-atmosphere'),'::before').backgroundImage
   }));
   expect(flags.overflow,route.url+' '+width).toBeLessThanOrEqual(1);
   expect(flags.bg).toContain('gh-real-hall-hero-20261113.webp');
   const buttons=page.locator('.ghp-shared-locale button');
   await expect(buttons).toHaveCount(3);
   for(const button of await buttons.all()){
    const rect=await button.boundingBox();
    expect(rect.height).toBeGreaterThanOrEqual(38);
   }
  }
 }
});

test('shared Palace nav follows existing EN/Nepali/Chinese language selection',async({page})=>{
 await page.goto('/voice.html');
 await page.locator('.ghp-shared-locale [data-lang="en"]').click();
 await expect(page.locator('.ghp-shared-nav [data-ghp-nav="rules"]')).toHaveText('Contest Rules');
 await page.locator('.ghp-shared-locale [data-lang="ne"]').click();
 await expect(page.locator('.ghp-shared-nav [data-ghp-nav="about"]')).toHaveText('परिचय');
 await page.goto('/news.html');
 await expect(page.locator('.ghp-shared-nav [data-ghp-nav="rules"]')).toHaveText('प्रतियोगिता नियम');
 await page.locator('.ghp-shared-locale [data-lang="zh"]').click();
 await expect(page.locator('.ghp-shared-nav [data-ghp-nav="rules"]')).toHaveText('比賽規則');
 await page.goto('/golden-himal.html');
 await expect(page.locator('.ghp-shared-nav [data-ghp-nav="home"]')).toHaveText('首頁');
});

test('previous quick links, voice registration and member log-in entry are preserved',async({page})=>{
 for(const [route,links] of [
  ['/news.html',['./','./member.html#register','#contact']],
  ['/announcements.html',['./','./news.html','#contact']],
  ['/member.html',['./','./news.html','#contact']]
 ]){
  await page.goto(route);
  const q=page.locator('.ghp-secondary-links .quick-nav a');
  await expect(q).toHaveCount(3);
  for(const [i,href] of links.entries())await expect(q.nth(i)).toHaveAttribute('href',href);
 }
 await page.goto('/voice.html');
 await expect(page.locator('#home-apply')).toHaveAttribute('href','./member.html#register');
 await expect(page.locator('#home-login')).toHaveAttribute('href','./member.html#login');
 await page.goto('/member.html');
 await expect(page.locator('#signin-panel')).toHaveCount(1);
 await expect(page.locator('#member-status')).toHaveCount(1);
});

test('homepage remains the same approved header, without duplicate shared brand',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.ghp-home-header .ghp-home-logo img')).toHaveAttribute('src','./images/ghp-clean-official-logo-20261116.png');
 await expect(page.locator('.ghp-shared-atmosphere')).toHaveCount(0);
 await expect(page.locator('.portal-top-nav a')).toHaveCount(4);
});
