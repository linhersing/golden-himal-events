// Continuous live smoke test: read-only D1 fixture checks and public write denial.
// No privileged tokens, personal data, secrets, or database modifications.
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
  // The temporary OIDC fixture writer must be absent after test completion.
  const retired=await fetch(base+'/api/staging/ci-fixture-write',{
    method:'POST',signal:AbortSignal.timeout(10000)
  });
  assert.equal(retired.status,404,'temporary CI write endpoint was not retired');
  console.log('PASS live Cloudflare D1 readback: fictional TEST-SINGER-001; writes disabled.');
}

let error;
for(let i=0;i<20;i++){
  try {
    await check();
    const fixture=await getJSON('/api/staging/ci-read');
    assert.equal(fixture.ok,true);
    assert.equal(fixture.testOnly,true);
    assert.equal(fixture.source,'d1-staging');
    assert.equal(fixture.sample.display_name,'TEST-SINGER-API-001');
    assert.equal(fixture.sample.category,'university');
    console.log('PASS persisted CI synthetic fixture readback; all public writes remain OFF.');
    process.exit(0);
  }catch(e){
    error=e;
    console.log('Live staging check attempt '+(i+1)+'/20: '+String(e.message));
    if(i<19)await pause(12000);
  }
}
console.error('FAIL live D1 smoke test after Cloudflare rollout: '+String(error?.message));
process.exitCode=1;
