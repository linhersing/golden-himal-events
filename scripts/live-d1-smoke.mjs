// Staging smoke test: checks public reads and disabled public writes, then uses
// short-lived GitHub OIDC to INSERT just one idempotent fictional D1 record.
// No personal data, persistent credentials or participant information.
import assert from 'node:assert/strict';

const base='https://golden-himal-voice-preview.linhersing.workers.dev';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getJSON(path) {
  const response=await fetch(base+path,{signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(response.status!==200)throw new Error(path+' returned HTTP '+response.status);
  return response.json();
}
async function check(){
  const [health,sample]=await Promise.all([
    getJSON('/api/staging/health'),getJSON('/api/staging/sample-read')
  ]);
  assert.deepEqual(health,{
    ok:true,testOnly:true,tableReady:true,canWrite:false
  },'The staging write switch MUST remain OFF');
  assert.equal(sample.ok,true);
  assert.equal(sample.testOnly,true);
  assert.equal(sample.source,'d1-staging');
  assert.equal(sample.sample.display_name,'TEST-SINGER-001');
  assert.equal(sample.sample.category,'university');
  assert.equal(sample.sample.round_code,'2027-03');
  assert.equal(sample.sample.status,'pending');
  // Verify the public Worker cannot accept any registrations.
  const denied=await fetch(base+'/api/staging/registration-test',{
    method:'POST',
    headers:{'Origin':base,'Content-Type':'application/json'},
    body:JSON.stringify({sample:'TEST-SINGER-API-001'}),
    signal:AbortSignal.timeout(10000)
  });
  assert.equal(denied.status,503,'staging writes unexpectedly enabled');
  const body=await denied.json();
  assert.equal(body.error,'staging_write_disabled');
  console.log('PASS live Cloudflare D1 readback: fictional TEST-SINGER-001; writes disabled.');
}

async function ciToken() {
 const urlString=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
 const bearer=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!urlString||!bearer)throw new Error('GitHub OIDC runner variables unavailable');
 const url=new URL(urlString);
 url.searchParams.set('audience','ghv-d1-staging-smoke');
 const response=await fetch(url,{headers:{Authorization:'Bearer '+bearer},
   signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('GitHub OIDC token request returned HTTP '+response.status);
 const data=await response.json();
 if(!data.value)throw new Error('GitHub OIDC token missing');
 return data.value;
}
async function authenticatedFixtureWrite() {
 const token=await ciToken();
 const response=await fetch(base+'/api/staging/ci-fixture-write',{
  method:'POST',headers:{Authorization:'Bearer '+token},
  signal:AbortSignal.timeout(15000)
 });
 if(response.status===403){
   // Only log public workflow metadata, NEVER the token, subject, actor or signature.
   const middle=token.split('.')[1];
   const metadata=JSON.parse(Buffer.from(middle,'base64url').toString('utf8'));
   const keys=['iss','aud','repository','repository_id','ref','event_name','workflow_ref','iat','exp','nbf'];
   const summary=Object.fromEntries(keys.map(key=>[key,metadata[key]]));
   console.log('OIDC safe public claim diagnostics: '+JSON.stringify(summary));
 }
 if(!response.ok)throw new Error('OIDC staging write returned HTTP '+response.status);
 const body=await response.json();
 assert.equal(body.ok,true);
 assert.equal(body.testOnly,true);
 assert.equal(body.source,'ci-oidc');
 assert.equal(body.stored.display_name,'TEST-SINGER-API-001');
 assert.equal(body.stored.category,'university');
 const read=await getJSON('/api/staging/ci-read');
 assert.equal(read.ok,true);
 assert.equal(read.testOnly,true);
 assert.equal(read.sample.display_name,'TEST-SINGER-API-001');
 assert.equal(read.sample.id,body.stored.id);
 console.log('PASS live OIDC-authenticated D1 synthetic INSERT + independent SELECT readback.');
}
let error;
for(let i=0;i<3;i++){
  try {
    await check();
    await authenticatedFixtureWrite();
    process.exit(0);
  }catch(e){
    error=e;
    console.log('Live staging check attempt '+(i+1)+'/20: '+String(e.message));
    if(i<2)await pause(10000);
  }
}
console.error('FAIL OIDC diagnostic smoke test: '+String(error?.message));
process.exitCode=1;
