import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('home is focused on registration, member login and news only',async()=>{
 const html=await read('index.html');
 assert.match(html,/class="front-actions"/);
 for(const href of ['./member.html#register','./member.html#login','./news.html','./backoffice.html'])assert.ok(html.includes('href="'+href+'"'),href);
 assert.match(html,/網站預覽階段/);
 assert.doesNotMatch(html,/<form[^>]+action\s*=/i);
 assert.doesNotMatch(html,/class="v2-rule-summary"|class="season-preview"|id="vote-dialog"/);
});
test('previous site resources and links remain in an immutable design archive',async()=>{
 const html=await read('docs/archive/2026-11-02-index-before-simple-front.html');
 for(const id of ['event','updates','registration','voting','venue'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="vote-dialog"/);
 assert.match(html,/href="\.\/practice\.html"/);
});
test('member and staff share server-issued identity but never fake official payments',async()=>{
 const [member,staff,api,backend]=await Promise.all([read('public/member.html'),read('public/backoffice.html'),read('public/simple.js'),read('backend/staging-e2e.js')]);
 assert.match(member,/id="member-email-form"/);assert.match(member,/id="entries"/);assert.match(member,/name="demo_url"/);
 assert.match(staff,/id="paid-count">0/);assert.match(staff,/data-role-tab="reviewer"/);
 for(const path of ['update-application','delete-application','reviewer-queue','organizer-queue'])assert.match(api,new RegExp(path));
 assert.match(backend,/account_id=\?/);assert.match(backend,/payment_status='unpaid'/);
 assert.match(api,/正式報名/);
});
test('social preview metadata remains neutral and noindex until go live',async()=>{
 const html=await read('index.html');
 assert.match(html,/property="og:title"/);assert.match(html,/property="og:image"/);
 assert.match(html,/golden-himal-voice-preview\.linhersing\.workers\.dev\/images\/brand-identity\.png/);
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.doesNotMatch(html,/\b(?:CMA|Chinese Mission Alliance|wanjun|cma-mission\.com)\b/i);
});
test('home retains English Nepali and Traditional Chinese switch',async()=>{
 const html=await read('index.html'),js=await read('public/simple.js');
 for(const lang of ['en','ne','zh']){assert.match(html,new RegExp('data-lang="'+lang+'"'));assert.match(js,new RegExp('\\b'+lang+':\\s*\\{'))}
});
