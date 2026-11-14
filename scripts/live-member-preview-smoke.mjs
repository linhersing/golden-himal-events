// Read-only live check for current brand portal and invited member OTP preview.
// GET only: does not request any codes, send emails, mutate D1, or reveal private data.
const BASE='https://golden-himal-voice-preview.linhersing.workers.dev';
// Public-facing TEST notices moved to footer; homepage is now a 3-route brand portal.
// Verify each route exists without confusing this read-only smoke with real login acceptance.
const footerMarkers=['TEST MODE','class="test-site-banner test-site-footer wrap"'];
const endpoints=[
  ['/',['id="home-about"','id="home-competition"','id="home-news"','href="./golden-himal.html"','href="./voice.html"','id="location"',...footerMarkers]],
  ['/golden-himal.html',['data-page="story"','story-name','story-gallery','imageDisclaimer','gh-real-hall-hero-20261113.webp',...footerMarkers]],
  ['/voice.html',['data-page="home"','id="home-apply"','id="home-login"','front-visual-wedding','class="wedding-halo"','The Best Wedding','NPR 10,000',...footerMarkers]],
  ['/simple.css',['.front-visual-wedding .wedding-halo::before','.front-visual-wedding .wedding-halo::after','border-top:10px solid rgba(255,253,247,.95)']],
  ['/member.html',[...footerMarkers,'id="member-email-form"','id="member-code-form"','id="member-status"','simple.js']],
  ['/news.html',[...footerMarkers,'news-schedule','id="rules-awards"','id="rules-voting"']],
  ['/simple.js',['request-code','test_email_service_unavailable','verify-code']]
];
async function read(path) {
  const response=await fetch(BASE+path,{headers:{'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(path+' HTTP '+response.status);
  return response;
}
async function run() {
  for(const [path,markers] of endpoints){
    const body=await (await read(path)).text();
    for(const marker of markers)if(!body.includes(marker))throw Error(path+' missing current UI marker '+JSON.stringify(marker));
    console.log('PASS current member preview '+path);
  }
  const value=await (await read('/api/staging/e2e-readiness')).json();
  if(value.ok!==true||value.testOnly!==true)throw Error('Readiness returned malformed or unavailable status');
  // Only boolean capability names are reported; never print secret values, addresses, or tokens.
  const flags=Object.entries(value.resources||{}).map(([k,v])=>k+'='+Boolean(v)).join(', ');
  console.log('Read-only Email readiness: '+String(value.readiness)+'; '+flags);
  if(value.readiness!=='READY_FOR_INVITED_OTP_TEST')throw Error('Invited OTP readiness BLOCKED; inspect false boolean capability flags above');
  console.log('PASS same-version brand UI + read-only staging readiness. NOTE: No OTP was sent or delivered, no live score or official vote was executed, and no login was verified.');
}
let lastError;
for(let attempt=1;attempt<=3;attempt++){
  try{await run();process.exit(0)}
  catch(error){lastError=error;console.warn('Attempt '+attempt+'/3: '+error.message);if(attempt<3)await new Promise(resolve=>setTimeout(resolve,3000))}
}
console.error('FAIL current live member readiness: '+lastError?.message);
process.exit(1);
