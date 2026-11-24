import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = name => readFileSync(new URL('../public/'+name, import.meta.url),'utf8');
const keys=['accountToolsKicker','accountToolsTitle','accountToolsHelp','accountToolsEdit','accountToolsCorrection','accountToolsDelete','accountToolsEmpty','accountToolsEditable','accountToolsLocked','correctionAction','correctionTitle','correctionHelp','correctionUnavailable','correctionPending','correctionName','correctionAffiliation','correctionReason','correctionSubmit','correctionSuccess','accountDeleteLogin','accountDeleteConfirm','accountDeletePrompt','accountDeleteCancelled','accountDeleteSuccess','demoNumber','januaryTestNotice','cancel','signedIn','signedOut','otpRequested','nepalTime'];
test('member management labels, warnings, dynamic parameters and login feedback switch in all three languages',()=>{
 const sample='$& <img onerror=alert(1)>', elements=keys.map(l=>({dataset:{l,...(['correctionPending','correctionSuccess','demoNumber'].includes(l)?{lValue:sample}:{})}}));
 const storage=new Map(), document={documentElement:{},querySelector:()=>null,querySelectorAll:s=>s==='[data-l]'?elements:[]};
 const window={dispatchEvent(){}};
 const ctx={window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{}};
 vm.runInNewContext(source('page-locale.js'),ctx);
 const seen={};
 for(const lang of ['zh','en','ne']){
  window.GHVLocale.set(lang);assert.equal(document.documentElement.lang,lang==='zh'?'zh-Hant':lang);
  for(const el of elements){
   const k=el.dataset.l,v=window.GHVLocale.t(k);assert.notEqual(v,k,'Missing key '+lang+':'+k);
   assert.ok(v.trim());if(lang==='ne')assert.match(v,/[\u0900-\u097f]/u,k);
   if(lang==='en')assert.doesNotMatch(v,/[\u3400-\u9fff\u0900-\u097f]/u,k);
   if(lang==='zh')assert.match(v,/[\u3400-\u9fff]/u,k);
   if(el.dataset.lValue)assert.ok(el.textContent.includes(sample),'parameter remains literal '+k);
   else assert.equal(el.textContent,v);
   (seen[k]??=new Set()).add(v);
  }
 }
 for(const [k,v] of Object.entries(seen))assert.equal(v.size,3,'unexpected language fallback: '+k);
 assert.match(window.GHVLocale.t('accountDeletePrompt'),/DELETE/);
});
test('member account management HTML and dynamic UI use locale keys; deletion confirmation stays intact',()=>{
 const html=source('member.html'),js=source('simple.js');
 const section=html.slice(html.indexOf('id="member-account-tools"'),html.indexOf('</section>',html.indexOf('id="member-account-tools"')));
 for(const k of ['accountToolsKicker','accountToolsTitle','accountToolsHelp','accountToolsEdit','accountToolsDelete','accountToolsEmpty'])assert.ok(section.includes('data-l="'+k+'"'),k);
 assert.match(js,/localizeMember\(manageEdit,/);assert.match(js,/localizeMember\(manageNote,/);
 assert.match(js,/memberNode\('button','correctionAction'/);
 assert.match(js,/confirm\(mt\('accountDeleteConfirm'\)\)/);
 assert.match(js,/prompt\(mt\('accountDeletePrompt'\)\)/);
 assert.match(js,/phrase!=='DELETE'/);
 assert.match(js,/result\.deletedTestData!==true/);
 assert.match(js,/document\.createTextNode\(' · '\+\(savedVideos\[i\]\.song_title/);
});
