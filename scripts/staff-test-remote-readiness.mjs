// Public, read-only Cloudflare staff TEST readiness audit.
// No credentials, email addresses, OTPs, POSTs, secrets, or live data mutations.
import {appendFileSync} from 'node:fs';
const ENDPOINT='https://ghv-staff-test-20261119.linhersing.workers.dev/api/staging/e2e-readiness';
const fields=[
 'readyForLoginTest','dualRoleReadyForLoginTest','dualRoleInviteConfigured',
 'staffSchemaReady','organizerInviteListConfigured','reviewerInviteListConfigured',
 'humanCheckEnabled','humanCheckReady','emailProviderConfigured',
 'senderConfigured','identitySecretConfigured','explicitTestModeEnabled'
];
let result;
try{
 const response=await fetch(ENDPOINT,{
  method:'GET',redirect:'error',headers:{Accept:'application/json'},
  signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)throw Error('HTTP_'+response.status);
 const body=await response.json();
 if(body?.ok!==true||body.testOnly!==true||!body.staff||typeof body.staff!=='object')
  throw Error('STAFF_DIAGNOSTICS_NOT_DEPLOYED');
 const staff=body.staff;
 // Only explicit known Boolean flags are copied; ignore any future private fields.
 if(fields.some(key=>typeof staff[key]!=='boolean'))
  throw Error('STAFF_FLAGS_MISSING_OR_INVALID');
 result=Object.fromEntries(fields.map(key=>[key,staff[key]]));
 const blocked=fields.filter(key=>!result[key]);
 console.log('TEST Staff dual-role readiness: '+(result.dualRoleReadyForLoginTest?'READY_FOR_LIVE_OTP_TEST':'BLOCKED'));
 console.log('Sanitized capability flags: '+JSON.stringify(result));
 console.log('Non-ready flags: '+(blocked.join(', ')||'(none)'));
 console.log('Note: readiness never proves OTP delivery, authenticated role switching, or scoring.');
 if(process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   '### Golden Himal Voice — isolated staff TEST (read-only)\n\n'+
   '**Dual-role configuration:** '+(result.dualRoleReadyForLoginTest?'READY for manual OTP validation':'BLOCKED')+'\n\n'+
   '| Check | Ready |\n|---|---|\n'+fields.map(key=>'| `'+key+'` | '+(result[key]?'Yes':'No')+' |').join('\n')+
   '\n\nNo actual mail was sent. No login or scoring was attempted.\n');
 }
}catch(error){
 // Never print response body: it might contain unanticipated private data.
 console.error('Remote readiness read failed: '+(error?.name==='TimeoutError'?'REQUEST_TIMEOUT':
  /^HTTP_\d+$/.test(error?.message||'')?error.message:
  error?.message==='STAFF_DIAGNOSTICS_NOT_DEPLOYED'?'STAFF_DIAGNOSTICS_NOT_DEPLOYED':
  error?.message==='STAFF_FLAGS_MISSING_OR_INVALID'?'STAFF_FLAGS_MISSING_OR_INVALID':'FETCH_UNAVAILABLE'));
 process.exitCode=1;
}
