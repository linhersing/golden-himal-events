// Live read-only status probe; NOT a proof of successful OTP delivery or storage.
// Node.js 20+, no credentials, GET only.
const BASE='https://golden-himal-voice-preview.linhersing.workers.dev';
const response=await fetch(BASE+'/api/staging/e2e-readiness',{
 method:'GET',headers:{'Accept':'application/json'},cache:'no-store',
 signal:AbortSignal.timeout(12000)
});
if(!response.ok){
 console.log('Cloudflare readiness endpoint HTTP '+response.status);
 process.exitCode=1;
}else{
 const data=await response.json();
 const rows=data.resources||{};
 console.log(JSON.stringify({timestamp:new Date().toISOString(),
   cloudflareLive:true,readiness:data.readiness,resources:rows,
   warning:'READY flags do not prove real Email OTP delivery, D1 account writes, or private R2 uploads.'},null,2));
 if(!data.testOnly||!['READY_FOR_INVITED_OTP_TEST','BLOCKED'].includes(data.readiness))process.exitCode=1;
}
