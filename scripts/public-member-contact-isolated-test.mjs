import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';
import {MUSE_FIELDS} from '../backend/muse-audition.js';

const [tools,evidence]=process.argv.slice(2),repo=process.cwd();
if(!tools||!evidence)throw Error('Runtime tools and evidence path required');
const require=createRequire(join(repo,'package.json')),{chromium,expect}=require('@playwright/test');
const runtime=await isolatedStaffRuntime(repo,tools,undefined,{publicMember:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const contact={full_name:'TEST Public Legal Name',contact_phone:'+977 9800000000',contact_email:'public-contact@example.invalid',
 contact_handle:'TEST Messenger',city:'TEST City',street_address:'TEST Tol',educational_background:'TEST Graduate',
 short_description:'TEST Description',musical_training:'TEST Training'};
const checks={result:'PASS',runtime:'Microsoft Edge + isolated Cloudflare workerd + disposable D1',
 identity:'verified public member, not on invited-member list; seeded session (not an OTP acceptance test)',devices:[]};
const api=(role,path,body)=>runtime.fetchFor(role,'/api/e2e/'+path,body);
try{
 await mkdir(evidence,{recursive:true});
 assert.equal((await api('public-member','me')).data.muse_form_enabled,true);
 for(const [device,width]of[['small-mobile',320],['mobile',390],['desktop',1440]]){
  // Reuse the same public identity on each device, with a fresh synthetic entry.
  await runtime.db.prepare('DELETE FROM e2e_applications WHERE account_id=?').bind(runtime.publicMemberId).run();
  const context=await runtime.injectContext(browser,'public-member',{viewport:{width,height:device==='desktop'?960:844},locale:'zh-TW',isMobile:device!=='desktop',hasTouch:device!=='desktop'});
  const page=await context.newPage();
  await page.goto(runtime.origin+'/member.html#register');
  const form=page.locator('#application-form');
  await expect(form).toBeVisible();
  for(const key of MUSE_FIELDS){const input=form.locator('[name="'+key+'"]');await expect(input).toBeEnabled();await input.fill(contact[key]);await expect(input).toHaveValue(contact[key]);}
  await form.locator('[name=city]').scrollIntoViewIfNeeded();
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
  await page.screenshot({path:join(evidence,'public-member-contact-'+device+'.png')});
  for(const [key,value]of Object.entries({stage_name:'TEST Public Singer',affiliation:'TEST College',location_detail:'TEST District',song_title:'TEST Song 1',original_artist:'TEST Artist',demo_url:'https://youtu.be/TEST_012341'}))await form.locator('[name='+key+']').fill(value);
  await form.locator('[name=round_code]').selectOption('2027-01');
  await form.locator('[name=competition_region]').selectOption('A');
  await form.locator('[name=eligibility_basis]').selectOption('graduated');
  await form.locator('[name=province]').selectOption('lumbini');
  await form.locator('[name=location_basis]').selectOption('residence');
  await form.locator('[name=song_language]').selectOption('Nepali');
  await form.locator('[name=song_key]').selectOption('C major');
  for(let i=2;i<=5;i++){
   await page.locator('#demo-add').click();
   for(const [suffix,value]of Object.entries({title:'TEST Song '+i,artist:'TEST Artist',url:'https://youtu.be/TEST_01234'+i}))await form.locator('[name=demo_'+i+'_'+suffix+']').fill(value);
   await form.locator('[name=demo_'+i+'_language]').selectOption('Nepali');
  }
  for(const key of ['video_confirmed','no_exclusive_contract','nonreligious_song_ack'])await form.locator('[name='+key+']').check();
  assert.equal(await form.evaluate(el=>el.checkValidity()),true,'complete synthetic form must pass native validation');
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/e2e/applications'&&r.request().method()==='POST');
  await form.locator('button[type=submit]').click();
  const result=await response;assert.equal(result.status(),201,await result.text());
  const {application_id:id}=await result.json();
  await expect(page.locator('#entries')).toContainText('TEST Public Singer');
  await expect(page.locator('#entries')).toContainText(/等待主辦方核准|Awaiting organizer approval/);
  const persisted=await runtime.db.prepare('SELECT '+MUSE_FIELDS.join(',')+' FROM e2e_muse_audition_details WHERE application_id=?').bind(id).first();
  assert.deepEqual(persisted,contact);
  assert.equal((await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos WHERE application_id=?').bind(id).first()).n,5);
  const own=(await api('public-member','applications')).data.applications[0];for(const key of MUSE_FIELDS)assert.equal(own[key],contact[key]);
  assert.equal((await api('member','applications')).data.applications.some(row=>row.id===id),false);
  for(const role of ['member','reviewer'])assert.equal((await api(role,'organizer-contact?id='+id+'&section=contact')).status,403);
  const queue=(await api('organizer','organizer-queue')).data.applications;for(const key of MUSE_FIELDS)assert.equal(Object.hasOwn(queue.find(row=>row.id===id),key),false);
  assert.equal((await api('organizer','organizer-contact?id='+id+'&section=contact')).status,200);
  await page.screenshot({path:join(evidence,'public-member-saved-'+device+'.png')});
  checks.devices.push({device,width,fieldsEnabledAndTyped:9,submitted:201,demosReadBack:5,contactReadBack:'9 fields match fictional input',otherMemberAndReviewer:'denied',organizer:'audited on-demand only'});
  await context.close();
 }
 // Guest sessions remain unable to use or submit the private form.
 const guest=await runtime.injectContext(browser,'guest',{viewport:{width:390,height:844}}),page=await guest.newPage();
 await page.goto(runtime.origin+'/member.html#register');
 await expect(page.locator('#muse-test-fields')).toHaveAttribute('disabled','');
 assert.equal(await page.locator('#muse-test-fields [name=city]').evaluate(el=>el.matches(':disabled')),true);
 assert.equal((await api('guest','applications',contact)).status,401);
 await guest.close();
 checks.guest='fieldset stays disabled; API 401';
 await writeFile(join(evidence,'public-member-contact-evidence.json'),JSON.stringify(checks,null,2)+'\n');
 console.log(JSON.stringify(checks,null,2));
}finally{await browser.close();await runtime.close()}
