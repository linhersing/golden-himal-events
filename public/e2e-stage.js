// Real Cloudflare staging API client. No localStorage member state and no real funds.
const role=document.body.dataset.role;
const $=id=>document.getElementById(id);
const translations={
en:{safety:'Only invite-listed test email addresses and test media. Payments never charge money.',
memberTitle:'My D1-backed test account',judgeTitle:'Reviewer login & scorecards',
pageIntro:'This acceptance test uses real server-side D1 records, not browser localStorage. A one-time email code is used; production password management is not enabled.',
signinTitle:'Email verification & sign in',signinText:'Use an organizer-allowlisted TEST mailbox. When enabled, a real one-time code is delivered by email.',
email:'TEST email address',sendCode:'Send email code',code:'6-digit verification code',verify:'Verify and open my dashboard',
logout:'Log out',applyTitle:'Submit a TEST audition entry',stageName:'Fictional stage name',round:'Qualifying round',
category:'Category',demo:'YouTube or TikTok performance URL',adult:'I confirm the fictional TEST participant is 18+. This is not identity verification.',
submit:'Save application to Cloudflare D1',entries:'My saved TEST entries',deleteTitle:'Erase my TEST account',
deleteText:'Delete all my TEST applications, scores, sessions and private test files. This cannot be undone.',
delete:'Delete my TEST account',reviewTitle:'Private judge dashboard',reviewIntro:'Only pre-approved judge emails can access this page. Proposed demo scoring: technique 0–60, interpretation 0–40; not official regulations.',
notLive:'TEST ONLY: real D1 persistence does not imply real eligibility verification, real fees or official judging.',
signedIn:'Signed in to D1 staging',none:'No saved applications yet.',reviewNone:'No mock-paid entries to review yet.',
application:'Application',status:'Review status',payment:'Payment',saved:'Stored in Cloudflare D1',mockPay:'Simulate NPR 500 payment',testPaid:'SIMULATED PAID — no bank transfer',
upload:'Upload private TEST audio/video (max 20MB)',uploadAction:'Send file to private R2',fileUnavailable:'Media upload requires a private R2 bucket configured.',
technique:'Technique (0–60)',interpretation:'Interpretation (0–40)',conflict:'I have no conflict of interest with this contestant.',
score:'Submit my test score',scoreSaved:'Score saved to D1',alreadyScored:'My submitted score',download:'Download private TEST media',
consentDelete:'Delete this entire TEST account and all associated test entries? This cannot be undone.',
sendSuccess:'Verification code requested. Check your TEST inbox.',done:'Successfully verified. This test session is backed by D1.',
failed:'Action failed: ',restart:'Email and registration are unavailable until Cloudflare staging bindings are configured.',
fileReady:'Private test file stored in R2.',newEntry:'Application saved in D1.',paymentDone:'Mock NPR 500 payment recorded in D1 — no real money.',
deleted:'TEST account and associated D1 records deleted.',reviewerOnly:'This page is for invited reviewers only.',memberOnly:'This page is for test participants only.'},
zh:{safety:'僅使用主辦方核准的測試信箱與測試作品，絕不收取真實款項。',
memberTitle:'我的 D1 資料庫測試帳戶',judgeTitle:'評審專屬登入與評分頁',
pageIntro:'這是真正寫入 Cloudflare D1 的測試環境，不使用瀏覽器暫存作會員資料。現階段以 Email 一次性驗證碼登入；正式密碼服務尚未啟用。',
signinTitle:'Email 驗證與會員登入',signinText:'請使用主辦方事先列入名單的測試信箱。郵件服務設定完成後，系統會真正寄送一次性驗證碼。',
email:'測試用 Email 信箱',sendCode:'寄送驗證碼',code:'Email 收到的六位驗證碼',verify:'確認驗證，進入個人首頁',
logout:'登出',applyTitle:'建立測試參賽資料',stageName:'虛構參賽名稱',round:'初賽場次',category:'參賽組別',
demo:'YouTube 或 TikTok 作品連結',adult:'我確認虛構測試人物年滿18歲。此勾選並非正式年齡驗證。',
submit:'送出並儲存至 Cloudflare D1',entries:'我的測試報名紀錄',deleteTitle:'刪除我的測試帳戶',
deleteText:'刪除我所有的 D1 測試報名、模擬付款、評分與私人測試作品，無法復原。',
delete:'刪除測試帳號及資料',reviewTitle:'評審專屬評分工作區',reviewIntro:'只有事先核准的評審信箱可以登入。測試配分：演唱技巧0–60、詮釋表現0–40，尚非正式賽制。',
notLive:'測試版：D1 真的保存測試紀錄，但不代表正式資格驗證、真實收款或正式評分。',
signedIn:'已登入 D1 測試環境',none:'尚無儲存的測試報名。',reviewNone:'目前沒有模擬付款後可評分的作品。',
application:'報名編號',status:'審核狀態',payment:'付款狀態',saved:'已存入 Cloudflare D1',
mockPay:'模擬支付 NPR 500',testPaid:'模擬付款完成，沒有銀行交易',
upload:'上傳私人測試音訊／影片（20MB內）',uploadAction:'上傳至私人 R2',fileUnavailable:'上傳需先配置 Cloudflare 私人 R2 儲存桶。',
technique:'演唱技巧（0–60）',interpretation:'詮釋表現（0–40）',conflict:'我確認與該位參賽者沒有利益衝突。',
score:'儲存我的測試評分',scoreSaved:'評分已寫入 D1',alreadyScored:'我已提交的分數',download:'下載私人測試作品',
consentDelete:'確定刪除整個測試會員與所有關聯資料嗎？無法復原。',
sendSuccess:'已要求寄送驗證碼，請查看測試信箱。',done:'已完成驗證，個人資料將由 D1 保存。',
failed:'操作失敗：',restart:'必須先完成 Cloudflare 測試資料庫及寄信綁定才能操作。',
fileReady:'測試作品已儲存在私人 R2。',newEntry:'測試報名已寫入 D1。',paymentDone:'模擬 NPR 500 付款已記錄至 D1，沒有真正扣款。',
deleted:'測試帳戶及所屬資料已刪除。',reviewerOnly:'此頁僅限獲邀評審登入。',memberOnly:'此頁僅供測試參賽者登入。'},
ne:{safety:'स्वीकृत परीक्षण इमेल र नमुना भिडियो मात्र प्रयोग गर्नुहोस्। वास्तविक रकम लिइँदैन।',
memberTitle:'मेरो D1 परीक्षण सदस्य पृष्ठ',judgeTitle:'निर्णायक लगइन र मूल्याङ्कन',
pageIntro:'यो वास्तविक D1 डाटाबेसमा परीक्षण अभिलेख राख्ने प्रणाली हो, ब्राउजरको localStorage होइन। अहिले इमेल कोडबाट लगइन हुन्छ; वास्तविक पासवर्ड सेवा सक्रिय छैन।',
signinTitle:'इमेल प्रमाणिकरण र लगइन',signinText:'आयोजकबाट स्वीकृत परीक्षण इमेल प्रयोग गर्नुहोस्। सेवा तयार भएपछि वास्तविक प्रमाणीकरण कोड पठाइन्छ।',
email:'परीक्षण इमेल',sendCode:'इमेल कोड पठाउनुहोस्',code:'इमेलको ६-अङ्क कोड',verify:'प्रमाणित गरेर मेरो पृष्ठ खोल्नुहोस्',
logout:'लगआउट',applyTitle:'परीक्षण प्रतियोगिता दर्ता',stageName:'काल्पनिक मञ्च नाम',round:'छनोट चरण',category:'समूह',
demo:'YouTube वा TikTok भिडियो लिंक',adult:'काल्पनिक परीक्षण सहभागी १८ वर्ष पुगेको पुष्टि गर्छु। यो वास्तविक पहिचान जाँच होइन।',
submit:'D1 मा परीक्षण आवेदन राख्नुहोस्',entries:'मेरा परीक्षण आवेदनहरू',deleteTitle:'परीक्षण खाता हटाउनुहोस्',
deleteText:'मेरा सबै परीक्षण आवेदन, स्कोर र निजी फाइल हटाउँछ। पुनःप्राप्त गर्न सकिँदैन।',
delete:'परीक्षण खाता मेटाउनुहोस्',reviewTitle:'निर्णायकको निजी स्कोर पृष्ठ',reviewIntro:'स्वीकृत निर्णायक इमेलले मात्र प्रवेश पाउँछ। परीक्षण स्कोर: प्राविधिक ०–६०, व्याख्या ०–४०।',
notLive:'यो परीक्षण मात्र हो। D1 अभिलेख, वास्तविक भुक्तानी वा आधिकारिक मूल्याङ्कन होइन।',
signedIn:'D1 परीक्षणमा लगइन भयो',none:'अहिलेसम्म आवेदन छैन।',reviewNone:'मूल्याङ्कनका लागि कुनै आवेदन छैन।',
application:'आवेदन नं.',status:'समीक्षा',payment:'भुक्तानी',saved:'Cloudflare D1 मा सुरक्षित',
mockPay:'NPR 500 को नमुना भुक्तानी',testPaid:'नमुना भुक्तानी मात्र—वास्तविक होइन',
upload:'निजी परीक्षण अडियो/भिडियो (२०MB)',uploadAction:'निजी R2 मा पठाउनुहोस्',fileUnavailable:'R2 भण्डार जोड्नुपर्छ।',
technique:'प्राविधिक (०–६०)',interpretation:'व्याख्या (०–४०)',conflict:'मेरो हितको द्वन्द्व छैन।',
score:'परीक्षण स्कोर पठाउनुहोस्',scoreSaved:'D1 मा स्कोर राखियो',alreadyScored:'मेरो स्कोर',download:'निजी परीक्षण फाइल',
consentDelete:'खाता र सबै परीक्षण डाटा मेटाउने हो?',sendSuccess:'इमेल कोड पठाउन अनुरोध गरियो।',done:'प्रमाणित भयो।',
failed:'त्रुटि: ',restart:'पहिले Cloudflare को डाटाबेस र इमेल सेवा सेट गर्नुपर्छ।',
fileReady:'निजी R2 मा फाइल सुरक्षित भयो।',newEntry:'D1 मा आवेदन राखियो।',paymentDone:'NPR 500 नमुना भुक्तानी D1 मा राखियो।',
deleted:'परीक्षण खाता मेटाइयो।',reviewerOnly:'निर्णायकका लागि मात्र।',memberOnly:'परीक्षण सहभागीका लागि मात्र।'}
};
let lang=(()=>{try{return localStorage.getItem('ghv_ui_language_v1')||'en'}catch{return'en'}})();if(!translations[lang])lang='en';
let challenge=null,logged=null;
function t(key){return translations[lang][key]||translations.en[key]||key}
function text(id,v){$(id).textContent=String(v)}
function e(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n}
function status(msg,kind=''){text('status',msg);$('status').className='status '+kind}
function locale(value){lang=translations[value]?value:'en';document.documentElement.lang=lang==='zh'?'zh-Hant':lang;
 try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
 document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
 if(logged)loadWorkspace();
}
async function call(path,options={}){
 const resp=await fetch('/api/e2e/'+path,{credentials:'same-origin',cache:'no-store',...options});
 let data;try{data=await resp.json()}catch{throw Error('invalid_response')}
 if(!resp.ok||!data.ok)throw Error(data.error||String(resp.status));
 return data;
}
const post=(path,data)=>call(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function toggleSession(active){$('signin').hidden=active;$('workspace').hidden=!active}
async function checkSession(){
 try{
  const result=await call('me');logged=result.account;
  if(logged.role!==role){toggleSession(false);status(t(role==='reviewer'?'reviewerOnly':'memberOnly'),'error');return}
  toggleSession(true);text('welcome',t('signedIn')+' · '+logged.id.slice(0,8)+' · '+logged.role);status(t('saved'),'good');
  await loadWorkspace();
 }catch(error){logged=null;toggleSession(false);status(error.message==='e2e_not_configured'?t('restart'):t('signinText'),'error')}
}
async function loadWorkspace(){
 if(role==='reviewer')await loadJudging();else await loadApplications();
}
async function loadApplications(){
 const view=$('applications');view.replaceChildren();
 try{
 const result=await call('applications');
 if(!result.applications.length){view.append(e('p',t('none')));return}
 for(const app of result.applications){
  const article=e('article',undefined,'entry');article.append(e('h3',app.stage_name));
  const meta=e('div',undefined,'meta');
  for(const [label,value] of [[t('application'),app.id],[t('round'),app.round_code],[t('category'),app.category],[t('status'),app.status],[t('payment'),app.payment_status],[t('saved'),new Date(app.created_at*1000).toLocaleString()]]){const wrap=e('div');wrap.append(e('small',label),e('strong',value));meta.append(wrap)}
  article.append(meta);
  if(app.demo_url){const link=e('a',app.demo_url);link.href=app.demo_url;link.target='_blank';link.rel='noopener noreferrer';article.append(link)}
  if(app.has_uploaded_file){const link=e('a',t('download'));link.href='/api/e2e/demo-download?application='+encodeURIComponent(app.id);link.style.display='block';article.append(link)}
  const actions=e('div',undefined,'actions');
  if(app.payment_status==='unpaid'){
    const pay=e('button',t('mockPay'),'secondary');pay.type='button';pay.addEventListener('click',async()=>{
      pay.disabled=true;try{await post('mock-payment',{application_id:app.id});status(t('paymentDone'),'good');await loadApplications()}catch(err){status(t('failed')+err.message,'error')}finally{pay.disabled=false}});
    actions.append(pay);
  }else actions.append(e('strong',t('testPaid')));
  const label=e('label',t('upload'));const file=document.createElement('input');file.type='file';file.accept='audio/mpeg,audio/mp4,audio/ogg,audio/wav,video/mp4,video/webm';label.append(file);
  const upload=e('button',t('uploadAction'),'secondary');upload.type='button';
  upload.addEventListener('click',async()=>{
   const chosen=file.files?.[0];if(!chosen||chosen.size>20*1024*1024){status(t('failed')+'invalid_file_size','error');return}
   upload.disabled=true;try{
    const response=await fetch('/api/e2e/demo-upload?application='+encodeURIComponent(app.id),{method:'POST',headers:{'Content-Type':chosen.type},body:chosen,credentials:'same-origin'});
    const payload=await response.json();if(!response.ok||!payload.ok)throw Error(payload.error||response.status);
    status(t('fileReady'),'good');await loadApplications()
   }catch(err){status(t('failed')+err.message,'error')}finally{upload.disabled=false}
  });
  actions.append(label,upload);article.append(actions);view.append(article);
 }
 }catch(error){status(t('failed')+error.message,'error')}
}
async function loadJudging(){
 const view=$('queue');view.replaceChildren();
 try{
 const {queue}=await call('reviewer-queue');if(!queue.length){view.append(e('p',t('reviewNone')));return}
 for(const app of queue){
  const article=e('article',undefined,'entry');article.append(e('h3',app.stage_name+' · '+app.round_code));
  article.append(e('p',app.id+' · '+app.category+' · '+app.payment_status));
  if(app.demo_url){const link=e('a',app.demo_url);link.href=app.demo_url;link.target='_blank';link.rel='noopener noreferrer';article.append(link)}
  if(app.has_uploaded_file){const link=e('a',t('download'));link.href='/api/e2e/demo-download?application='+encodeURIComponent(app.id);link.style.display='block';article.append(link)}
  if(app.technique!==null&&app.technique!==undefined){article.append(e('p',t('alreadyScored')+': '+(app.technique+app.interpretation)+'/100'));view.append(article);continue}
  const form=e('form'),scores=e('div',undefined,'score-fields');
  const inputs=[];
  for(const [key,max] of [['technique',60],['interpretation',40]]){
   const wrap=e('div'),label=e('label',t(key));const input=document.createElement('input');input.type='number';input.required=true;input.min='0';input.max=String(max);input.step='1';
   label.append(input);wrap.append(label);scores.append(wrap);inputs.push(input)}
  form.append(scores);
  const wrap=e('label',undefined,'check'),check=document.createElement('input');check.type='checkbox';check.required=true;
  wrap.append(check,e('span',t('conflict')));form.append(wrap);
  const button=e('button',t('score'),'primary');button.type='submit';form.append(button);
  form.addEventListener('submit',async event=>{
   event.preventDefault();button.disabled=true;
   try{await post('score',{application_id:app.id,technique:Number(inputs[0].value),interpretation:Number(inputs[1].value),no_conflict:check.checked});
    status(t('scoreSaved'),'good');await loadJudging()
   }catch(err){status(t('failed')+err.message,'error')}finally{button.disabled=false}
  });article.append(form);view.append(article);
 }
 }catch(err){status(t('failed')+err.message,'error')}
}
$('send-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=$('send-form').querySelector('button');btn.disabled=true;
 try{const result=await post('request-code',{email:$('email').value,role});
  challenge=result.challenge_id;$('verify-form').hidden=false;status(t('sendSuccess'),'good');$('code').focus()
 }catch(err){status(t('failed')+err.message,'error')}finally{btn.disabled=false}
});
$('verify-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=$('verify-form').querySelector('button');btn.disabled=true;
 try{await post('verify-code',{challenge_id:challenge,code:$('code').value});$('code').value='';await checkSession();status(t('done'),'good')}
 catch(err){status(t('failed')+err.message,'error')}finally{btn.disabled=false}
});
$('logout').addEventListener('click',async()=>{
 try{await post('logout',{});logged=null;challenge=null;$('verify-form').hidden=true;toggleSession(false);status(t('signinText'))}catch(err){status(t('failed')+err.message,'error')}
});
if($('application-form'))$('application-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const button=$('application-form').querySelector('button');button.disabled=true;
 try{await post('applications',{round_code:$('round').value,category:$('category').value,stage_name:$('stage').value,demo_url:$('demo').value,adult_confirmed:$('adult').checked});
  status(t('newEntry'),'good');await loadApplications()
 }catch(err){status(t('failed')+err.message,'error')}finally{button.disabled=false}
});
if($('delete-account'))$('delete-account').addEventListener('click',async()=>{
 if(!confirm(t('consentDelete')))return;
 try{await post('delete-my-data',{});logged=null;toggleSession(false);status(t('deleted'),'good')}
 catch(err){status(t('failed')+err.message,'error')}
});
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>locale(b.dataset.lang)));
locale(lang);checkSession();
