import {createHash} from 'node:crypto';
// Read-only live check for current brand portal and invited member OTP preview.
// GET only: does not request any codes, send emails, mutate D1, or reveal private data.
const BASE='https://golden-himal-voice-preview.linhersing.workers.dev';
// Public-facing TEST notices moved to footer; homepage is now a 3-route brand portal.
// Verify each route exists without confusing this read-only smoke with real login acceptance.
const footerMarkers=['TEST MODE','class="test-site-banner test-site-footer wrap"'];
const endpoints=[
  ['/',['id="home-about"','id="home-competition"','id="home-news"','portal-tagline-official','portal-tagline-nepali','ghp-footer-brand','ghp-clean-official-logo-20261116.png',...footerMarkers]],
  ['/golden-himal.html',['data-page="story"','gh-story-slogan','ghp-footer-brand','ghp-clean-official-logo-20261116.png',...footerMarkers]],
  ['/voice.html',['data-page="home"','id="home-apply"','id="home-login"','voice-prize-grid','id="voice-rewards-heading"','NPR 50,000','NPR 30,000','NPR 15,000','NPR 20,000','href="./news.html#rules-awards"','ghp-universal-footer-brand','ghp-clean-official-logo-20261116.png','voice-wedding-hero-approved-20261114.jpg',...footerMarkers]],
  ['/member.html',['id="member-email-form"','id="member-code-form"','id="member-status"','id="member-manage-edit"','id="member-manage-delete"','id="muse-test-fields"','name="contact_phone"','name="contact_email"','name="street_address"','name="educational_background"','data-l="museRegionLock"','ghp-universal-footer-brand','ghp-clean-official-logo-20261116.png',...footerMarkers]],
  ['/news.html',['id="rules-awards"','id="rules-voting"','ghp-universal-footer-brand','ghp-clean-official-logo-20261116.png',...footerMarkers]],
  ['/simple.css',['.voice-prize-grid','.voice-prize-link:hover','.member-account-tools','.ghp-universal-footer-brand']],
  ['/brand-portal.css',['portal-tagline-official','.ghp-footer-brand']],
  ['/simple.js',["api('delete-my-data',{})","rows.find(memberCanEdit)","setupMuseForm(v.muse_form_enabled===true)"]],
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
    if(path==='/member.html'){
      const newEntry=body.indexOf('id="new-application-callout"');
      const application=body.indexOf('id="application-details"');
      const existing=body.indexOf('class="panel member-home"');
      const management=body.indexOf('id="member-account-tools"');
      if(!(newEntry>=0&&newEntry<application&&application<existing&&existing<management))
        throw Error('member user journey is not registration > form > saved data > management');
      if(!body.includes('id="muse-test-fields" class="full muse-test-fields" disabled'))
        throw Error('Muse contact fields must remain disabled until D1 privacy release');
    }
    console.log('PASS current member preview '+path);
  }
  // Confirm the actual JPEG pixels are published, not only an HTML filename marker.
  const artwork=await read('/images/voice-wedding-hero-approved-20261114.jpg');
  const header=(artwork.headers.get('content-type')||'').toLowerCase();
  if(!header.includes('image/jpeg'))throw Error('Approved artwork unexpected Content-Type: '+header);
  const pixels=new Uint8Array(await artwork.arrayBuffer());
  if(pixels.length<20000||pixels[0]!==0xff||pixels[1]!==0xd8)throw Error('Approved artwork missing or invalid JPEG payload');
  console.log('PASS real approved wedding artwork: '+pixels.length+' bytes');
  // This catches the exact failure where HTML labels the Peace Tower but the deployed image
  // bytes are actually the unfinished banquet hall. Match reviewed source pixels, not alt text.
  const reviewedImages=[
    ['gh-reviewed-20261115-fountain-day.jpg','5d35f3a70dd47740bd1b7bfe01b0480e3eacd74a829dd5ea2c73c4bd708d64be'],
    ['gh-reviewed-20261115-a-entrance-night.jpg','856b24de7268f739d9ad938f888c23595736d73fe761f7b17e6889572c9fe798'],
    ['gh-reviewed-20261115-grand-hall-empty.jpg','03ddc40c35ded2244ce6495164a5bf9e02606c0493b96db7e77d8cb14276681b']
  ];
  for(const [file,expected] of reviewedImages){
    const imageResponse=await read('/images/'+file);
    if(!(imageResponse.headers.get('content-type')||'').toLowerCase().includes('image/jpeg'))
      throw Error('Reviewed image wrong content type: '+file);
    const actual=Buffer.from(await imageResponse.arrayBuffer());
    if(actual.length<20000||actual[0]!==0xff||actual[1]!==0xd8)
      throw Error('Reviewed image invalid JPEG: '+file);
    const digest=createHash('sha256').update(actual).digest('hex');
    if(digest!==expected)throw Error('Reviewed image bytes do not match approved user upload: '+file);
    console.log('PASS approved actual image bytes: '+file+' '+actual.length+' bytes');
  }
  const value=await (await read('/api/staging/e2e-readiness')).json();
  if(value.ok!==true||value.testOnly!==true)throw Error('Readiness returned malformed or unavailable status');
  // Only boolean capability names are reported; never print secret values, addresses, or tokens.
  const flags=Object.entries(value.resources||{}).map(([k,v])=>k+'='+Boolean(v)).join(', ');
  console.log('Read-only Email readiness: '+String(value.readiness)+'; '+flags);
  // OTP readiness is a separate security gate: a blocked mailbox must not make visual deployment a false FAIL.
  console.log('PASS matching live Cloudflare brand, prize and member management UI. OTP is reported separately; no email, login, score, payment or real vote was executed.');
}
let lastError;
for(let attempt=1;attempt<=12;attempt++){
  try{await run();process.exit(0)}
  catch(error){lastError=error;console.warn('Attempt '+attempt+'/12: '+error.message);if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000))}
}
console.error('FAIL current live member readiness: '+lastError?.message);
process.exit(1);
