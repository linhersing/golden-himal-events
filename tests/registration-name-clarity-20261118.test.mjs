import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const member = readFileSync(new URL('../public/member.html',import.meta.url),'utf8');
const locale = readFileSync(new URL('../public/page-locale.js',import.meta.url),'utf8');

test('legal and performance names remain distinct stored fields with clear help',()=>{
 const legal = member.match(/<label class="field"><span data-l="museFullName">[\s\S]*?<\/label>/);
 const stage = member.match(/<label class="field"><span data-l="stageName">[\s\S]*?<\/label>/);
 assert.ok(legal, 'legal-name label');
 assert.ok(stage, 'performance-name label');
 assert.match(legal[0], /name="full_name"/);
 assert.match(stage[0], /name="stage_name"/);
 assert.match(legal[0], /required/);
 assert.match(stage[0], /required/);
 assert.match(legal[0], /aria-describedby="legal-name-help"/);
 assert.match(stage[0], /aria-describedby="performance-name-help"/);
 assert.match(legal[0], /data-l="museFullNameHelp"/);
 assert.match(stage[0], /data-l="stageNameHelp"/);
 // Do not let browser autocomplete a legal name into a stage-name field.
 assert.match(stage[0], /autocomplete="off"/);
});

test('all three UI languages explain real name vs stage name separately',()=>{
 for(const lang of ['zh','en','ne']) {
  const obj = locale.match(new RegExp('Object\\.assign\\(texts\\.'+lang+',\\{([^\\n]+)"stageNameHelp"[^\\n]+\\}\\);'));
  assert.ok(obj, lang+' requires localized names/help');
  for(const key of ['museFullName','museFullNameHelp','stageName','stageNameHelp','stagePlaceholder']) {
   assert.match(obj[0],new RegExp('"'+key+'"\\s*:'),lang+' missing '+key);
  }
 }
});

test('form paths and original singer profile are preserved',()=>{
 assert.match(member, /<form id="application-form"/);
 assert.match(member, /name="stage_name" maxlength="60" required/);
 assert.match(member, /name="full_name" maxlength="120"/);
 assert.match(member, /id="muse-test-fields"[^>]+disabled/);
 assert.match(member, /href="\.\/voice\.html"|href="\.\/index\.html"/);
});
