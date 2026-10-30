// Alan V2 2026-10-29 · real D1 acceptance client, not public registration.
// Only non-sensitive LANGUAGE preference uses localStorage; all accounts and forms use Worker.
const $=id=>document.getElementById(id),role=document.body.dataset.role;
const dict={
en:{
 safety:'STAGING ONLY · Invited TEST email addresses and fictional records. No actual registration, payments, or prizes.',
 memberTitle:'My test participant dashboard',judgeTitle:'Private invited judge dashboard',organizerTitle:'Organizer control · TEST ONLY',
 pageIntro:'Alan V2 · online auditions Jan 1–31 and Apr 1–30, live rounds March and June, final in early September 2027. D1 persistence requires approved Cloudflare setup. No official registration.',
 signinTitle:'Email verification & sign in',signinText:'Use a pre-approved TEST email. A real one-time verification code is sent only after Cloudflare Email Sending is configured.',
 email:'TEST email address',sendCode:'Email me a verification code',code:'Six-digit email code',verify:'Verify & open my personal dashboard',
 logout:'Log out',applyTitle:'Enter a fictional TEST singer',stageName:'TEST performer name',round:'Online audition window',
 janWindow:'January 1–31, 2027',aprWindow:'April 1–30, 2027',category:'Contest category',province:'Eligible province',
 basis:'Residence, study or work location',affiliation:'TEST school or occupation',song:'Song title',artist:'Original singer',
 songLanguage:'Song language',songKey:'Song key',demo:'Demo video URL (optional if uploading a TEST video)',
 demoRule:'V2: 60–90 sec of uninterrupted live singing, face and voice identifiable; no lip-sync, tuning or splicing.',
 adult:'Community category: fictional participant is 18+ at audition close.',
 student:'University category: fictional participant is currently enrolled.',
 contract:'Fictional participant has no exclusive artist contract conflicting with the contest.',
 submit:'Save fictional TEST application in D1',entries:'My persisted test entries',
 deleteTitle:'Erase TEST account',deleteText:'Remove all TEST D1 applications, scores, votes and private files linked to this participant.',
 delete:'Delete this TEST member',reviewTitle:'Stage-by-stage review scores',
 reviewIntro:'Invite-only judges. Demo = technique 60 / expression 40; live qualifier and final = 40 / 30 / 20 / 10. Each stage scores separately.',
 notLive:'This is a closed technical rehearsal. No real payment, eligibility check, official vote or award is performed.',
 signedIn:'Verified test session',saved:'Stored in Cloudflare D1',none:'No test entries yet',reviewNone:'No eligible review submissions.',
 application:'Application ID',phase:'Competition stage',status:'Review status',payment:'Payment',mockPay:'Simulate NPR 500 test payment',
 testPaid:'SIMULATED NPR 500 · no real transfer',upload:'Upload TEST 60–90 sec MP4/WebM video, max 20 MB',
 eligibility:'Upload fictional TEST eligibility PDF/image, max 5 MB',receipt:'Upload fictional TEST payment receipt PDF/image, max 5 MB',
 uploadAction:'Upload privately to R2',download:'Download private TEST demo',
 allFiles:'For review: provide a TEST video or video link, plus TEST eligibility and receipt files.',
 technique:'Technique',interpretation:'Interpretation',stagePresence:'Stage presence',appearance:'Appearance',
 conflict:'I confirm I have no direct conflict of interest.',score:'Submit TEST score',
 alreadyScored:'Score already saved',scoreSaved:'D1 score recorded',
 organizerReviewTitle:'Advance candidates manually (TEST)',organizerReviewIntro:'Invite-only organizers. Promotion requires 3 separate judge scores per stage; max 25 to live qualifiers and 8 to the final per category/window.',
 standingTitle:'Final TEST standings · website votes 51% + judges 49%',promote:'Promote to',pending:'Need 3 judge scores',
 voteStageTitle:'September final · TEST website vote',voteStageNote:'Only finalists may receive test votes. One per verified TEST email is a temporary rehearsal limit, not the published voter policy.',
 voteTest:'Submit one TEST vote',noFinalists:'No test finalists are ready yet.',noOrganizer:'No test applications yet.',
 sendSuccess:'Email requested. Check your TEST inbox.',done:'Verified. Test account data is stored on Cloudflare D1.',
 failed:'Operation failed: ',restart:'Cloudflare setup incomplete: D1 migration, Email binding, allowlist and secrets are required.',
 fileReady:'Test file stored privately in R2.',newEntry:'D1 TEST entry saved.',paymentDone:'NPR 500 mock payment logged in D1; no money charged.',
 deleted:'TEST account erased.',reviewerOnly:'This login is for invited judges only.',memberOnly:'Participant-only page.',organizerOnly:'Organizer invitation required.',
 confirmDelete:'Erase all this test account data? This cannot be undone.',user:'TEST ACCOUNT',contestRules:'V2 rehearsal terms',
 noFunds:'TEST ONLY: never upload real IDs, receipts, or remit any money.'
},
ne:{
 safety:'परीक्षण मात्र · निमन्त्रित परीक्षण इमेल र काल्पनिक डाटा। वास्तविक दर्ता वा भुक्तानी होइन।',
 memberTitle:'मेरो परीक्षण सहभागी पृष्ठ',judgeTitle:'निमन्त्रित निर्णायकको पृष्ठ',organizerTitle:'आयोजक परीक्षण नियन्त्रण',
 pageIntro:'Alan V2 · अनलाइन छनोट जनवरी १–३१ र अप्रिल १–३०; प्रत्यक्ष छनोट मार्च र जुन, सेप्टेम्बरमा फाइनल। Cloudflare जोडिएपछि मात्र D1 मा परीक्षण रेकर्ड राखिन्छ।',
 signinTitle:'इमेल प्रमाणिकरण र लगइन',signinText:'पहिल्यै स्वीकृत परीक्षण इमेल प्रयोग गर्नुहोस्। सेटिङ पूरा भएपछि एक पटक प्रयोग हुने कोड आउँछ।',
 email:'परीक्षण इमेल',sendCode:'प्रमाणीकरण कोड पठाउनुहोस्',code:'इमेलको ६-अङ्क कोड',verify:'प्रमाणित गरी मेरो पृष्ठ खोल्नुहोस्',
 logout:'लगआउट',applyTitle:'काल्पनिक परीक्षण सहभागी भर्नुहोस्',stageName:'परीक्षण गायकको नाम',round:'अनलाइन छनोट समय',
 janWindow:'जनवरी १–३१, २०२७',aprWindow:'अप्रिल १–३०, २०२७',category:'प्रतियोगिता समूह',province:'प्रदेश',
 basis:'बसोबास, अध्ययन वा काम',affiliation:'परीक्षण विद्यालय वा पेशा',song:'गीत',artist:'मूल गायक',
 songLanguage:'गीतको भाषा',songKey:'स्वर',demo:'Demo भिडियो लिंक (निजी परीक्षण भिडियो अपलोड गर्न सकिन्छ)',
 demoRule:'६०–९० सेकेन्डको अविच्छिन्न गीत; अनुहार र स्वर स्पष्ट हुनुपर्छ। सम्पादन निषेध।',
 adult:'सामाजिक समूह: काल्पनिक सहभागी अन्तिम मितिमा १८+ छ।',
 student:'विश्वविद्यालय समूह: काल्पनिक सहभागी हाल अध्ययनरत छ।',
 contract:'काल्पनिक सहभागीको विशेष कलाकार सम्झौता छैन।',
 submit:'D1 मा परीक्षण आवेदन सुरक्षित गर्नुहोस्',entries:'मेरो परीक्षण आवेदन',
 deleteTitle:'परीक्षण खाता हटाउनुहोस्',deleteText:'यस खाताको सबै परीक्षण डाटा र फाइल मेटाइनेछ।',delete:'परीक्षण खाता मेटाउनुहोस्',
 reviewTitle:'प्रत्येक चरणको निर्णायक स्कोर',reviewIntro:'निमन्त्रित निर्णायक मात्र। भिडियो ६०/४०, प्रत्यक्ष छनोट र फाइनल ४०/३०/२०/१०।',
 notLive:'परीक्षण मात्र। आधिकारिक दर्ता, भुक्तानी, मतदान वा पुरस्कार होइन।',
 signedIn:'परीक्षण सत्र प्रमाणित',saved:'Cloudflare D1 मा सुरक्षित',none:'आवेदन छैन',reviewNone:'स्कोरका लागि आवेदन छैन',
 application:'आवेदन',phase:'चरण',status:'स्थिति',payment:'भुक्तानी',mockPay:'NPR 500 नमुना भुक्तानी',
 testPaid:'नमुना NPR 500 · वास्तविक रकम होइन',upload:'परीक्षण MP4/WebM, २० MB',
 eligibility:'परीक्षण योग्यता PDF/तस्बिर, ५ MB',receipt:'परीक्षण भुक्तानी प्रमाण PDF/तस्बिर, ५ MB',
 uploadAction:'निजी R2 मा राख्नुहोस्',download:'निजी परीक्षण भिडियो लिनुहोस्',
 allFiles:'निर्णायकका लागि भिडियो र परीक्षण योग्यता/रसिद प्रमाण चाहिन्छ।',
 technique:'गायन प्राविधिक',interpretation:'गीत व्याख्या',stagePresence:'मञ्च प्रस्तुति',appearance:'समग्र प्रस्तुति',
 conflict:'मसँग प्रत्यक्ष हितको द्वन्द्व छैन।',score:'परीक्षण स्कोर पठाउनुहोस्',
 alreadyScored:'स्कोर राखिएको छ',scoreSaved:'D1 मा स्कोर राखियो',
 organizerReviewTitle:'परीक्षण छनोट अगाडि बढाउनुहोस्',organizerReviewIntro:'आयोजक निमन्त्रित मात्र। चरण परिवर्तन गर्न कम्तीमा ३ निर्णायकको स्कोर चाहिन्छ।',
 standingTitle:'फाइनल परीक्षण: वेबसाइट ५१% + निर्णायक ४९%',promote:'अगाडि बढाउनुहोस्',pending:'३ निर्णायक चाहिन्छ',
 voteStageTitle:'सेप्टेम्बर फाइनल · परीक्षण मतदान',voteStageNote:'फाइनलिस्टको परीक्षण मत मात्र; आधिकारिक मतदान नियम होइन।',
 voteTest:'परीक्षण मत दिनुहोस्',noFinalists:'फाइनलिस्ट छैनन्',noOrganizer:'परीक्षण आवेदन छैन',
 sendSuccess:'इमेल कोड मागियो।',done:'प्रमाणित भयो। डाटा D1 मा सुरक्षित रहन्छ।',
 failed:'त्रुटि: ',restart:'Cloudflare D1/Email/गोप्य सेटिङ अझै पूरा भएको छैन।',
 fileReady:'निजी R2 मा परीक्षण फाइल राखियो।',newEntry:'D1 मा आवेदन राखियो।',paymentDone:'NPR 500 नमुना घटना D1 मा राखियो।',
 deleted:'परीक्षण खाता मेटियो।',reviewerOnly:'निमन्त्रित निर्णायक मात्र',memberOnly:'सहभागी मात्र',organizerOnly:'आयोजक निमन्त्रणा आवश्यक',
 confirmDelete:'सबै परीक्षण डाटा हटाउने?',user:'परीक्षण खाता',contestRules:'V2 परीक्षण',noFunds:'वास्तविक कागजात वा पैसा नदिनुहोस्।'
},
zh:{
 safety:'僅供 V2 驗收模擬，不提供正式註冊、實際繳費或正式得獎認定。請只用受邀測試信箱與虛構資料。',
 memberTitle:'我的 Cloudflare D1 參賽測試中心',judgeTitle:'受邀評審專屬評分中心',organizerTitle:'賽事管理員測試控制台',
 pageIntro:'Alan V2：2027年1月與4月線上海選報名；3月與6月實體初賽；9月初年度決賽。Cloudflare 設定完成後才真正保存測試資料，不接受正式收件。',
 signinTitle:'Email 驗證與會員登入',signinText:'請使用列入白名單的測試信箱。完成 Cloudflare 郵件服務設定後，系統才會真正發送一次性驗證碼。',
 email:'測試 Email 帳號',sendCode:'寄出真實驗證碼',code:'Email 收到的六位驗證碼',verify:'驗證並進入我的會員中心',
 logout:'登出',applyTitle:'建立虛構參賽資料',stageName:'測試選手名稱',round:'線上海選報名窗口',
 janWindow:'2027年1月1日至31日',aprWindow:'2027年4月1日至30日',category:'參賽組別',province:'受理省份',
 basis:'符合地區的依據（居住／就學／工作）',affiliation:'虛構學校或職業',song:'歌曲名稱',artist:'原唱者',
 songLanguage:'演唱語言',songKey:'調性',demo:'Demo 影片網址（也可報名後上傳私人測試影片）',
 demoRule:'V2 Demo 限60至90秒，本人連續演唱、清楚可辨識面容與聲音，不得對嘴、修音或拼接。',
 adult:'僅社會組：虛構選手於海選截止時年滿18歲。',
 student:'僅大學組：虛構選手有正式在學身分。',
 contract:'虛構選手沒有衝突的專屬經紀或唱片合約。',
 submit:'建立 D1 測試報名紀錄',entries:'我在 D1 的測試報名紀錄',
 deleteTitle:'刪除測試會員',deleteText:'刪除我所有 D1 測試報名、評分、投票與私人 R2 測試資料；無法復原。',
 delete:'刪除整個測試帳號',reviewTitle:'分階段評審工作區',
 reviewIntro:'評審須獲邀請。海選 Demo 使用技巧60分＋詮釋40分；實體初賽、年度決賽使用技巧40＋詮釋30＋台風20＋儀態10；不同階段成績不累計。',
 notLive:'本頁為封閉功能驗收。資料若成功寫入 D1 仍不是正式報名、資格認定、付款、官網正式投票或獎金。',
 signedIn:'測試信箱已驗證',saved:'已儲存至 Cloudflare D1',none:'尚無測試報名',reviewNone:'目前沒有符合測試審核條件的作品',
 application:'報名編號',phase:'賽事階段',status:'審核狀態',payment:'付款狀態',mockPay:'模擬支付 NPR 500',
 testPaid:'NPR 500 已模擬（沒有銀行交易）',upload:'上傳測試演唱 MP4／WebM 影片（20MB內）',
 eligibility:'上傳虛構測試資格文件（PDF／圖片，5MB內）',receipt:'上傳虛構測試繳費證明（PDF／圖片，5MB內）',
 uploadAction:'送到私人 R2',download:'下載我的測試演唱影片',
 allFiles:'評審審核須具備測試影片／作品連結，以及測試資格和繳費證明。',
 technique:'歌唱技巧與音準',interpretation:'情感表達與歌曲詮釋',stagePresence:'舞台表現與台風',appearance:'儀態及整體呈現',
 conflict:'我確認與此選手沒有直接利益衝突。',score:'確認儲存測試評分',
 alreadyScored:'此階段已評分',scoreSaved:'測試評分已寫入 D1',
 organizerReviewTitle:'人工晉級與名額管理',organizerReviewIntro:'僅限受邀賽事管理員。每階段至少3位評審完成獨立評分，才能人工晉級；每場每組最多25人進實體初賽、8人進年度決賽。',
 standingTitle:'9月決賽測試總分：官網票數51%＋評審均分49%',promote:'測試人工晉級至',pending:'尚未達3位評審',
 voteStageTitle:'9月決賽官網測試投票',voteStageNote:'只有管理員晉級的決賽者可接受投票；已驗證測試會員一人一票是暫定驗收限制，不是正式票選辦法。',
 voteTest:'投下測試票',noFinalists:'目前沒有測試決賽者，須完成海選及初賽評分後人工晉級。',noOrganizer:'目前沒有D1測試報名',
 sendSuccess:'已要求寄送驗證碼，請檢查測試信箱。',done:'驗證完成，資料由 D1 儲存。',
 failed:'操作失敗：',restart:'Cloudflare 尚未設定完整：需先建立 D1 資料表、Email 寄件、白名單及密鑰。',
 fileReady:'測試檔案已存入私人 R2。',newEntry:'測試報名已寫入 D1。',paymentDone:'NPR 500 模擬付款已寫入 D1，沒有實際扣款。',
 deleted:'測試會員已刪除。',reviewerOnly:'只限受邀評審登入',memberOnly:'此頁只限參賽測試會員',organizerOnly:'需要受邀管理員權限',
 confirmDelete:'確定刪除所有測試會員資料？無法復原。',user:'測試會員',contestRules:'V2 模擬章程',noFunds:'不要在這裡上傳真實證件或匯款。'
}};
// Common, low-cognitive-load, mobile-first onboarding copy in the three locales.
const mobileCopy={
 en:{introEyebrow:'INVITED TEST · NO OFFICIAL ENTRY',stepEmail:'Email',stepVerify:'Verify',stepAccount:'My account',
 emailHint:'Use your invited TEST mailbox. We send one code to confirm you own the email address. No real IDs or payments.',
 codeHint:'Enter the 6-digit code from your TEST inbox. It is valid for 10 minutes.',changeEmail:'Use another email',
 codeSentTo:'Code sent to',stepTitle:'Step 1 of 3: Email verification'},
 ne:{introEyebrow:'निमन्त्रित परीक्षण · आधिकारिक दर्ता होइन',stepEmail:'इमेल',stepVerify:'प्रमाणित',stepAccount:'मेरो खाता',
 emailHint:'आमन्त्रित परीक्षण इमेल मात्र प्रयोग गर्नुहोस्। इमेल तपाईंको हो भन्ने पुष्टि गर्न एक कोड पठाइन्छ। वास्तविक प्रमाणपत्र वा रकम नदिनुहोस्।',
 codeHint:'परीक्षण इमेलमा आएको ६-अङ्क कोड लेख्नुहोस्। कोड १० मिनेट मान्य हुन्छ।',changeEmail:'अर्को इमेल प्रयोग गर्नुहोस्',
 codeSentTo:'कोड पठाइएको',stepTitle:'पहिलो चरण: इमेल प्रमाणिकरण'},
 zh:{introEyebrow:'受邀測試 · 非正式報名',stepEmail:'Email',stepVerify:'驗證',stepAccount:'個人中心',
 emailHint:'僅限受邀測試信箱。一次性驗證碼用來確認這個 Email 確實屬於你；請勿提供真實證件或匯款。',
 codeHint:'輸入測試信箱收到的6位驗證碼，有效期限10分鐘。',changeEmail:'更換 Email 信箱',
 codeSentTo:'驗證碼已寄至',stepTitle:'第一步：確認測試信箱'}
};
for(const l of ['en','ne','zh'])Object.assign(dict[l],mobileCopy[l]);

let lang='en';try{const p=localStorage.getItem('ghv_ui_language_v1');if(dict[p])lang=p}catch{}
let challenge='',account=null;
const t=k=>dict[lang][k]||dict.en[k]||k;
const node=(tag,value,cls)=>{const a=document.createElement(tag);if(value!==undefined)a.textContent=String(value);if(cls)a.className=cls;return a};
const message=(value,bad=false)=>{$('status').textContent=value;$('status').className='status '+(bad?'error':'good')};
function locale(l){
 lang=dict[l]?l:'en';document.documentElement.lang=lang==='zh'?'zh-Hant':lang;
 try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}
 for(const el of document.querySelectorAll('[data-lang]'))el.setAttribute('aria-pressed',String(el.dataset.lang===lang));
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 progress();
 if(account)workspace();
}
async function api(path,options={}){
 const response=await fetch('/api/e2e/'+path,{credentials:'same-origin',cache:'no-store',...options});
 let data;try{data=await response.json()}catch{throw Error('invalid_response')}
 if(!response.ok||!data.ok)throw Error(data.error||String(response.status));
 return data;
}
const post=(path,obj)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
function progress(){
 const phase=account?'account':$('verify-form').hidden?'email':'verify';
 for(const el of document.querySelectorAll('.access-step')){
  const match=el.dataset.step===phase;
  if(match)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  el.classList.toggle('current',match);
 }
}
const visible=x=>{$('signin').hidden=x;$('workspace').hidden=!x};
async function session(){
 try{
  const data=await api('me');account=data.account;
  if(account.role!==role){account=null;visible(false);message(t(role==='reviewer'?'reviewerOnly':role==='organizer'?'organizerOnly':'memberOnly'),true);return}
  visible(true);progress();$('welcome').textContent=t('signedIn')+' · '+account.id.slice(0,8);
  message(t('saved'));await workspace();
 }catch(error){account=null;visible(false);progress();message(error.message==='e2e_not_configured'?t('restart'):t('signinText'),error.message==='e2e_not_configured')}
}
async function workspace(){
 if(role==='reviewer')await judging();
 else if(role==='organizer')await organizer();
 else{await applications();await finalists()}
}
async function applications(){
 const view=$('applications');view.replaceChildren();
 try{
  const data=await api('applications');
  if(!data.applications.length){view.append(node('p',t('none')));return}
  for(const a of data.applications){
   const item=node('article',undefined,'entry');item.append(node('h3',a.stage_name+' · '+a.round_code));
   const meta=node('div',undefined,'meta');
   for(const [key,value] of [[t('application'),a.id],[t('phase'),a.phase],[t('category'),a.category],[t('status'),a.status],[t('payment'),a.payment_status]]){
    const c=node('div');c.append(node('small',key),node('strong',value));meta.append(c)}
   item.append(meta,node('p',a.song_title+' / '+a.original_artist));
   if(a.demo_url){const l=node('a',a.demo_url);l.href=a.demo_url;l.target='_blank';l.rel='noopener noreferrer';item.append(l)}
   if(a.has_uploaded_file){const l=node('a',t('download'));l.href='/api/e2e/demo-download?application='+encodeURIComponent(a.id);l.style.display='block';item.append(l)}
   const actions=node('div',undefined,'actions');
   if(a.payment_status==='unpaid'){
    const pay=node('button',t('mockPay'),'secondary');pay.type='button';
    pay.onclick=async()=>{pay.disabled=true;try{await post('mock-payment',{application_id:a.id});message(t('paymentDone'));await applications()}
    catch(err){message(t('failed')+err.message,true)}finally{pay.disabled=false}};
    actions.append(pay);
   }else actions.append(node('strong',t('testPaid')));
   for(const kind of ['demo','eligibility','receipt']){
    const label=node('label',kind==='demo'?t('upload'):kind==='eligibility'?t('eligibility'):t('receipt'));
    const file=document.createElement('input');file.type='file';
    file.accept=kind==='demo'?'video/mp4,video/webm':'application/pdf,image/png,image/jpeg';
    label.append(file);
    const ready=kind==='demo'?a.has_uploaded_file:kind==='eligibility'?a.has_eligibility_file:a.has_receipt_file;
    if(ready)label.append(node('small',' ✓ '+t('saved')));
    const btn=node('button',t('uploadAction'),'secondary');btn.type='button';
    btn.onclick=async()=>{
     const f=file.files?.[0],max=(kind==='demo'?20:5)*1024*1024;
     if(!f||f.size>max){message(t('failed')+'invalid_file_size',true);return}
     btn.disabled=true;
     try{const data=await api('demo-upload?application='+encodeURIComponent(a.id)+'&kind='+kind,
       {method:'POST',headers:{'Content-Type':f.type},body:f});
       message(t('fileReady'));await applications()}
     catch(err){message(t('failed')+err.message,true)}finally{btn.disabled=false}
    };
    actions.append(label,btn);
   }
   if(!a.has_eligibility_file||!a.has_receipt_file||(!a.has_uploaded_file&&!a.demo_url))actions.append(node('p',t('allFiles'),'micro'));
   item.append(actions);view.append(item);
  }
 }catch(err){message(t('failed')+err.message,true)}
}
async function judging(){
 const view=$('queue');view.replaceChildren();
 try{
  const {queue}=await api('reviewer-queue');
  if(!queue.length){view.append(node('p',t('reviewNone')));return}
  for(const a of queue){
   const card=node('article',undefined,'entry');
   card.append(node('h3',a.stage_name+' · '+a.round_code+' · '+a.phase),
    node('p',a.song_title+' · '+a.original_artist));
   if(a.demo_url){const l=node('a',a.demo_url);l.href=a.demo_url;l.target='_blank';l.rel='noopener noreferrer';card.append(l)}
   if(a.has_uploaded_file){const l=node('a',t('download'));l.href='/api/e2e/demo-download?application='+encodeURIComponent(a.id);card.append(l)}
   const demo=a.phase==='demo',scored=demo?a.demo_technique:a.live_technique;
   if(scored!==null&&scored!==undefined){
    const sum=demo?a.demo_technique+a.demo_interpretation:a.live_technique+a.live_interpretation+a.stage_presence+a.appearance;
    card.append(node('p',t('alreadyScored')+' · '+sum+'/100'));view.append(card);continue
   }
   const form=node('form'),group=node('div',undefined,'score-fields'),inputs={};
   for(const [field,limit] of (demo?[['technique',60],['interpretation',40]]:[['technique',40],['interpretation',30],['stagePresence',20],['appearance',10]])){
    const lab=node('label',t(field)+' · 0–'+limit),inp=document.createElement('input');
    inp.type='number';inp.min='0';inp.max=String(limit);inp.step='1';inp.required=true;lab.append(inp);group.append(lab);inputs[field]=inp}
   form.append(group);
   const checkLabel=node('label',undefined,'check'),check=document.createElement('input');
   check.type='checkbox';check.required=true;checkLabel.append(check,node('span',t('conflict')));form.append(checkLabel);
   const submit=node('button',t('score'),'primary');submit.type='submit';form.append(submit);
   form.onsubmit=async ev=>{
    ev.preventDefault();submit.disabled=true;
    const body={application_id:a.id,phase:a.phase,technique:Number(inputs.technique.value),interpretation:Number(inputs.interpretation.value),no_conflict:check.checked};
    if(!demo){body.stage_presence=Number(inputs.stagePresence.value);body.appearance=Number(inputs.appearance.value)}
    try{await post('score',body);message(t('scoreSaved'));await judging()}
    catch(err){message(t('failed')+err.message,true)}finally{submit.disabled=false}
   };
   card.append(form);view.append(card);
  }
 }catch(err){message(t('failed')+err.message,true)}
}
async function finalists(){
 const view=$('finalists');if(!view)return;view.replaceChildren();
 try{
  const {finalists}=await api('finalists');
  if(!finalists.length){view.append(node('p',t('noFinalists')));return}
  for(const a of finalists){
   const card=node('article',undefined,'entry');card.append(node('h3',a.stage_name+' · '+a.category),node('p',a.song_title));
   const btn=node('button',t('voteTest'),'secondary');btn.type='button';
   btn.onclick=async()=>{btn.disabled=true;try{await post('test-vote',{application_id:a.id});message(t('saved'))}
     catch(err){message(t('failed')+err.message,true)}finally{btn.disabled=false}};
   card.append(btn);view.append(card);
  }
 }catch(err){message(t('failed')+err.message,true)}
}
async function organizer(){
 const apps=$('admin-apps'),board=$('standings');if(!apps||!board)return;
 apps.replaceChildren();board.replaceChildren();
 try{
  const {applications:items}=await api('organizer-queue');
  if(!items.length)apps.append(node('p',t('noOrganizer')));
  for(const a of items){
   const box=node('article',undefined,'entry');box.append(node('h3',a.stage_name+' · '+a.round_code+' · '+a.category));
   box.append(node('p',a.phase+' · '+a.status+' · '+a.payment_status));
   box.append(node('p','Demo '+a.demo_judges+'/3 (avg '+(a.demo_mean??'—')+') · Live '+a.live_judges+'/3 (avg '+(a.live_mean??'—')+')'));
   if(a.phase!=='final'&&a.payment_status==='simulated_paid'){
    const next=a.phase==='demo'?'qualifier':'final',b=node('button',t('promote')+' '+next,'secondary');b.type='button';
    b.disabled=(a.phase==='demo'?a.demo_judges:a.live_judges)<3;
    b.onclick=async()=>{b.disabled=true;try{await post('organizer-promote',{application_id:a.id,to_phase:next});message(t('saved'));await organizer()}
     catch(err){message(t('failed')+err.message,true)}finally{b.disabled=false}};
    box.append(b);
   }apps.append(box);
  }
  const {standings}=await api('standings');
  for(const x of standings){
   const box=node('article',undefined,'entry');
   box.append(node('h3',x.stage_name+' · '+x.category));
   box.append(node('p','TEST votes '+x.votes+' · normalized '+x.vote_score+' · jury '+(x.judges_mean??'—')+' · total '+(x.total_score??'awaiting 3 judge scores')));
   board.append(box);
  }
 }catch(err){message(t('failed')+err.message,true)}
}
$('send-form').onsubmit=async ev=>{
 ev.preventDefault();const btn=$('send-form').querySelector('button');btn.disabled=true;
 try{const result=await post('request-code',{email:$('email').value,role});challenge=result.challenge_id;
   $('send-form').hidden=true;$('verify-form').hidden=false;$('verify-mailbox').textContent=t('codeSentTo')+' '+$('email').value.trim();progress();$('code').focus();message(t('sendSuccess'))}
 catch(err){message(t('failed')+err.message,true)}finally{btn.disabled=false}
};
$('verify-form').onsubmit=async ev=>{
 ev.preventDefault();const btn=$('verify-form').querySelector('button');btn.disabled=true;
 try{await post('verify-code',{challenge_id:challenge,code:$('code').value});$('code').value='';await session();message(t('done'))}
 catch(err){message(t('failed')+err.message,true)}finally{btn.disabled=false}
};
$('logout').onclick=async()=>{
 try{await post('logout',{});account=null;visible(false);$('verify-form').hidden=true;$('send-form').hidden=false;progress();message(t('signinText'))}
 catch(err){message(t('failed')+err.message,true)}
};
if($('application-form'))$('application-form').onsubmit=async ev=>{
 ev.preventDefault();const btn=$('application-form').querySelector('button');btn.disabled=true;
 const data={
 round_code:$('round').value,category:$('category').value,province:$('province').value,
 location_basis:$('basis').value,affiliation:$('affiliation').value,stage_name:$('stage').value,
 song_title:$('song').value,original_artist:$('artist').value,song_language:$('song-language').value,
 song_key:$('song-key').value,demo_url:$('demo').value,adult_confirmed:$('adult').checked,
 student_confirmed:$('student').checked,no_exclusive_contract:$('contract').checked
 };
 try{await post('applications',data);message(t('newEntry'));await applications()}
 catch(err){message(t('failed')+err.message,true)}finally{btn.disabled=false}
};
if($('delete-account'))$('delete-account').onclick=async()=>{
 if(!confirm(t('confirmDelete')))return;
 try{await post('delete-my-data',{});account=null;visible(false);message(t('deleted'))}
 catch(err){message(t('failed')+err.message,true)}
};
$('change-email').onclick=()=>{
 $('verify-form').hidden=true;$('send-form').hidden=false;challenge='';$('code').value='';progress();$('email').focus();
};
for(const b of document.querySelectorAll('[data-lang]'))b.onclick=()=>locale(b.dataset.lang);
locale(lang);session();
