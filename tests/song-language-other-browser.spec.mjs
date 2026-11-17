import {test,expect} from '@playwright/test';

async function stubMember(page,entry=null){
 let current=entry,writes=[];
 await page.route('**/api/e2e/**',async route=>{
  const key=new URL(route.request().url()).pathname.split('/').pop();
  let payload={ok:true};
  if(key==='me')payload={ok:true,account:{id:'SYNTH-ACCOUNT',role:'member',available_roles:['member']},
   five_demo_enabled:false,profile_enabled:false,muse_form_enabled:false,frontline_form_enabled:false,
   nepal_locations_enabled:false,eligibility_upload_enabled:false};
  else if(key==='applications'&&route.request().method()==='GET')
   payload={ok:true,applications:current?[current]:[],next_audition_round:null};
  else if(key==='update-application'&&route.request().method()==='POST'){
   const data=route.request().postDataJSON();writes.push(data);
   current={...current,...data};payload={ok:true,application_id:current.id,testOnly:true};
  }
  await route.fulfill({status:200,json:payload});
 });
 return {get writes(){return writes}};
}

test('mobile form covers Nepal regional languages and permits an actual Other language name in Demo 1 and 2',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await stubMember(page);
 await page.goto('/member.html#login');
 await expect(page.locator('#member-panel')).toBeVisible();
 const first=page.locator('#song-language');
 await expect(first.locator('option[value="Tharu"]')).toHaveCount(1);
 await expect(first.locator('option[value="Nepal Bhasa"]')).toHaveCount(1);
 await expect(first.locator('option[value="Awadhi"]')).toHaveCount(1);
 await first.selectOption('Other');
 const firstCustom=page.locator('#application-form .song-language-other').first();
 await expect(firstCustom).toBeVisible();
 await expect(firstCustom).toHaveJSProperty('required',true);
 await firstCustom.fill('Korean');
 await first.selectOption('Tamang');
 await expect(firstCustom).toBeHidden();
 await expect(firstCustom).toHaveJSProperty('required',false);
 await page.locator('#demo-add').click();
 const demo2=page.locator('[data-demo-slot="2"]');
 await expect(demo2).toBeVisible();
 await demo2.locator('select[name="demo_2_language"]').selectOption('Other');
 const secondCustom=demo2.locator('.song-language-other');
 await expect(secondCustom).toBeVisible();
 await secondCustom.fill('French');
 await expect(secondCustom).toHaveValue('French');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('member edit restores a stored custom language and sends the real name instead of Other',async({page})=>{
 const entry={
  id:'SYNTH-LANG-1',stage_name:'Synthetic Singer',song_title:'Test track',
  original_artist:'Test original',song_language:'Korean',song_key:'C major',
  affiliation:'Test campus',category:'community',round_code:'2027-01',
  province:'bagmati',location_basis:'residence',demo_url:'https://youtu.be/testlink',
  phase:'demo',status:'under_review',payment_status:'unpaid',can_edit:1
 };
 const mock=await stubMember(page,entry);
 await page.goto('/member.html#login');
 await expect(page.locator('#member-manage-edit')).toBeEnabled();
 await page.locator('#member-manage-edit').click();
 const edit=page.locator('#member-edit-panel');
 await expect(edit.locator('select[name="song_language"]')).toHaveValue('Other');
 await expect(edit.locator('.song-language-other')).toHaveValue('Korean');
 await edit.locator('.song-language-other').fill('French');
 await edit.locator('button[type="submit"]').click();
 await expect.poll(()=>mock.writes.length).toBe(1);
 expect(mock.writes[0].song_language).toBe('French');
 await expect(page.locator('#member-welcome-name')).toHaveText('Synthetic Singer');
 await expect(page.locator('#entries')).toContainText('French');
});
