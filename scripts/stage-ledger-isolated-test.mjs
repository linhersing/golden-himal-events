import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';
const [dependencies,evidence]=process.argv.slice(2);
if(!dependencies||!evidence)throw Error('Usage: node scripts/stage-ledger-isolated-test.mjs <tools> <evidence dir>');
const repo=process.cwd(),require=createRequire(join(repo,'package.json')),{chromium,expect}=require('@playwright/test');
const runtime=await isolatedStaffRuntime(repo,dependencies,join(repo,'tests/fixtures/stage-ui'),{stageRehearsal:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),endpoint='/api/stage-test',judges=['reviewer','reviewer-two','reviewer-three'];
const command=(role,body)=>runtime.fetchFor(role,endpoint,{request_id:crypto.randomUUID(),...body});
async function ok(role,body){const r=await command(role,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
const state=(role,stage)=>ok(role,{operation:'read',stage});
const counts=async()=>({applications:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_applications').first()).n,demos:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_demo_2027_videos').first()).n,oldScores:(await runtime.db.prepare('SELECT COUNT(*) n FROM e2e_live_scores').first()).n});
const evidenceData={testOnly:true,official:false,status:'RUNNING',runtime:'Edge + local Cloudflare workerd / disposable D1',limits:'No remote deployment; no public ballot lifecycle in this slice; no physical handsets.'};
const counter=async(stage)=>runtime.db.prepare('SELECT COUNT(*) n FROM stage_test_scores WHERE stage=?').bind(stage).first();
const liveValues=i=>({technique:40-i%10,interpretation:25,stage_presence:15,appearance:5});
async function configure(stage,extra){const s=await state('organizer',stage);return ok('organizer',{operation:'configure',stage,version:s.version,panel:s.panel,...extra})}
async function grade(stage){
 const s=await state('organizer',stage);
 for(let i=0;i<s.units.length;i++)for(let position=1;position<=s.units[i].positions;position++)for(const reviewer of judges){
  const own=await state(reviewer,stage);if(own.units.find(u=>u.id===s.units[i].id).scores.some(x=>x.position===position))continue;
  await ok(reviewer,{operation:'score',stage,unit_id:s.units[i].id,position,version:s.version,values:stage==='audition'?{technique:30+i%10+position,interpretation:35}:liveValues(i)});
 }
 return s;
}
async function freeze(stage){const s=await state('organizer',stage);assert.equal(s.preview.ready,true,JSON.stringify(s.preview.blockers));return ok('organizer',{operation:'freeze',stage,version:s.version})}
try{
 await mkdir(evidence,{recursive:true});const before=await counts();
 assert.equal((await command('guest',{operation:'read',stage:'audition'})).status,401);
 assert.equal((await command('member',{operation:'read',stage:'audition'})).status,403);
 assert.equal((await fetch(runtime.origin+endpoint,{method:'POST',headers:{Origin:'https://wrong.invalid'},body:'{}'})).status,403);
 let current=await state('organizer','audition');assert.equal(current.units.length,20);assert(current.preview.blockers.includes('quota_pending'));
 await configure('audition',{quotas:{A:10,B:10}});await grade('audition');await freeze('audition');
 assert.equal((await state('organizer','qualifier_one')).units.length,20);assert.equal((await counter('qualifier_one')).n,0);
 await configure('qualifier_one',{quotas:{A:10,B:10}});
 for(const [device,width]of[['desktop',1440],['mobile',390]]){
  const context=await runtime.injectContext(browser,'reviewer',{viewport:{width,height:900},locale:'zh-TW',...(device==='mobile'?{isMobile:true,hasTouch:true}:{})});
  try{
   const page=await context.newPage();await page.goto(runtime.origin+'/stage-test.html');await expect(page.locator('#workspace .row')).toHaveCount(6);
   await page.locator('#stages').getByRole('button',{name:'第一次初選',exact:true}).click();await expect(page.locator('#workspace .row')).toHaveCount(6);
   await page.screenshot({path:join(evidence,'stage-roster-'+device+'.png')});
   const index=device==='desktop'?0:1;await page.locator('#workspace .row').nth(index).click();
   const form=page.locator('#workspace form');await expect(form.locator('[name=technique]')).toBeVisible();
   for(const[key,value]of Object.entries(liveValues(index)))await form.locator('[name='+key+']').fill(String(value));await form.locator('[type=checkbox]').check();
   await page.screenshot({path:join(evidence,'stage-score-'+device+'.png')});
   if(device==='mobile'){
    let intercepted=false;await page.route('**/api/stage-test',async route=>{if(route.request().postDataJSON()?.operation!=='score'||intercepted){await route.continue();return}intercepted=true;const r=await route.fetch();assert.equal(r.status(),200);await route.abort('timedout')});
   }
   await form.getByRole('button',{name:'儲存本首評分',exact:true}).click();
   if(device==='mobile'){await expect(page.locator('#feedback')).toContainText('結果尚未確認');await page.locator('#workspace').getByRole('button',{name:'查核儲存紀錄',exact:true}).click();}
   await expect(page.locator('#workspace')).toContainText('已由資料庫確認儲存');
   await page.screenshot({path:join(evidence,'stage-saved-'+device+'.png')});
   await page.goBack();await expect(page.locator('#workspace .row')).toHaveCount(6);
   for(const w of[280,320,360,375,390,412,430,480,768,1440]){await page.setViewportSize({width:w,height:900});assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1)}
   await page.setViewportSize({width:320,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=1);
   await page.locator('[data-lang=en]').click();await expect(page.locator('#boundary')).toContainText('Fictional isolated rehearsal');await page.locator('[data-lang=ne]').click();await expect(page.locator('#boundary')).toContainText('काल्पनिक');
  }finally{await context.close()}
 }
 await grade('qualifier_one');await freeze('qualifier_one');
 await configure('qualifier_two',{quotas:{A:10,B:10},maxTeamSize:2});current=await state('organizer','qualifier_two');
 const groups=['A','B'].flatMap(region=>{const rows=current.units.filter(u=>u.region===region);return[[rows[0].members[0],rows[1].members[0]],...rows.slice(2).map(u=>u.members)]});
 await ok('organizer',{operation:'groups',stage:'qualifier_two',version:current.version,groups});assert.equal((await state('organizer','qualifier_two')).units.length,18);
 await grade('qualifier_two');const second=await freeze('qualifier_two');assert.equal(second.result.selected.length,20);
 current=await state('organizer','regional_pk');const pairs=['A','B'].flatMap(region=>{const rows=current.units.filter(u=>u.region===region);return Array.from({length:5},(_,i)=>({id:region+i,ids:[rows[2*i].id,rows[2*i+1].id]}))});
 await configure('regional_pk',{pairs});await grade('regional_pk');const pk=await freeze('regional_pk');assert.equal(pk.result.finalists.length,10);
 current=await state('organizer','final');const finalistIds=current.units.map(u=>u.members[0]);assert.equal(finalistIds.length,10);
 await ok('organizer',{operation:'training',stage:'final',version:current.version,application_id:finalistIds[0],opt_in:true});await ok('organizer',{operation:'training',stage:'final',version:current.version,application_id:finalistIds[0],opt_in:false});
 assert.deepEqual((await state('organizer','final')).units.map(u=>u.members[0]),finalistIds);
 const trainingContext=await runtime.injectContext(browser,'organizer',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-TW'});
 try{
  const page=await trainingContext.newPage();await page.goto(runtime.origin+'/stage-test.html');await page.locator('#stages').getByRole('button',{name:'季度總決賽',exact:true}).click();await page.getByRole('button',{name:'自願培訓',exact:true}).click();
  const person=page.getByRole('combobox',{name:'選手',exact:true}),choice=page.getByRole('combobox',{name:'自願培訓',exact:true}),save=page.getByRole('button',{name:'記錄培訓選擇',exact:true});
  await expect(choice).toHaveValue('false');await person.selectOption(finalistIds[1]);await expect(choice).toHaveValue('');await choice.selectOption('true');
  let mode='committed',attempts=[];await page.route('**/api/stage-test',async route=>{const body=route.request().postDataJSON();if(body?.operation!=='training'){await route.continue();return}attempts.push(body.request_id);if(mode==='committed'){mode='pass';const response=await route.fetch();assert.equal(response.status(),200);await route.abort('timedout')}else if(mode==='failed'){mode='pass';await route.abort('timedout')}else await route.continue()});
  await save.click();await expect(page.locator('#feedback')).toContainText('結果尚未確認');await expect(person).toHaveValue(finalistIds[1]);await page.getByRole('button',{name:'查核儲存紀錄',exact:true}).click();await expect(page.locator('#feedback')).toContainText('已由資料庫確認儲存');await expect(choice).toHaveValue('true');
  await person.selectOption(finalistIds[2]);await choice.selectOption('true');mode='failed';await save.click();await expect(page.locator('#feedback')).toContainText('結果尚未確認');await expect(person).toHaveValue(finalistIds[2]);
  await person.selectOption(finalistIds[0]);await expect(page.getByRole('button',{name:'查核儲存紀錄',exact:true})).toHaveCount(0);await person.selectOption(finalistIds[2]);await page.getByRole('button',{name:'查核儲存紀錄',exact:true}).click();await expect(page.locator('#feedback')).toContainText('可保留輸入重試');await expect(save).toBeEnabled();await save.click();await expect(page.locator('#feedback')).toContainText('已由資料庫確認儲存');assert.equal(attempts.at(-1),attempts.at(-2));
  await page.screenshot({path:join(evidence,'training-confirmed-mobile.png')});
  evidenceData.trainingRecovery={secondFinalistCommitTimeoutConfirmed:true,thirdFinalistFailedWriteRetried:true,sameRequestIdOnRetry:true,selectionRetained:true};
 }finally{await trainingContext.close()}

 await grade('final');const blocked=await command('organizer',{operation:'freeze',stage:'final',version:current.version});assert.equal(blocked.status,403);assert.equal(blocked.data.error,'final_vote_lifecycle_pending');
 assert.deepEqual(await counts(),before);
 evidenceData.database={before,after:await counts(),scores:Object.fromEntries(await Promise.all(['audition','qualifier_one','qualifier_two','regional_pk','final'].map(async stage=>[stage,(await counter(stage)).n]))),finalists:finalistIds.length,trainingOptOutPreservesEligibility:true,audit:(await runtime.db.prepare('SELECT COUNT(*) n FROM stage_test_audit').first()).n};
 // Restore only into another fresh disposable fixture. Stage snapshots are local
 // files, never public exports; summaries/hashes alone enter the shared evidence.
 const tables=['stage_test_scope','stage_test_rounds','stage_test_units','stage_test_members','stage_test_scores','stage_test_audit','stage_test_training'],snapshot={};
 for(const table of tables)snapshot[table]=(await runtime.db.prepare('SELECT * FROM '+table).all()).results;
 await writeFile(join(evidence,'stage-ledger-backup.json'),JSON.stringify(snapshot));
 const backup=await isolatedStaffRuntime(repo,dependencies,join(repo,'tests/fixtures/stage-ui'),{stageRehearsal:true,seedStage:false});
 try{
  // Restore only new empty tables. Insert rounds temporarily open so immutable
  // score guards can verify the imported scores; restore exact frozen state last.
  assert.equal((await backup.db.prepare('SELECT COUNT(*) n FROM stage_test_scores').first()).n,0);
  const loaded=JSON.parse(await readFile(join(evidence,'stage-ledger-backup.json'),'utf8'));
  for(const table of tables){
   assert.equal((await backup.db.prepare('SELECT COUNT(*) n FROM '+table).first()).n,0);
   for(const row of loaded[table]){
    const restored=table==='stage_test_rounds'?{...row,status:'open',result:null}:row,columns=Object.keys(restored);
    assert(columns.every(key=>/^[a-z_]+$/.test(key)));
    await backup.db.prepare('INSERT INTO '+table+' ('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').bind(...Object.values(restored)).run();
   }
  }
  for(const row of loaded.stage_test_rounds)await backup.db.prepare('UPDATE stage_test_rounds SET status=?,result=? WHERE code=?').bind(row.status,row.result,row.code).run();
  const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(Object.fromEntries(Object.keys(row).sort().map(k=>[k,row[k]])))).sort())).digest('hex');
  const digests={};for(const table of tables){const restored=(await backup.db.prepare('SELECT * FROM '+table).all()).results;assert.equal(hash(restored),hash(loaded[table]),table);digests[table]={rows:restored.length,sha256:hash(restored)}}
  const restoredFinal=await backup.fetchFor('organizer',endpoint,{operation:'read',stage:'final'});assert.equal(restoredFinal.status,200);assert.equal(restoredFinal.data.units.length,10);
  evidenceData.restore={status:'PASS',freshDisposableTarget:true,allTableDigestsMatch:true,tables:digests,finalistsReadBack:10};
 }finally{await backup.close()}
 evidenceData.roleIsolation=true;evidenceData.mobilePostCommitTimeout='exact stored values checked before success';evidenceData.status='PASS';
 await writeFile(join(evidence,'stage-ledger-evidence.json'),JSON.stringify(evidenceData,null,2));console.log(JSON.stringify(evidenceData,null,2));
}finally{await browser.close();await runtime.close()}
