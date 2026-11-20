import {test,expect} from '@playwright/test';
import {publicMemberFixture} from './fixtures/public-member-submit.mjs';
import {mkdir} from 'node:fs/promises';

for(const width of [390,1280])test('public member real handler stores browser form at '+width+'px',async({page})=>{
 const db=publicMemberFixture();
 try{
  await page.setViewportSize({width,height:850});
  await page.route('**/api/e2e/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname.split('/').pop();
   const response=await db.call(request.method()==='POST'?request.postDataJSON():undefined,path);
   await route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});
  });
  await page.goto('/member.html#register');
  await expect(page.locator('#frontline-test-fields')).toBeVisible();
  const name=width===390?'測':'TEST Codex 1120',count=width===390?5:1;
  await page.locator('[name=stage_name]').fill(name);
  await page.locator('[name=location_detail]').fill('TEST Municipality');
  await page.locator('[name=affiliation]').fill('TEST College');
  await page.locator('[name=song_title]').fill('TEST Song 1');
  await page.locator('[name=original_artist]').fill('TEST Artist');
  await page.locator('[name=song_language]').selectOption('Nepali');
  await page.locator('[name=song_key]').selectOption('Unknown');
  await page.locator('[name=demo_url]').fill('https://youtu.be/TEST_PUB001');
  for(const name of ['video_confirmed','no_exclusive_contract','nonreligious_song_ack'])await page.locator('[name='+name+']').check();
  const root=process.env.GHV_SCREENSHOT_DIR||'test-results/public-submit';await mkdir(root,{recursive:true});
  if(count===5){
   for(let i=2;i<=count;i++){
    await page.locator('#demo-add').click();
    await page.locator('[name=demo_'+i+'_title]').fill('TEST Song '+i);
    await page.locator('[name=demo_'+i+'_artist]').fill('TEST Artist');
    await page.locator('[name=demo_'+i+'_language]').selectOption('Nepali');
    await page.locator('[name=demo_'+i+'_url]').fill('https://youtu.be/TEST_PUB00'+i);
   }
   await page.locator('[name=demo_2_url]').fill('https://youtu.be/TEST_PUB001');
   for(const [button,message] of [['EN','A video link is repeated'],['नेपाली','भिडियो लिंक दोहोरिएको छ'],['中文','Demo 影片連結重複了']]){
    await page.getByRole('button',{name:button,exact:true}).click();
    const rejected=page.waitForResponse(r=>r.url().endsWith('/api/e2e/applications')&&r.request().method()==='POST');
    await page.locator('#application-form [type=submit]').click();
    expect((await rejected).status()).toBe(422);
    await expect(page.locator('#member-status')).toContainText(message);
    await expect(page.locator('[name=stage_name]')).toHaveValue(name);
    expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n).toBe(0);
   }
   await page.screenshot({path:root+'/public-submit-help-mobile.png'});
   await page.locator('[name=demo_2_url]').fill('https://youtu.be/TEST_PUB002');
  }
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/e2e/applications')&&r.request().method()==='POST');
  await page.locator('#application-form [type=submit]').click();
  const response=await responsePromise;
  expect(response.status(),JSON.stringify(await response.json())+' payload '+response.request().postData()).toBe(201);
  await expect(page.locator('#entries')).toContainText(name);
  await expect(page.locator('#entries')).toContainText('等待主辦方核准');
  expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_applications').get().n).toBe(1);
  expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_demo_2027_videos').get().n).toBe(count);
  await page.reload();await expect(page.locator('#entries')).toContainText(name);
  await page.screenshot({path:root+'/public-submit-saved-'+width+'.png'});
 }finally{db.close()}
});
