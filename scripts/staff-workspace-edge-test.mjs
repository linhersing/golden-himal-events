import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixtures,isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';
import {checkRecycle} from '../tests/fixtures/registration-recycle-browser.mjs';

const [dependencies,evidence,assets]=process.argv.slice(2);
const repo=process.cwd();
if(!dependencies||!evidence)throw Error('Usage: node scripts/staff-workspace-edge-test.mjs <runtime tools root> <evidence directory> [assets directory]');
const require=createRequire(join(repo,'package.json'));
const {chromium,expect}=require('@playwright/test');
const runtime=await isolatedStaffRuntime(repo,dependencies,assets,{judgingMode:'all_stages_test'});
const browser=await chromium.launch({channel:'msedge',headless:true});
const desktop={viewport:{width:1440,height:960},locale:'zh-TW'};
const mobile={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'zh-TW'};
const sample=fixtures[2];
const url=runtime.origin+'/backoffice.html';
const checks={result:'PASS',runtime:'Edge and Cloudflare workerd with disposable local D1',viewport:{desktop:desktop.viewport,mobile:mobile.viewport}};
const out=(role,screen,device)=>join(evidence,role+'-'+screen+'-'+device+'-edge.png');
const assertState=(page,state)=>expect.poll(async()=>page.evaluate(()=>history.state?.ghvStaff?.view??null)).toBe(state);
const ensureViewport=async page=>assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
async function take(page,role,screen,device){await ensureViewport(page);await page.screenshot({path:out(role,screen,device)});}

try {
 await mkdir(evidence,{recursive:true});
 for(const [device,options] of [['desktop',desktop],['mobile',mobile]]){
  const context=await runtime.injectContext(browser,'organizer',options);
  const page=await context.newPage();
  await page.goto(url);
  const root=page.locator('#admin-apps'),detail=page.locator('#organizer-entry-dialog');
  await expect(root.locator('.organizer-record-row')).toHaveCount(12);
  await expect(root).not.toContainText('TEST Song');
  await take(page,'organizer','roster',device);
  const row=root.getByRole('button',{name:/TEST Singer 03/});
  await row.click();
  await expect(root).toBeHidden();
  await expect(detail.locator('.organizer-step-button')).toHaveCount(4);
  await take(page,'organizer','contestant',device);
  await detail.getByRole('button',{name:/歌曲與影片/}).click();
  await expect(detail.locator('.organizer-step-button')).toHaveCount(5);
  await detail.getByRole('button',{name:/TEST Song 3 . 5/}).click();
  await expect(detail).toContainText('TEST Song 3 / 5');
  await expect(detail).not.toContainText('TEST Song 3 / 4');
  await expect(detail.locator('a.organizer-record-watch')).toHaveAttribute('href','https://youtu.be/0000003TES5');
  await take(page,'organizer','song',device);
  await page.goBack();
  await expect(detail.locator('.organizer-step-button')).toHaveCount(5);
  await detail.locator('#organizer-entry-back').click();
  await detail.getByRole('button',{name:/受控(?:報名)?聯絡資料/}).click();
  await expect(detail).not.toContainText('@example.invalid');
  await detail.getByRole('button',{name:/真實姓名/}).click();
  await expect(detail).toContainText('TEST Legal Name 3');
  await expect(detail).not.toContainText('@example.invalid');
  await detail.locator('#organizer-entry-close').click();
  await expect(detail).toBeHidden();
  await expect(detail).not.toContainText('TEST Legal Name 3');
  await expect(row).toBeFocused();
  await context.close();
 }
 checks.organizerRoutes={rows:20,pages:2,details:'one contestant and one song',scope:'identity-only; removed from DOM on close',history:true};
 for(const [device,options] of [['desktop',desktop],['mobile',mobile]]){
  const context=await runtime.injectContext(browser,'reviewer',options);
  const page=await context.newPage();
  await page.goto(url);
  page.on('console',m=>console.log(m.text())); page.on('response',async r=>{const u=new URL(r.url()); if(u.pathname.includes('reviewer-queue')||u.pathname.includes('video-score')){const d=await r.json(); console.log(JSON.stringify({network:u.pathname,status:r.status(),score:d.score,position:d.position,error:d.error,received:d.queue?.find(row=>row.id===sample.id)?.demo_entries?.map(x=>x.my_score)}));}});
  const rows=page.locator('#judge-list'),frame=page.locator('#judge-detail'),songs=page.locator('#judge-queue');
  await expect(rows.getByRole('button').first()).toBeVisible();
  await take(page,'reviewer','roster',device);
  await page.locator('#judge-search').fill(sample.stageName);
  await rows.getByRole('button',{name:/TEST Singer 03/}).click();
  await expect(songs.locator('[data-song-position]')).toHaveCount(5);
  const position=device==='desktop'?2:3;
  await songs.locator('[data-song-position="'+position+'"]').click();
  const form=songs.locator('form');
  await expect(form).toHaveCount(1);
  await expect(songs).toContainText('TEST Song 3 / '+position);
  await expect(songs).not.toContainText('TEST Song 3 / 1');
  await expect(form.locator('[name=technique]')).toHaveAttribute('inputmode','numeric');
  await expect(form.locator('[name=technique]')).toHaveAttribute('max','60');
  await expect(form.locator('[name=interpretation]')).toHaveAttribute('max','40');
  await form.locator('[name=technique]').fill('56');await form.locator('[name=interpretation]').fill('38');await form.locator('[type=checkbox]').check();
  await take(page,'reviewer','score',device);
  const submit=form.locator('[type=submit]');
  if(device==='mobile'){
   let resolveRequest,releaseRequest,posts=0;
   const request=new Promise(resolve=>{resolveRequest=resolve}),release=new Promise(resolve=>{releaseRequest=resolve});
   const interception='**/api/e2e/january-video-score';
   const skip=async route=>{
    posts++;
    resolveRequest();
    await release;
    await route.abort('internetdisconnected');
   };
   await page.route(interception,skip,{times:1});
   try{
    await submit.click();
    await request;
    await expect(submit).toBeDisabled();
    await expect(frame).toContainText(/儲存中|正在儲存/);
   }finally{releaseRequest();}
   await expect(submit).toBeDisabled();
   await songs.locator('#judge-save-check').click();
   await expect(submit).toBeEnabled();
   await expect(form.locator('[name=technique]')).toHaveValue('56');
   assert.equal(posts,1);
   const unavailable=await runtime.db.prepare('SELECT COUNT(*) AS n FROM e2e_demo_2027_scores WHERE application_id=? AND position=?').bind(sample.id,position).first();
   assert.equal(unavailable.n,0);
   await page.route(interception,async route=>{
    posts++;
    const response=await route.fetch();
    assert.equal(response.status(),201);
    await route.abort('timedout');
   },{times:1});
   await submit.click();
   await expect(songs.locator('#judge-save-check')).toBeVisible();
   await songs.locator('#judge-save-check').click();
   await expect(songs).toContainText(/94\s*分/);
   assert.equal(posts,2);
   checks.network={preCommitFailure:'input retained and zero D1 rows',postCommitTimeout:'D1 readback confirmed actual score',onePostPerClick:true};
  }else{
   await submit.click();
   await expect(songs).toContainText(/94\s*分/);
  }
  await expect(songs.locator('form')).toHaveCount(0);
  await take(page,'reviewer','saved',device);
  const dbRow=await runtime.db.prepare('SELECT technique,interpretation FROM e2e_demo_2027_scores WHERE application_id=? AND position=? AND reviewer_id=?').bind(sample.id,position,runtime.reviewer).first();
  assert.deepEqual(dbRow,{technique:56,interpretation:38});
  await page.goBack();
  await expect(songs.locator('[data-song-position]')).toHaveCount(5);
  await page.locator('#judge-back-list').click();
  await expect(rows).toBeVisible();
  await expect(page.locator('#judge-search')).toHaveValue(sample.stageName);
  await context.close();
 }
 checks.reviewerRoutes={oneWorkDisplayed:true,scoresPersisted:[2,3],wrongSongExcluded:true,backRetainsSearch:true};
 const audit=(await runtime.db.prepare("SELECT COUNT(*) AS n FROM e2e_staff_audit WHERE json_extract(diff,'$.access')='organizer_contact' AND target_id=? AND result='success'").bind(sample.id).first()).n;
 assert.equal(audit,2);
 checks.organizerRoutes.auditCount=audit;
 checks.registrationRecycle=await checkRecycle(runtime,browser,evidence,expect);
 const json=JSON.stringify(checks,null,2)+'\n';
 await writeFile(join(evidence,'staff-edge-workerd-evidence.json'),json);
 console.log(json);
} finally {
 await browser.close();
 await runtime.close();
}

// Existing CI entrypoint also verifies the independent stage rehearsal; it never
// binds the brand database or copies the rehearsal assets into dist.
const stages=spawnSync(process.execPath,['scripts/stage-ledger-isolated-test.mjs',dependencies,join(evidence,'stage-ledger')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(stages.stdout||'');process.stderr.write(stages.stderr||'');
assert.equal(stages.status,0,stages.error?.message||'Isolated stage rehearsal failed');

const votes=spawnSync(process.execPath,['scripts/final-vote-isolated-test.mjs',dependencies,join(evidence,'final-vote')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(votes.stdout||'');process.stderr.write(votes.stderr||'');
assert.equal(votes.status,0,votes.error?.message||'Isolated final-vote rehearsal failed');

const finalOnly=spawnSync(process.execPath,['scripts/final-only-judging-isolated-test.mjs',dependencies,join(evidence,'final-only')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(finalOnly.stdout||'');process.stderr.write(finalOnly.stderr||'');
assert.equal(finalOnly.status,0,finalOnly.error?.message||'Current final-only judging policy failed');

const supplement=spawnSync(process.execPath,['scripts/five-demo-supplement-isolated-test.mjs',dependencies,join(evidence,'five-demo-supplement')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(supplement.stdout||'');process.stderr.write(supplement.stderr||'');
assert.equal(supplement.status,0,supplement.error?.message||'Five-demo supplement D1 consistency failed');

const publicContact=spawnSync(process.execPath,['scripts/public-member-contact-isolated-test.mjs',dependencies,join(evidence,'public-member-contact')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(publicContact.stdout||'');process.stderr.write(publicContact.stderr||'');
assert.equal(publicContact.status,0,publicContact.error?.message||'Public member private contact regression failed');

const additional=spawnSync(process.execPath,['scripts/remaining-browser-regressions.mjs'],{cwd:repo,encoding:'utf8',timeout:330000});
process.stdout.write(additional.stdout||'');process.stderr.write(additional.stderr||'');
assert.equal(additional.status,0,additional.error?.message||'Additional browser regression suite failed');

const staffLogin=spawnSync(process.execPath,['scripts/stage-staff-login-isolated-test.mjs',dependencies,join(evidence,'stage-staff-login')],{cwd:repo,encoding:'utf8',timeout:120000});
process.stdout.write(staffLogin.stdout||'');process.stderr.write(staffLogin.stderr||'');
assert.equal(staffLogin.status,0,staffLogin.error?.message||'Isolated staff OTP login failed');

const handoff=spawnSync(process.execPath,['scripts/frontline-handoff-isolated-test.mjs',dependencies,join(evidence,'frontline-handoff')],{cwd:repo,encoding:'utf8',timeout:180000});
process.stdout.write(handoff.stdout||'');process.stderr.write(handoff.stderr||'');
assert.equal(handoff.status,0,handoff.error?.message||'Frontline manual final handoff failed');
