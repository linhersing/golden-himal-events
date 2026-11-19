import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../public/backoffice.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/official-backoffice-decor.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/official-backoffice-decor.js',import.meta.url),'utf8');

test('approved logo and all original staff auth DOM controls survive visual decoration',()=>{
 for(const id of ['back-email-form','back-code-form','signup-turnstile','signup-human-status','back-dashboard','organizer-dashboard','judge-dashboard','organizer-entry-dialog']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.equal(html.split('official-backoffice-decor.css').length,2);
 assert.equal(html.split('official-backoffice-decor.js').length,2);
 assert.match(html,/ghp-clean-official-logo-20261116\.png/);
 assert.match(css,/ghp-universal-footer-brand\s*\{[^}]*display:\s*flex\s*!important/s);
 assert.doesNotMatch(js,/fetch\(|addEventListener\(['"]submit|localStorage|sessionStorage/);
});

function renderHost(hostname,page='back'){
 const classes=new Set();
 const inserted=[];
 const body={dataset:{page},classList:{add:cls=>classes.add(cls)}};
 const heading={insertAdjacentElement:(_pos,child)=>inserted.push(child)};
 const document={
  body,readyState:'complete',
  querySelector(selector){
   if(selector==='main.page-shell > h1.page-heading')return heading;
   if(selector==='.ghp-official-site-tag')return inserted[0]||null;
   return null;
  },
  createElement(tag){
   assert.equal(tag,'p');
   return {className:'',textContent:'',setAttribute(k,v){this[k]=v;}};
  }
 };
 vm.runInNewContext(js,{window:{location:{hostname}},document,Set});
 return {classes,inserted};
}

test('official-domain only: preview and isolated TEST never show the official-site badge',()=>{
 for(const host of ['golden-himal-voice-preview.linhersing.workers.dev','ghv-staff-test-20261119.linhersing.workers.dev','localhost','example.com']){
  const result=renderHost(host);
  assert.equal(result.classes.size,0,host);
  assert.equal(result.inserted.length,0,host);
 }
});
test('canonical hosts show one distinct office marker; other page types remain unmodified',()=>{
 for(const host of ['goldenhimalpalace.com','www.goldenhimalpalace.com']){
  const result=renderHost(host);
  assert(result.classes.has('ghp-official-backoffice'));
  assert.equal(result.inserted.length,1);
  assert.match(result.inserted[0].textContent,/goldenhimalpalace\.com/);
  assert.equal(renderHost(host,'member').classes.size,0);
 }
});
test('visual overrides stay within official backoffice; no generic Turnstile/OTP changes',()=>{
 assert.match(css,/body\[data-page="back"\]\.ghp-official-backoffice/);
 assert.doesNotMatch(css,/iframe\s*\{|\.cf-turnstile\s*\{|#signup-turnstile\s*\{|#back-code-form\s*\{/);
 assert.doesNotMatch(css,/^\s*(?:body|form|button)\s*\{/m);
});
