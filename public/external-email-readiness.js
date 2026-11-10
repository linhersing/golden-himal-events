// Read-only organizer TEST readiness; never expose Cloudflare secret values.
// Does not change Worker variables, D1 records or registration switches.
const button=document.getElementById('external-email-check');
const output=document.getElementById('external-email-results');
const labels={
 stagingEnabled:'測試登入模式／TEST login enabled',
 publicTestApproved:'外部 Email 測試已獲准／External TEST switch approved',
 linksOnly:'僅使用外部作品連結／Links-only submissions',
 verifiedSenderConfigured:'Resend 寄件網域符合／Verified sender configured',
 resendKeyConfigured:'Resend 寄件金鑰可供檢查／Sender key configured',
 turnstileSiteConfigured:'Cloudflare 防機器人網站金鑰／Turnstile site key',
 turnstileSecretConfigured:'Cloudflare 防機器人伺服器金鑰／Turnstile secret key',
 isolatedDatabaseReady:'隔離測試資料庫已遷移／Staging D1 migration'
};
if(button&&output){
 button.addEventListener('click',async()=>{
  button.disabled=true;
  output.hidden=false;
  output.replaceChildren();
  output.textContent='Checking TEST prerequisites…';
  try{
   const response=await fetch('/api/e2e/organizer-signup-readiness',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'}
   });
   if(!response.ok){
    output.textContent=response.status===401||response.status===403?
     '請先使用主辦人員身分登入，再重新檢查。 / Organizer login required.':
     '目前無法查詢測試設定，請稍後再試。 / TEST readiness unavailable.';
    return;
   }
   const report=await response.json();
   if(report.ok!==true||report.testOnly!==true||!report.checks||typeof report.checks!=='object')
    throw Error('invalid_readiness_report');
   const title=document.createElement('strong');
   title.textContent=report.ready?
    '受控外部 Email TEST 已具備開通條件；仍須真人收信及資料驗收。':
    '尚未開放外部 Email 測試：請先完成下列未通過項目。';
   const list=document.createElement('ul');
   for(const [key,text] of Object.entries(labels)){
    const item=document.createElement('li');
    item.textContent=(report.checks[key]===true?'✓ ':'○ ')+text;
    list.append(item);
   }
   output.replaceChildren(title,list);
  }catch{
   output.textContent='系統檢查暫時失敗，不能視為已開放。 / Safety preflight failed.';
  }finally{button.disabled=false}
 });
}
