import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('member login is visibly a synthetic credential rehearsal, with personal account and no uploads',async()=>{
 const html=await read('../public/member-login.html');
 const js=await read('../public/member-login.js');
 const portal=await read('../public/member-portal.js');
 const main=await read('../index.html');
 for(const id of ['login-form','login-username','login-password','register-persona','auth-view',
  'dashboard-view','summary-member','summary-status','summary-payment','entries-list','sign-out'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/TEST ONLY · NOT REAL AUTHENTICATION/);
 assert.match(html,/never enter a real password/i);
 assert.match(html,/type="password"/);
 assert.match(html,/नेपाली/);
 assert.match(js,/PASSCODE='GHV-TEST-2027'/);
 assert.match(js,/ghv_member_sandbox_v1/);
 assert.match(js,/ghv_demo_active_member_v1/);
 assert.match(js,/safeParsePortal/);
 assert.match(js,/signUpMock/);
 assert.match(js,/sessionStorage\.setItem/);
 assert.match(js,/sessionStorage\.removeItem/);
 assert.match(portal,/sessionStorage\.getItem\('ghv_demo_active_member_v1'\)/);
 assert.match(main,/href="\.\/member-login\.html"/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|\.post\s*\(/);
 assert.doesNotMatch(html,/<input\s[^>]*type="(?:email|file|tel)"/);
});

test('personal account dashboard links are test-only and main app fixture keeps age rule',async()=>{
 const html=await read('../public/member-login.html');
 const js=await read('../public/member-login.js');
 const model=await read('../public/member-portal-model.mjs');
 assert.match(html,/./);
 assert.match(js,/\.\/member-portal\.html\?step=checkout/);
 assert.match(js,/\.\/member-portal\.html\?step=apply/);
 assert.match(js,/GHV-TEST-2027/);
 assert.match(model,/i===19\?17/);
 assert.match(js,/person==='T020'/);
 assert.doesNotMatch(html,/Pay now|Official receipt issued|Account verified/);
});
