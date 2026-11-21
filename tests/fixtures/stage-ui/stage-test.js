(()=>{'use strict';
const words={
 boundary:['僅限獨立虛構資料演練；不是正式比賽，不收費、不開放正式投票。畫面參數均為測試設定。','Fictional isolated rehearsal only. No official contest, payments or public voting. Settings are TEST scenarios.','काल्पनिक छुट्टै अभ्यास मात्र। आधिकारिक प्रतियोगिता, भुक्तानी वा सार्वजनिक मतदान होइन। सबै सेटिङ परीक्षणका हुन्।'],
 audition:['海選','Audition','अनलाइन छनोट'],qualifier_one:['第一次初選','First qualifier','पहिलो छनोट'],qualifier_two:['第二次初選','Second qualifier','दोस्रो छनोट'],regional_pk:['區內 PK 晉級賽','Regional PK','क्षेत्रीय PK'],final:['季度總決賽','Quarterly final','त्रैमासिक फाइनल'],training:['自願培訓','Optional training','ऐच्छिक प्रशिक्षण'],
 back:['上一步','Back','पछाडि'],roster:['返回本關名冊','Stage roster','चरणको सूची'],settings:['本關演練設定','Stage TEST settings','चरण परीक्षण सेटिङ'],groups:['個人／組隊設定','Solo / teams','व्यक्तिगत / टोली'],pairs:['確認 PK 配對','Confirm PK pairs','PK जोडी पुष्टि'],freeze:['凍結本關結果並建立下一關資格','Freeze results and advance','नतिजा स्थिर गरी अर्को चरणमा पठाउनुहोस्'],
 refresh:['重新讀取','Reload','फेरि पढ्नुहोस्'],search:['搜尋演出名稱或編號','Search performer or ID','नाम वा नम्बर खोज्नुहोस्'],view:['查看','View','हेर्नुहोस्'],saved:['已由資料庫確認儲存','Saved and confirmed by database','डाटाबेसबाट सुरक्षित भएको पुष्टि'],waiting:['正在儲存…','Saving…','सुरक्षित हुँदैछ…'],unknown:['結果尚未確認，請先查核儲存紀錄。','Outcome unknown. Check saved record first.','नतिजा निश्चित छैन। पहिले सुरक्षित विवरण जाँच्नुहोस्।'],check:['查核儲存紀錄','Check saved record','सुरक्षित विवरण जाँच्नुहोस्'],retry:['尚未找到相符紀錄，可保留輸入重試。','No matching saved record yet. Inputs retained for retry.','मिल्ने विवरण भेटिएन। लेखेको विवरण राखेर फेरि प्रयास गर्नुहोस्।'],
 locked:['尚未取得前關晉級資格，或本關已凍結。','Not yet eligible, or stage is frozen.','अघिल्लो चरणको योग्यता छैन वा चरण स्थिर छ।'],notready:['尚未可凍結／晉級','Not ready to freeze / advance','स्थिर गर्न वा अघि बढ्न तयार छैन'],incomplete:['缺少完整評審分數','Incomplete panel scores','निर्णायकका अङ्क अपूर्ण'],quotapending:['晉級名額尚未設定','Quota not configured','छनोट सङ्ख्या सेट छैन'],policypending:['隊伍人數或邊界名額規則未核定','Team / boundary policy pending','टोली वा सीमा नियम बाँकी'],ballotpending:['同分須評審團記名表決，不能自動決定。','Tie requires a named panel decision.','बराबरीमा निर्णायकको नामसहित निर्णय चाहिन्छ।'],votepending:['決賽投票流程待驗收，不能發布最終結果。','Final vote lifecycle awaits acceptance; publication blocked.','फाइनल मतदान प्रक्रिया जाँच बाँकी; अन्तिम नतिजा प्रकाशन रोकिएको छ।'],denied:['需要有效的受邀工作人員登入；本頁只連接隔離演練環境。','An invited staff session is required in the isolated rehearsal.','छुट्टै अभ्यासमा आमन्त्रित कर्मचारी लगइन आवश्यक छ।'],failed:['目前無法完成，請重新讀取並核對本關狀態。','Unable to complete. Reload and check stage status.','अहिले पूरा भएन। फेरि पढेर चरणको अवस्था जाँच्नुहोस्।'],
 tech:['歌唱技巧','Technique','गायन सीप'],interp:['情感表達','Interpretation','भाव अभिव्यक्ति'],presence:['舞台表現','Stage presence','मञ्च प्रस्तुति'],appearance:['整體呈現','Presentation','समग्र प्रस्तुति'],submit:['儲存本首評分','Save this performance','यो प्रस्तुतिको अङ्क सुरक्षित गर्नुहोस्'],conflict:['我確認沒有利益衝突','I confirm no conflict of interest','स्वार्थको द्वन्द्व छैन भन्ने पुष्टि गर्छु'],recuse:['迴避此評分','Recuse from scoring','यो मूल्याङ्कनबाट अलग हुनुहोस्'],reason:['迴避原因（請勿填入個資）','Recusal reason (no personal data)','अलग हुने कारण (व्यक्तिगत विवरण नराख्नुहोस्)'],
 configure:['儲存演練設定','Save TEST settings','परीक्षण सेटिङ सुरक्षित गर्नुहोस्'],quotaA:['A 區演練名額','A TEST quota','A परीक्षण सङ्ख्या'],quotaB:['B 區演練名額','B TEST quota','B परीक्षण सङ्ख्या'],maxteam:['演練每隊人數上限','TEST maximum team size','परीक्षणमा टोलीको अधिकतम सदस्य'],groupcode:['組隊代號：相同代號為一隊，空白為個人','Same code forms a team; blank means solo','एउटै कोड टोली; खाली भए व्यक्तिगत'],previous:['上一頁','Previous','अघिल्लो'],next:['下一頁','Next','अर्को'],noentries:['目前沒有本關參賽資料','No entries in this stage','यो चरणमा दर्ता छैन'],ready:['評分與名額檢查通過（僅演練）','Score and quota checks passed (TEST only)','अङ्क र सङ्ख्या जाँच पूरा (परीक्षण मात्र)'],confirm:['確認這項演練操作？','Confirm this TEST action?','यो परीक्षण कार्य पुष्टि गर्ने?'],optin:['參加培訓','Join training','प्रशिक्षणमा सहभागी हुने'],optout:['不參加培訓，保留決賽資格','Skip training; keep final eligibility','प्रशिक्षण नलिने; फाइनल योग्यता कायम'],record:['記錄培訓選擇','Record training choice','प्रशिक्षण रोजाइ सुरक्षित गर्नुहोस्'],trainingnote:['培訓不計分，不影響已取得的決賽資格。','Training has no score and does not change final eligibility.','प्रशिक्षणमा अङ्क हुँदैन र फाइनल योग्यतामा असर गर्दैन।'],person:['選手','Entrant','प्रतियोगी'],performance:['作品','Performance','प्रस्तुति'],scored:['已處理','Recorded','अभिलेखित'],pending:['待評','Pending','बाँकी'],notreal:['虛構資料；現場曲目與影片仍須前線確認。','Fictional data; live songs and videos still require frontline confirmation.','काल्पनिक विवरण; गीत र भिडियो अग्रपङ्क्तिबाट पुष्टि हुनुपर्छ।']};
let lang='zh',route={stage:'audition',view:'list'},data=null,epoch=0,actorId=null;const drafts=new Map(),unknown=new Map(),filters=new Map(),retryable=new Set();
const $=id=>document.getElementById(id),t=key=>words[key]?.[['zh','en','ne'].indexOf(lang)]||key;
const n=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
const btn=(key,fn,primary=false)=>{const b=n('button',t(key),primary?'primary':'');b.type='button';b.onclick=fn;return b};
const feedback=(key,error=false)=>{$('feedback').textContent=t(key);$('feedback').className=error?'error':''};
const blocker=code=>({scores_incomplete:'incomplete',quota_pending:'quotapending',team_size_policy_pending:'policypending',team_overflow:'policypending',cutoff_tie:'ballotpending',named_panel_ballot_required:'ballotpending',final_vote_lifecycle_pending:'votepending',stage_locked:'locked',login_required:'denied',staff_only:'denied',isolated_test_unavailable:'denied',unassigned_judge:'denied'})[code]||'failed';
async function api(body){const r=await fetch('/api/stage-test',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});let d;try{d=await r.json()}catch{throw Error('unavailable')};if(!r.ok||d.ok!==true)throw Error(d.error||'unavailable');if(actorId&&actorId!==d.actor?.id){drafts.clear();unknown.clear();retryable.clear();actorId=d.actor?.id;throw Error('session_changed')}actorId=d.actor?.id;return d;}
async function refresh(){const stamp=++epoch;try{const d=await api({operation:'read',stage:route.stage});if(stamp!==epoch)return;data=d;render()}catch(e){if(stamp===epoch){$('workspace').replaceChildren(n('p',t(blocker(e.message))));feedback(blocker(e.message),true);if(e.message==='login_required'){drafts.clear();unknown.clear()}}}}
function go(view,detail={},replace=false){route={...route,view,...detail};history[replace?'replaceState':'pushState']({stageTest:route},'');refresh()}
window.addEventListener('popstate',e=>{route=e.state?.stageTest||{stage:'audition',view:'list'};refresh()});
function render(){
 document.documentElement.lang={zh:'zh-Hant',en:'en',ne:'ne'}[lang];$('boundary').textContent=t('boundary');$('stages').replaceChildren();
 for(const stage of ['audition','qualifier_one','qualifier_two','regional_pk','final']){const b=btn(stage,()=>go('list',{stage}));if(stage===route.stage)b.setAttribute('aria-current','page');$('stages').append(b)}
 const root=$('workspace');root.replaceChildren(n('h1',t(route.stage)));
 const tools=n('nav');tools.append(btn('refresh',refresh));if(route.view!=='list')tools.append(btn('roster',()=>go('list')));root.append(tools);
 if(!data)return;
 if(['config','groups','pairs','training'].includes(route.view)&&data.actor.role!=='organizer')return root.append(n('p',t('denied')));
 if(route.view==='config')return configure(root);
 if(route.view==='groups')return groups(root);
 if(route.view==='pairs')return pairs(root);
 if(route.view==='training')return training(root);
 if(route.view==='unit')return unit(root);
 const f=filters.get(route.stage)||{q:'',page:0},search=n('input');search.type='search';search.placeholder=t('search');search.setAttribute('aria-label',t('search'));search.value=f.q;
 search.oninput=()=>{filters.set(route.stage,{q:search.value,page:0});render();const current=root.querySelector('input[type=search]');current?.focus();current?.setSelectionRange(current.value.length,current.value.length)};root.append(search);
 const found=data.units.filter(u=>[u.label,u.id].some(value=>String(value).toLowerCase().includes(f.q.toLowerCase()))),list=n('div',undefined,'list');
 for(const u of found.slice(f.page*6,f.page*6+6)){const b=btn('view',()=>go('unit',{unit:u.id,position:1}));b.className='row';b.replaceChildren(n('span',u.label+' · '+u.id.slice(-6)),n('span',u.scores.length+' / '+(data.actor.role==='reviewer'?u.positions:u.positions*data.panel.length),'badge'));list.append(b)}
 if(!found.length)list.append(n('p',t('noentries')));root.append(list);
 const pages=n('nav');for(const [offset,label]of[[-1,'previous'],[1,'next']])if(f.page+offset>=0&&(f.page+offset)*6<found.length)pages.append(btn(label,()=>{filters.set(route.stage,{...f,page:f.page+offset});render()}));root.append(pages);
 if(data.actor.role==='organizer'){
  const actions=n('div',undefined,'actions');actions.append(btn('settings',()=>go('config')));
  if(route.stage==='qualifier_two')actions.append(btn('groups',()=>go('groups')));
  if(route.stage==='regional_pk')actions.append(btn('pairs',()=>go('pairs')));
  if(route.stage==='final')actions.append(btn('training',()=>go('training')));
  root.append(actions);
  if(data.result)root.append(n('p',t('saved')));
  else if(data.preview?.ready&&data.status==='open')root.append(btn('freeze',async()=>{if(confirm(t('confirm')))await command({operation:'freeze'})},true));
  else{root.append(n('p',t('notready')));for(const issue of new Set((data.preview?.blockers||[]).map(blocker)))root.append(n('p',t(issue),'minor'));}
 }
}
async function command(body){const stamp=epoch;const buttons=[...$('workspace').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);feedback('waiting');try{await api({stage:route.stage,version:data.version,request_id:crypto.randomUUID(),...body});if(stamp===epoch){feedback('saved');await refresh()}}catch(e){if(stamp===epoch){feedback(blocker(e.message),true);buttons.forEach(b=>b.disabled=false)}}}
function unit(root){
 const u=data.units.find(u=>u.id===route.unit);if(!u)return root.append(n('p',t('noentries')));
 root.append(n('h2',u.label+' · '+u.id.slice(-6)),n('p',t('notreal'),'minor'));
 const songs=n('nav');for(let p=1;p<=u.positions;p++)songs.append(btn(t('performance')+' '+p,()=>go('unit',{position:p})));root.append(songs);
 const stored=u.scores.find(s=>s.position===route.position&&s.judgeId===data.actor.id);
 if(data.actor.role!=='reviewer'||data.status!=='open'||stored){root.append(n('p',t(stored?'saved':'locked')));if(stored)for(const key of ['technique','interpretation','stage_presence','appearance'])if(stored[key]!==undefined)root.append(n('p',key+' '+stored[key]));return}
 const key=[route.stage,u.id,route.position].join(':'),isDemo=route.stage==='audition',criteria=isDemo?[['technique','tech',60],['interpretation','interp',40]]:[['technique','tech',40],['interpretation','interp',30],['stage_presence','presence',20],['appearance','appearance',10]];
 const form=n('form',undefined,'fields'),draft=drafts.get(key)||{};
 for(const[name,label,max]of criteria){const wrap=n('label',t(label)+' / '+max),input=n('input');input.name=name;input.type='number';input.inputMode='numeric';input.min='0';input.max=String(max);input.step='1';input.required=true;input.value=draft[name]??'';input.oninput=()=>drafts.set(key,{...drafts.get(key),[name]:input.value});wrap.append(input);form.append(wrap)}
 const acknowledgment=n('label',undefined,'check full'),check=n('input');check.type='checkbox';check.required=true;acknowledgment.append(check,n('span',t('conflict')));form.append(acknowledgment);
 const send=n('button',t('submit'),'primary full');send.type='submit';form.append(send);
 const pending=unknown.get(key);
 if(pending){send.disabled=true;form.append(btn('check',async()=>{try{const d=await api({operation:'read',stage:pending.stage}),row=d.units.find(u=>u.id===pending.unit_id)?.scores.find(s=>s.position===pending.position&&s.judgeId===d.actor.id);if(row&&Object.keys(pending.values).every(k=>row[k]===pending.values[k])){unknown.delete(key);drafts.delete(key);feedback('saved');await refresh()}else if(!row){unknown.delete(key);feedback('retry');render()}else feedback('failed',true)}catch{feedback('unknown',true)}}));}
 form.onsubmit=async e=>{
  e.preventDefault();if(unknown.has(key))return;
  const payload={operation:'score',stage:route.stage,unit_id:u.id,position:route.position,version:data.version,request_id:crypto.randomUUID(),values:Object.fromEntries(criteria.map(([name])=>[name,Number(form.elements[name].value)]))};
  const stamp=epoch;unknown.set(key,payload);[...form.elements].forEach(el=>el.disabled=true);feedback('waiting');
  try{const r=await api(payload);if(!r.audit_id||Object.keys(payload.values).some(k=>r.score?.[k]!==payload.values[k]))throw Error('unknown');unknown.delete(key);drafts.delete(key);if(stamp===epoch){feedback('saved');await refresh()}}
  catch{if(stamp===epoch){feedback('unknown',true);render()}}
 };root.append(form);
 const recuse=btn('recuse',()=>{const reason=prompt(t('reason'));if(reason?.trim())command({operation:'score',unit_id:u.id,position:route.position,values:{recused:true,reason:reason.trim()}})});root.append(recuse);
}
function configure(root){
 const form=n('form',undefined,'fields');
 for(const[key,label,value,max]of[['A','quotaA',data.config.quotas?.A,100],['B','quotaB',data.config.quotas?.B,100],['maxTeamSize','maxteam',data.config.maxTeamSize,20]]){const wrap=n('label',t(label)),input=n('input');input.type='number';input.inputMode='numeric';input.min=key==='maxTeamSize'?'2':'0';input.max=String(max);input.name=key;input.value=value??'';input.required=key!=='maxTeamSize';wrap.append(input);form.append(wrap)}
 const save=n('button',t('configure'),'primary full');save.type='submit';form.append(save);form.onsubmit=e=>{e.preventDefault();command({operation:'configure',panel:data.panel,quotas:{A:Number(form.elements.A.value),B:Number(form.elements.B.value)},...(form.elements.maxTeamSize.value?{maxTeamSize:Number(form.elements.maxTeamSize.value)}:{})})};root.append(form);
}
function groups(root){
 const assignments=new Map(),form=n('form');root.append(n('p',t('groupcode')));
 for(const u of data.units)for(const id of u.members){const row=n('label',undefined,'group-row'),input=n('input');input.type='text';input.maxLength=20;row.append(n('span',u.label+' · '+id.slice(-6)),input);form.append(row);input.oninput=()=>assignments.set(id,input.value.trim())}
 const save=n('button',t('configure'),'primary');save.type='submit';form.append(save);form.onsubmit=e=>{e.preventDefault();const grouped=new Map();for(const u of data.units)for(const id of u.members){const k=assignments.get(id)?u.region+':'+assignments.get(id):'solo:'+id;grouped.set(k,[...grouped.get(k)||[],id])}command({operation:'groups',groups:[...grouped.values()]})};root.append(form);
}
function pairs(root){
 const form=n('form'),selected=[];
 for(const region of['A','B'])for(let i=0;i<5;i++){const row=n('div',undefined,'pair-row');for(let side=0;side<2;side++){const select=n('select');select.required=true;select.setAttribute('aria-label',region+' '+(i+1)+' '+(side+1));select.append(new Option('—',''));for(const u of data.units.filter(u=>u.region===region))select.append(new Option(u.label+' '+u.id.slice(-6),u.id));row.append(select);selected.push(select)}form.append(row)}
 const save=n('button',t('pairs'),'primary');save.type='submit';form.append(save);form.onsubmit=e=>{e.preventDefault();command({operation:'configure',panel:data.panel,pairs:Array.from({length:10},(_,i)=>({id:'TEST-pair-'+i,ids:[selected[i*2].value,selected[i*2+1].value]}))})};root.append(form);
}
function training(root){
 root.append(n('p',t('trainingnote')));const form=n('form',undefined,'fields'),person=n('select');person.setAttribute('aria-label',t('person'));for(const u of data.units)person.append(new Option(u.label+' '+u.id.slice(-6),u.members[0]));
 if([...person.options].some(o=>o.value===route.trainingPerson))person.value=route.trainingPerson;
 const choice=n('select');choice.required=true;choice.setAttribute('aria-label',t('training'));choice.append(new Option('—',''),new Option(t('optin'),'true'),new Option(t('optout'),'false'));
 const saved=n('p',undefined,'full'),recovery=n('div',undefined,'full');form.append(person,choice,saved);const save=n('button',t('record'),'primary full');save.type='submit';form.append(save,recovery);
 function show(){route.trainingPerson=person.value;const key='training:'+person.value,row=data.training?.find(r=>r.application_id===person.value),pending=unknown.get(key);choice.value=pending?String(pending.opt_in):row?String(Boolean(row.opt_in)):'';saved.textContent=row?t(row.opt_in?'optin':'optout'):'';save.disabled=Boolean(pending)&&!retryable.has(key);choice.disabled=Boolean(pending);recovery.replaceChildren();if(pending)recovery.append(btn('check',()=>verify(pending).catch(()=>feedback('unknown',true))));}
 async function verify(payload){const stamp=epoch,key='training:'+payload.application_id,d=await api({operation:'read',stage:'final'}),row=d.training?.find(r=>r.application_id===payload.application_id);if(row&&Boolean(row.opt_in)===payload.opt_in){unknown.delete(key);retryable.delete(key);if(stamp===epoch){feedback('saved');data=d;render()}return true}retryable.add(key);if(stamp===epoch){data=d;feedback('retry');render()}return false;}
 person.onchange=show;show();
 form.onsubmit=async e=>{e.preventDefault();const key='training:'+person.value;if(unknown.has(key)&&!retryable.has(key))return;const payload=unknown.get(key)||{operation:'training',stage:'final',version:data.version,request_id:crypto.randomUUID(),application_id:person.value,opt_in:choice.value==='true'},stamp=epoch;unknown.set(key,payload);retryable.delete(key);[...form.elements].forEach(el=>el.disabled=true);feedback('waiting');try{const result=await api(payload);if(!result.audit_id)throw Error('unknown');await verify(payload)}catch{if(stamp===epoch){feedback('unknown',true);render()}}};root.append(form);
}

document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{lang=b.dataset.lang;render()});history.replaceState({stageTest:route},'');refresh();
})();
