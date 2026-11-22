import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixtures,isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';
const [dependencies,evidence]=process.argv.slice(2),repo=process.cwd();
const require=createRequire(join(repo,'package.json')),{chromium,expect}=require('@playwright/test');
const runtime=await isolatedStaffRuntime(repo,dependencies,join(repo,'tests/fixtures/stage-ui'),{stageRehearsal:true,voteRehearsal:true,staffLogin:true,seedStage:false,frontlineHandoff:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const summary={testOnly:true,official:false,providers:'MOCK external mail and Turnstile; real workerd/D1/server-cookie protocol',physicalPhone:false};
const sqlSnapshot=async()=>JSON.stringify(await Promise.all(['e2e_applications','e2e_demo_2027_videos','e2e_live_scores','e2e_muse_audition_details'].map(async table=>[table,(await runtime.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results])));
try{
 await mkdir(evidence,{recursive:true});let before=await sqlSnapshot();const db=runtime.db;
 await db.prepare("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY')").run();
 const panel=(await db.prepare("SELECT id FROM e2e_accounts WHERE role='reviewer' ORDER BY id").all()).results.map(x=>x.id);
 await db.prepare("INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','locked',?,'{}')").bind(JSON.stringify(panel)).run();
 const routeProbe=await fetch(runtime.origin+'/api/frontline-handoff-test');
 assert.equal(routeProbe.status,401,'manual handoff endpoint must exist and require login');
 assert.equal(routeProbe.headers.get('cache-control'),'no-store');
 assert.equal((await fetch(runtime.origin+'/api/frontline-handoff-test',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
 for(const [role,status]of[['guest',401],['member',403],['reviewer',403]])assert.equal((await runtime.fetchFor(role,'/api/frontline-handoff-test')).status,status);
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(runtime.origin+'/'))return route.continue({headers:{...route.request().headers(),'CF-Connecting-IP':'198.51.100.35'}});if(url.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js'))return route.fulfill({contentType:'application/javascript',body:"window.turnstile={render(e,o){o.callback('fictional-staff-proof');return 'mock'},reset(){},remove(){}};window.staffWidgetReady?.();"});return route.abort()});
 assert.equal((await context.cookies()).length,0);await page.goto(runtime.origin+'/staff-login.html');
 await page.locator('#staff-email').fill('organizer@example.invalid');await page.locator('#staff-send').click();await expect(page.locator('#staff-code-form')).toBeVisible();
 await page.locator('#staff-code').fill(runtime.mailbox.at(-1).text.match(/code is (\d{6})/)[1]);await page.locator('#staff-verify').click();await expect(page.locator('#staff-session')).toBeVisible();
 await page.locator('#staff-handoff-link').click();await expect(page.locator('#handoff-candidates input[type=checkbox]')).toHaveCount(10);
 await page.screenshot({path:join(evidence,'organizer-roster-mobile.png')});
 await page.locator('#handoff-source').fill('TEST-frontline-paper-20261122');
 for(const box of await page.locator('#handoff-candidates input[type=checkbox]').all())await box.check();
 for(const width of [280,320,360,375,390,412,430,480,768,1440]){await page.setViewportSize({width,height:900});assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,`overflow ${width}`)}
 for(const language of ['en','ne','zh']){await page.locator('#handoff-language').selectOption(language);await expect(page.locator('#handoff-title')).not.toBeEmpty();assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1)}
 await page.setViewportSize({width:1440,height:900});await page.locator('#handoff-preview').click();await expect(page.locator('#handoff-confirm')).toBeVisible();await expect(page.locator('#handoff-confirm')).toBeDisabled();
 await page.screenshot({path:join(evidence,'organizer-preview-desktop.png')});await page.locator('#handoff-ack').check();
 // Definitive stale-preview rejection must restore editing, not trap the user.
 await db.prepare('UPDATE e2e_applications SET updated_at=updated_at+1 WHERE id=?').bind(fixtures[0].id).run();
 await page.locator('#handoff-confirm').click();await expect(page.locator('#handoff-picker')).toBeVisible();await expect(page.locator('#handoff-preview')).toBeEnabled();
 await db.prepare('UPDATE e2e_applications SET updated_at=updated_at-1 WHERE id=?').bind(fixtures[0].id).run();
 before=await sqlSnapshot(); // The two deliberate test updates advance the monotonic timestamp trigger.
 await page.locator('#handoff-preview').click();await expect(page.locator('#handoff-review')).toBeVisible();await expect(page.locator('#handoff-selected p')).toHaveCount(10);await expect(page.locator('#handoff-summary')).toContainText('TEST-frontline-paper-20261122');await expect(page.locator('#handoff-ack')).toBeEnabled();await page.locator('#handoff-ack').check();await expect(page.locator('#handoff-confirm')).toBeEnabled();
 // First fail before commit, then retry the same request and lose its committed response.
 let attempts=0,originalRequest;await page.route('**/api/frontline-handoff-test',async route=>{const body=route.request().postDataJSON();if(body?.operation==='confirm'){attempts++;if(attempts===1){originalRequest=body;return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"prewrite_failure"}'})}assert.deepEqual(body,originalRequest);const committed=await route.fetch();assert.equal(committed.status(),200);return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"lost_response"}'})}return route.continue()});
 await page.locator('#handoff-confirm').click();await expect(page.locator('#handoff-check')).toBeVisible();await expect(page.locator('#handoff-confirm')).toBeDisabled();await expect(page.locator('#handoff-status')).not.toContainText('已由資料庫確認');
 await page.locator('#handoff-check').click();await expect(page.locator('#handoff-retry')).toBeVisible();assert.equal((await db.prepare('SELECT COUNT(*) n FROM frontline_test_handoffs').first()).n,0);await page.locator('#handoff-retry').click();await expect(page.locator('#handoff-check')).toBeEnabled();
 await page.locator('#handoff-check').click();await expect(page.locator('#handoff-receipt')).toBeVisible();await expect(page.locator('#handoff-status')).toContainText('已由資料庫確認');
 await page.reload();await expect(page.locator('#handoff-receipt')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(evidence,'organizer-confirmed-mobile.png')});
 const handoff=(await db.prepare('SELECT * FROM frontline_test_handoffs').first());assert(handoff);assert.equal((await db.prepare("SELECT COUNT(*) n FROM stage_test_members WHERE stage='final'").first()).n,10);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stage_test_scores').first()).n,0);assert.equal(await sqlSnapshot(),before);
 const reviewer=await runtime.fetchFor('reviewer','/api/stage-test',{operation:'read',stage:'final'});assert.equal(reviewer.status,200);assert.equal(reviewer.data.units.length,10);assert.doesNotMatch(JSON.stringify(reviewer.data),/source_reference|contact_email|full_name/);
 const target=reviewer.data.units[2],score=await runtime.fetchFor('reviewer','/api/stage-test',{operation:'score',stage:'final',version:1,request_id:'TEST-new-final-score',unit_id:target.id,position:1,values:{technique:37,interpretation:28,stage_presence:17,appearance:8}});
 assert.equal(score.status,200);assert.equal(score.data.score.technique,37);
 const readback=await runtime.fetchFor('reviewer','/api/stage-test',{operation:'read',stage:'final'});assert.equal(readback.data.units.find(x=>x.id===target.id).scores[0].technique,37);
 assert.equal((await runtime.fetchFor('organizer','/api/vote-test',{operation:'initialize'})).status,200);
 const votes=await runtime.fetchFor('organizer','/api/vote-test');assert.equal(votes.data.candidates.length,10);assert.equal(votes.data.state,'draft');assert.equal((await runtime.fetchFor('guest','/api/vote-test')).data.candidates.length,0);
 assert.equal(await sqlSnapshot(),before);summary.status='PASS';summary.applicationCount=20;summary.demoCount=(await db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').first()).n;summary.finalMembers=10;summary.finalScores=1;summary.earlierOnlineScoresRequired=false;summary.ballotState='draft';summary.prewriteFailureRecovered=true;summary.lostResponseRecovered=true;summary.originalDataUnchanged=true;summary.deliberateFixtureTimestampUpdates=2;
 const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'stage_test_%' OR name LIKE 'vote_test_%' OR name='frontline_test_handoffs') ORDER BY name").all()).results.map(x=>x.name);
 const backup={};for(const name of names){assert(/^(stage_test_|vote_test_|frontline_test_handoffs$)[a-z_]*$/.test(name));backup[name]=(await db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()).results;}
 await writeFile(join(evidence,'fictional-handoff-backup.json'),JSON.stringify(backup,null,2));
 const restored=await isolatedStaffRuntime(repo,dependencies,join(repo,'tests/fixtures/stage-ui'),{stageRehearsal:true,voteRehearsal:true,staffLogin:true,seedStage:false,frontlineHandoff:true});
 try{
  const restoreOrder=['stage_test_scope','stage_test_rounds','stage_test_units','stage_test_members','stage_test_audit','stage_test_scores','stage_test_training','frontline_test_handoffs',...names.filter(n=>n.startsWith('vote_test_'))];
  for(const name of restoreOrder){assert.equal((await restored.db.prepare('SELECT COUNT(*) n FROM '+name).first()).n,0,'restore target must be empty');for(const row of backup[name]){const columns=Object.keys(row);assert(columns.every(x=>/^[a-z_]+$/.test(x)));await restored.db.prepare(`INSERT INTO ${name}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()}}
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');summary.restoreHashes={};
  for(const name of names){const actual=(await restored.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()).results;assert.equal(digest(actual),digest(backup[name]));summary.restoreHashes[name]=digest(actual)}
  const stored=await restored.fetchFor('organizer','/api/frontline-handoff-test',{operation:'current'});assert.equal(stored.data.receipt.member_count,10);summary.restoredTables=names.length;
 }finally{await restored.close()}
 for(const [width,height,scale] of [[280,700,2],[844,390,1],[1440,900,1]]){await page.setViewportSize({width,height});await page.evaluate(value=>document.documentElement.style.fontSize=value+'%',scale*100);assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1)}
 await writeFile(join(evidence,'frontline-handoff-evidence.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));await context.close();
}finally{await browser.close();await runtime.close()}
