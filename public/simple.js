/* Minimal public front + authenticated invited staging screens. No fake payment or session. */
(()=>{'use strict';
const $=id=>document.getElementById(id),page=document.body.dataset.page;
const translations={
en:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'Every voice deserves a stage.',subline:'A place for music, talent and connection. Your journey begins here.',apply:'Join the competition',applySub:'Create your singing entry',login:'Member login',loginSub:'View your entry and performance',news:'Latest news',newsSub:'Updates and official results',preview:'Preview stage · Official paid registration is not open',back:'Staff login'},
ne:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'हरेक आवाजको आफ्नै मञ्च हुन्छ।',subline:'संगीत, प्रतिभा र सम्बन्धको लागि नयाँ मञ्च। यहाँबाट सुरु गर्नुहोस्।',apply:'प्रतियोगितामा सहभागी हुनुहोस्',applySub:'आवेदन सुरु गर्नुहोस्',login:'सदस्य लगइन',loginSub:'आफ्नो आवेदन हेर्नुहोस्',news:'नयाँ सूचना',newsSub:'समाचार र नतिजा',preview:'पूर्वावलोकन · वास्तविक शुल्कसहित दर्ता खुलेको छैन',back:'कर्मचारी लगइन'},
zh:{topline:'GOLDEN HIMAL VOICE · 2027',headline:'你的聲音，值得被聽見。',subline:'一個為歌聲而生的舞台。從這裡，開啟你的旅程。',apply:'我要報名',applySub:'開始建立我的參賽資料',login:'會員登入',loginSub:'查看我的報名與作品',news:'最新公告',newsSub:'賽事消息與公布資訊',preview:'網站預覽階段｜正式收費報名尚未開放',back:'工作人員入口'}};
if(page==='home'){
 let lang='zh';try{const stored=localStorage.getItem('ghv_ui_language_v1');if(translations[stored])lang=stored}catch{}
 const apply=()=>{document.documentElement.lang=lang==='zh'?'zh-Hant':lang;document.querySelectorAll('[data-t]').forEach(el=>{const x=translations[lang][el.dataset.t];if(x)el.textContent=x});document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)))};
 document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;try{localStorage.setItem('ghv_ui_language_v1',lang)}catch{}apply()}));apply();return;
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
 const common={"e2e_not_configured":"errNoEmail","test_email_service_unavailable":"errMail","not_on_test_allowlist":"errAllow","expired_or_invalid_code":"errInvalid","login_required":"errLogin"};
 if(common[e?.message])return mt(common[e.message]);
 const errors={
 member_only:'This account is not a singer account.',
 update_locked:'This entry is locked after checkout.',
 delete_locked:'This entry cannot be deleted.',
 invalid_demo_url:'Enter a valid public video link.',
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
 mock_payment_not_allowed:'This application cannot be checked out.',
 test_payment_result_unverified:'TEST payment could not be verified. No charge was made.'
 };
 return errors[e?.message]||mt('errUnknown');
 }

 const errors={self_review_disallowed:'同一信箱不能評自己的參賽作品，請由其他獨立評審評分。',too_many_code_requests:'驗證信已達次數限制，請稍候再試；登入後切換已授權身分不必重新寄信。',e2e_not_configured:'目前尚未開通 Email 驗證服務，無法登入。正式系統需先完成寄信設定。',test_email_service_unavailable:'寄信服務目前不可使用，請稍後或確認平台設定。',not_on_test_allowlist:'此 Email 尚未獲授權，目前只接受受邀帳號。',expired_or_invalid_code:'驗證碼錯誤或已過期，請重新取得。',login_required:'請先登入。',organizer_only:'這個帳號不是主辦單位，無權查看管理資料。',reviewer_only:'這個帳號不是評審，無權打分。',member_only:'此帳號並非會員。',update_locked:'這筆資料已進入審核或模擬繳費階段，無法直接修改。',delete_locked:'這筆資料已進入評審或後續流程，無法直接刪除。',invalid_demo_url:'請輸入有效的公開作品連結。',annual_category_locked:'年度組別已鎖定。',already_scored_or_unavailable:'你已評過這位選手，不能重複給分。'};return errors[e?.message]||('目前無法完成操作（'+(e?.message||'連線失敗')+'）。')}
async function api(path,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch('/api/e2e/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:c.signal});const data=await r.json();if(!r.ok||data.ok!==true)throw new Error(data.error||('HTTP '+r.status));return data}finally{clearTimeout(timer)}}
async function run(fn){if(busy)return;busy=true;document.body.classList.add('requesting');try{await fn()}catch(e){status(friendlyError(e),true)}finally{busy=false;document.body.classList.remove('requesting')}}
function authUI(signedIn){(staff?$('back-signin'):$('signin-panel')).hidden=signedIn;$(prefix+'-dashboard')?.setAttribute('hidden','');if(staff){$('back-dashboard').hidden=!signedIn}else{$('member-panel').hidden=!signedIn}}
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
 if((staff&&!['organizer','reviewer'].includes(v.account.role))||(!staff&&v.account.role!=='member'))v=await api('switch-role',{role:target});
 account=v.account;role=account.role;authUI(true);if(staff)staffTabs();else setupProfileFields(v.profile_enabled===true);await dashboard();
 }catch(e){account=null;authUI(false);if(staff)staffTabs();if(e.message==='e2e_not_configured')status(friendlyError(e),true)}}
function setupAuth(){
const mailForm=$(prefix+'-email-form'),codeForm=$(prefix+'-code-form');
mailForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{const {email}=formValues(mailForm);const v=await api('request-code',{email,role:staff?'staff':role});challenge=v.challenge_id;authForms(false);status(page==='member'?mt('otpRequested'):'驗證信已要求寄送，請查看 Email（僅限受邀測試帳號）。');codeForm.querySelector('input').focus()})});
codeForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('verify-code',{challenge_id:challenge,code:String(formValues(codeForm).code||'').trim()});codeForm.reset();await loadSession();if(account)status(page==='member'?mt('signedIn'):'已登入。')})});
const change=$(staff?'back-change':'change-mail');change?.addEventListener('click',()=>{authForms(true);challenge=null;statusBox.hidden=true});
$(prefix+'-logout')?.addEventListener('click',()=>run(async()=>{await api('logout',{});account=null;authUI(false);if(staff)staffTabs();challenge=null;authForms(true);status(page==='member'?mt('signedOut'):'已登出。')}));
}
async function dashboard(){if(!account)return;if(staff){if(role==='organizer')await renderOrganizer();else await renderJudge()}else await renderMember()}
function drawEntry(a){
 const box=node('article',undefined,'entry'),head=node('strong',a.stage_name+' · '+a.song_title);
 const avatar=profileImage(a.photo_url_1);
 if(avatar)box.append(avatar);
 box.append(head,node('p',mt('entryId')+': '+a.id,'minor'));
 const isPaid=a.payment_status==='simulated_paid';
 box.append(node('span',mt(isPaid?'testPaid':'testPending'),'pill '+(isPaid?'pill-pass':'pill-warn')));
 box.append(node('p',mt('categoryLabel')+': '+mt(a.category==='university'?'university':'community')+' · '+mt('windowLabel')+': '+a.round_code,'minor'));
 const link=safeLink(a.demo_url);
 if(link){const l=node('a',mt('viewVideo'),'small-link');l.href=link;l.target='_blank';l.rel='noopener noreferrer';box.append(l)}
 const actions=node('div',undefined,'inline-actions');
 if(!isPaid&&a.status==='submitted'){
  const edit=node('button',mt('edit'),'btn btn-soft');edit.type='button';edit.onclick=()=>showEdit(a);
  const del=node('button',mt('delete'),'btn btn-danger');del.type='button';
  del.onclick=()=>{
   if(!confirm(mt('delTitle')+'\n\n'+mt('delBody')+' '+a.id))return;
   run(async()=>{await api('delete-application',{application_id:a.id});status(mt('deleted'));await renderMember()})
  };
  const pay=node('button',mt('testCheckout'),'btn btn-primary');pay.type='button';
  pay.onclick=()=>{
   if(!confirm(mt('payTitle')))return;
   run(async()=>{
    const result=await api('mock-payment',{application_id:a.id});
    if(result.status!=='simulated_paid'||result.testOnly!==true||result.realCharge!==false)throw Error('test_payment_result_unverified');
    await renderMember();status(mt('paymentDone'));
    const note=$('test-completion');
    if(note){note.hidden=false;note.textContent='✓ '+mt('testComplete')+' — '+mt('entryId')+': '+a.id+'. '+mt('noCharge');note.scrollIntoView({block:'center',behavior:'smooth'});}
   })
  };
  actions.append(edit,del,pay);
 }else actions.append(node('small',mt('locked')));
 box.append(actions);return box;
}
async function renderMember(){
 const holder=$('entries');holder.replaceChildren();
 const v=await api('applications');
 const hasEntries=v.applications.length>0;
 const callout=$('new-application-callout'),form=$('application-details');
 if(callout)callout.hidden=hasEntries;
 if(form){form.hidden=hasEntries;if(hasEntries)form.open=false;}
 if(!hasEntries)holder.append(node('p',mt('noEntries')));
 for(const a of v.applications)holder.append(drawEntry(a));
 const done=$('test-completion');
 if(done){const paid=v.applications.find(a=>a.payment_status==='simulated_paid');done.hidden=!paid;if(paid)done.textContent='✓ '+mt('testComplete')+' — '+paid.stage_name+' · '+paid.song_title+' · '+mt('entryId')+': '+paid.id+'. '+mt('noCharge');}
 const paid=v.applications.some(a=>a.payment_status==='simulated_paid');
 $('step-login')?.classList.add('active');
 $('step-apply')?.classList.toggle('active',hasEntries);
 $('step-checkout')?.classList.toggle('active',paid);
}
function showEdit(a){
 const holder=$('entries');let existing=document.querySelector('[data-editing]');if(existing)existing.remove();
 const box=node('div',undefined,'panel');box.dataset.editing='true';
 const heading=node('h3',mt('editHeader'));heading.dataset.l='editHeader';box.append(heading);
 const form=node('form',undefined,'form-grid');
 const fields=[['stage_name','stageName'],['song_title','songTitle'],['original_artist','artist'],['demo_url','videoUrl'],...(profileEnabled?[['gender','profileGender'],['photo_url_1','profileMainPhoto'],['photo_url_2','profilePhoto2'],['photo_url_3','profilePhoto3']]:[])];
 for(const [name,key] of fields){
  const lab=node('label',undefined,'field'),label=node('span',mt(key)),input=node('input');label.dataset.l=key;
  input.name=name;input.value=a[name]||'';input.required=!['gender','photo_url_1','photo_url_2','photo_url_3'].includes(name);
  if(name==='gender'){
   const options=[['','不填寫'],['male','男'],['female','女'],['other','其他'],['prefer_not_say','不願透露']];
   const sel=node('select');sel.name=name;for(const [v,t] of options){const opt=node('option',t);opt.value=v;opt.selected=v===(a.gender||'');sel.append(opt)}
   lab.append(label,sel);form.append(lab);continue;
  }
  if(name==='demo_url'||name.startsWith('photo_url_'))input.type='url';
  lab.append(label,input);if(name==='demo_url')lab.classList.add('full');form.append(lab);
 }
 if(profileEnabled){
  const agree=node('label',undefined,'check full'),check=node('input');
  check.type='checkbox';check.name='profile_consent';
  agree.append(check,node('span',mt('profileConsent')));
  form.append(agree);
 }
 const actions=node('div',undefined,'form-actions full'),save=node('button',mt('saveChanges'),'btn btn-primary');save.type='submit';save.dataset.l='saveChanges';
 const cancel=node('button',mt('cancel'),'btn btn-soft');cancel.type='button';cancel.dataset.l='cancel';cancel.onclick=()=>{box.remove();renderMember().catch(e=>status(friendlyError(e),true))};
 actions.append(save,cancel);form.append(actions);
 form.onsubmit=ev=>{ev.preventDefault();run(async()=>{await api('update-application',{application_id:a.id,...formValues(form),...(profileEnabled?{profile_consent:form.querySelector('[name=profile_consent]')?.checked===true}:{})});status(mt('savedChanges'));await renderMember()})};
 box.append(form);holder.prepend(box);box.scrollIntoView({block:'nearest',behavior:'smooth'});
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
   const img=profileImage(a.photo_url_1);
   if(img)info.prepend(img);
   const stats=node('div',undefined,'roster-entry-side');
   stats.append(node('span',a.payment_status==='simulated_paid'?'模擬付款':'未付款','pill'));
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
 const v=formValues(application),data={...v,profile_consent:application.querySelector('[name=profile_consent]')?.checked===true,adult_confirmed:application.querySelector('[name=adult_confirmed]').checked,student_confirmed:application.querySelector('[name=student_confirmed]').checked,no_exclusive_contract:application.querySelector('[name=no_exclusive_contract]').checked};
 const saved=await api('applications',data);application.reset();toggle();details.open=false;status('✓ '+mt('saved')+' '+mt('entryId')+': '+saved.application_id);await renderMember()})});
 const toggle=()=>{const community=$('category').value==='community';const adult=application.querySelector('[name=adult_confirmed]'),student=application.querySelector('[name=student_confirmed]');$('community-statement').hidden=!community;$('university-statement').hidden=community;adult.required=community;student.required=!community;if(community)student.checked=false;else adult.checked=false;};
 $('category').addEventListener('change',toggle);toggle();
 if(location.hash==='#register')details.open=true;syncStart();
 loadSession();
}else if(page==='back'){
 setupAuth();staffTabs();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role||!account)return;run(async()=>{const v=await api('switch-role',{role:next});account=v.account;role=account.role;staffTabs();await dashboard();status('已切換為'+(role==='organizer'?'主辦方':'評審')+'。')})}));loadSession();
}
})();
