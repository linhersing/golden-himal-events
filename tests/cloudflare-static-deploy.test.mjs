import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../backend/staging-registration-worker.js';

test('Cloudflare preview serves static assets and only isolated staging API',async()=>{
  const cfg=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(cfg.name,'golden-himal-voice-preview');
  assert.equal(cfg.assets.directory,'./dist');
  assert.equal(cfg.assets.binding,'ASSETS');
  assert.deepEqual(cfg.assets.run_worker_first,['/api/staging/*','/api/e2e/*','/member','/member.html','/backoffice','/backoffice.html']);
  assert.equal(cfg.vars.STAGING_E2E_ENABLED,undefined, 'E2E enable requires a separately provisioned Cloudflare secret');
  assert.equal(cfg.vars.STAGING_PUBLIC_SIGNUP_ENABLED,undefined,'Public test signup requires an explicit runtime opt-in');
  assert.equal(cfg.main,'./backend/staging-registration-worker.js');
  assert.equal(cfg.vars.STAGING_TEST_WRITE_ENABLED,'false');
  assert.equal(cfg.d1_databases[0].database_name,'ghv-staging');
  assert.equal(cfg.d1_databases[0].binding,'DB');
  assert.equal(JSON.stringify(cfg).includes('backend/src/index.js'),false,
     'Never deploy draft real voting backend in demo preview');
  assert.equal(JSON.stringify(cfg).includes('OTP_PEPPER'),false);
});

test('Turnstile policy is limited to the main signup page while the flag is on',async()=>{
 const policy="default-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'";
 const env={ASSETS:{fetch:async request=>request.headers.has('If-None-Match')?
  new Response(null,{status:304}):new Response('test',{headers:{
  'Content-Type':'text/html','Content-Security-Policy':policy,'X-Frame-Options':'DENY'
 }})}};
 const header=async(path,headers={})=>(await worker.fetch(new Request('https://example.invalid'+path,{headers}),env)).headers;
 assert.equal((await header('/member')).get('Content-Security-Policy'),policy);
 env.STAGING_PUBLIC_SIGNUP_ENABLED='true';
 for(const path of ['/member','/member.html']){
  const headers=await header(path,{'If-None-Match':'"old-html"'}),csp=headers.get('Content-Security-Policy');
  assert.equal(headers.get('Cache-Control'),'no-store');
  assert.match(csp,/script-src 'self' https:\/\/challenges\.cloudflare\.com;/);
  assert.match(csp,/frame-src https:\/\/challenges\.cloudflare\.com;/);
  assert.ok(csp.endsWith("connect-src 'self'; frame-ancestors 'none'"));
  assert.equal(headers.get('X-Frame-Options'),'DENY');
 }
 assert.equal((await header('/')).get('Content-Security-Policy'),policy);
});

test('flag-enabled backoffice gets staff Turnstile CSP while unrelated pages remain locked down',async()=>{
 const policy="default-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'";
 const env={ASSETS:{fetch:async request=>request.headers.has('If-None-Match')?
  new Response(null,{status:304}):new Response('staff TEST',{headers:{
    'Content-Type':'text/html','Content-Security-Policy':policy,'X-Frame-Options':'DENY'
  }})}};
 const get=async(path,headers={})=>worker.fetch(new Request('https://example.invalid'+path,{headers}),env);
 assert.equal((await get('/backoffice.html')).headers.get('Content-Security-Policy'),policy);
 env.STAGING_STAFF_TURNSTILE_REQUIRED='true';
 for(const path of ['/backoffice','/backoffice.html']){
  const response=await get(path,{'If-None-Match':'"stale"'});
  const csp=response.headers.get('Content-Security-Policy');
  assert.match(csp,/script-src 'self' https:\/\/challenges\.cloudflare\.com;/);
  assert.match(csp,/frame-src https:\/\/challenges\.cloudflare\.com;/);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  assert.ok(!csp.includes("'unsafe-inline'"));
 }
 for(const path of ['/','/news.html','/member.html']){
  assert.equal((await get(path)).headers.get('Content-Security-Policy'),policy);
 }
 env.STAGING_PUBLIC_SIGNUP_ENABLED='true';
 const memberCsp=(await get('/member.html')).headers.get('Content-Security-Policy');
 assert.match(memberCsp,/https:\/\/challenges\.cloudflare\.com/);
});
