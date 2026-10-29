import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');

test('all three public-facing experiences exist as semantic sections',async()=>{
  const html=await read('index.html');
  for(const id of ['event','updates','registration','voting','venue'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/<form id="registration-form"/);
  assert.match(html,/id="vote-dialog"/);
  assert.match(html,/data-filter="shortlist"/);
});

test('preview form is explicitly non-collecting and has no submission endpoint',async()=>{
  const html=await read('index.html');
  const js=await read('src/scripts/main.js');
  assert.match(html,/simulations only/);
  assert.match(html,/not accepting applications yet/i);
  assert.doesNotMatch(html,/<form[^>]+action\s*=/i);
  const formSubmission=js.slice(js.indexOf("form.addEventListener('submit'"),js.indexOf("const d1Health="));
  assert.doesNotMatch(formSubmission,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon/);
  assert.match(js,/body:JSON\.stringify\(\{sample:'TEST-SINGER-API-001'\}\)/);
  assert.match(js,/event\.preventDefault\(\)/);
});

test('public preview does not announce unapproved numbers or organizational identity',async()=>{
  const html=await read('index.html');
  assert.doesNotMatch(html,/\b(?:CMA|Chinese Mission Alliance|wanjun|cma-mission\.com)\b/i);
  assert.doesNotMatch(html,/\b(?:NPR|NT\$|USD)\s*[\d,]+/i);
  assert.doesNotMatch(html,/\b(?:12|15)\s*(?:finalists|強)/i);
});

test('social metadata references only the independent preview brand',async()=>{
  const html=await read('index.html');
  assert.match(html,/property="og:title"/);
  assert.match(html,/property="og:image"/);
  assert.match(html,/\/images\/brand-identity\.png/);
  assert.match(html,/noindex,nofollow,noarchive/);
});

test('language switch offers English Nepali and Chinese',async()=>{
  const html=await read('index.html');
  const js=await read('src/scripts/main.js');
  for(const lang of ['en','ne','zh']){assert.match(html,new RegExp('data-lang="'+lang+'"'));assert.match(js,new RegExp('\\b'+lang+':\\s*\\{'));}
});
