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
const staff=page==='back',prefix=staff?'back':'member';
let busy=false,challenge=null,role=staff?'organizer':'member',account=null;
const statusBox=$(prefix+'-status');
function status(text,bad=false){if(!statusBox)return;statusBox.hidden=false;statusBox.className='feedback'+(bad?' error':' success');statusBox.textContent=text;statusBox.scrollIntoView({block:'nearest',behavior:'smooth'})}
function friendlyError(e){const errors={e2e_not_configured:'目前尚未開通 Email 驗證服務，無法登入。正式系統需先完成寄信設定。',test_email_service_unavailable:'寄信服務目前不可使用，請稍後或確認平台設定。',not_on_test_allowlist:'此 Email 尚未獲授權，目前只接受受邀帳號。',expired_or_invalid_code:'驗證碼錯誤或已過期，請重新取得。',login_required:'請先登入。',organizer_only:'這個帳號不是主辦單位，無權查看管理資料。',reviewer_only:'這個帳號不是評審，無權打分。',member_only:'此帳號並非會員。',update_locked:'這筆資料已進入審核或模擬繳費階段，無法直接修改。',delete_locked:'這筆資料已進入評審或後續流程，無法直接刪除。',invalid_demo_url:'請輸入有效的公開作品連結。',annual_category_locked:'年度組別已鎖定。',already_scored_or_unavailable:'你已評過這位選手，不能重複給分。'};return errors[e?.message]||('目前無法完成操作（'+(e?.message||'連線失敗')+'）。')}
async function api(path,body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{const r=await fetch('/api/e2e/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:c.signal});const data=await r.json();if(!r.ok||data.ok!==true)throw new Error(data.error||('HTTP '+r.status));return data}finally{clearTimeout(timer)}}
async function run(fn){if(busy)return;busy=true;document.body.classList.add('requesting');try{await fn()}catch(e){status(friendlyError(e),true)}finally{busy=false;document.body.classList.remove('requesting')}}
function authUI(signedIn){(staff?$('back-signin'):$('signin-panel')).hidden=signedIn;$(prefix+'-dashboard')?.setAttribute('hidden','');if(staff){$('back-dashboard').hidden=!signedIn}else{$('member-panel').hidden=!signedIn}}
function authForms(email){$(prefix+'-email-form').hidden=!email;$(prefix+'-code-form').hidden=email}
async function loadSession(){try{const v=await api('me');if(v.account.role!==role){account=null;authUI(false);status('已登入其他身分，請先登出再切換角色。',true);return;}account=v.account;authUI(true);await dashboard()}catch(e){account=null;authUI(false);if(e.message==='e2e_not_configured')status(friendlyError(e),true)}}
function setupAuth(){
const mailForm=$(prefix+'-email-form'),codeForm=$(prefix+'-code-form');
mailForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{const {email}=formValues(mailForm);const v=await api('request-code',{email,role});challenge=v.challenge_id;authForms(false);status('驗證信已要求寄送，請查看 Email（僅限受邀測試帳號）。');codeForm.querySelector('input').focus()})});
codeForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('verify-code',{challenge_id:challenge,code:String(formValues(codeForm).code||'').trim()});codeForm.reset();await loadSession();if(account)status('已登入。')})});
const change=$(staff?'back-change':'change-mail');change?.addEventListener('click',()=>{authForms(true);challenge=null;statusBox.hidden=true});
$(prefix+'-logout')?.addEventListener('click',()=>run(async()=>{await api('logout',{});account=null;authUI(false);challenge=null;authForms(true);status('已登出。')}));
}
async function dashboard(){if(!account)return;if(staff){if(role==='organizer')await renderOrganizer();else await renderJudge()}else await renderMember()}
function drawEntry(a){
const box=node('article',undefined,'entry'),head=node('strong',a.stage_name+' · '+a.song_title);box.append(head,node('p','報名編號：'+a.id,'minor'));
const isPaid=a.payment_status==='simulated_paid';const badge=node('span',isPaid?'僅模擬付款｜非正式成功':'待付款｜尚未正式報名','pill '+(isPaid?'':'pill-warn'));box.append(badge);
box.append(node('p','組別：'+a.category+' · 報名梯次：'+a.round_code,'minor'));
const link=safeLink(a.demo_url);if(link){const l=node('a','查看我的作品連結 ↗','small-link');l.href=link;l.target='_blank';l.rel='noopener noreferrer';box.append(l)}
const actions=node('div',undefined,'inline-actions');
if(!isPaid&&a.status==='submitted'){
const edit=node('button','修改資料','btn btn-soft');edit.type='button';edit.onclick=()=>showEdit(a);
const del=node('button','刪除此筆','btn btn-danger');del.type='button';del.onclick=()=>{if(!confirm('確定刪除這筆尚未付款的測試報名？此操作無法復原。'))return;run(async()=>{await api('delete-application',{application_id:a.id});status('這筆報名已刪除。');await renderMember()})};
const fake=node('button','模擬付款（不收費）','btn btn-soft');fake.type='button';fake.onclick=()=>{if(!confirm('這只是流程模擬，不會扣款，也不代表正式報名成功。繼續嗎？'))return;run(async()=>{await api('mock-payment',{application_id:a.id});status('已記錄付款流程模擬，沒有實際收費，正式報名仍未成功。');await renderMember()})};
actions.append(edit,del,fake);
}else actions.append(node('small','此階段暫不提供自行修改，如需變更將由主辦方另訂流程。'));
box.append(actions);return box;
}
async function renderMember(){
const holder=$('entries');holder.replaceChildren();
const v=await api('applications');
if(!v.applications.length)holder.append(node('p','目前沒有報名資料。點下方「填寫新報名」開始。'));
for(const a of v.applications)holder.append(drawEntry(a));
}
function showEdit(a){
const holder=$('entries'),id='edit-'+a.id;let existing=document.querySelector('[data-editing]');if(existing)existing.remove();
const box=node('div',undefined,'panel');box.dataset.editing='true';
box.append(node('h3','編輯作品與報名資料'));
const form=node('form',undefined,'form-grid');
const fields=[['stage_name','歌手名稱'],['song_title','歌曲名稱'],['original_artist','原唱者'],['demo_url','作品公開連結']];
for(const [name,labelText] of fields){const lab=node('label',undefined,'field');const label=node('span',labelText),input=node('input');input.name=name;input.value=a[name]||'';input.required=true;if(name==='demo_url')input.type='url';lab.append(label,input);if(name==='demo_url')lab.classList.add('full');form.append(lab)}
const act=node('div',undefined,'form-actions full'),save=node('button','儲存修改','btn btn-primary');save.type='submit';const cancel=node('button','取消','btn btn-soft');cancel.type='button';cancel.onclick=()=>box.remove();act.append(save,cancel);form.append(act);
form.onsubmit=ev=>{ev.preventDefault();run(async()=>{await api('update-application',{application_id:a.id,...formValues(form)});status('修改已寫入雲端。');await renderMember()})};box.append(form);holder.prepend(box);box.scrollIntoView({behavior:'smooth'});
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
 role='member';setupAuth();const application=$('application-form');application.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
 const v=formValues(application),data={...v,adult_confirmed:application.querySelector('[name=adult_confirmed]').checked,student_confirmed:application.querySelector('[name=student_confirmed]').checked,no_exclusive_contract:application.querySelector('[name=no_exclusive_contract]').checked};
 await api('applications',data);application.reset();$('application-details').open=false;status('資料已送出並儲存，但尚未付款，尚不算正式報名成功。');await renderMember()})});
 const toggle=()=>{const c=$('category').value;application.querySelector('[name=adult_confirmed]').required=c==='community';application.querySelector('[name=student_confirmed]').required=c==='university';};$('category').addEventListener('change',toggle);toggle();
 if(location.hash==='#register')$('application-details').open=true;
 loadSession();
}else if(page==='back'){
 setupAuth();document.querySelectorAll('[data-role-tab]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.roleTab;if(next===role)return;role=next;document.querySelectorAll('[data-role-tab]').forEach(b=>b.classList.toggle('active',b.dataset.roleTab===role));account=null;challenge=null;authUI(false);authForms(true);statusBox.hidden=true;run(async()=>{const v=await api('me');if(v.account.role===role){account=v.account;authUI(true);await dashboard()}else status('請使用對應身分的受邀 Email 登入。')})}));loadSession();
}
})();
