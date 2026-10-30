import {PERSONAS,blankPortal,safeParsePortal,signUpMock} from './member-portal-model.mjs';
// DEMONSTRATION ONLY. No real authentication, credential storage, PII or network calls.
// A publicly visible shared passcode does not secure anything.
const DATA_KEY='ghv_member_sandbox_v1';
const SESSION_KEY='ghv_demo_active_member_v1';
const PASSCODE='GHV-TEST-2027';
const $=id=>document.getElementById(id);
const text=(id,value)=>{$(id).textContent=String(value)};
const translations={
 en:{
  demoHeading:'TEST ONLY · NOT REAL AUTHENTICATION',introEyebrow:'CONTESTANT AREA · TEST PREVIEW',cardEyebrow:'MEMBER ACCESS',sandboxBadge:'TEST PREVIEW',actionEyebrow:'YOUR NEXT STEP',submissionsEyebrow:'MY SUBMISSIONS',footerDemo:'GOLDEN HIMAL VOICE · MEMBER JOURNEY TEST ONLY',
  testBanner:'Use only the displayed fictional test account and demo passcode. Never enter a real password, personal information, or payment details.',
  backHome:'← Event home',welcome:'Your stage. Your account.',
  welcomeText:'Sign in to your personal area to see your competition entry, demo submission, mock NPR 500 payment and screening progress — all in one place.',
  step1:'Create a test account',step2:'Submit a demo & test payment',step3:'Return here to track your result',
  sameDevice:'Test entries remain on this browser and website address only; they are not real Cloudflare member accounts.',
  signInTitle:'Member sign in',signInIntro:"Already registered in this browser's member test? Use the fictional ID and shared demo passcode below.",
  usernameLabel:'Fictional test Email (account) / Member ID',passwordLabel:'Demo password (not a real password)',
  toggleReveal:'Show',toggleHide:'Hide',testCredentials:'Use only these public demonstration credentials:',
  signInBtn:'Sign in to my test account',newMember:'First time here? Create a fictional test member.',
  chooseTestPerson:'Choose a fictional participant',createTestAccount:'Create test account & open my area',
  notSecure:'This shared demo passcode proves nothing about identity. No password is saved or sent. Real sign-in will require a secure server, individual credentials and verified sessions before launch.',
  personalArea:'MY MEMBER AREA · DEMO',dashboardTitle:'My competition dashboard',signOut:'Sign out (demo)',
  localOnly:'This is a browser-only test account. No identity, uploaded media, payment or official entry is stored in the real back end.',
  memberId:'Member ID',currentStatus:'My current status',statusNotOfficial:'Test status · not an official decision',
  paymentStatus:'Payment status',paymentNotReal:'Simulated NPR 500 only · no real money',
  nextAction:'What should I do next?',continueApplication:'Continue my test application',
  myDetails:'ACCOUNT PROFILE · TEST',accountTitle:'My details',myEntries:'My registrations and demos',
  manageEntries:'Manage test submission →',testRegistration:'Registration & mock payment lab',backEvent:'Back to event homepage',
  needUsername:'Enter the fictional test account identifier.',incorrectLogin:'No matching test account on this browser, or the demo passcode is incorrect.',
  blocked:'This test fixture is under 18 and must not be registered.',alreadyMember:'This participant already has a test account. Sign in using the public demo passcode.',
  created:'Fictional account created. You are now in the personal dashboard.',
  labelAlias:'Fictional name',labelEmail:'Example email',labelCategory:'2027 category',labelAge:'Simulated age',labelVerification:'Verification',
  university:'University',community:'Open / community',mockOnly:'MOCK ONLY',
  noneStatus:'No entry yet',submitted:'Under review (test)',needs_info:'Correction requested (test)',shortlisted:'Selected for qualifier (test)',rejected:'Not selected (test)',finalist:'Qualified for final (test)',
  noPayment:'No test order',unpaid:'Payment not simulated',failed:'Payment simulation failed',paid:'Mock paid NPR 500',refund_pending:'Test refund pending',refunded:'Test refunded',
  firstStep:'You have a test member account. Continue to the registration lab and create a fictional Demo submission.',
  payStep:'Your mock application is on file. Continue to the test checkout to rehearse the NPR 500 payment — no real money.',
  correctionStep:'The test reviewer requested changes. Open the rehearsal workspace to inspect the record; actual correction uploads are not yet available.',
  reviewStep:'Your sample entry is recorded. Check back here to view the latest simulated review status.',
  qualifiedStep:'Your sample has a positive review state. This is only a rehearsal result; it is not an official invitation.',
  rejectedStep:'The fictional review result is not selected. A real appeal process has not been activated.',
  stage:'Round',demo:'Demo submission',payment:'Payment',review:'Review',noEntry:'No test application yet. Use the button above to start a fictional registration.',
  demoNotUploaded:'Fixed demo fixture only; no video was uploaded.',noteSameBrowser:'Sign-in works only with test records created on this exact website and browser.',
  ready:'Welcome back,',testPersonLabel:'TEST / fictional'
 },
 ne:{
  demoHeading:'परीक्षण मात्र · वास्तविक लगइन होइन',introEyebrow:'प्रतियोगी क्षेत्र · परीक्षण',cardEyebrow:'सदस्य लगइन',sandboxBadge:'परीक्षण',actionEyebrow:'अब के गर्ने',submissionsEyebrow:'मेरा आवेदनहरू',footerDemo:'गोल्डेन हिमाल भ्वाइस · सदस्य परीक्षण मात्र',
  testBanner:'यहाँ देखाइएको काल्पनिक परीक्षण खाता र डेमो पासकोड मात्र प्रयोग गर्नुहोस्। वास्तविक पासवर्ड, व्यक्तिगत विवरण वा भुक्तानी जानकारी नहाल्नुहोस्।',
  backHome:'← कार्यक्रमको मुख्य पृष्ठ',welcome:'तपाईंको मञ्च। तपाईंको खाता।',
  welcomeText:'आफ्नो प्रतियोगिता आवेदन, डेमो, NPR 500 को नमुना भुक्तानी र छनोटको अवस्था एउटै ठाउँमा हेर्न साइन इन गर्नुहोस्।',
  step1:'परीक्षण खाता बनाउनुहोस्',step2:'डेमो र नमुना भुक्तानी गर्नुहोस्',step3:'नतिजा हेर्न फेरि यहाँ आउनुहोस्',
  sameDevice:'परीक्षण विवरण यही ब्राउजर र वेबसाइट ठेगानामा मात्र रहन्छन्। यी वास्तविक Cloudflare सदस्य खाताहरू होइनन्।',
  signInTitle:'सदस्य साइन इन',signInIntro:'यस ब्राउजरमा परीक्षण सदस्य बनाइसक्नुभयो? तलको काल्पनिक ID र साझा परीक्षण कोड प्रयोग गर्नुहोस्।',
  usernameLabel:'काल्पनिक परीक्षण इमेल (खाता) / सदस्य ID',passwordLabel:'डेमो पासकोड (वास्तविक पासवर्ड होइन)',
  toggleReveal:'देखाउनुहोस्',toggleHide:'लुकाउनुहोस्',testCredentials:'यी सार्वजनिक नमुना विवरण मात्र प्रयोग गर्नुहोस्:',
  signInBtn:'मेरो परीक्षण खातामा साइन इन',newMember:'पहिलो पटक आउनुभएको हो? काल्पनिक परीक्षण खाता बनाउनुहोस्।',
  chooseTestPerson:'काल्पनिक सहभागी छान्नुहोस्',createTestAccount:'परीक्षण खाता बनाएर मेरो पृष्ठ खोल्नुहोस्',
  notSecure:'यो साझा डेमो कोडले वास्तविक पहिचान प्रमाणित गर्दैन। पासवर्ड न त सुरक्षित राखिन्छ न पठाइन्छ। वास्तविक सेवा सुरु गर्न सुरक्षित सर्भर, व्यक्तिगत लगइन र प्रमाणित सेसन आवश्यक छ।',
  personalArea:'मेरो सदस्य पृष्ठ · डेमो',dashboardTitle:'मेरो प्रतियोगिता विवरण',signOut:'साइन आउट (डेमो)',
  localOnly:'यो ब्राउजरमा मात्र चल्ने परीक्षण खाता हो। वास्तविक सर्भरमा व्यक्तिगत पहिचान, भिडियो, भुक्तानी वा आधिकारिक आवेदन छैन।',
  memberId:'सदस्य ID',currentStatus:'हालको अवस्था',statusNotOfficial:'परीक्षण अवस्था · आधिकारिक निर्णय होइन',
  paymentStatus:'भुक्तानी अवस्था',paymentNotReal:'NPR 500 को नक्कली परीक्षण मात्र · वास्तविक रकम होइन',
  nextAction:'अब के गर्ने?',continueApplication:'परीक्षण आवेदन जारी राख्नुहोस्',
  myDetails:'सदस्य विवरण · परीक्षण',accountTitle:'मेरो विवरण',myEntries:'मेरो आवेदन र डेमो',
  manageEntries:'परीक्षण आवेदन व्यवस्थापन →',testRegistration:'आवेदन र नमुना भुक्तानी परीक्षण',backEvent:'कार्यक्रमको मुख्य पृष्ठमा फर्कनुहोस्',
  needUsername:'काल्पनिक परीक्षण खाता ID लेख्नुहोस्।',incorrectLogin:'यस ब्राउजरमा परीक्षण खाता भेटिएन वा डेमो कोड मिलेन।',
  blocked:'यो परीक्षण व्यक्ति १८ वर्षभन्दा कम उमेरको भएकाले दर्ता गर्न मिल्दैन।',alreadyMember:'यो परीक्षण व्यक्तिको खाता पहिल्यै छ। सार्वजनिक डेमो कोडबाट साइन इन गर्नुहोस्।',
  created:'काल्पनिक खाता बन्यो। अब तपाईंको सदस्य पृष्ठ खुल्यो।',
  labelAlias:'काल्पनिक नाम',labelEmail:'नमुना इमेल',labelCategory:'२०२७ समूह',labelAge:'नमुना उमेर',labelVerification:'प्रमाणीकरण',
  university:'विश्वविद्यालय समूह',community:'खुला / सामाजिक समूह',mockOnly:'नमुना मात्र',
  noneStatus:'अहिलेसम्म आवेदन छैन',submitted:'समीक्षामा (परीक्षण)',needs_info:'सुधार आवश्यक (परीक्षण)',shortlisted:'प्रारम्भिक चरणका लागि छनोट (परीक्षण)',rejected:'छनोट भएन (परीक्षण)',finalist:'फाइनलका लागि योग्य (परीक्षण)',
  noPayment:'परीक्षण अर्डर छैन',unpaid:'भुक्तानी परीक्षण भएको छैन',failed:'भुक्तानी परीक्षण असफल',paid:'NPR 500 नक्कली भुक्तानी सफल',refund_pending:'नमुना फिर्ता प्रक्रियामा',refunded:'नमुना रकम फिर्ता',
  firstStep:'तपाईंको परीक्षण सदस्य खाता तयार छ। प्रतियोगिता परीक्षण पृष्ठमा गई काल्पनिक डेमो आवेदन बनाउनुहोस्।',
  payStep:'तपाईंको नमुना आवेदन दर्ता छ। NPR 500 को नक्कली भुक्तानी परीक्षण गर्न अगाडि बढ्नुहोस् — वास्तविक रकम लाग्दैन।',
  correctionStep:'परीक्षण समीक्षकले सुधार मागेको छ। विवरण हेर्न परीक्षण पृष्ठ खोल्नुहोस्। वास्तविक सुधार सामग्री अपलोड गर्न सकिँदैन।',
  reviewStep:'तपाईंको नमुना आवेदन सुरक्षित छ। यसको परीक्षण समीक्षा अवस्था यहाँ हेर्न सक्नुहुन्छ।',
  qualifiedStep:'तपाईंको नमुना समीक्षा सकारात्मक छ। यो अभ्यास मात्र हो, आधिकारिक निमन्त्रणा होइन।',
  rejectedStep:'नमुना समीक्षा परिणामअनुसार छनोट भएन। वास्तविक पुनरावेदन सेवा सुरु भएको छैन।',
  stage:'चरण',demo:'डेमो',payment:'भुक्तानी',review:'समीक्षा',noEntry:'हालसम्म परीक्षण आवेदन छैन। माथिको बटन प्रयोग गरी काल्पनिक आवेदन सुरु गर्नुहोस्।',
  demoNotUploaded:'निश्चित परीक्षण डेमो मात्र हो; वास्तविक भिडियो अपलोड भएको छैन।',noteSameBrowser:'यही वेबसाइट र ब्राउजरमा बनेको परीक्षण खाता मात्र चल्छ।',
  ready:'फेरि स्वागत छ,',testPersonLabel:'परीक्षण / काल्पनिक'
 },
 zh:{
  testBanner:'這是測試頁。只能使用畫面顯示的虛構帳號與示範密碼，請勿輸入真實密碼、個人資料或付款資訊。',
  demoHeading:'僅供測試・不是正式登入',
  backHome:'← 返回活動首頁',welcome:'你的舞台，你的會員專區。',
  welcomeText:'登入後可在同一頁查看自己的測試報名、Demo 作品、NPR 500 模擬付款及審核進度。',
  step1:'建立測試會員',step2:'提交 Demo 並模擬付款',step3:'回到這裡查詢進度',
  sameDevice:'測試資料只存在目前這個網站與瀏覽器中，不是真正的 Cloudflare 會員帳號。',
  signInTitle:'會員登入',signInIntro:'已建立測試會員？請輸入下方虛構會員帳號和公開示範密碼，進入個人首頁。',
  usernameLabel:'虛構測試 Email（登入帳號）／會員編號',passwordLabel:'示範密碼（請勿輸入真實密碼）',
  toggleReveal:'顯示',toggleHide:'隱藏',testCredentials:'可使用以下公開測試資料：',
  signInBtn:'登入我的會員中心',newMember:'第一次體驗？請先建立虛構測試會員。',
  chooseTestPerson:'選擇虛構測試參賽者',createTestAccount:'建立測試會員並開啟個人首頁',
  notSecure:'這組公開示範密碼並不能驗證真實身分；系統不儲存也不傳送密碼。正式上線前需建立安全登入及獨立帳號驗證。',
  personalArea:'我的會員專區・測試版',dashboardTitle:'我的參賽進度',signOut:'登出（測試）',
  localOnly:'這是瀏覽器本機測試帳號；真實身分、影片檔案、付款和正式報名資料都尚未存入正式後端。',
  memberId:'會員編號',currentStatus:'目前審核狀態',statusNotOfficial:'僅模擬審核，不是正式決議',
  paymentStatus:'付款狀態',paymentNotReal:'NPR 500 模擬付款，沒有實際扣款',
  nextAction:'我下一步該做什麼？',continueApplication:'繼續我的測試報名',
  myDetails:'會員資料・測試版',accountTitle:'我的基本資料',myEntries:'我的報名與作品',
  manageEntries:'管理測試報名 →',testRegistration:'前往報名與模擬付款',backEvent:'回到活動首頁',
  needUsername:'請輸入測試帳號。',incorrectLogin:'此瀏覽器沒有相符的測試會員，或示範密碼不正確。',
  blocked:'此測試人物未滿18歲，不能註冊。',alreadyMember:'此虛構人物已有測試會員，請使用示範密碼登入。',
  created:'測試會員建立成功，已進入個人首頁。',
  labelAlias:'測試姓名',labelEmail:'虛構信箱',labelCategory:'2027 年度組別',labelAge:'模擬年齡',labelVerification:'驗證狀態',
  university:'大學組',community:'社會組',mockOnly:'僅供模擬',
  noneStatus:'尚未報名',submitted:'待審核（測試）',needs_info:'待補件（測試）',shortlisted:'通過初篩（測試）',rejected:'未入選（測試）',finalist:'晉級決賽（測試）',
  noPayment:'尚無測試訂單',unpaid:'尚未模擬付款',failed:'模擬付款失敗',paid:'已模擬付款 NPR 500',refund_pending:'模擬退款處理中',refunded:'模擬已退款',
  firstStep:'你已建立測試會員。請前往報名頁，建立虛構的 Demo 作品報名。',
  payStep:'你的測試報名已建立。下一步是模擬 NPR 500 結帳，沒有真實收款。',
  correctionStep:'模擬審查要求補件。請回到測試報名頁查看資料；正式補件上傳尚未開放。',
  reviewStep:'你的測試報名已記錄。可以回到這裡查看模擬審核進度。',
  qualifiedStep:'這筆測試報名的審核狀態已通過，但不是正式入圍通知。',
  rejectedStep:'這筆虛構報名未入選；正式申訴機制尚未啟用。',
  stage:'報名場次',demo:'Demo 作品',payment:'付款狀態',review:'審核狀態',noEntry:'目前沒有測試報名，請點上方按鈕開始。',
  demoNotUploaded:'這是固定的測試 Demo 代號，並沒有實際上傳影片。',noteSameBrowser:'只能使用此網站及此瀏覽器建立的測試會員資料登入。',
  ready:'歡迎回來，',testPersonLabel:'測試／虛構',
  introEyebrow:'參賽者專區・測試預覽',cardEyebrow:'會員登入入口',sandboxBadge:'測試版',
  actionEyebrow:'下一步操作',submissionsEyebrow:'我的送件紀錄',footerDemo:'黃金喜馬拉雅歌唱賽・會員測試・非正式系統'
 }
};
const UI_LANG_KEY='ghv_ui_language_v1';
function savedLanguage(){try{const value=localStorage.getItem(UI_LANG_KEY);return ['en','ne','zh'].includes(value)?value:'en'}catch{return 'en'}}
let language=savedLanguage();
let state=readState();
function readState(){try{return safeParsePortal(localStorage.getItem(DATA_KEY))}catch{return blankPortal()}}
function t(key){return translations[language][key]||translations.en[key]||key}
function setLanguage(next){
 language=['en','ne','zh'].includes(next)?next:'en';document.documentElement.lang=language==='zh'?'zh-Hant':language;
 try{localStorage.setItem(UI_LANG_KEY,language)}catch{}
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===language)));
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
 document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
 $('show-password').textContent=t($('login-password').type==='text'?'toggleHide':'toggleReveal');
 render();
}
const make=(tag,textValue,className)=>{
 const n=document.createElement(tag);n.textContent=String(textValue);
 if(className)n.className=className;return n;
};
function feedback(id,message,error=false){text(id,message);$(id).classList.toggle('error',error)}
function findTestMember(raw){
 const key=String(raw||'').trim().toLowerCase();
 if(!key)return null;
 return state.members.find(m=>
  [m.id,m.alias,m.email,m.person].some(item=>item.toLowerCase()===key)
 )||null;
}
function currentMember(){
 let id;try{id=sessionStorage.getItem(SESSION_KEY)}catch{return null}
 return state.members.find(m=>m.id===id)||null;
}
function enter(member){
 try{sessionStorage.setItem(SESSION_KEY,member.id)}catch{}
 $('login-password').value='';
 render();window.scrollTo({top:0,behavior:'instant'});
}
function signOut(){
 try{sessionStorage.removeItem(SESSION_KEY)}catch{}
 $('login-password').value='';render();$('login-username').focus();
}
function row(dl,label,value){
 const dt=make('dt',t(label)),dd=make('dd',value);dl.append(dt,dd);
}
function viewStatus(app){
 if(!app)return t('noneStatus');
 return t(app.status);
}
function paymentFor(app){
 if(!app)return null;
 return state.orders.find(o=>o.applicationId===app.id)||null;
}
function viewPayment(order){return order?t(order.status):t('noPayment')}
function statusClass(status){
 return ['shortlisted','finalist'].includes(status)?'good':
 ['rejected'].includes(status)?'bad':'warn';
}
function renderDashboard(member){
 const apps=state.applications.filter(a=>a.memberId===member.id);
 const latest=apps[apps.length-1]||null;
 const order=paymentFor(latest);
 text('member-greeting',t('ready')+' '+member.alias);
 text('summary-member',member.id);
 text('summary-category',member.category==='university'?t('university'):t('community'));
 text('summary-status',viewStatus(latest));
 text('summary-payment',viewPayment(order));
 const details=$('account-details');details.replaceChildren();
 row(details,'labelAlias',member.alias);
 row(details,'labelEmail',member.email);
 row(details,'labelCategory',member.category==='university'?t('university'):t('community'));
 row(details,'labelAge',String(member.age));
 row(details,'labelVerification',t('mockOnly'));
 const action=$('action-text'),link=$('action-link');
 link.href='./member-portal.html?step=apply';
 if(!latest){action.textContent=t('firstStep')}
 else if(latest.status==='needs_info'){action.textContent=t('correctionStep');link.href='./member-portal.html?step=profile'}
 else if(latest.status==='rejected'){action.textContent=t('rejectedStep');link.href='./member-portal.html?step=profile'}
 else if(['shortlisted','finalist'].includes(latest.status)){action.textContent=t('qualifiedStep');link.href='./member-portal.html?step=profile'}
 else if(!order||order.status==='unpaid'||order.status==='failed'){action.textContent=t('payStep');link.href='./member-portal.html?step=checkout&application='+encodeURIComponent(latest.id)}
 else action.textContent=t('reviewStep');
 const list=$('entries-list');list.replaceChildren();
 if(apps.length===0){list.append(make('p',t('noEntry'),'empty'));return}
 for(const app of [...apps].reverse()){
  const wrap=make('article','','entry');
  const top=make('div','','entry-top');
  top.append(make('strong',app.id),make('span',viewStatus(app),'status '+statusClass(app.status)));
  wrap.append(top);
  const info=make('div','','entry-grid');
  for(const [label,value] of [
   [t('stage'),app.round],
   [t('demo'),app.demo],
   [t('payment'),viewPayment(paymentFor(app))],
   [t('review'),viewStatus(app)]
  ]){
   const unit=make('div','');unit.append(make('small',label),make('b',value));info.append(unit);
  }
  wrap.append(info,make('p',t('demoNotUploaded'),'muted'));list.append(wrap);
 }
}
function render(){
 state=readState();
 const member=currentMember();
 $('auth-view').hidden=!!member;
 $('dashboard-view').hidden=!member;
 if(member)renderDashboard(member);
}
$('login-form').addEventListener('submit',event=>{
 event.preventDefault();
 const id=$('login-username').value.trim();
 if(!id){feedback('login-feedback',t('needUsername'),true);return}
 // Public fixed demo passcode; not a security boundary and never saved.
 const member=id.length<=80&&$('login-password').value===PASSCODE?findTestMember(id):null;
 $('login-password').value='';
 if(!member){feedback('login-feedback',t('incorrectLogin')+' '+t('noteSameBrowser'),true);return}
 feedback('login-feedback','');enter(member);
});
$('register-test').addEventListener('click',()=>{
 state=readState();
 const person=$('register-persona').value;
 const result=signUpMock(state,person);
 if(result.error){
  feedback('register-feedback',
   person==='T020'?t('blocked'):
   state.members.some(m=>m.person===person)?t('alreadyMember'):result.error,true);
  return;
 }
 try{localStorage.setItem(DATA_KEY,JSON.stringify(state))}catch{
  feedback('register-feedback','Local browser storage unavailable.',true);return;
 }
 feedback('register-feedback',t('created'));enter(result.member);
});
$('sign-out').addEventListener('click',signOut);
$('show-password').addEventListener('click',()=>{
 const field=$('login-password');
 field.type=field.type==='password'?'text':'password';
 $('show-password').textContent=t(field.type==='password'?'toggleReveal':'toggleHide');
});
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
for(const person of PERSONAS){
 const label=person.alias+(person.age<18?' · 17 yrs / blocked':'');
 $('register-persona').add(new Option(label,person.code));
}
setLanguage(savedLanguage());
