import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCiIdentity,ciTestAudience} from '../backend/ci-oidc.js';
import worker from '../backend/staging-registration-worker.js';

const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const fixedNow=1793257800;
const trust={
  iss:'https://token.actions.githubusercontent.com',
  aud:ciTestAudience,
  iat:fixedNow-10,
  nbf:fixedNow-10,
  exp:fixedNow+200,
  repository:'linhersing/golden-himal-events',
  repository_id:'1406943966',
  ref:'refs/heads/codex/initial-site',
  event_name:'push',
  workflow_ref:'linhersing/golden-himal-events/.github/workflows/live-d1-smoke.yml@refs/heads/codex/initial-site'
};
async function fixture(){
 const keys=await crypto.subtle.generateKey(
  {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
   publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},
  true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);
 const keyId='simulated-github-oidc-key';
 const fetchImpl=async()=>Response.json({keys:[{...jwk,kid:keyId,use:'sig',alg:'RS256'}]});
 async function token(claims=trust,signingKey=keys.privateKey) {
  const msg=b64({alg:'RS256',typ:'JWT',kid:keyId})+'.'+b64(claims);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',
    signingKey,new TextEncoder().encode(msg));
  return msg+'.'+Buffer.from(sig).toString('base64url');
 }
 return {fetchImpl,token};
}
test('signed, tightly scoped GitHub push OIDC can authorize one synthetic test',async()=>{
 const f=await fixture();
 assert.equal(await verifyCiIdentity(await f.token(),{fetchImpl:f.fetchImpl,now:fixedNow}),true);
});
test('OIDC rejects different repo, branch, audience, event, workflow, expiry',async()=>{
 const f=await fixture();
 for(const change of [
  {repository:'another/clone'}, {repository_id:'111'}, {ref:'refs/heads/fork'},
  {aud:'aud-for-other-service'}, {event_name:'pull_request'},
  {workflow_ref:'another/workflow'}, {exp:fixedNow-1},
  {iat:fixedNow-900}
 ]){
  assert.equal(await verifyCiIdentity(await f.token({...trust,...change}),
   {fetchImpl:f.fetchImpl,now:fixedNow}),false,JSON.stringify(change));
 }
});
test('OIDC rejects malformed token and forged signature',async()=>{
 const f=await fixture();
 assert.equal(await verifyCiIdentity('garbage'),false);
 const good=await f.token();
 const parts=good.split('.');
 const altered=[parts[0],b64({...trust,repository_id:'1406943966',event_name:'push',iat:fixedNow-20}),parts[2]].join('.');
 assert.equal(await verifyCiIdentity(altered,{fetchImpl:f.fetchImpl,now:fixedNow}),false);
 const other=await crypto.subtle.generateKey(
 {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},
 true,['sign','verify']);
 assert.equal(await verifyCiIdentity(await f.token(trust,other.privateKey),
   {fetchImpl:f.fetchImpl,now:fixedNow}),false);
});
test('unauthenticated public calls cannot write a single fictional fixture',async()=>{
 const url='https://golden-himal-voice-preview.linhersing.workers.dev/api/staging/ci-fixture-write';
 const binding={prepare(){throw Error('MUST NOT query DB for unauthenticated request')}};
 const env={DB:binding,ASSETS:{fetch:()=>new Response('static')}};
 const noAuth=await worker.fetch(new Request(url,{method:'POST'}),env);
 assert.equal(noAuth.status,401);
 const fakeAuth=await worker.fetch(new Request(url,{
  method:'POST',headers:{Authorization:'Bearer garbage'}
 }),env);
 assert.equal(fakeAuth.status,403);
});
