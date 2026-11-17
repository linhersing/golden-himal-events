import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all standalone HTML pages end with approved original logo',()=>{
 for(const name of readdirSync(new URL('../public/',import.meta.url)).filter(n=>n.endsWith('.html'))){
  const source=read('public/'+name);
  if(name==='golden-himal.html')continue;
  assert.match(source,/ghp-universal-footer-brand/,name);
  assert.match(source,/ghp-clean-official-logo-20261116\.png/,name);
  assert.match(source,/सबैभन्दा राम्रो विवाह समारोह गोल्डेन हिमालमा।/,name);
 }
});
test('member controls use authenticated D1 endpoints',()=>{
 const html=read('public/member.html'),script=read('public/simple.js');
 for(const id of ['member-manage-edit','member-manage-delete'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(script.includes("api('delete-my-data',{})"));
 assert.ok(script.includes("rows.find(memberCanEdit)"));
 assert.ok(script.includes("phrase!=='DELETE'"));
 const backend=read('backend/staging-e2e.js');
 assert.ok(backend.includes("pathname==='/api/e2e/delete-my-data'"));
});
test('full-width prize area keeps the link and published amounts',()=>{
 const html=read('public/voice.html'),css=read('public/simple.css');
 for(const value of ['NPR 50,000','NPR 30,000','NPR 15,000','NPR 20,000'])assert.ok(html.includes(value));
 assert.ok(html.includes('href="./news.html#rules-awards"'));
 assert.ok(html.includes('voice-prize-grid'));
 assert.ok(css.includes('.voice-prize-link:hover'));
 assert.ok(css.includes('calc(100vw - 32px)'));
});

test('Palace footer reuses approved Chitwan photo under mobile-safe gradients',()=>{
 const selectors=[['public/simple.css','.ghp-universal-footer-brand'],['public/palace-brand-footer.css','.ghp-universal-footer-brand'],['public/brand-portal.css','.portal-footer .ghp-footer-brand']];
 for(const [path,selector] of selectors){
  const css=read(path);
  assert.ok(css.includes(selector),path+' needs its own brand component');
  assert.match(css,/gh-real-chitwan-view-20261113\.webp/);
  assert.match(css,/radial-gradient\(/);
  assert.match(css,/background-size:cover!important/);
  assert.match(css,/@media\(max-width:650px\)/);
 }
 const img=readFileSync(new URL('../public/images/gh-real-chitwan-view-20261113.webp',import.meta.url));
 assert.ok(img.byteLength>20000&&img.byteLength<300000,'existing real panorama must stay small and unchanged');
});
