import {test,expect} from '@playwright/test';

const counts=[1,3,5];
const viewportWidths=[280,320,360,375,390,412,430,480,768,1280];

function fictionalEntries(){
 return Array.from({length:20},(_,i)=>{
  const number=String(i+1).padStart(3,'0');
  return {
   id:'face0'+number+'-2222-4333-8444-555555555555',
   stage_name:i===15||i===16?'FICTIONAL ENTRANT — SAME NAME':'FICTIONAL ENTRANT '+number,
   category:'community',round_code:'2027-01',approval_state:i%2?'approved':'pending',
   song_language:'Nepali',province:'Bagmati',payment_status:'unpaid',demo_judges:0,live_judges:0,
   demo_entries:Array.from({length:counts[i%3]},(_,j)=>({
    position:j+1,song_title:'FICTIONAL SONG '+number+'-'+(j+1),
    original_artist:'FICTIONAL ARTIST '+number+'-'+(j+1),song_language:j%2?'Hindi':'Nepali',
    demo_url:'https://example.org/qa/'+number+'/'+(j+1)
   }))
  };
 });
}

async function serveOrganizer(page,{lookup}={}){
 const entries=fictionalEntries(),requests=[];
 await page.route('**/api/e2e/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.split('/').at(-1);
  if(path==='organizer-contact'){
   const request={id:url.searchParams.get('id'),section:url.searchParams.get('section')};
   requests.push(request);
   return route.fulfill(lookup?await lookup(request):{
    json:{ok:true,section:request.section,contact:{
     full_name:request.section==='identity'?'FICTIONAL LEGAL NAME '+request.id.slice(5,8):undefined,
     contact_email:request.section==='contact'?'fictional-'+request.id.slice(5,8)+'@example.invalid':undefined
    },testOnly:true}
   });
  }
  const json=path==='me'?
   {ok:true,account:{id:'organizer-qa',role:'organizer',available_roles:['organizer']}}
   :path==='organizer-queue'?{ok:true,applications:entries,registration_management_enabled:false,contact_storage_enabled:true}:{ok:true};
  return route.fulfill({status:200,json});
 });
 await page.goto('/backoffice.html');
 return {entries,requests};
}

test('20 applications with one, three, and five songs stay compact and retain filters, page and same-name position',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const {entries,requests}=await serveOrganizer(page);
 const list=page.locator('#admin-apps'),cards=list.locator('.organizer-record-row');
 const detail=page.locator('#organizer-entry-dialog'),search=page.locator('#organizer-search');
 await expect(cards).toHaveCount(12);
 await expect(cards.nth(0)).toContainText(/1\s*首/);
 await expect(cards.nth(1)).toContainText(/3\s*首/);
 await expect(cards.nth(2)).toContainText(/5\s*首/);
 await expect(list.locator('details')).toHaveCount(0);
 await expect(list).not.toContainText('FICTIONAL SONG');
 await expect(page.locator('#organizer-count')).toContainText(/20\s*(?:筆|\/)/);
 await search.fill('FICTIONAL ENTRANT');
 await page.locator('.organizer-filter-panel summary').click();
 await page.locator('#organizer-category').selectOption('single');
 await page.locator('#organizer-pagination button').last().click();
 await expect(cards).toHaveCount(8);
 const selected=cards.filter({hasText:'SAME NAME'}).nth(1).locator('button.organizer-record-open');
 await expect(selected).toHaveAttribute('data-application-id',entries[16].id);
 await selected.click();
 await expect(list).toBeHidden();
 await detail.getByRole('button',{name:/基本資料與照片/}).click();
 await expect(detail).toContainText(entries[16].id);
 await expect(detail).not.toContainText(entries[15].id);
 await detail.locator('#organizer-entry-close').click();
 await expect(detail).toBeHidden();
 await expect(search).toHaveValue('FICTIONAL ENTRANT');
 await expect(page.locator('#organizer-category')).toHaveValue('single');
 await expect(page.locator('#organizer-pagination')).toContainText('2 / 2');
 await expect(selected).toBeFocused();
 expect(requests).toHaveLength(0);
});

test('organizer replaces each layer, preserves browser Back and Forward, and requests one private section at a time',async({page})=>{
 const {entries,requests}=await serveOrganizer(page);
 const opener=page.locator('#admin-apps .organizer-record-open').nth(2);
 const detail=page.locator('#organizer-entry-dialog'),body=detail.locator('#organizer-entry-content');
 await opener.click();
 await expect(body.locator('.organizer-step-button')).toHaveCount(4);
 await body.getByRole('button',{name:/歌曲與影片/}).click();
 await expect(body.locator('.organizer-step-button')).toHaveCount(5);
 await body.getByRole('button',{name:/FICTIONAL SONG 003-5/}).click();
 await expect(body).toContainText('FICTIONAL SONG 003-5');
 await expect(body).not.toContainText('FICTIONAL SONG 003-1');
 await expect(body.locator('.organizer-record-watch')).toHaveAttribute('href','https://example.org/qa/003/5');
 await page.goBack();
 await expect(body.locator('.organizer-step-button')).toHaveCount(5);
 await page.goForward();
 await expect(body.locator('.organizer-record-watch')).toHaveAttribute('href','https://example.org/qa/003/5');
 await detail.locator('#organizer-entry-back').click();
 await detail.locator('#organizer-entry-back').click();
 await body.getByRole('button',{name:/受控(?:報名)?聯絡資料/}).click();
 expect(requests).toHaveLength(0);
 await body.getByRole('button',{name:/真實姓名/}).click();
 await expect(body).toContainText('FICTIONAL LEGAL NAME 003');
 await expect(body).not.toContainText('@example.invalid');
 expect(requests).toEqual([{id:entries[2].id,section:'identity'}]);
 await page.goBack();
 await expect(body).not.toContainText('FICTIONAL LEGAL NAME');
 await body.getByRole('button',{name:/聯絡方式/}).click();
 await expect(body).toContainText('fictional-003@example.invalid');
 await expect(body).not.toContainText('FICTIONAL LEGAL NAME');
 expect(requests).toEqual([{id:entries[2].id,section:'identity'},{id:entries[2].id,section:'contact'}]);
 await detail.locator('#organizer-entry-close').click();
 await expect(detail).toBeHidden();
 await expect(detail).not.toContainText('@example.invalid');
 await expect(opener).toBeFocused();
});

test('a delayed contact response cannot appear after navigating to another applicant',async({page})=>{
 let resolveLookup;
 const queued=new Promise(resolve=>{resolveLookup=resolve});
 const {requests}=await serveOrganizer(page,{lookup:()=>queued});
 const detail=page.locator('#organizer-entry-dialog'),body=detail.locator('#organizer-entry-content');
 const openers=page.locator('#admin-apps .organizer-record-open');
 await openers.first().click();
 await body.getByRole('button',{name:/受控(?:報名)?聯絡資料/}).click();
 await body.getByRole('button',{name:/真實姓名/}).click();
 await expect.poll(()=>requests.length).toBe(1);
 const responseDone=Promise.race([
  page.waitForEvent('requestfinished',{predicate:req=>req.url().includes('organizer-contact')}),
  page.waitForEvent('requestfailed',{predicate:req=>req.url().includes('organizer-contact')})
 ]);
 await detail.locator('#organizer-entry-close').click();
 await openers.nth(1).click();
 resolveLookup({json:{ok:true,section:'identity',contact:{full_name:'STALE FIRST APPLICANT'},testOnly:true}});
 await responseDone;
 await expect(detail).toContainText('FICTIONAL ENTRANT 002');
 await expect(detail).not.toContainText('STALE FIRST APPLICANT');
});

test('organizer workspace fits phone and desktop sizes, landscape and 200% text',async({page})=>{
 await serveOrganizer(page);
 const opener=page.locator('#admin-apps .organizer-record-open').nth(2);
 const detail=page.locator('#organizer-entry-dialog'),body=detail.locator('#organizer-entry-content');
 await opener.click();
 await body.getByRole('button',{name:/歌曲與影片/}).click();
 await body.getByRole('button',{name:/FICTIONAL SONG 003-5/}).click();
 const measure=()=>detail.evaluate(el=>({
  page:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  detail:el.scrollWidth-el.clientWidth,
  content:el.querySelector('#organizer-entry-content').scrollWidth-el.querySelector('#organizer-entry-content').clientWidth
 }));
 for(const width of viewportWidths){
  await page.setViewportSize({width,height:760});
  const result=await measure();
  for(const [area,overflow] of Object.entries(result))expect(overflow,area+' @ '+width).toBeLessThanOrEqual(1);
 }
 await page.setViewportSize({width:740,height:360});
 expect((await measure()).page).toBeLessThanOrEqual(1);
 await page.setViewportSize({width:320,height:760});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 expect((await measure()).page).toBeLessThanOrEqual(1);
 await page.evaluate(()=>document.documentElement.style.fontSize='');
 for(const [device,width,height] of [['desktop',1280,850],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.screenshot({path:'test-results/ghv-staff-workspaces/organizer-'+device+'.png',fullPage:true});
 }
});

test('switching to reviewer clears loaded organizer management and audit DOM',async({page})=>{
 let current='organizer';
 const row={id:'33333333-2222-4333-8444-555555555555',stage_name:'FICTIONAL PRIVATE MANAGEMENT',affiliation:'FICTIONAL SCHOOL',state:'active',protected:0};
 await page.route('**/api/e2e/**',route=>{
  const path=new URL(route.request().url()).pathname.split('/').at(-1);
  let data={ok:true};
  const account=()=>({id:'dual-fixture',role:current,available_roles:['organizer','reviewer']});
  if(path==='me')data={ok:true,account:account()};
  if(path==='switch-role'){current=route.request().postDataJSON().role;data={ok:true,account:account()};}
  if(path==='organizer-queue')data={ok:true,applications:[],registration_management_enabled:true};
  if(path==='organizer-registrations')data={ok:true,registrations:[row],next_offset:null};
  if(path==='organizer-registration-audit')data={ok:true,events:[{occurred_at:1700000000,action:'edit',result:'success',actor_id:'FICTIONAL AUDIT ACTOR',diff:{}}]};
  if(path==='reviewer-queue')data={ok:true,queue:[]};
  return route.fulfill({json:data});
 });
 await page.goto('/backoffice.html');
 await page.locator('#staff-management-open').click();
 await page.locator('#admin-registration-list').getByRole('button',{name:/FICTIONAL PRIVATE MANAGEMENT/}).click();
 await page.locator('#organizer-entry-content').getByText('操作紀錄',{exact:true}).click();
 await expect(page.locator('#organizer-entry-content')).toContainText('FICTIONAL AUDIT ACTOR');
 await page.locator('#organizer-entry-close').click();
 await page.locator('[data-role-tab=reviewer]').click();
 await expect(page.locator('#judge-dashboard')).toBeVisible();
 await expect(page.locator('#admin-registration-list')).toBeEmpty();
 await expect(page.locator('#organizer-entry-content')).toBeEmpty();
 await expect(page.locator('#organizer-correction-list')).toBeEmpty();
});


test('approved mobile hierarchy keeps exactly four top-level cards, never stacks hidden sections',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const {entries,requests}=await serveOrganizer(page);
 const roster=page.locator('#admin-apps');
 const workspace=page.locator('#organizer-entry-dialog');
 const content=page.locator('#organizer-entry-content');
 const search=page.locator('#organizer-search');
 const filter=page.locator('.organizer-filter-panel');
 await expect(roster.locator('.organizer-record-row')).toHaveCount(12);
 await expect(filter).not.toHaveAttribute('open');
 const opener=roster.locator('.organizer-record-open').nth(2);
 await opener.click();
 await expect(roster).toBeHidden();
 const overview=content.locator('.organizer-step-button');
 await expect(overview).toHaveCount(4);
 const labels=await overview.locator('strong').allTextContents();
 expect(labels).toEqual(['歌曲與影片','基本資料與照片','受控報名聯絡資料','報名審核與補件']);
 // Re-rendering and phone rotation must never append duplicate section cards.
 for(const width of [320,390,430,768]){
  await page.setViewportSize({width,height:780});
  await expect(overview).toHaveCount(4);
  const geometry=await workspace.evaluate(el=>({
   doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   card:el.scrollWidth-el.clientWidth,
   buttonMinHeight:Math.min(...[...el.querySelectorAll('.organizer-step-button')].map(b=>b.getBoundingClientRect().height))
  }));
  expect(geometry.doc,'no horizontal scrolling @'+width).toBeLessThanOrEqual(1);
  expect(geometry.card,'workspace fits @'+width).toBeLessThanOrEqual(1);
  expect(geometry.buttonMinHeight,'48px minimum touch targets @'+width).toBeGreaterThanOrEqual(48);
 }
 await page.setViewportSize({width:390,height:844});
 await overview.nth(0).click();
 await expect(content.locator('.organizer-step-button')).toHaveCount(5);
 await expect(content).not.toContainText('受控報名聯絡資料');
 await content.locator('.organizer-step-button').last().click();
 await expect(content.locator('.organizer-step-button')).toHaveCount(0);
 await expect(content).toContainText('FICTIONAL SONG 003-5');
 await expect(content).not.toContainText('FICTIONAL SONG 003-1');
 await workspace.locator('#organizer-entry-back').click();
 await expect(content.locator('.organizer-step-button')).toHaveCount(5);
 await workspace.locator('#organizer-entry-back').click();
 await expect(content.locator('.organizer-step-button')).toHaveCount(4);
 await content.getByRole('button',{name:/基本資料與照片/}).click();
 await expect(content.locator('.organizer-record-field')).toHaveCount(5);
 await expect(content).toContainText(entries[2].id);
 await expect(content.locator('.organizer-step-button')).toHaveCount(0);
 const fieldRects=await content.locator('.organizer-record-field').evaluateAll(nodes=>nodes.map(x=>x.getBoundingClientRect()));
 for(let i=1;i<fieldRects.length;i++)
  expect(fieldRects[i].top,'one field card per row').toBeGreaterThan(fieldRects[i-1].top);
 await workspace.locator('#organizer-entry-back').click();
 await content.getByRole('button',{name:/受控(?:報名)?聯絡資料/}).click();
 await expect(content.locator('.organizer-step-button')).toHaveCount(4);
 expect(requests,'private data must not load until a specific section opens').toHaveLength(0);
 await workspace.locator('#organizer-entry-back').click();
 await content.getByRole('button',{name:/報名審核與補件/}).click();
 await expect(content.locator('.organizer-record-fields')).toHaveCount(1);
 await expect(content.locator('.organizer-step-button')).toHaveCount(0);
 await workspace.locator('#organizer-entry-close').click();
 await expect(workspace).toBeHidden();
 await expect(roster).toBeVisible();
 await expect(opener).toBeFocused();
 await expect(search).toBeVisible();
 await expect(filter).not.toHaveAttribute('open');
 await expect(roster.locator('.organizer-record-row')).toHaveCount(12);
});
