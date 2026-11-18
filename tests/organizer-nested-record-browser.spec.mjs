import {test,expect} from '@playwright/test';

function demoEntrants(count=20){
 return Array.from({length:count},(_,i)=>({
  id:'FAKE-APP-'+String(i+1).padStart(3,'0'),
  stage_name:'FICTIONAL ENTRANT '+String(i+1),
  category:'community',round_code:'2027-01',approval_state:'pending',
  song_language:'Nepali',province:'Bagmati',payment_status:'unpaid',
  demo_judges:0,live_judges:0,
  // Privacy canary: these fields must never appear in the organizer UI.
  contact_phone:'DO-NOT-DISPLAY-PRIVATE-PHONE',
  contact_email:'PRIVATE-NOT-FOR-UI@example.invalid',
  full_name:'PRIVATE LEGAL NAME DO NOT SHOW',
  demo_entries:Array.from({length:5},(_,j)=>({
   position:j+1,song_title:'FICTIONAL SONG '+(j+1),
   original_artist:'FAKE ARTIST '+(j+1),song_language:j===4?'Hindi':'Nepali',
   demo_url:'https://example.org/qa-song-'+(j+1)
  }))
 }));
}
async function serveOrganizer(page){
 const entries=demoEntrants();
 await page.route('**/api/e2e/**',route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  const json=path==='me'?
   {ok:true,account:{id:'organizer-qa',role:'organizer',available_roles:['organizer']}}
   :path==='organizer-queue'?{ok:true,applications:entries,registration_management_enabled:false}:{ok:true};
  return route.fulfill({status:200,json});
 });
 await page.goto('/backoffice.html');
 return entries;
}
test('twenty applicants with five songs each render as one compact card per ID',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await serveOrganizer(page);
 const list=page.locator('#admin-apps'),cards=list.locator('.organizer-record-row');
 await expect(cards).toHaveCount(12);
 await expect(list.locator('details')).toHaveCount(0);
 await expect(cards.first()).toContainText('5 首作品');
 await expect(list).not.toContainText('FICTIONAL SONG 5');
 await expect(page.locator('#organizer-count')).toContainText('20 筆');
 const height=await list.evaluate(el=>el.getBoundingClientRect().height);
 expect(height).toBeLessThan(1600); // 12 concise records, not 60 expanded song blocks
 await page.locator('#organizer-pagination button').last().click();
 await expect(cards).toHaveCount(8);
});

test('one entrant has separate screens for songs, profile, protected contact, and review',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await serveOrganizer(page);
 const opener=page.locator('#admin-apps .organizer-record-open').first();
 await opener.click();
 const dialog=page.locator('#organizer-entry-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('.organizer-step-button')).toHaveCount(4);
 // The sensitive profile canary is not in DOM even while the record is open.
 for(const secret of ['DO-NOT-DISPLAY-PRIVATE-PHONE','PRIVATE-NOT-FOR-UI@example.invalid','PRIVATE LEGAL NAME DO NOT SHOW'])
  await expect(dialog).not.toContainText(secret);
 await dialog.getByRole('button',{name:/歌曲與影片/}).click();
 await expect(dialog.locator('.organizer-step-button')).toHaveCount(5);
 await dialog.getByRole('button',{name:/FICTIONAL SONG 5/}).click();
 await expect(dialog).toContainText('FICTIONAL SONG 5');
 await expect(dialog.locator('.organizer-record-watch')).toHaveAttribute('href','https://example.org/qa-song-5');
 await dialog.locator('#organizer-entry-back').click();
 await dialog.locator('#organizer-entry-back').click();
 await dialog.getByRole('button',{name:/基本資料與照片/}).click();
 await expect(dialog).toContainText('Bagmati');
 await expect(dialog).not.toContainText('PRIVATE LEGAL NAME DO NOT SHOW');
 await dialog.locator('#organizer-entry-back').click();
 await dialog.getByRole('button',{name:/受控報名聯絡資料/}).click();
 await expect(dialog).toContainText('主辦名冊 API 不提供完整私人聯絡資料');
 await expect(dialog).not.toContainText('DO-NOT-DISPLAY-PRIVATE-PHONE');
 await dialog.locator('#organizer-entry-back').click();
 await dialog.getByRole('button',{name:/報名審核與補件/}).click();
 await expect(dialog.getByRole('button',{name:'核准測試報名'})).toBeVisible();
 await dialog.locator('#organizer-entry-close').click();
 await expect(dialog).toBeHidden();
 await expect(opener).toBeFocused();
});

test('modal stays in viewport and does not extend organizer page across phone widths',async({page})=>{
 await serveOrganizer(page);
 const opener=page.locator('#admin-apps .organizer-record-open').first();
 for(const width of [280,320,360,390,430,768,1024]){
  await page.setViewportSize({width,height:700});
  await opener.click();
  const dialog=page.locator('#organizer-entry-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:/歌曲與影片/}).click();
  const geometry=await dialog.evaluate(el=>({
   top:el.getBoundingClientRect().top,
   bottom:el.getBoundingClientRect().bottom,
   width:el.getBoundingClientRect().width,
   viewport:document.documentElement.clientWidth,
   scrollOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   contentOverflow:el.querySelector('.organizer-dialog-content').scrollWidth-el.querySelector('.organizer-dialog-content').clientWidth
  }));
  expect(geometry.width).toBeLessThanOrEqual(width+1);
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.bottom).toBeLessThanOrEqual(701);
  expect(geometry.scrollOverflow).toBeLessThanOrEqual(1);
  expect(geometry.contentOverflow).toBeLessThanOrEqual(1);
  await dialog.locator('#organizer-entry-close').click();
  await expect(dialog).toBeHidden();
 }
});

test('native keyboard Escape dismisses record and returns focus to the same entrant',async({page})=>{
 await serveOrganizer(page);
 const opener=page.locator('#admin-apps .organizer-record-open').first();
 await opener.click();
 await page.keyboard.press('Escape');
 await expect(page.locator('#organizer-entry-dialog')).toBeHidden();
 await expect(opener).toBeFocused();
});
