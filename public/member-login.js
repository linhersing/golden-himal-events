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
  testBanner:'Use only the displayed fictional test account and demo passcode. Never enter a real password, personal information, or payment details.',
  backHome:'← Event home',welcome:'Your stage. Your account.',
  welcomeText:'Sign in to your personal area to see your competition entry, demo submission, mock NPR 500 payment and screening progress — all in one place.',
  step1:'Create a test account',step2:'Submit a demo & test payment',step3:'Return here to track your result',
  sameDevice:'Test entries remain on this browser and website address only; they are not real Cloudflare member accounts.',
  signInTitle:'Member sign in',signInIntro:"Already registered in this browser's member test? Use the fictional ID and shared demo passcode below.",
  usernameLabel:'Test account name / Member ID / test email',passwordLabel:'Demo password (not a real password)',
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
  testBanner:'यहाँ देखाइएको काल्पनिक परीक्षण खाता र डेमो पासकोड मात्र प्रयोग गर्नुहोस्। वास्तविक पासवर्ड, व्यक्तिगत विवरण वा भुक्तानी जानकारी नहाल्नुहोस्।',
  backHome:'← कार्यक्रमको मुख्य पृष्ठ',welcome:'तपाईंको मञ्च। तपाईंको खाता।',
  welcomeText:'आफ्नो प्रतियोगिता आवेदन, डेमो, NPR 500 को नमुना भुक्तानी र छनोटको अवस्था एउटै ठाउँमा हेर्न साइन इन गर्नुहोस्।',
  step1:'परीक्षण खाता बनाउनुहोस्',step2:'डेमो र नमुना भुक्तानी गर्नुहोस्',step3:'नतिजा हेर्न फेरि यहाँ आउनुहोस्',
  sameDevice:'परीक्षण विवरण यही ब्राउजर र वेबसाइट ठेगानामा मात्र रहन्छन्। यी वास्तविक Cloudflare सदस्य खाताहरू होइनन्।',
  signInTitle:'सदस्य साइन इन',signInIntro:'यस ब्राउजरमा परीक्षण सदस्य बनाइसक्नुभयो? तलको काल्पनिक ID र साझा परीक्षण कोड प्रयोग गर्नुहोस्।',
  usernameLabel:'परीक्षण प्रयोगकर्ता नाम / सदस्य ID / परीक्षण इमेल',passwordLabel:'डेमो पासकोड (वास्तविक पासवर्ड होइन)',
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
 }
};
let language='en';
let state=readState();
function readState(){try{return safeParsePortal(localStorage.getItem(DATA_KEY))}catch{return blankPortal()}}
function t(key){return translations[language][key]||translations.en[key]||key}
function setLanguage(next){
 language=next==='ne'?'ne':'en';document.documentElement.lang=language;
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===language)));
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
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
 else if(!order||order.status==='unpaid'||order.status==='failed'){action.textContent=t('payStep');link.href='./member-portal.html?step=checkout'}
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
setLanguage('en');
