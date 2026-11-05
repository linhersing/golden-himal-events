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
let busy=false,challenge=null,role=staff?'organizer':'member',account=null;
const statusBox=$(prefix+'-status');
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
 account=v.account;role=account.role;authUI(true);if(staff)staffTabs();await dashboard();
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
 const fields=[['stage_name','stageName'],['song_title','songTitle'],['original_artist','artist'],['demo_url','videoUrl']];
 for(const [name,key] of fields){
  const lab=node('label',undefined,'field'),label=node('span',mt(key)),input=node('input');label.dataset.l=key;
  input.name=name;input.value=a[name]||'';input.required=true;
  if(name==='demo_url')input.type='url';
  lab.append(label,input);if(name==='demo_url')lab.classList.add('full');form.append(lab);
 }
 const actions=node('div',undefined,'form-actions full'),save=node('button',mt('saveChanges'),'btn btn-primary');save.type='submit';save.dataset.l='saveChanges';
 const cancel=node('button',mt('cancel'),'btn btn-soft');cancel.type='button';cancel.dataset.l='cancel';cancel.onclick=()=>{box.remove();renderMember().catch(e=>status(friendlyError(e),true))};
 actions.append(save,cancel);form.append(actions);
 form.onsubmit=ev=>{ev.preventDefault();run(async()=>{await api('update-application',{application_id:a.id,...formValues(form)});status(mt('savedChanges'));await renderMember()})};
 box.append(form);holder.prepend(box);box.scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function renderOrganizer(){
$('organizer-dashboard').hidden=false;$('judge-dashboard').hidden=true;
const v=await api('organizer-queue');$('pending-count').textContent=String(v.applications.length);
$('scores-count').textContent=String(v.applications.reduce((n,a)=>n+Number(a.demo_judges||0)+Number(a.live_judges||0),0));
$('paid-count').textContent='0';
const holder=$('admin-apps');holder.replaceChildren();
if(!v.applications.length)holder.append(node('p','目前沒有可讀取的測試報名紀錄。'));
for(const a of v.applications){const box=node('article',undefined,'entry');box.append(node('strong',(a.stage_name||'選手')+' · '+a.round_code+' · '+a.category));box.append(node('p','報名：'+a.id,'minor'));box.append(node('span',a.payment_status==='simulated_paid'?'模擬付款｜正式付款 0':'尚未付款','pill'));box.append(node('p','評審回覆：'+(a.demo_judges||0)+'/3 · 平均：'+(a.demo_mean??'—'),'minor'));holder.append(box)}
}
async function renderJudge(){
 $('organizer-dashboard').hidden=true;$('judge-dashboard').hidden=false;
 const v=await api('reviewer-queue'),holder=$('judge-queue');holder.replaceChildren();
 if(!v.queue.length)holder.append(node('p','目前沒有可評分的作品。'));
 for(const a of v.queue){
  const box=node('article',undefined,'entry');
  const phase=a.phase||'demo',demo=phase==='demo';
  box.append(node('strong',a.stage_name+' · '+a.round_code));
  box.append(node('p','目前階段：'+(demo?'線上海選':phase==='qualifier'?'現場初賽':'決賽'),'minor'));
  const link=safeLink(a.demo_url);
  if(link){const l=node('a','觀看作品 ↗','small-link');l.href=link;l.target='_blank';l.rel='noopener noreferrer';box.append(l)}
  const saved=demo?a.demo_technique:a.live_technique;
  if(saved!==null&&saved!==undefined){
   const existing=demo?[a.demo_technique,a.demo_interpretation]:[a.live_technique,a.live_interpretation,a.stage_presence,a.appearance];
   box.append(node('p','已評分：'+existing.reduce((sum,x)=>sum+Number(x||0),0)+' 分','minor'));
   holder.append(box);continue;
  }
  const form=node('form',undefined,'form-grid');
  const criteria=demo?[['technique','技巧（0–60）',60],['interpretation','表現（0–40）',40]]:
   [['technique','技巧（0–40）',40],['interpretation','表現（0–30）',30],['stage_presence','台風（0–20）',20],['appearance','儀容（0–10）',10]];
  for(const [name,labelText,max] of criteria){
   const lab=node('label',undefined,'field'),input=node('input');
   input.name=name;input.type='number';input.min='0';input.max=String(max);input.step='1';input.required=true;
   lab.append(node('span',labelText),input);form.append(lab);
  }
  const agree=node('label',undefined,'check'),checkbox=node('input');
  checkbox.type='checkbox';checkbox.name='conflict';checkbox.required=true;
  agree.append(checkbox,node('span','我確認此次評分沒有利益衝突。'));form.append(agree);
  const save=node('button','儲存我的評分','btn btn-primary');save.type='submit';form.append(save);
  form.onsubmit=ev=>{ev.preventDefault();run(async()=>{
   const input=formValues(form),payload={application_id:a.id,phase,no_conflict:checkbox.checked};
   for(const [name] of criteria)payload[name]=Number(input[name]);
   await api('score',payload);
   status('評分已儲存。');await renderJudge();
  })};box.append(form);holder.append(box);
 }
}

if(page==='member'){
 role='member';setupAuth();
 window.addEventListener('ghv:languagechange',()=>{if(account&&account.role==='member'){if(document.querySelector('[data-editing]'))return;renderMember().catch(e=>status(friendlyError(e),true))}});
 const application=$('application-form'),details=$('application-details'),start=$('start-application');
 const syncStart=()=>start?.setAttribute('aria-expanded',String(details.open));
 details.addEventListener('toggle',syncStart);
 start?.addEventListener('click',()=>{details.open=true;syncStart();details.scrollIntoView({block:'start',behavior:'smooth'});setTimeout(()=>application.querySelector('[name=stage_name]')?.focus({preventScroll:true}),180)});
 application.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const v=formValues(application),data={...v,adult_confirmed:application.querySelector('[name=adult_confirmed]').checked,student_confirmed:application.querySelector('[name=student_confirmed]').checked,no_exclusive_contract:application.querySelector('[name=no_exclusive_contract]').checked};
 const saved=await api('applications',data);application.reset();toggle();details.open=false;status('✓ '+mt('saved')+' '+mt('entryId')+': '+saved.application_id);await renderMember()})});
 const toggle=()=>{const community=$('category').value==='community';const adult=application.querySelector('[name=adult_confirmed]'),student=application.querySelector('[name=student_confirmed]');$('community-statement').hidden=!community;$('university-statement').hidden=community;adult.required=community;student.required=!community;if(community)student.checked=false;else adult.checked=false;};
 $('category').addEventListener('change',toggle);toggle();
 if(location.hash==='#register')details.open=true;syncStart();
 loadSession();
}else if(page==='back'){
 setupAuth();staffTabs();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role||!account)return;run(async()=>{const v=await api('switch-role',{role:next});account=v.account;role=account.role;staffTabs();await dashboard();status('已切換為'+(role==='organizer'?'主辦方':'評審')+'。')})}));loadSession();
}
})();;(()=>{function setupPhotoAndGender(){const photoInput=document.getElementById('photo-url-input'),photoPreview=document.getElementById('photo-preview'),genderInputs=document.querySelectorAll('input[name="gender"], select[name="gender"], #gender-input, #gender-select');function updatePreview(url){if(!photoPreview)return;if(photoPreview.tagName==='IMG'){if(url){photoPreview.src=url;photoPreview.hidden=false;photoPreview.style.display='block';}else{photoPreview.hidden=true;photoPreview.style.display='none';}}else{let img=photoPreview.querySelector('img');if(url){if(!img){img=document.createElement('img');img.style.maxWidth='100%';img.style.maxHeight='150px';photoPreview.appendChild(img);}img.src=url;photoPreview.hidden=false;photoPreview.style.display='block';}else{if(img)img.remove();photoPreview.hidden=true;photoPreview.style.display='none';}}}function saveState(){const url=photoInput?photoInput.value.trim():'';let g='';genderInputs.forEach(el=>{if((el.type==='radio'||el.type==='checkbox')?el.checked:el.value)g=el.value;});if(url)localStorage.setItem('ghv_photo_url',url);if(g)localStorage.setItem('ghv_gender',g);updatePreview(url);}if(photoInput){['input','change'].forEach(ev=>photoInput.addEventListener(ev,e=>{updatePreview(e.target.value.trim());saveState();}));const u=photoInput.value||localStorage.getItem('ghv_photo_url');if(u){photoInput.value=u;updatePreview(u);}}genderInputs.forEach(el=>['change','input'].forEach(ev=>el.addEventListener(ev,saveState)));}function enrichCards(){const u=localStorage.getItem('ghv_photo_url'),g=localStorage.getItem('ghv_gender');document.querySelectorAll('#organizer-applications > *, #judge-queue > *').forEach(card=>{if(card.dataset.enriched)return;card.dataset.enriched='true';if(u&&!card.querySelector('.card-avatar')){const img=document.createElement('img');img.src=u;img.className='card-avatar';img.style.width='32px';img.style.height='32px';img.style.borderRadius='50%';img.style.marginRight='8px';const h=card.querySelector('h3,h4,header')||card.firstChild;if(h&&h.parentNode)h.parentNode.insertBefore(img,h);}if(g&&!card.querySelector('.gender-tag')){const tag=document.createElement('span');tag.className='badge gender-tag';tag.textContent=g;tag.style.marginLeft='8px';const h=card.querySelector('h3,h4,header')||card;h.appendChild(tag);}});}function setupOrganizerFilters(){const langs=document.querySelectorAll('[data-org-filter-lang]'),cats=document.querySelectorAll('[data-org-filter-cat]'),statuses=document.querySelectorAll('[data-org-filter-status]'),container=document.getElementById('organizer-applications');function apply(){if(!container)return;const lang=document.querySelector('[data-org-filter-lang].active')?.dataset.orgFilterLang||'all',cat=document.querySelector('[data-org-filter-cat].active')?.dataset.orgFilterCat||'all',st=document.querySelector('[data-org-filter-status].active')?.dataset.orgFilterStatus||'all';Array.from(container.children).forEach(card=>{const txt=card.textContent.toLowerCase(),cLang=(card.dataset.lang||'').toLowerCase(),cCat=(card.dataset.category||card.dataset.cat||'').toLowerCase(),cSt=(card.dataset.status||'').toLowerCase(),mL=lang==='all'||!lang||cLang.includes(lang.toLowerCase())||txt.includes(lang.toLowerCase()),mC=cat==='all'||!cat||cCat.includes(cat.toLowerCase())||txt.includes(cat.toLowerCase()),mS=st==='all'||!st||cSt.includes(st.toLowerCase())||txt.includes(st.toLowerCase());card.style.display=(mL&&mC&&mS)?'':'none';});}function bind(group){group.forEach(btn=>btn.addEventListener('click',()=>{group.forEach(b=>b.classList.remove('active'));btn.classList.add('active');apply();}));}bind(langs);bind(cats);bind(statuses);}function setupJudgeWorkbench(){const queue=document.getElementById('judge-queue'),roster=document.getElementById('judge-roster-list'),filters=document.getElementById('judge-filters'),pag=document.getElementById('judge-pagination'),modal=document.getElementById('judge-modal-overlay');if(!queue&&!roster)return;let page=1,pageSize=10,currentFilter='all';function render(){if(!roster||!queue)return;const raw=Array.from(queue.children),items=raw.map((card,idx)=>{const name=card.querySelector('h3,h4,.candidate-name,strong')?.textContent||`選手 ${idx+1}`,evaled=card.classList.contains('evaluated')||card.dataset.status==='evaluated'||card.textContent.includes('已評')||card.textContent.includes('已打分');return{card,idx,name,evaled,u:localStorage.getItem('ghv_photo_url'),g:localStorage.getItem('ghv_gender')};}),filtered=items.filter(it=>{if(currentFilter==='pending'||currentFilter==='待評')return!it.evaled;if(currentFilter==='evaluated'||currentFilter==='已評')return it.evaled;return true;}),totalPages=Math.ceil(filtered.length/pageSize)||1;if(page>totalPages)page=totalPages;if(page<1)page=1;const pageItems=filtered.slice((page-1)*pageSize,page*pageSize);roster.innerHTML='';if(!pageItems.length){const li=document.createElement('li');li.textContent='無符合條件的選手';li.style.padding='10px';roster.appendChild(li);}else{pageItems.forEach(it=>{const li=document.createElement('li');li.className='judge-roster-item card-row';li.style.cssText='cursor:pointer;padding:10px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;';const left=document.createElement('div');left.style.display='flex';left.style.alignItems='center';left.style.gap='8px';if(it.u){const img=document.createElement('img');img.src=it.u;img.style.cssText='width:28px;height:28px;border-radius:50%;object-fit:cover;';left.appendChild(img);}const nm=document.createElement('span');nm.textContent=it.name;nm.style.fontWeight='600';left.appendChild(nm);if(it.g){const gTag=document.createElement('span');gTag.className='badge';gTag.textContent=it.g;left.appendChild(gTag);}const st=document.createElement('span');st.className='status-badge';st.textContent=it.evaled?'已評':'待評';st.style.cssText='font-size:0.8em;padding:2px 8px;border-radius:10px;'+(it.evaled?'background:#c6f6d5;color:#22543d;':'background:#feebc8;color:#744210;');li.appendChild(left);li.appendChild(st);li.addEventListener('click',()=>openModal(it));roster.appendChild(li);});}renderPag(totalPages);}function renderPag(totalPages){if(!pag)return;pag.innerHTML='';const prev=document.createElement('button');prev.type='button';prev.textContent='上一頁';prev.disabled=page<=1;prev.onclick=e=>{e.stopPropagation();if(page>1){page--;render();}};const info=document.createElement('span');info.textContent=` ${page} / ${totalPages} `;info.style.margin='0 8px';const next=document.createElement('button');next.type='button';next.textContent='下一頁';next.disabled=page>=totalPages;next.onclick=e=>{e.stopPropagation();if(page<totalPages){page++;render();}};pag.appendChild(prev);pag.appendChild(info);pag.appendChild(next);}function openModal(it){if(!modal)return;let body=modal.querySelector('.modal-content, .judge-modal-body, #judge-modal-body')||modal.querySelector('div')||modal,closeBtn=modal.querySelector('#judge-modal-close, .close-btn, .modal-close');if(!closeBtn){closeBtn=document.createElement('button');closeBtn.id='judge-modal-close';closeBtn.type='button';closeBtn.innerHTML='&times;';closeBtn.style.cssText='position:absolute;top:10px;right:15px;font-size:24px;border:none;background:none;cursor:pointer;';body.insertBefore(closeBtn,body.firstChild);}const close=()=>{modal.classList.remove('active','open');modal.style.display='none';modal.setAttribute('aria-hidden','true');if(queue&&it.card&&it.card.parentNode!==queue)queue.appendChild(it.card);};closeBtn.onclick=close;modal.onclick=e=>{if(e.target===modal)close();};let container=modal.querySelector('#judge-modal-card-container')||body;if(container&&it.card){container.appendChild(it.card);it.card.style.display='block';}modal.classList.add('active','open');modal.style.display='flex';modal.setAttribute('aria-hidden','false');}if(filters){filters.querySelectorAll('[data-judge-filter], button, .filter-pill').forEach(b=>{b.addEventListener('click',()=>{filters.querySelectorAll('[data-judge-filter], button, .filter-pill').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.judgeFilter||b.dataset.filter||b.textContent.trim().toLowerCase();page=1;render();});});}if(queue){new MutationObserver(()=>{render();enrichCards();}).observe(queue,{childList:true,subtree:true});}render();}function start(){setupPhotoAndGender();setupOrganizerFilters();setupJudgeWorkbench();enrichCards();}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',start);}else{start();}})();
