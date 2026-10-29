import {PEOPLE,blank,addSyntheticRegistration,reviewSynthetic,castSyntheticVote} from './test-lab-model.mjs';
/* GHV browser-only simulation lab.
 * Mock registrations, mock receipts, announcements and votes NEVER leave this browser.
 * The only network operations are READ-ONLY GETs to fixed staging D1 endpoints.
 * Do not use personal information. Do not count these as real applications or votes.
 */
const STORAGE_KEY='ghv_internal_synthetic_lab_v1';
let state=blank();
try{
 const raw=localStorage.getItem(STORAGE_KEY);
 if(raw){
   const parsed=JSON.parse(raw);
   if(parsed&&parsed.version===1&&Array.isArray(parsed.registrations)&&Array.isArray(parsed.votes)
     &&parsed.registrations.length<=60&&parsed.votes.length<=100&&
     parsed.registrations.every(r=>PEOPLE[r.person]&&/^2027-(03|06|09)$/.test(r.round)))
      state=parsed;
 }
}catch{ /* sandbox still works when storage is disabled */ }
let cloudStats=null;
function persist(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
}
function text(el,value){el.textContent=String(value)}
function statusName(status){return ({pending:'待審核',approved:'已通過',rejected:'退件'})[status]||'未知'}
function categoryName(cat){return cat==='university'?'大學組':'社會組'}
function countApproved(){return state.registrations.filter(r=>r.status==='approved').length}
function pill(status){
 const el=document.createElement('span');el.className='status '+status;
 text(el,statusName(status));return el;
}
function cell(value){
 const td=document.createElement('td');
 if(value instanceof Node)td.append(value);else text(td,value);
 return td;
}
function addButton(title,role,handle,isDisabled=false){
 const btn=document.createElement('button');btn.type='button';
 text(btn,title);btn.disabled=isDisabled;
 if(role==='reject')btn.className='red';
 btn.addEventListener('click',handle);return btn;
}
function switchPanel(name){
 document.querySelectorAll('.tab').forEach(b=>{
  const selected=b.dataset.tab===name;
  b.classList.toggle('active',selected);
  b.setAttribute('aria-selected',String(selected));
  b.tabIndex=selected?0:-1;
 });
 document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!=='panel-'+name);
 if(name==='reports')void refreshCloud();
}
document.querySelectorAll('[data-tab]').forEach(button=>{
 button.addEventListener('click',()=>switchPanel(button.dataset.tab));
 button.addEventListener('keydown',event=>{
  if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
  const tabs=[...document.querySelectorAll('.tab')];
  const next=tabs[(tabs.indexOf(button)+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
  next.focus();switchPanel(next.dataset.tab);
 });
});
function makeRegistration(person,round,category,demo,payment){
 const result=addSyntheticRegistration(state,person,round,category,demo,payment,new Date().toISOString());
 if(result.record){persist();render()}
 return result;
}
$('lab-form').addEventListener('submit',event=>{
 event.preventDefault();
 const result=makeRegistration($('candidate').value,$('round').value,$('category').value,$('demo').value,$('payment').value);
 const output=$('form-status');
 if(result.error){text(output,result.error);output.classList.add('error');return}
 output.classList.remove('error');
 text(output,result.record.id+' 已建立（僅本機測試）');
});
function updateRegistration(id,newStatus){
 if(reviewSynthetic(state,id,newStatus)){persist();render()}
}
function renderStats(){
 const stats=[
  ['本機報名',state.registrations.length],
  ['待審核',state.registrations.filter(r=>r.status==='pending').length],
  ['已通過',countApproved()],
  ['退件',state.registrations.filter(r=>r.status==='rejected').length]
 ];
 const root=$('stats');root.replaceChildren();
 for(const [label,num] of stats){
  const box=document.createElement('div');box.className='metric';
  const strong=document.createElement('strong');text(strong,num);
  const name=document.createElement('span');text(name,label);
  box.append(strong,name);root.append(box);
 }
}
function renderRegistrations(){
 const root=$('registration-rows');root.replaceChildren();
 const records=[...state.registrations].reverse().filter(x=> $('filter').value==='all'||x.status===$('filter').value);
 if(records.length===0){
  const tr=document.createElement('tr'),td=document.createElement('td');
  td.colSpan=5;td.className='empty';text(td,'沒有此狀態的虛構報名，請從前台新增。');
  tr.append(td);root.append(tr);return;
 }
 for(const record of records){
  const tr=document.createElement('tr');
  const title=document.createElement('div');
  const strong=document.createElement('strong');text(strong,record.id);
  const name=document.createElement('small');text(name,PEOPLE[record.person]);
  title.append(strong,document.createElement('br'),name);
  tr.append(cell(title),cell(categoryName(record.category)+' · '+record.round),
    cell(record.demo+' / '+(record.payment==='mock-receipt'?'測試收據':'尚未核款')),cell(pill(record.status)));
  const actions=document.createElement('div');actions.className='row-actions';
  actions.append(
   addButton('核准','approve',()=>updateRegistration(record.id,'approved'),record.status==='approved'),
   addButton('退件','reject',()=>updateRegistration(record.id,'rejected'),record.status==='rejected'),
   addButton('重審','reset',()=>updateRegistration(record.id,'pending'),record.status==='pending'));
  tr.append(cell(actions));root.append(tr);
 }
}
$('filter').addEventListener('change',renderRegistrations);
$('seed').addEventListener('click',()=>{
 const keys=Object.keys(PEOPLE);
 keys.forEach((id,i)=>makeRegistration(id,'2027-03',i%2===0?'university':'community',
  'demo-a',i%3?'mock-pending':'mock-receipt'));
 text($('form-status'),'已新增虛構參賽者（同一人物不重複）。');
 switchPanel('admin');
});
function renderNotice(){
 const approved=state.registrations.filter(r=>r.status==='approved');
 const sample=approved.map(r=>PEOPLE[r.person]).join('、');
 text($('notice-content'),sample?
   '範例晉級名單：'+sample+'。※ 僅供測試，非真實晉級結果。':
   '尚無已通過的測試選手，請先到後台審核虛構資料。');
 text($('notice-state'),'狀態：'+(state.published?'已發佈（僅本機）':'草稿（僅本機）'));
}
$('publish').addEventListener('click',()=>{
 if(countApproved()===0){text($('notice-state'),'請先核准至少一筆測試資料，才能發佈。');return}
 state.published=true;persist();render();
});
$('unpublish').addEventListener('click',()=>{state.published=false;persist();render()});
function candidatesForVote(){
 return [...new Map(state.registrations.filter(r=>r.status==='approved')
   .map(r=>[r.person,PEOPLE[r.person]])).entries()];
}
function renderVote(){
 const select=$('vote-candidate');const current=select.value;select.replaceChildren();
 const approved=candidatesForVote();
 if(!approved.length){
  const empty=new Option('請先核准一位測試選手','');select.add(empty);
 }else {
  approved.forEach(([key,label])=>select.add(new Option(label,key)));
  if(approved.some(a=>a[0]===current))select.value=current;
 }
 $('vote').disabled=approved.length===0;
 const root=$('vote-rows');root.replaceChildren();
 if(!approved.length){
  const tr=document.createElement('tr');const td=cell('目前沒有已核准的虛構選手。');
  td.colSpan=2;td.className='empty';tr.append(td);root.append(tr);return;
 }
 for(const [id,name] of approved){
  const row=document.createElement('tr');
  row.append(cell(name),cell(state.votes.filter(v=>v.person===id).length));root.append(row);
 }
}
$('vote').addEventListener('click',()=>{
 const voter=$('voter').value,person=$('vote-candidate').value,output=$('vote-status');
 const result=castSyntheticVote(state,voter,person);
 if(result.error){text(output,result.error+'（不代表真人防灌票已通過）。');output.classList.add('error');return}
 persist();render();text(output,'測試票已記錄在本機（不是正式投票）。');output.classList.remove('error');
});
function checkLine(textContent,cls){
 const p=document.createElement('p');p.className=cls;text(p,textContent);return p;
}
function renderReports(){
 text($('local-count'),state.registrations.length);
 text($('d1-count'),cloudStats?cloudStats.registered:'—');
 text($('d1-details'),cloudStats?
  'Cloudflare D1 · 2027年3月 · 大學組 '+cloudStats.university+' / 社會組 '+cloudStats.community+'（僅虛構紀錄）'
  :'Cloudflare D1 真正統計尚未取得。');
 const checks=$('checks');checks.replaceChildren();
 checks.append(checkLine('● 前台報名：'+state.registrations.length+'筆本機虛構資料','yes'),
  checkLine('● 後台審核：'+countApproved()+'筆已通過','yes'),
  checkLine('● 公告：'+(state.published?'本機模擬已發佈':'本機模擬草稿'),'neutral'),
  checkLine('● 投票：'+state.votes.length+'張本機示範票（非正式計票）','yes'),
  checkLine('● Cloudflare D1：'+(cloudStats?'可讀取真實測試統計':'尚未完成本次連線確認'),cloudStats?'yes':'neutral'),
  checkLine('● 真正報名 API、R2 上傳及付款：尚未啟用，不可收取真實資料','no'),
  checkLine('● 正式管理權限、真實選手驗證、防灌票及壓測：待後續驗收','no'));
}
function render(){renderStats();renderRegistrations();renderNotice();renderVote();renderReports()}
$('reset').addEventListener('click',()=>{
 if(!confirm('確定清除「此瀏覽器」的所有虛構報名、公告與示範投票？Cloudflare D1 不會被清除。'))return;
 state=blank();persist();$('filter').value='all';
 text($('form-status'),'已重置本機沙盒。Cloudflare D1 未變更。');render();
});
$('download').addEventListener('click',()=>{
 const result={schema:'GHV internal synthetic lab v1',scope:'browser-local-only',
  generated_at:new Date().toISOString(),data:state};
 const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='ghv-lab-test-only.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
async function getJSON(path){
 const response=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw new Error('HTTP '+response.status);
 return response.json();
}
async function refreshCloud(){
 const btn=$('cloud-refresh');btn.disabled=true;
 text($('cloud-state'),'檢查 D1 中（只讀）…');
 try{
  const [health,dash]=await Promise.all([
   getJSON('/api/staging/health'),getJSON('/api/staging/dashboard')]);
  if(!health.ok||!health.testOnly||!health.tableReady||
      health.canWrite!==false||!dash.ok||!dash.testOnly||
      dash.source!=='cloudflare-d1'||dash.canWrite!==false)throw Error('unsafe_response');
  const stats=dash.stats;
  if(!stats||!Number.isInteger(stats.registered)||
    !Number.isInteger(stats.university)||!Number.isInteger(stats.community))throw Error('invalid_stats');
  cloudStats=stats;
  text($('cloud-state'),'已連接 D1，只有 TEST- 虛構資料；寫入保持關閉');
 }catch{
  cloudStats=null;
  text($('cloud-state'),'本次未能核對 D1；本機模擬仍能操作（不可視為線上資料庫驗收）');
 }finally{btn.disabled=false;renderReports()}
}
$('cloud-refresh').addEventListener('click',refreshCloud);
render();
void refreshCloud();
