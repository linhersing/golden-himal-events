const $=id=>document.getElementById(id);
let overview=null,records=null,page=1,source='practice',tab='registrations',working=false;
const num=x=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('zh-TW'):'—';
const label={january:'2027年1月',april:'2027年4月',university:'大學組',community:'社會組',demo:'海選Demo',qualifier:'實體初賽',final:'年度決賽',
deferred:'未模擬付款',simulation_only:'模擬付款完成',unpaid:'未模擬付款',simulated_paid:'模擬付款完成'};
const tr=x=>label[x]||x||'—';
const el=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);if(cls)node.className=cls;return node};
function status(value,error=false){$('status').textContent=value;$('status').classList.toggle('error',error)}
async function api(resource){
 const response=await fetch('/api/staging/management/'+resource,{credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'},signal:AbortSignal.timeout(16000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.ok!==true){const err=new Error('Unable to read Cloudflare management data');err.status=response.status;err.code=data?.error||'network_error';throw err}
 return data;
}
function showMetrics(){
 if(!overview)return;
 $('content').hidden=false;
 const p=overview.sources.practice,e=overview.sources.e2e;
 const a=p.counts||{},b=e.counts||{};
 const stats=[
  ['有效測試空間',p.status==='available'?num(a.active_workspaces):'—'],
  ['虛構測試報名筆數',p.status==='available'?num(a.applications):'—'],
  ['不重複虛構測試身分',p.status==='available'?num(a.distinct_test_identities):'—'],
  ['模擬付款完成筆數',p.status==='available'?num(a.mock_paid):'—'],
  ['測試評分卡',p.status==='available'?num(a.scorecards):'—'],
  ['測試決賽票',p.status==='available'?num(a.votes):'—'],
  ['受邀Email測試報名',e.status==='available'?num(b.applications):'未啟用'],
  ['真實收款', '未接通']
 ];
 $('cards').replaceChildren();
 for(const [k,v] of stats){const card=el('div',undefined,'stat');card.append(el('span',k),el('strong',v));$('cards').append(card)}
 $('sources').replaceChildren();
 for(const [key,title,report] of [['practice','私人測試空間',p],['e2e','Email 受邀驗收',e]]){
  const row=el('div',undefined,'source-line');row.append(el('span',title),el('strong',report.status==='available'?'已連線 · '+num(report.counts.applications)+'筆':'尚未啟用'));$('sources').append(row);
 }
 $('updated').textContent='D1 更新時間：'+new Date(overview.as_of).toLocaleString('zh-TW',{timeZone:'Asia/Kathmandu'})+'（尼泊爾）';
}
function renderRecords(){
 $('rows').replaceChildren();
 const headings=tab==='scores'?
  ['測試報名編號','評審身分','評分階段','評分細項','總分']:
  tab==='payments'?['測試報名編號','海選梯次','付款狀態','模擬付款紀錄','真實入帳']:
  ['測試報名編號','海選／組別','審核階段','評審分數','付款狀態'];
 [...document.querySelectorAll('thead th')].forEach((th,i)=>th.textContent=headings[i]);
 if(!records||records.status!=='available'){
  const row=el('tr'),cell=el('td','此資料來源未啟用；不可當作0筆。');
  cell.colSpan=5;row.append(cell);$('rows').append(row);$('page-label').textContent='—';
  $('previous').disabled=$('next').disabled=true;return;
 }
 const items=records.items||[];
 $('page-label').textContent='第 '+page+' 頁 · 共 '+num(records.total)+' 筆 · 每頁50筆';
 $('previous').disabled=page<=1;$('next').disabled=page*50>=records.total;
 if(!items.length){
  const row=el('tr'),cell=el('td','此資料來源目前沒有這類測試紀錄。');
  cell.colSpan=5;row.append(cell);$('rows').append(row);return
 }
 for(const item of items){
  const row=el('tr');
  if(tab==='scores'){
   row.append(
    el('td',item.application_id),el('td',item.judge_id),
    el('td',tr(item.phase)+(item.recused?' · 迴避':'')),
    el('td','技巧 '+num(item.technique)+' ／ 詮釋 '+num(item.interpretation)+
     ' ／ 台風 '+num(item.stage_presence)+' ／ 表現 '+num(item.appearance)),
    el('td',item.total_score===null?'迴避不計分':num(item.total_score)));
  }else if(tab==='payments'){
   const payment=el('td');
   payment.append(el('span',tr(item.payment_status),'pill '+
    (item.payment_status==='simulated_paid'||item.payment_status==='simulation_only'?'':'warning')));
   row.append(el('td',item.application_id),
    el('td',tr(item.round_code==='2027-01'?'january':'april')),
    payment,
    el('td',item.simulated_amount_npr===null?'尚未模擬收款':'模擬 NPR '+num(item.simulated_amount_npr)),
    el('td','未接通金流／無實收證據'));
  }else{
   const round=el('td',tr(item.round_code==='2027-01'?'january':'april')+' · '+tr(item.category));
   round.append(el('div',tr(item.province),'muted'));
   const phase=el('td',tr(item.phase));phase.append(el('div',item.review_status||'—','muted'));
   const score=el('td',num(item.scorecards)+' 張評分卡');
   score.append(el('div',item.score_mean===null?'尚未評分':'平均 '+num(item.score_mean),'muted'));
   const pay=el('td');
   pay.append(el('span',tr(item.payment_status),'pill '+
    (item.payment_status==='simulation_only'||item.payment_status==='simulated_paid'?'':'warning')));
   row.append(el('td',item.record_id),round,phase,score,pay);
  }
  $('rows').append(row);
 }
}
async function loadAll(){if(working)return;working=true;$('reload').disabled=true;status('正在從 Cloudflare D1 讀取資料…');
 try{const data=await api('overview');overview=data;showMetrics();await loadRecords();
  status('已透過 Cloudflare Access 取得測試總覽；付款全屬模擬，正式金流未啟用。');
 }catch(error){
  overview=null;records=null;$('content').hidden=true;
  status(error.code==='admin_access_not_configured'?'管理員後台程式已部署，但 Cloudflare Access、管理員名單尚未完成配置。':
   error.status===403?'拒絕存取：請使用獲主辦單位授權的 Cloudflare Access 管理員登入。':
    '無法安全取得 D1 統計；未顯示舊數字。',true)
 }finally{working=false;$('reload').disabled=false}
}
async function loadRecords(){
 try{records=await api((tab==='scores'?'scores':tab==='payments'?'payments':'records')+'?source='+encodeURIComponent(source)+'&page='+page);renderRecords()}
 catch{records=null;$('rows').replaceChildren();status('明細讀取失敗，請重試；未顯示過期資料。',true)}
}
$('reload').onclick=loadAll;
$('source').onchange=()=>{source=$('source').value;page=1;loadRecords()};
$('previous').onclick=()=>{if(page>1){page--;loadRecords()}};
$('next').onclick=()=>{if(records&&page*50<records.total){page++;loadRecords()}};
$('print').onclick=()=>{if(overview)window.print()};
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{tab=b.dataset.tab;for(const other of document.querySelectorAll('[data-tab]'))other.setAttribute('aria-pressed',String(other===b));$('records-title').textContent={registrations:'報名與審核明細',scores:'評審計分進度',payments:'付款狀態（僅模擬）'}[tab];page=1;loadRecords()};
loadAll();
