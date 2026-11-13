/* Minimal public front + authenticated invited staging screens. No fake payment or session. */
(()=>{'use strict';
const $=id=>document.getElementById(id),page=document.body.dataset.page;
const translations={
en:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'Every voice deserves a stage.',subline:'A place for music, talent and connection. Your journey begins here.',apply:'Join the competition',applySub:'Create your singing entry',login:'Member login',loginSub:'View your entry and performance',news:'Latest news',newsSub:'Updates and official results',preview:'Preview stage · Official paid registration is not open',back:'Staff login',myHome:'My singer home',myHomeSub:'Review my entry and progress',startEntry:'Start my entry',startEntrySub:'Complete the application',memberArea:'My member area',memberAreaSub:'Continue where I left off'},
ne:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'हरेक आवाजको आफ्नै मञ्च हुन्छ।',subline:'संगीत, प्रतिभा र सम्बन्धको लागि नयाँ मञ्च। यहाँबाट सुरु गर्नुहोस्।',apply:'प्रतियोगितामा सहभागी हुनुहोस्',applySub:'आवेदन सुरु गर्नुहोस्',login:'सदस्य लगइन',loginSub:'आफ्नो आवेदन हेर्नुहोस्',news:'नयाँ सूचना',newsSub:'समाचार र नतिजा',preview:'पूर्वावलोकन · वास्तविक शुल्कसहित दर्ता खुलेको छैन',back:'कर्मचारी लगइन',myHome:'मेरो प्रतियोगी पृष्ठ',myHomeSub:'मेरो विवरण र स्थिति हेर्नुहोस्',startEntry:'आवेदन सुरु गर्नुहोस्',startEntrySub:'प्रतियोगी विवरण भर्नुहोस्',memberArea:'मेरो सदस्य पृष्ठ',memberAreaSub:'मेरो आवेदन हेर्नुहोस्'},
zh:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'你的聲音，值得被聽見。',subline:'一個為歌聲而生的舞台。從這裡，開啟你的旅程。',apply:'我要報名',applySub:'開始建立我的參賽資料',login:'會員登入',loginSub:'查看我的報名與作品',news:'最新公告',newsSub:'賽事消息與公布資訊',preview:'網站預覽階段｜正式收費報名尚未開放',back:'工作人員入口',myHome:'我的參賽首頁',myHomeSub:'查看報名資料與進度',startEntry:'開始報名',startEntrySub:'填寫我的參賽資料',memberArea:'我的會員專區',memberAreaSub:'繼續查看自己的資料'}};
if(page==='home'){
 let lang='zh',homeState='anonymous';
 try{const stored=localStorage.getItem('ghv_ui_language_v1');if(translations[stored])lang=stored}catch{}
 const applyHomeState=()=>{
  const first=document.getElementById('home-apply'),second=document.getElementById('home-login');
  if(!first||!second)return;
  const text=translations[lang],applyText=first.querySelector('strong'),applySub=first.querySelector('small'),
   loginText=second.querySelector('strong'),loginSub=second.querySelector('small');
  if(homeState==='entry'){
   applyText.textContent=text.myHome;applySub.textContent=text.myHomeSub;
   second.hidden=true; // Keep the unchanged login URL in DOM without a redundant second choice.
  }else if(homeState==='member'){
   applyText.textContent=text.startEntry;applySub.textContent=text.startEntrySub;
   loginText.textContent=text.memberArea;loginSub.textContent=text.memberAreaSub;
   second.hidden=false;
  }else second.hidden=false;
 };
 const apply=()=>{
  document.documentElement.lang=lang==='zh'?'zh-Hant':lang;
  document.querySelectorAll('[data-t]').forEach(el=>{const x=translations[lang][el.dataset.t];if(x)el.textContent=x});
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
  applyHomeState();
 };
 document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{
  lang=b.dataset.lang;try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}apply()
 }));
 apply();
 // Read the HttpOnly server session; never infer a member account from localStorage.
 (async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch('/api/e2e/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!response.ok)return;
   const data=await response.json();
   if(data.ok!==true||data.account?.role!=='member')return; // Never switch staff roles here.
   homeState='member';applyHomeState();
   const appsResponse=await fetch('/api/e2e/applications',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!appsResponse.ok)return;
   const apps=await appsResponse.json();
   if(apps.ok===true&&Array.isArray(apps.applications)&&apps.applications.length)homeState='entry';
   applyHomeState();
  }catch{}finally{clearTimeout(timeout)}
 })();
 return;
}
if(page==='news')return;
const node=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined&&txt!==null)x.textContent=String(txt);if(cls)x.className=cls;return x};
const safeLink=(url)=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null}catch{return null}};
const formValues=form=>Object.fromEntries(new FormData(form));
const mt=k=>window.GHVLocale?.t(k)||k;
const staff=page==='back',prefix=staff?'back':'member';
let busy=false,challenge=null,role=staff?'organizer':'member',account=null,profileEnabled=false;
const statusBox=$(prefix+'-status');
function permittedPhoto(url){const href=safeLink(url);if(!href)return null;try{const x=new URL(href);if(x.username||x.password||(x.port&&x.port!=='443')||x.hostname==='localhost'||x.hostname.endsWith('.local')||x.hostname.endsWith('.internal'))return null;return href}catch{return null}}
function profileImage(url,large=false){
 const source=permittedPhoto(url);if(!source)return null;
 const img=node('img');img.className=large?'entrant-gallery-img':'entrant-avatar';
 img.src=source;img.loading='lazy';img.referrerPolicy='no-referrer';img.decoding='async';img.alt='參賽者自行提供的照片';
 img.addEventListener('error',()=>{img.replaceWith(node('span','照片暫時無法顯示','entrant-image-fallback'))});
 return img;
}
function profileGallery(a){
 const urls=[a.photo_url_1,a.photo_url_2,a.photo_url_3].filter(permittedPhoto);
 if(!urls.length)return null;
 const gallery=node('div',undefined,'entrant-gallery');
 for(const url of urls){
  const link=node('a',undefined,'entrant-photo-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
  link.append(profileImage(url,true));gallery.append(link);
 }
 return gallery;
}
function enablePhotoPreview(){
 const field=$('entrant-photo-url-1'),box=$('entrant-photo-preview'),img=$('entrant-preview-img');
 if(!field||!box||!img)return;
 const refresh=()=>{
  const url=permittedPhoto(field.value.trim());
  box.hidden=!url;if(!url){img.removeAttribute('src');return}
  img.src=url;img.alt='主照片預覽';
 };
 img.addEventListener('error',()=>{box.hidden=true});
 field.addEventListener('change',refresh);field.addEventListener('input',refresh);
}
function setupProfileFields(ready){
 profileEnabled=Boolean(ready);
 const group=$('entrant-profile-fields');
 if(group)group.hidden=!profileEnabled;
 if(profileEnabled)enablePhotoPreview();
 const consent=$('entrant-profile-consent');
 const fields=group?.querySelectorAll('[name=gender],[name^=photo_url_]');
 const sync=()=>{
  if(!consent)return;
  consent.required=profileEnabled&&Array.from(fields||[]).some(f=>Boolean(f.value.trim()));
 };
 fields?.forEach(el=>el.addEventListener('input',sync));
 sync();
}

function status(text,bad=false){if(!statusBox)return;statusBox.hidden=false;statusBox.className='feedback'+(bad?' error':' success');statusBox.textContent=text;statusBox.scrollIntoView({block:'nearest',behavior:'smooth'})}
function friendlyError(e){
 if(page==='member'){
 const common={"e2e_not_configured":"errNoEmail","test_email_service_unavailable":"errMail","not_on_test_allowlist":"errAllow","expired_or_invalid_code":"errInvalid","login_required":"errLogin","human_check_required":"signupHumanRequired","too_many_code_requests":"signupLimited"};
 if(common[e?.message])return mt(common[e.message]);
 const errors={
 member_only:'This account is not a singer account.',
 update_locked:mt('editLockedAfterReview'),
 delete_locked:'This entry cannot be deleted.',
 invalid_demo_url:'Enter a valid public video link.',
 invalid_location_detail:mt('locationDetailHelp'),
 location_storage_unavailable:mt('provincePending'),
 annual_category_locked:'Your annual competition category is already selected.',
 community_age_confirmation_required:'Confirm the community eligibility statement.',
 university_student_confirmation_required:'Confirm current university enrollment.',
 contract_declaration_required:'Confirm the exclusive-contract declaration.',
 duplicate_round_or_database_rejected:'This audition window may already have an application.',
 invalid_demo_url_or_fields:'Check song information and public video link.',
 profile_not_enabled:'照片資料目前尚未開通，請勿把照片視為已儲存。',
 profile_storage_unavailable:'照片資料儲存服務尚未就緒。',
 profile_database_error:'照片資料儲存失敗，請稍後再試。',
 profile_consent_required:'請先同意照片用途，才能送出外部照片網址或性別。',
 invalid_public_photo_url:'請輸入公開、安全的 HTTPS 照片網址。',
 invalid_gender:'請選擇有效的性別欄位。',
 main_photo_required:'填寫補充照片前，請先提供主照片網址。',
 invalid_song_language:mt('invalidSongLanguage'),
 readback_mismatch:mt('readbackFail'),
 mock_payment_not_allowed:'This application cannot be checked out.',
 test_payment_result_unverified:'TEST payment could not be verified. No charge was made.'
 };
 return errors[e?.message]||mt('errUnknown');
 }

 const errors={self_review_disallowed:'同一信箱不能評自己的參賽作品，請由其他獨立評審評分。',too_many_code_requests:'驗證信已達次數限制，請稍候再試；登入後切換已授權身分不必重新寄信。',e2e_not_configured:'目前尚未開通 Email 驗證服務，無法登入。正式系統需先完成寄信設定。',test_email_service_unavailable:'寄信服務目前不可使用，請稍後或確認平台設定。',not_on_test_allowlist:'此 Email 尚未獲授權，目前只接受受邀帳號。',expired_or_invalid_code:'驗證碼錯誤或已過期，請重新取得。',login_required:'請先登入。',organizer_only:'這個帳號不是主辦單位，無權查看管理資料。',reviewer_only:'這個帳號不是評審，無權打分。',member_only:'此帳號並非會員。',update_locked:'這筆資料已進入審核或模擬繳費階段，無法直接修改。',delete_locked:'這筆資料已進入評審或後續流程，無法直接刪除。',invalid_demo_url:'請輸入有效的公開作品連結。',annual_category_locked:'年度組別已鎖定。',already_scored_or_unavailable:'你已評過這位選手，不能重複給分。'};return errors[e?.message]||('目前無法完成操作（'+(e?.message||'連線失敗')+'）。')}
async function api(path,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch('/api/e2e/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:c.signal});const data=await r.json();if(!r.ok||data.ok!==true)throw new Error(data.error||('HTTP '+r.status));return data}finally{clearTimeout(timer)}}
async function run(fn){if(busy)return;busy=true;document.body.classList.add('requesting');try{await fn()}catch(e){status(friendlyError(e),true)}finally{busy=false;document.body.classList.remove('requesting')}}
function authUI(signedIn){
 (staff?$('back-signin'):$('signin-panel')).hidden=signedIn;
 $(prefix+'-dashboard')?.setAttribute('hidden','');
 if(staff)$('back-dashboard').hidden=!signedIn;
 else{
  $('member-panel').hidden=!signedIn;
  if(!signedIn){
   const heading=document.querySelector('.page-heading');
   if(heading){heading.dataset.l='memberTitle';heading.textContent=mt('memberTitle');}
   const intro=document.querySelector('.page-intro'),steps=document.querySelector('.steps');
   if(intro)intro.hidden=false;if(steps)steps.hidden=false;
  }
 }
}
function authForms(email){$(prefix+'-email-form').hidden=!email;$(prefix+'-code-form').hidden=email}
function staffTabs(){
 const roles=account?.available_roles||[account?.role];
 document.querySelector('.role-tabs')?.toggleAttribute('hidden',!account);
 document.querySelectorAll('[data-role-tab]').forEach(b=>{b.hidden=!roles.includes(b.dataset.roleTab);b.classList.toggle('active',b.dataset.roleTab===role)});
}
async function loadSession(){try{
 let v=await api('me');
 const granted=v.account.available_roles||[v.account.role];
 const target=staff?(granted.includes('organizer')?'organizer':granted.includes('reviewer')?'reviewer':null):'member';
 if(!target||!granted.includes(target)){account=null;authUI(false);staffTabs();return;}
 if((staff&&!['organizer','reviewer'].includes(v.account.role))||(!staff&&v.account.role!=='member')){
  v=await api('switch-role',{role:target});
  if(!staff)v=await api('me');
 }
 account=v.account;role=account.role;authUI(true);
 if(staff)staffTabs();else{
  setupProfileFields(v.profile_enabled===true);
  const nationwide=v.nepal_locations_enabled===true,location=$('entrant-location-detail'),field=location.querySelector('input');
  location.hidden=!nationwide;field.disabled=!nationwide;field.required=nationwide;
  const note=$('province-note');note.dataset.l=nationwide?'provinceHelp':'provincePending';note.textContent=mt(note.dataset.l);
  for(const option of $('application-form').elements.province.options){
   option.disabled=!nationwide&&!['bagmati','gandaki'].includes(option.value);option.hidden=option.disabled;
  }
 }
 await dashboard();
 }catch(e){account=null;authUI(false);if(staff)staffTabs();if(e.message==='e2e_not_configured')status(friendlyError(e),true)}}
function setupAuth(){
const mailForm=$(prefix+'-email-form'),codeForm=$(prefix+'-code-form');
let challengeEmail,publicTest=false,humanToken,widgetId,widgetTimer,widgetScript;
const humanBox=$('signup-human-status'),retryButton=$('signup-human-retry');
const sendButton=mailForm?.querySelector('button[type="submit"]');
let widgetLoading=false;
function humanState(key,kind='pending'){
 if(!humanBox)return;
 humanBox.hidden=false;
 humanBox.dataset.l=key;
 humanBox.dataset.state=kind;
 humanBox.textContent=mt(key);
 if(retryButton)retryButton.hidden=kind!=='error';
 if(publicTest&&sendButton)sendButton.disabled=!humanToken;
}
function clearHumanToken(){humanToken=undefined;if(publicTest&&sendButton)sendButton.disabled=true}
function humanError(code){
 clearTimeout(widgetTimer);widgetLoading=false;clearHumanToken();
 humanState('signupHumanBlocked','error');
 // A public Cloudflare error code helps diagnosis; do not log the widget token or keys.
 if(code&&/^\d{4,7}$/.test(String(code)))humanBox.textContent+=' (CF '+code+')';
}
function renderHumanWidget(siteKey){
 const widget=$('signup-turnstile');
 try{
  if(!window.turnstile||typeof window.turnstile.render!=='function')throw Error('widget_unavailable');
  // The async script's load event makes render available. Turnstile.ready rejects async scripts.
  widgetId=window.turnstile.render(widget,{
   sitekey:siteKey,size:widget.clientWidth<300?'compact':'normal',appearance:'always',theme:'light',
   action:'ghv_signup','response-field':false,
   callback:token=>{
    clearTimeout(widgetTimer);widgetLoading=false;
    if(typeof token!=='string'||!token){humanError();return}
    humanToken=token;
    humanState('signupHumanVerified','verified');
   },
   'expired-callback':()=>{clearHumanToken();humanState('signupHumanExpired','pending')},
   'timeout-callback':()=>{clearHumanToken();humanState('signupHumanExpired','pending')},
   'error-callback':code=>humanError(code)
  });
  clearTimeout(widgetTimer);widgetLoading=false;
  if(!humanToken){
   humanState('signupHumanPrompt');
   // Turnstile mounts an iframe in a closed shadow tree. Check its host.
   widgetTimer=setTimeout(()=>{
    if(!humanToken&&!widget.firstElementChild)humanError();
   },10000);
  }
 }catch{humanError()}
}
function beginHumanWidget(siteKey){
 clearTimeout(widgetTimer);widgetLoading=true;
 clearHumanToken();widgetId=undefined;
 const widget=$('signup-turnstile');
 widget.hidden=false;widget.replaceChildren();
 humanState('signupHumanLoading');
 widgetTimer=setTimeout(()=>{if(widgetLoading)humanError()},12000);
 if(window.turnstile?.render){renderHumanWidget(siteKey);return}
 widgetScript?.remove();
 const script=widgetScript=document.createElement('script');
 script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
 script.async=true;
 script.onload=()=>{if(script===widgetScript)renderHumanWidget(siteKey)};
 script.onerror=()=>{if(script===widgetScript)humanError()};
 document.head.append(script);
}
const signupConfig=staff?Promise.resolve():api('signup-config').then(config=>{
 if(config.mode!=='public_test'||typeof config.siteKey!=='string')return;
 publicTest=true;
 const notice=$('signup-mode');
 notice.dataset.l='signupPublicTest';
 notice.textContent=mt('signupPublicTest');
 for(const [id,key] of [['member-auth-intro','signupPilotIntro'],['email-legacy-summary','signupPilotEmail']]){
  const copy=$(id);if(copy){copy.dataset.l=key;copy.textContent=mt(key);}
 }
 retryButton?.addEventListener('click',()=>{
  if(widgetId!==undefined&&window.turnstile?.remove){
   try{window.turnstile.remove(widgetId)}catch{}
  }
  beginHumanWidget(config.siteKey);
 });
 beginHumanWidget(config.siteKey);
}).catch(()=>{});
mailForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 await signupConfig;
 if(publicTest&&!humanToken){
  status(mt('signupHumanRequired'),true);
  $('signup-turnstile')?.scrollIntoView({block:'center',behavior:'smooth'});
  return;
 }
 const {email}=formValues(mailForm);
 const payload={email,role:staff?'staff':role};
 if(humanToken)payload.turnstile_token=humanToken;
 try{
  const v=await api('request-code',payload);
  challenge=v.challenge_id;
  challengeEmail=publicTest?email:undefined;
 }finally{
  if(payload.turnstile_token){
   clearHumanToken();
   if(widgetId!==undefined&&window.turnstile?.reset){
    try{window.turnstile.reset(widgetId);humanState('signupHumanPrompt')}
    catch{humanError()}
   }else humanError();
  }
 }
 authForms(false);
 status(staff?'驗證信已要求寄送，請查看 Email（僅限受邀測試帳號）。':mt(publicTest?'signupCodeRequested':'otpRequested'));
 codeForm.querySelector('input').focus();
})});
codeForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const code=String(formValues(codeForm).code||'').trim();
 await api('verify-code',{challenge_id:challenge,code,email:challengeEmail});
 challengeEmail=undefined;
 codeForm.reset();
 await loadSession();
 if(account)status(staff?'已登入。':mt('signedIn'));
})});
const change=$(staff?'back-change':'change-mail');change?.addEventListener('click',()=>{authForms(true);challenge=null;challengeEmail=undefined;codeForm.reset();statusBox.hidden=true});
$(prefix+'-logout')?.addEventListener('click',()=>run(async()=>{await api('logout',{});account=null;authUI(false);if(staff)staffTabs();challenge=null;authForms(true);status(page==='member'?mt('signedOut'):'已登出。')}));
}
async function dashboard(){if(!account)return;if(staff){if(role==='organizer')await renderOrganizer();else await renderJudge()}else await renderMember()}
function memberCanEdit(a){
 return a.can_edit===true||a.can_edit===1||a.can_edit==='1'||
  (a.can_edit===undefined&&a.payment_status==='unpaid'&&a.status==='submitted');
}
function drawEntry(a){
 const box=node('article',undefined,'entry member-entry');
 const title=node('div',undefined,'member-entry-main');
 const avatar=profileImage(a.photo_url_1);
 if(avatar)title.append(avatar);
 const copy=node('div',undefined,'member-entry-copy');
 copy.append(node('strong',a.stage_name||mt('unnamedEntry')));
 copy.append(node('small',(a.song_title||'')+' · '+(a.song_language||'')));
 title.append(copy);box.append(title);
 const meta=node('div',undefined,'member-entry-meta');
 for(const item of [
  [mt('entryId'),a.id],
  [mt('categoryLabel'),mt(a.category==='university'?'university':'community')],
  [mt('windowLabel'),a.round_code]
 ]){
  const field=node('div',undefined,'member-entry-field');
  field.append(node('span',item[0]),node('strong',item[1]));
  meta.append(field);
 }
 box.append(meta);
 box.append(node('span',mt(a.payment_status==='simulated_paid'?'testPaid':'testPending'),'pill '+(a.payment_status==='simulated_paid'?'pill-pass':'pill-warn')));
 if(a.approval_state)box.append(node('p',mt(a.approval_state==='approved'?'approvalAccepted':'approvalPending'),'minor'));
 const actions=node('div',undefined,'inline-actions member-entry-buttons');
 if(memberCanEdit(a)){
  const edit=node('button',mt('edit'),'btn btn-primary');edit.type='button';edit.onclick=()=>showEdit(a);actions.append(edit);
 }
 const url=safeLink(a.demo_url);
 if(url){const link=node('a',mt('viewVideo'),'btn btn-soft');link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);}
 if(a.payment_status==='unpaid'&&a.status==='submitted'){
  const del=node('button',mt('delete'),'btn btn-soft');del.type='button';
  del.onclick=()=>{
   if(!confirm(mt('delTitle')+'\n\n'+mt('delBody')+' '+a.id))return;
   run(async()=>{await api('delete-application',{application_id:a.id});status(mt('deleted'));await renderMember()});
  };
  const pay=node('button',mt('testCheckout'),'btn btn-soft');pay.type='button';
  pay.onclick=()=>{
   if(!confirm(mt('payTitle')))return;
   run(async()=>{
    const result=await api('mock-payment',{application_id:a.id});
    if(result.status!=='simulated_paid'||result.testOnly!==true||result.realCharge!==false)throw Error('test_payment_result_unverified');
    await renderMember();status(mt(a.approval_state==='pending'?'paymentAwaitingApproval':'paymentDone'));
   });
  };
  actions.append(pay);if(a.approval_state!=='approved')actions.append(del);
 }
 box.append(actions);
 if(!memberCanEdit(a))box.append(node('p',mt('editLockedAfterReview'),'minor'));
 return box;
}
async function renderMember(){
 const holder=$('entries'),editSlot=$('member-edit-panel');
 holder.replaceChildren();
 if(editSlot){editSlot.replaceChildren();editSlot.hidden=true;}
 const v=await api('applications'),rows=Array.isArray(v.applications)?v.applications:[];
 const hasEntries=rows.length>0,first=rows[0];
 const callout=$('new-application-callout'),form=$('application-details');
 if(callout)callout.hidden=hasEntries;
 if(form){form.hidden=hasEntries;if(hasEntries)form.open=false;}
 $('member-welcome').hidden=!hasEntries;
 $('member-entry-overview').hidden=!hasEntries;
 $('member-state-grid').hidden=!hasEntries;
 $('member-primary-actions').hidden=!hasEntries;
 $('member-official-boundary').hidden=!hasEntries;
 $('member-dashboard-help').hidden=hasEntries;
 const heading=document.querySelector('.page-heading'),intro=document.querySelector('.page-intro'),steps=document.querySelector('.steps');
 if(heading){heading.dataset.l=hasEntries?'dashboard':'memberTitle';heading.textContent=mt(heading.dataset.l);}
 if(intro)intro.hidden=hasEntries;
 if(steps)steps.hidden=hasEntries;
 if(!hasEntries)holder.append(node('p',mt('noEntries'),'minor'));
 if(hasEntries){
  $('member-welcome-name').textContent=first.stage_name||mt('unnamedEntry');
  $('member-welcome-meta').textContent=mt(first.category==='university'?'university':'community')+' · '+first.round_code;
  const avatar=$('member-hero-avatar');avatar.replaceChildren();
  avatar.append(profileImage(first.photo_url_1)||node('span','✦'));
  $('member-state-data').textContent=mt('dataSaved');
  const paid=first.payment_status==='simulated_paid';
  $('member-state-payment').textContent=mt(paid?'statusSimulatedPaid':'testPending');
  $('member-quick-edit').hidden=!memberCanEdit(first);
  $('member-quick-edit').onclick=()=>showEdit(first);
  const video=$('member-view-video'),link=safeLink(first.demo_url);
  video.hidden=!link;if(link)video.href=link;else video.removeAttribute('href');
  $('member-show-details').onclick=()=>document.getElementById('member-entry-overview').scrollIntoView({behavior:'smooth',block:'start'});
  for(const a of rows)holder.append(drawEntry(a));
 }else{
  $('member-hero-avatar').replaceChildren();
  $('member-quick-edit').onclick=null;
 }
 const paidEntry=rows.find(a=>a.payment_status==='simulated_paid');
 const done=$('test-completion');
 if(done){
  done.hidden=!paidEntry;
  const completion=paidEntry?.approval_state==='pending'?mt('paymentAwaitingApproval'):paidEntry?.approval_state==='approved'?mt('approvalAccepted'):mt('testComplete');
  done.textContent=paidEntry?'✓ '+completion+' · '+mt('noCharge'):'';
 }
 $('step-login')?.classList.add('active');
 $('step-apply')?.classList.toggle('active',hasEntries);
 $('step-checkout')?.classList.toggle('active',Boolean(paidEntry));
}
function showEdit(a){
 if(!memberCanEdit(a)){status(mt('editLockedAfterReview'),true);return;}
 const holder=$('member-edit-panel');holder.replaceChildren();holder.hidden=false;
 const box=node('div',undefined,'member-edit-box');box.dataset.editing='true';
 const heading=node('h3',mt('editHeader'));heading.dataset.l='editHeader';
 const guidance=node('p',mt('editGuidance'),'minor');guidance.dataset.l='editGuidance';
 box.append(heading,guidance);
 const form=node('form',undefined,'form-grid');
 const fields=[
  ['stage_name','stageName'],['song_title','songTitle'],
  ['original_artist','artist'],['song_language','songLang'],['demo_url','videoUrl'],
  ...(profileEnabled?[['gender','profileGender'],['photo_url_1','profileMainPhoto'],['photo_url_2','profilePhoto2'],['photo_url_3','profilePhoto3']]:[])
 ];
 for(const [name,key] of fields){
  const lab=node('label',undefined,'field'),label=node('span',mt(key));label.dataset.l=key;
  let input;
  if(name==='gender'){
   input=node('select');
   const options=[['','profileGenderNone'],['male','profileMale'],['female','profileFemale'],['other','profileOther'],['prefer_not_say','profilePreferNot']];
   for(const [value,textKey] of options){const opt=node('option',mt(textKey));opt.value=value;input.append(opt);}
  }else if(name==='song_language'){
   input=$('song-language').cloneNode(true);input.removeAttribute('id');
  }else{
   input=node('input');
   if(name==='demo_url'||name.startsWith('photo_url_'))input.type='url';
   input.maxLength=name==='demo_url'?1000:name.startsWith('photo_url_')?600:100;
  }
  input.name=name;input.value=a[name]||'';
  input.required=!['gender','photo_url_1','photo_url_2','photo_url_3'].includes(name);
  lab.append(label,input);
  if(name==='demo_url')lab.classList.add('full');
  form.append(lab);
 }
 if(profileEnabled){
  const consent=node('label',undefined,'check full'),check=node('input');
  check.type='checkbox';check.name='profile_consent';check.required=true;
  consent.append(check,node('span',mt('profileConsent')));
  form.append(consent);
 }
 const buttons=node('div',undefined,'form-actions full');
 const save=node('button',mt('saveChanges'),'btn btn-primary');save.type='submit';save.dataset.l='saveChanges';
 const cancel=node('button',mt('cancel'),'btn btn-soft');cancel.type='button';cancel.dataset.l='cancel';
 cancel.onclick=()=>{holder.replaceChildren();holder.hidden=true;};
 buttons.append(save,cancel);form.append(buttons);
 form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const payload={application_id:a.id,...formValues(form)};
  if(profileEnabled)payload.profile_consent=form.querySelector('[name=profile_consent]')?.checked===true;
  await api('update-application',payload);
  const check=await api('applications');
  const saved=(check.applications||[]).find(row=>row.id===a.id);
  const names=['stage_name','song_title','original_artist','song_language','demo_url',
   ...(profileEnabled?['gender','photo_url_1','photo_url_2','photo_url_3']:[])];
  if(!saved||names.some(key=>{
   const entered=String(payload[key]??'').trim();
   // The server trims text and stores accepted photo URLs in their canonical form.
   const expected=entered&&key.startsWith('photo_url_')?new URL(entered).href:entered;
   return String(saved[key]??'')!==expected;
  }))throw Error('readback_mismatch');
  await renderMember();status(mt('savedChanges'));
 })});
 box.append(form);holder.append(box);
 holder.scrollIntoView({block:'start',behavior:'smooth'});
 form.querySelector('input')?.focus({preventScroll:true});
}
function makeRosterPager(target,page,totalPages,onPage){
 target.replaceChildren();
 if(totalPages<=1)return;
 const previous=node('button','上一頁','btn btn-soft');previous.type='button';previous.disabled=page<=1;
 previous.onclick=()=>onPage(page-1);
 const next=node('button','下一頁','btn btn-soft');next.type='button';next.disabled=page>=totalPages;
 next.onclick=()=>onPage(page+1);
 const label=node('span','第 '+page+' / '+totalPages+' 頁','minor');
 target.append(previous,label,next);
}
function scoredByJudge(a){
 const phase=a.phase||'demo';
 const first=phase==='demo'?a.demo_technique:a.live_technique;
 return first!==null&&first!==undefined;
}
async function renderOrganizer(){
 $('organizer-dashboard').hidden=false;$('judge-dashboard').hidden=true;
 const v=await api('organizer-queue'),apps=v.applications||[];
 $('pending-count').textContent=String(apps.length);
 $('scores-count').textContent=String(apps.reduce((n,a)=>n+Number(a.demo_judges||0)+Number(a.live_judges||0),0));
 $('paid-count').textContent='0';
 const holder=$('admin-apps'),pager=$('organizer-pagination'),summary=$('organizer-count');
 const search=$('organizer-search'),language=$('organizer-language'),category=$('organizer-category'),statusFilter=$('organizer-status');
 let pageNo=1;const perPage=12;
 function paint(){
  const q=search.value.trim().toLowerCase(),lang=language.value,cat=category.value,st=statusFilter.value;
  const found=apps.filter(a=>{
   if(q&&![a.stage_name,a.song_title,a.id,a.round_code].some(x=>String(x||'').toLowerCase().includes(q)))return false;
   if(lang&&a.song_language!==lang)return false;
   if(cat&&a.category!==cat)return false;
   if(st==='scored'&&!(Number(a.demo_judges||0)+Number(a.live_judges||0)))return false;
   if(st==='unscored'&&(Number(a.demo_judges||0)+Number(a.live_judges||0)))return false;
   if(['unpaid','simulated_paid'].includes(st)&&a.payment_status!==st)return false;
   return true;
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=Math.min(pageNo,pages);holder.replaceChildren();
  summary.textContent='符合 '+found.length+' 筆報名資料（目前全部為測試資料；正式付款 0 筆）';
  if(!found.length)holder.append(node('p','沒有符合條件的資料。'));
  for(const a of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const card=node('article',undefined,'roster-entry');
   const info=node('div',undefined,'roster-entry-text');
   info.append(node('strong',(a.stage_name||'選手')+' · '+(a.song_title||'未命名曲目')));
   info.append(node('p',a.round_code+' · '+(a.category==='university'?'大學組':'社會組')+' · '+(a.song_language||'語言未填'),'minor'));
   info.append(node('p','編號：'+a.id,'minor'));
   if(a.province)info.append(node('p',[a.province,a.location_detail].filter(Boolean).join(' · '),'minor'));
   const img=profileImage(a.photo_url_1);
   if(img)info.prepend(img);
   const stats=node('div',undefined,'roster-entry-side');
   stats.append(node('span',a.payment_status==='simulated_paid'?'模擬付款':'未付款','pill'));
   if(a.approval_state==='approved')stats.append(node('span','主辦已核准','pill pill-pass'));
   if(a.approval_state==='pending'){
    stats.append(node('span','待主辦核准','pill pill-warn'));
    const approve=node('button','核准測試報名','btn btn-soft');approve.type='button';
    approve.onclick=()=>{
     if(!confirm('核准「'+(a.stage_name||'選手')+'」的測試報名？核准後會鎖定報名資料。'))return;
     run(async()=>{
      const result=await api('approve-test-application',{application_id:a.id});
      if(result.approval_state!=='approved'||result.testOnly!==true)throw Error('approval_readback_failed');
      a.approval_state='approved';paint();status('已核准測試報名。');
     });
    };
    stats.append(approve);
   }
   stats.append(node('small','評審回覆 '+String(Number(a.demo_judges||0)+Number(a.live_judges||0))+' 筆'));
   card.append(info,stats);holder.append(card);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 for(const control of [search,language,category,statusFilter]){
  control.oninput=()=>{pageNo=1;paint()};
  control.onchange=()=>{pageNo=1;paint()};
 }
 paint();
}
async function renderJudge(){
 $('organizer-dashboard').hidden=true;$('judge-dashboard').hidden=false;
 const v=await api('reviewer-queue'),queue=v.queue||[];
 const list=$('judge-list'),pager=$('judge-pagination'),summary=$('judge-count');
 const search=$('judge-search'),statusFilter=$('judge-status');
 const rosterPanel=$('judge-roster-panel'),detail=$('judge-detail'),holder=$('judge-queue'),back=$('judge-back-list');
 let pageNo=1;const perPage=10;
 detail.hidden=true;rosterPanel.hidden=false;holder.replaceChildren();
 function paint(){
  const q=search.value.trim().toLowerCase(),st=statusFilter.value;
  const found=queue.filter(a=>{
   if(st==='scored'&&!scoredByJudge(a))return false;
   if(st==='unscored'&&scoredByJudge(a))return false;
   return !q||[a.stage_name,a.id,a.song_title,a.round_code].some(x=>String(x||'').toLowerCase().includes(q));
  });
  const pages=Math.max(1,Math.ceil(found.length/perPage));
  pageNo=Math.min(pageNo,pages);list.replaceChildren();
  summary.textContent='符合 '+found.length+' 位參賽者 · 待評 '+found.filter(a=>!scoredByJudge(a)).length+' 位';
  if(!found.length)list.append(node('p','目前沒有符合條件的參賽者。'));
  for(const a of found.slice((pageNo-1)*perPage,pageNo*perPage)){
   const row=node('button',undefined,'roster-entry roster-action');row.type='button';
   const body=node('span',undefined,'roster-entry-text');
   const img=profileImage(a.photo_url_1);
   if(img)body.append(img);
   body.append(node('strong',a.stage_name||'選手'));
   body.append(node('span',String(a.song_title||'作品')+' · '+a.round_code+' · '+(a.category==='university'?'大學組':'社會組'),'roster-mini'));
   const flag=node('span',scoredByJudge(a)?'已評分':'開始評分','pill');
   row.append(body,flag);row.onclick=()=>openDetail(a);list.append(row);
  }
  makeRosterPager(pager,pageNo,pages,p=>{pageNo=p;paint()});
 }
 function openDetail(a){
  rosterPanel.hidden=true;detail.hidden=false;holder.replaceChildren();
  let modified=false;
  back.onclick=()=>{if(modified&&!confirm('返回名單將放棄未儲存的分數，確定返回嗎？'))return;
   holder.replaceChildren();detail.hidden=true;rosterPanel.hidden=false;back.focus();paint();
  };
  const box=node('article',undefined,'entry');
  const phase=a.phase||'demo',demo=phase==='demo';
  box.append(node('h3',(a.stage_name||'選手')+' · '+a.round_code));
  box.append(node('p',(a.song_title||'作品')+' · '+(a.song_language||'')+' · '+(demo?'線上海選':phase==='qualifier'?'現場初賽':'決賽'),'minor'));
  const pictures=profileGallery(a);if(pictures)box.append(pictures);
  if(a.gender)box.append(node('p','參賽者填寫的性別：'+({male:'男',female:'女',other:'其他',prefer_not_say:'不願透露'}[a.gender]||'未提供'),'minor'));
  const link=safeLink(a.demo_url);
  if(link){const l=node('a','觀看作品 ↗','small-link');l.href=link;l.target='_blank';l.rel='noopener noreferrer';box.append(l);}
  if(scoredByJudge(a)){
   const xs=demo?[a.demo_technique,a.demo_interpretation]:[a.live_technique,a.live_interpretation,a.stage_presence,a.appearance];
   box.append(node('p','此階段已評分：'+xs.reduce((n,x)=>n+Number(x||0),0)+' 分（不能覆蓋）'));
   holder.append(box);back.focus();return;
  }
  const form=node('form',undefined,'form-grid');
  form.addEventListener('input',()=>{modified=true});
  const criteria=demo?[['technique','技巧（0–60）',60],['interpretation','表現（0–40）',40]]:
   [['technique','技巧（0–40）',40],['interpretation','表現（0–30）',30],['stage_presence','台風（0–20）',20],['appearance','儀容（0–10）',10]];
  for(const [name,labelText,max] of criteria){
   const lab=node('label',undefined,'field'),input=node('input');
   input.name=name;input.type='number';input.min='0';input.max=String(max);input.step='1';input.required=true;
   lab.append(node('span',labelText),input);form.append(lab);
  }
  const agree=node('label',undefined,'check'),checkbox=node('input');checkbox.type='checkbox';checkbox.name='conflict';checkbox.required=true;
  agree.append(checkbox,node('span','我確認此次評分沒有利益衝突。'));form.append(agree);
  const save=node('button','儲存我的評分','btn btn-primary');save.type='submit';form.append(save);
  form.onsubmit=e=>{e.preventDefault();run(async()=>{
   const inputs=formValues(form),payload={application_id:a.id,phase,no_conflict:checkbox.checked};
   for(const [name] of criteria)payload[name]=Number(inputs[name]);
   await api('score',payload);status('評分已儲存。');await renderJudge();
  })};
  box.append(form);holder.append(box);back.focus();
 }
 search.oninput=()=>{pageNo=1;paint()};statusFilter.onchange=()=>{pageNo=1;paint()};
 paint();
}

if(page==='member'){
 role='member';setupAuth();
 window.addEventListener('ghv:languagechange',()=>{if(account&&account.role==='member'){if(document.querySelector('[data-editing]'))return;renderMember().catch(e=>status(friendlyError(e),true))}});
 const application=$('application-form'),details=$('application-details'),start=$('start-application');
 const syncStart=()=>start?.setAttribute('aria-expanded',String(details.open));
 details.addEventListener('toggle',syncStart);
 start?.addEventListener('click',()=>{details.open=true;syncStart();details.scrollIntoView({block:'start',behavior:'smooth'});setTimeout(()=>application.querySelector('[name=stage_name]')?.focus({preventScroll:true}),180)});
 application.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const v=formValues(application),data={...v,video_confirmed:application.querySelector('[name=video_confirmed]')?.checked===true,profile_consent:application.querySelector('[name=profile_consent]')?.checked===true,adult_confirmed:application.querySelector('[name=adult_confirmed]').checked,student_confirmed:application.querySelector('[name=student_confirmed]').checked,no_exclusive_contract:application.querySelector('[name=no_exclusive_contract]').checked};
 const saved=await api('applications',data);application.reset();toggle();details.open=false;status('✓ '+mt('saved')+' '+mt('entryId')+': '+saved.application_id);await renderMember()})});
 const toggle=()=>{const community=$('category').value==='community';const adult=application.querySelector('[name=adult_confirmed]'),student=application.querySelector('[name=student_confirmed]');$('community-statement').hidden=!community;$('university-statement').hidden=community;adult.required=community;student.required=!community;if(community)student.checked=false;else adult.checked=false;};
 $('category').addEventListener('change',toggle);toggle();
 if(location.hash==='#register')details.open=true;syncStart();
 loadSession();
}else if(page==='back'){
 setupAuth();staffTabs();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role||!account)return;run(async()=>{const v=await api('switch-role',{role:next});account=v.account;role=account.role;staffTabs();await dashboard();status('已切換為'+(role==='organizer'?'主辦方':'評審')+'。')})}));loadSession();
}
})();
