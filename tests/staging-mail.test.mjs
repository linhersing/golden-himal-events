import test from 'node:test';
import assert from 'node:assert/strict';
import {mailProviderReady,mailSenderReady,sendTestEmail} from '../backend/staging-mail.js';
const env={STAGING_EMAIL_PROVIDER:'mailgun',STAGING_MAILGUN_DOMAIN:'sandboxabc123.mailgun.org',STAGING_MAILGUN_API_KEY:'unit-test-key-'.repeat(4),STAGING_FROM_EMAIL:'ghv-test@sandboxabc123.mailgun.org'};
const letter={from:env.STAGING_FROM_EMAIL,to:'example+ghv-judge1@gmail.com',subject:'TEST verification',text:'Fictional one-time code',html:'<p>Fictional code</p>'};
test('Mailgun sandbox delivery uses the fixed HTTPS API with tracking disabled and never testmode',async t=>{
 const calls=[];t.mock.method(globalThis,'fetch',async (url,init)=>{calls.push({url,init});return Response.json({id:'message@example.invalid',message:'Queued. Thank you.'})});
 assert.equal(mailProviderReady(env),true);assert.equal(mailSenderReady(env),true);
 await sendTestEmail(env,letter);
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.mailgun.net/v3/sandboxabc123.mailgun.org/messages');
 const options=calls[0].init;
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 assert.equal(options.headers.Authorization,'Basic '+btoa('api:'+env.STAGING_MAILGUN_API_KEY));
 assert(options.body instanceof FormData);assert.equal(options.body.get('to'),letter.to);
 assert.equal(options.body.get('from'),env.STAGING_FROM_EMAIL);
 assert.equal(options.body.get('o:tracking'),'no');assert.equal(options.body.get('o:tracking-clicks'),'no');assert.equal(options.body.get('o:tracking-opens'),'no');
 assert.equal(options.body.get('o:require-tls'),'yes');assert.equal(options.body.get('o:skip-verification'),'no');assert.equal(options.body.has('o:testmode'),false);
});
test('EU sandbox delivery uses the EU API and provider failures never look like accepted email',async t=>{
 let endpoint;t.mock.method(globalThis,'fetch',async url=>{endpoint=url;return new Response('provider private response',{status:403})});
 await assert.rejects(sendTestEmail({...env,STAGING_MAILGUN_REGION:'eu'},letter),e=>e.message==='test_email_service_unavailable');
 assert.equal(endpoint,'https://api.eu.mailgun.net/v3/sandboxabc123.mailgun.org/messages');
 t.mock.restoreAll();t.mock.method(globalThis,'fetch',async()=>Response.json({message:'not a queued acknowledgement'}));
 await assert.rejects(sendTestEmail(env,letter),e=>e.message==='test_email_service_unavailable');
});
test('missing or malformed provider configuration is rejected before sending',async t=>{
 let called=false;t.mock.method(globalThis,'fetch',async()=>{called=true;throw Error('must not send')});
 for(const bad of [{...env,STAGING_MAILGUN_API_KEY:''},{...env,STAGING_MAILGUN_DOMAIN:'evil.example.com'},{...env,STAGING_MAILGUN_REGION:'other'},{...env,STAGING_FROM_EMAIL:'wrong@gmail.com'},{...env,STAGING_EMAIL_PROVIDER:'unknown'}]){
  assert.equal(mailProviderReady(bad)&&mailSenderReady(bad),false);
  await assert.rejects(sendTestEmail(bad,letter));
 }
 assert.equal(called,false);
});
test('native Cloudflare Email binding remains supported',async()=>{
 let sent;const native={EMAIL:{async send(x){sent=x}},STAGING_FROM_EMAIL:'test@example.invalid'};
 assert.equal(mailProviderReady(native),true);assert.equal(mailSenderReady(native),true);
 await sendTestEmail(native,{...letter,from:native.STAGING_FROM_EMAIL});assert.equal(sent.to,letter.to);
});
