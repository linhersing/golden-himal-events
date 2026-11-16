import {test,expect} from '@playwright/test';

const slogan='The Best Wedding at Golden Himal.';
const nepali='सबैभन्दा राम्रो विवाह समारोह गोल्डेन हिमालमा।';
const publicPages=['/','/golden-himal.html','/voice.html','/news.html','/announcements.html','/member.html','/backoffice.html'];

test('original Palace mark and slogan remain legible throughout visitor journey',async({page})=>{
 for(const width of [320,375,390,768,1280]){
  await page.setViewportSize({width,height:850});
  for(const route of publicPages){
   await page.goto(route);
   const brand=page.locator('header .gh-brand-lockup');
   await expect(brand).toBeVisible();
   await expect(brand.locator('.gh-brand-slogan')).toHaveText(slogan);
   await expect(brand).toHaveAttribute('href','./');
   const mark=brand.locator('.gh-brand-mark img');
   await expect(mark).toHaveAttribute('src','./images/brand-identity.png');
   await expect.poll(()=>mark.evaluate(el=>el.complete&&el.naturalWidth>0)).toBeTruthy();
   const markBox=await brand.locator('.gh-brand-mark').boundingBox();
   expect(markBox?.width).toBeGreaterThanOrEqual(width<=370?55:width<=650?69:94);
   const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
   expect(horizontalOverflow,route+' at '+width+'px').toBeFalsy();
  }
 }
});

test('Palace homepage promotes the official bilingual slogan without changing navigation',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.portal-tagline-official')).toHaveText(slogan);
 await expect(page.locator('.portal-tagline-nepali')).toHaveText(nepali);
 await expect(page.locator('#home-about')).toHaveAttribute('href','./golden-himal.html');
 await expect(page.locator('#home-competition')).toHaveAttribute('href','./voice.html');
 await expect(page.locator('#home-news')).toHaveAttribute('href','./news.html');
 await page.locator('button[data-lang="ne"]').click();
 await expect(page.locator('.portal-tagline-official')).toHaveText(slogan);
 await expect(page.locator('.portal-tagline-nepali')).toHaveText(nepali);
});

test('brand story repeats the exact campaign line while preserving the story navigation',async({page})=>{
 await page.goto('/golden-himal.html');
 await expect(page.locator('.gh-story-slogan')).toHaveText(slogan);
 await expect(page.locator('.portal-top-nav a[aria-current="page"]')).toHaveAttribute('href','./golden-himal.html');
});
