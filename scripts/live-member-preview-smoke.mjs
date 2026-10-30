// Read-only smoke check against deployed Cloudflare static assets, not just GitHub Pages.
// NO POST, no real data, no Cloudflare secrets or D1 mutation.
const BASE='https://golden-himal-voice-preview.linhersing.workers.dev';
const checks=[
  ['/', ['會員／報名試作 TEST', 'TEST LAB']],
  ['/member-portal.html',['TEST ONLY','建立你的虛構會員','member-portal.js']],
  ['/member-portal.js',['signUpMock','simulatePayment','seed20']],
  ['/member-portal-model.mjs',['PERSONAS','blankPortal','@example.invalid']]
];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function checkOnce(){
  for(const [path,markers] of checks){
    const response=await fetch(BASE+path,{method:'GET',cache:'no-store',
      headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error(path+' HTTP '+response.status);
    const content=await response.text();
    if(content.length<100)throw Error(path+' empty body');
    for(const marker of markers)if(!content.includes(marker))
      throw Error(path+' missing marker '+JSON.stringify(marker));
    console.log('PASS Cloudflare HTTP '+response.status+' '+path);
  }
}
let error;
for(let i=1;i<=12;i++){
  try{
    await checkOnce();
    console.log('PASS newest MEMBER TEST UI visible on Cloudflare Worker preview, GET only; this is NOT a real account backend.');
    process.exit(0);
  }catch(e){
    error=e;
    console.warn('Attempt '+i+'/12: '+e.message);
    if(i<12)await pause(10000);
  }
}
console.error('FAIL Cloudflare Worker still lacks latest membership preview: '+error?.message);
console.error('GitHub Pages green does NOT prove Cloudflare Worker auto build success. Inspect Cloudflare Workers Builds deployment settings.');
process.exit(1);
