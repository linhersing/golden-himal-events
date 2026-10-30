import {PERSONAS,ROUNDS,FEE_NPR,blankPortal,safeParsePortal,
 signUpMock,applyMock,getOrCreateOrder,simulatePayment,reviewMock,summary,seed20} from './member-portal-model.mjs';
// NO user authentication, PII, bank interaction, real video upload or D1 POST.
// All actors, emails, scores and prices here are fictitious local browser state.
const KEY='ghv_member_sandbox_v1';
const $=id=>document.getElementById(id);
let state;
try{state=safeParsePortal(localStorage.getItem(KEY))}catch{state=blankPortal()}
let activeId=null;
let lastSeed=null;
function setText(id,value){$(id).textContent=String(value)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function info(id,message,error=false){const x=$(id);x.textContent=message;x.classList.toggle('error',error)}
function make(name,textValue,cls){
 const e=document.createElement(name);e.textContent=String(textValue);
 if(cls)e.className=cls;return e;
}
function box(label,value){
 const b=make('div','');b.append(make('small',label),make('strong',value));return b;
}
function col(value){
 const td=document.createElement('td');if(value instanceof Node)td.append(value);else td.textContent=String(value);return td;
}
function setOptions(id,items,placeholder='請選擇'){
 const sel=$(id),prev=sel.value;sel.replaceChildren();
 sel.add(new Option(placeholder,''));
 for(const x of items)sel.add(new Option(x.label,x.value));
 if(items.some(x=>x.value===prev))sel.value=prev;
}
function changeTab(name){
 document.querySelectorAll('.tab[data-tab]').forEach(button=>{
  const on=button.dataset.tab===name;
  button.classList.toggle('active',on);
  button.setAttribute('aria-selected',String(on));
  button.tabIndex=on?0:-1;
 });
 document.querySelectorAll('.member-panel').forEach(section=>{
  section.hidden=section.id!=='panel-'+name;
 });
}
document.querySelectorAll('.tab[data-tab]').forEach(button=>{
 button.addEventListener('click',()=>changeTab(button.dataset.tab));
 button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
  const tabs=[...document.querySelectorAll('.tab')];
  const next=tabs[(tabs.indexOf(button)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
  next.focus();changeTab(next.dataset.tab);
 });
});
$('start').addEventListener('click',()=>{changeTab('enroll');$('persona').focus()});
function member(){return state.members.find(m=>m.id===activeId)}
function myApplications(){return state.applications.filter(a=>a.memberId===activeId)}
function payment(appId){return state.orders.find(o=>o.applicationId===appId)}
const reviewNames={submitted:'待審核',needs_info:'待補件',shortlisted:'通過Demo初篩',rejected:'未入選',finalist:'晉級年度決賽'};
const payNames={unpaid:'尚未付款',failed:'模擬付款失敗',paid:'模擬付款成功',refund_pending:'模擬退款申請中',refunded:'模擬已退款'};
function displayPersona(){
 const p=PERSONAS.find(x=>x.code===$('persona').value);
 const root=$('persona-preview');root.replaceChildren();
 if(!p){root.append(make('span','請選一位固定測試人物。'));return;}
 root.append(make('strong',p.alias),make('br',''),
  make('small','測試Email：'+p.email+'｜模擬年齡：'+p.age+'｜組別：'+
   (p.category==='university'?'大學組':'社會組')));
 if(p.age<18)root.append(make('p','⚠️ 此人物為17歲，用來測試「不得報名」規則。'));
}
$('persona').addEventListener('change',displayPersona);
$('signup').addEventListener('click',()=>{
 const result=signUpMock(state,$('persona').value);
 if(result.error){info('enroll-status',result.error,true);return}
 activeId=result.member.id;save();render();
 info('enroll-status',result.member.id+' 註冊模擬完成。');
 changeTab('apply');
});
$('login').addEventListener('click',()=>{
 const id=$('signin').value;
 if(!state.members.some(m=>m.id===id)){info('enroll-status','請先選擇已建立的虛構會員。',true);return}
 activeId=id;render();
 info('enroll-status','已切換至 '+member().alias+'（無密碼的假登入）。');
 changeTab('profile');
});
$('apply').addEventListener('click',()=>{
 const result=applyMock(state,activeId,$('round').value,$('demo').value);
 if(result.error){info('apply-status',result.error,true);return;}
 save();render();info('apply-status',result.application.id+' 已建立，請繼續模擬付款。');
 changeTab('checkout');$('pay-app').value=result.application.id;renderCheckout();
});
$('pay-app').addEventListener('change',renderCheckout);
function selectedApplication(){return myApplications().find(x=>x.id===$('pay-app').value)}
function selectedOrder(){return payment($('pay-app').value)}
function renderCheckout(){
 const app=selectedApplication(),order=selectedOrder(),root=$('checkout-card');root.replaceChildren();
 root.append(box('報名',app?.id||'尚無申請'),
  box('伺服器應核定的固定金額','NPR '+FEE_NPR),
  box('假訂單狀態',order?payNames[order.status]:'未建立訂單'));
 $('order').disabled=!app;
 $('pay-success').disabled=!order||!['unpaid','paid'].includes(order.status);
 $('pay-fail').disabled=!order||order.status!=='unpaid';
 $('pay-retry').disabled=!order||order.status!=='failed';
}
$('order').addEventListener('click',()=>{
 const app=selectedApplication();
 const result=getOrCreateOrder(state,app?.id);
 if(result.error){info('payment-feedback',result.error,true);return}
 save();render();
 info('payment-feedback',result.existing?'此報名已有唯一 TEST 訂單，沒有重複建立。':
  result.order.id+' 建立成功，尚未付款（完全不扣款）。');
});
for(const [id,event] of [['pay-success','success'],['pay-fail','fail'],['pay-retry','retry']]){
 $(id).addEventListener('click',()=>{
  const order=selectedOrder(),result=simulatePayment(state,order?.id,event);
  if(result.error){info('payment-feedback',result.error,true);return}
  save();render();
  info('payment-feedback',result.duplicate?'重複的假付款成功通知已忽略，金額沒有重複增加。':
   '已模擬 '+payNames[result.order.status]+'。正式系統應獨立向支付商驗證，此處沒有銀行交易。');
 });
}
function tdWithButtons(app){
 const container=make('div','', 'row-actions');
 for(const [label,next] of [['補件','needs_info'],['入圍初賽','shortlisted'],['退件','rejected'],['決賽晉級','finalist']]){
  const button=make('button',label);
  button.type='button';button.disabled=app.status===next;
  button.addEventListener('click',()=>{
   const result=reviewMock(state,app.id,next);
   if(result.error){info('operator-feedback',result.error,true);return}
   save();render();info('operator-feedback',app.id+' 的模擬審核狀態已改為 '+reviewNames[next]);
  });
  container.append(button);
 }
 return container;
}
function renderOperator(){
 const root=$('admin-rows');root.replaceChildren();
 if(!state.applications.length){
  const row=make('tr',''),td=col('還沒有 TEST 報名。請先建立會員，或到驗收頁一鍵產生資料。');
  td.colSpan=6;row.append(td);root.append(row);
 }
 for(const app of [...state.applications].reverse()){
  const mem=state.members.find(m=>m.id===app.memberId),order=payment(app.id);
  const ident=make('div','');
  ident.append(make('strong',app.id),make('small',app.memberId));
  const row=make('tr','');
  row.append(col(ident),col(mem.alias+'／'+(mem.category==='university'?'大學組':'社會組')),
   col(app.round+' / '+app.demo),col(order?payNames[order.status]:'未開單'),
   col(reviewNames[app.status]),col(tdWithButtons(app)));
  root.append(row);
 }
 const stats=summary(state),metrics=$('operator-stats');metrics.replaceChildren();
 for(const [label,value] of [
  ['TEST 會員',stats.members],['TEST 報名',stats.applications],
  ['模擬已付款',stats.paidOrders],['模擬已入圍',stats.shortlist],
  ['模擬淨額','NPR '+stats.testNetNpr]])
 {
  const el=make('div','', 'metric');
  el.append(make('strong',value),make('span',label));metrics.append(el);
 }
}
function renderProfile(){
 const root=$('profile');root.replaceChildren();
 const m=member();
 if(!m){root.append(make('p','未模擬登入，請先建立 TEST 會員或切換身份。'));return}
 root.append(make('h3','TEST 會員卡｜'+m.alias));
 const info=make('div','');
 for(const [label,value] of [['會員ID',m.id],['固定虛構信箱',m.email],
  ['年齡（假）',m.age],['全年鎖定組別',m.category==='university'?'大學組':'社會組'],
  ['驗證狀態','僅模擬，沒有發送 OTP']]){
  const slot=make('section','');slot.append(make('small',label),make('b',value));info.append(slot);
 }
 root.append(info);
}
function renderMyApps(){
 const root=$('my-apps');root.replaceChildren();
 if(!myApplications().length){
  const row=make('tr',''),td=col('尚無報名。先到「線上報名」建立測試申請。');
  td.colSpan=5;row.append(td);root.append(row);return;
 }
 for(const app of [...myApplications()].reverse()){
  const row=make('tr',''),order=payment(app.id);
  row.append(col(app.id),col(app.round),col(app.demo),
   col(order?payNames[order.status]:'未開單'),col(reviewNames[app.status]));
  root.append(row);
 }
}
function render(){
 const personaOptions=PERSONAS.map(p=>({value:p.code,label:p.alias+(p.age<18?' (17歲測試拒絕)':'')}));
 const selected=$('persona').value;
 if($('persona').options.length===0){
  setOptions('persona',personaOptions,'請選擇固定虛構人物');
  if(!selected)$('persona').value='T001';
 }
 displayPersona();
 setOptions('signin',state.members.map(m=>({value:m.id,label:m.id+'｜'+m.alias})),'選擇現有 TEST 會員');
 setText('active-apply',member()?
  member().id+'｜'+member().alias+'｜'+(member().category==='university'?'大學組':'社會組'):
  '尚未選擇 TEST 會員。先建立帳號或模擬登入。');
 setOptions('pay-app',myApplications().map(a=>({value:a.id,label:a.id+'｜'+a.round})),'請先建立測試報名');
 if(!selectedApplication()&&myApplications().length)$('pay-app').value=myApplications()[0].id;
 $('apply').disabled=!member();
 renderCheckout();renderProfile();renderMyApps();renderOperator();
 const metrics=summary(state);
 setText('member-total',metrics.members);
 setText('application-total',metrics.applications);
 const checks=$('qa-report');checks.replaceChildren();
 for(const line of [
  '● 已建立虛構會員 '+metrics.members+' 位（最大19位有效、1位未成年測試拒絕）',
  '● 已建立虛構報名 '+metrics.applications+' 筆，尚未付款 '+metrics.pendingOrders+' 筆',
  '● 模擬付款確認 '+metrics.paidOrders+' 筆；模擬淨額 NPR '+metrics.testNetNpr,
  '● 模擬Demo初篩入圍 '+metrics.shortlist+' 筆；此數字不是現場實際入圍人數',
  '● 真正登入、Email OTP、Cloudflare D1寫入、R2上傳、支付商、權限後台：未實作'
 ])checks.append(make('p',line));
}
$('seed20').addEventListener('click',()=>{
 if(!confirm('將「此會員沙盒」重置，再產生20個固定虛構測試案例？不會改動既有D1、金流或別的測試室。'))return;
 state=blankPortal();activeId=null;
 lastSeed=seed20(state);
 save();render();
 const failed=lastSeed.filter(x=>x.error),ok=lastSeed.length-failed.length;
 info('qa-status','已執行20個合成案例：'+ok+'筆會員及報名建立、'+failed.length+
  '筆年齡規則拒絕（第20位為17歲）。已模擬付款及部分入圍，可進「後台審核」查看。');
});
$('reset').addEventListener('click',()=>{
 if(!confirm('清除這台瀏覽器的會員／報名／付款測試資料？此操作不會刪除D1或其他沙盒。'))return;
 state=blankPortal();activeId=null;lastSeed=null;
 save();render();info('qa-status','會員測試沙盒已重置。');
});
$('export').addEventListener('click',()=>{
 const data={label:'TEST ONLY · NO REAL MEMBER OR PAYMENT',exported_at:new Date().toISOString(),state};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='ghv-member-mock-only.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
