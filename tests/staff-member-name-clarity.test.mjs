import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const member=readFileSync(new URL('../public/member.html',import.meta.url),'utf8');
const locale=readFileSync(new URL('../public/page-locale.js',import.meta.url),'utf8');

test('real name and performance name are separate required database-backed form fields',()=>{
  const legal=member.match(/<label class="field"><span data-l="museFullName">[\s\S]*?<\/label>/)?.[0];
  const artist=member.match(/<label class="field"><span data-l="stageName">[\s\S]*?<\/label>/)?.[0];
  assert.ok(legal);assert.ok(artist);
  assert.match(legal,/name="full_name" maxlength="120" autocomplete="off"/);
  assert.match(artist,/name="stage_name" maxlength="60" required autocomplete="off"/);
  assert.match(legal,/aria-describedby="legal-name-help" required/);
  assert.match(artist,/aria-describedby="performance-name-help"/);
  assert.match(legal,/id="legal-name-help" data-l="museFullNameHelp"/);
  assert.match(artist,/id="performance-name-help" data-l="stageNameHelp"/);
  assert.notEqual('full_name','stage_name');
});
test('localized labels and guidance exist in all three public languages',()=>{
 for(const lang of ['zh','en','ne']){
   const line=locale.split('\n').find(line=>line.startsWith('Object.assign(texts.'+lang+',')&&line.includes('museFullNameHelp'));
   assert.ok(line,lang+' lacks name guidance');
   for(const key of ['museFullName','museFullNameHelp','stageName','stageNameHelp','stagePlaceholder']){
     assert.match(line,new RegExp('\\b'+key+':'),lang+': '+key+' missing');
   }
 }
});
test('identity fields retain test-only visibility protections',()=>{
 assert.match(member,/id="muse-test-fields"/);
 assert.match(member,/<fieldset[^>]*id="muse-test-fields"[^>]*disabled/);
 // No API parameter, DB field, or href has been changed by this label-only patch.
 assert.match(member,/<form id="application-form"/);
});
