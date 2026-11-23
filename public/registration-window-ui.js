/* Golden Himal Voice — scheduled entry status. The server, not this clock,
   decides whether a TEST application may be submitted. */
(()=>{
'use strict';
const root=document.getElementById('ghv-entry-window');
const heading=document.getElementById('ghv-entry-window-title');
const note=document.getElementById('ghv-entry-window-note');
const clock=document.getElementById('ghv-entry-window-clock');
if(!root||!heading||!note||!clock)return;
const text={
 zh:{testing:['目前開放內部測試','測試資料不算正式海選報名。前線驗收通過後將關閉測試收件。'],
 paused:['測試結束，報名尚未開放','2027年1月1日開始海選收件；請先準備演唱Demo。'],
 countdown:['距離海選報名開始','2027年1月1日零時（尼泊爾時間）起收件；目前不能送出正式報名。'],
 awaiting_launch_approval:['預定日期已到，等待主辦確認開放','為保護參賽資料，正式報名系統尚未啟用；請以官網公告為準。'],
 closed:['本次海選收件已截止','正式收件期間為2027年1月1日至31日（尼泊爾時間）。'],
 unavailable:['暫時無法確認報名狀態','請重新整理頁面。正式報名仍以主辦公告為準。'],
 countdownLabel:['距離開始',''],day:'天',hour:'小時',minute:'分鐘'},
 en:{testing:['Internal TEST is available','TEST applications are not official contest entries. TEST closes after acceptance.'],
 paused:['Registration is not open yet','Prepare your singing Demo; the planned opening is January 1, 2027.'],
 countdown:['Countdown to audition entry','Opens January 1, 2027, at 00:00 Nepal time. Official entries cannot be submitted yet.'],
 awaiting_launch_approval:['Opening date reached — awaiting organizer approval','The official submission system is not enabled yet. Check the official announcement.'],
 closed:['Audition entries are closed','The official entry window is January 1–31, 2027 (Nepal time).'],
 unavailable:['Entry status temporarily unavailable','Refresh this page. The official organizer notice controls opening.'],
 countdownLabel:['Time until opening',''],day:'d',hour:'h',minute:'min'},
 ne:{testing:['आन्तरिक परीक्षण चलिरहेको छ','परीक्षणमा बुझाएको फाराम आधिकारिक प्रतियोगिताको आवेदन होइन।'],
 paused:['आधिकारिक दर्ता अझै खुलेको छैन','गीतको डेमो तयार गर्नुहोस्। दर्ता १ जनवरी २०२७ बाट सुरु हुने योजना छ।'],
 countdown:['दर्ता खुल्न बाँकी समय','नेपाल समयअनुसार १ जनवरी २०२७, बिहान १२:०० बाट दर्ता सुरु हुने योजना छ।'],
 awaiting_launch_approval:['मिति आएको छ, आयोजकको स्वीकृति बाँकी छ','आधिकारिक दर्ता प्रणाली अझै खोलिएको छैन। आधिकारिक सूचना हेर्नुहोस्।'],
 closed:['यो चरणको दर्ता बन्द भएको छ','आधिकारिक दर्ता अवधि १–३१ जनवरी २०२७ (नेपाल समय) हो।'],
 unavailable:['दर्ता स्थिति जाँच्न सकिएन','पृष्ठ पुनः खोल्नुहोस्। आयोजकको आधिकारिक सूचना हेर्नुहोस्।'],
 countdownLabel:['दर्ता खुल्न बाँकी',''],day:'दिन',hour:'घण्टा',minute:'मिनेट'}
};
let info=null,offset=0;
const lang=()=>['en','ne','zh'].includes(window.GHVLocale?.lang)?window.GHVLocale.lang:'en';
function draw(){
 const t=text[lang()],state=info?.phase&&t[info.phase]?info.phase:'unavailable';
 const [title,description]=t[state];
 heading.textContent=title;note.textContent=description;
 root.dataset.phase=state;
 const formButton=document.querySelector('#application-form button[type="submit"]');
 if(formButton&&info)formButton.disabled=!info.testSubmissionsAllowed;
 if(!info||state==='testing'||state==='closed'||state==='awaiting_launch_approval'){
  clock.hidden=true;clock.textContent='';return;
 }
 const left=Math.max(0,Date.parse(info.opensAt)-(Date.now()+offset));
 if(!Number.isFinite(left)||left===0){clock.hidden=true;clock.textContent='';return}
 const minutes=Math.ceil(left/60000);
 const days=Math.floor(minutes/(24*60));
 const hours=Math.floor((minutes%(24*60))/60);
 const mins=minutes%60;
 clock.hidden=false;
 clock.textContent=[days+t.day,hours+t.hour,mins+t.minute].join(' · ');
}
async function refresh(){
 try{
  const res=await fetch('/api/staging/registration-window',{cache:'no-store',credentials:'same-origin'});
  if(!res.ok)throw Error('window_unavailable');
  const data=await res.json();
  if(data.ok!==true||typeof data.opensAt!=='string'||!data.serverNow)throw Error('window_unavailable');
  info=data;
  offset=Date.parse(data.serverNow)-Date.now();
 }catch{info=null}
 draw();
}
window.addEventListener('ghv:languagechange',draw);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
refresh();
setInterval(draw,30000);
setInterval(refresh,300000);
})();
