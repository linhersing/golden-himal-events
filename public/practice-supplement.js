// Role-scoped synthetic correction UI. No mail is sent from this module.
const words={
 en:{title:'One correction within 48 hours',pending:'Waiting for one correction',completed:'Correction saved and locked',expired:'Correction expired and locked',deadline:'Deadline',reason:'Correction reason',ack:'I manually notified the test singer; this system sends no email.',open:'Open 48-hour correction',save:'Submit my single correction',help:'Only the link, test contacts and affiliation can change. The song and identity stay locked.',locked:'Corrections can only start before any judging, in the Demo stage.',work:'Corrected public link',phone:'Test phone',contact:'Test contact',affiliation:'Test school / affiliation',working:'Saving and reading back cloud data…',uncertain:'Unable to confirm. Your input is kept. Reload cloud data before retrying; the change may already be saved.',rejected:'Correction unavailable, invalid, already used or expired. Check the fields and reload cloud data.',audit:'Show original and corrected details',original:'Original',corrected:'Corrected',blocked:'Correction unresolved: scoring and advancement are locked.',scope:'Manual test notification · no email sent · cloud-read status'},
 zh:{title:'48小時內限補件一次',pending:'等待一次補件',completed:'補件已完成並鎖定',expired:'補件已逾期並鎖定',deadline:'補件截止',reason:'補件原因',ack:'已手動通知測試選手；系統不會寄信。',open:'開啟48小時補件',save:'送出唯一一次補件',help:'只可修正作品連結、測試聯絡資料及學校／單位；歌曲與身分資料維持鎖定。',locked:'僅能在海選且尚無任何評審回覆時開啟補件。',work:'補正作品公開連結',phone:'測試電話',contact:'測試聯絡方式',affiliation:'測試學校／單位',working:'正在儲存並讀回雲端資料…',uncertain:'尚無法確認結果，輸入內容已保留。可能已經儲存，請先重新讀取雲端資料再決定是否重送。',rejected:'目前不可補件、內容有誤、已使用或已逾期；請檢查欄位並重新讀取雲端資料。',audit:'查看補正前後紀錄',original:'補正前',corrected:'補正後',blocked:'補件尚未完成：暫停評分及晉級。',scope:'手動測試通知 · 沒有寄信 · 狀態依雲端讀回'},
 ne:{title:'४८ घण्टाभित्र एक पटक सुधार',pending:'एक पटक सुधारको प्रतीक्षा',completed:'सुधार सुरक्षित भयो र बन्द भयो',expired:'सुधार समय सकियो र बन्द भयो',deadline:'अन्तिम समय',reason:'सुधारको कारण',ack:'मैले परीक्षण गायकलाई आफैँ जानकारी दिएँ; प्रणालीले इमेल पठाउँदैन।',open:'४८ घण्टे सुधार खोल्नुहोस्',save:'एक पटकको सुधार पेस गर्नुहोस्',help:'लिङ्क, परीक्षण सम्पर्क र संस्था मात्र सच्याउन सकिन्छ। गीत र पहिचान बन्द रहन्छ।',locked:'Demo चरणमा कुनै निर्णायकको जवाफ आउनुअघि मात्र सुधार खोल्न सकिन्छ।',work:'सच्याइएको सार्वजनिक लिङ्क',phone:'परीक्षण फोन',contact:'परीक्षण सम्पर्क',affiliation:'परीक्षण संस्था',working:'क्लाउडमा सुरक्षित गर्दै र फेरि पढ्दै…',uncertain:'नतिजा पुष्टि भएन। विवरण राखिएको छ; सुरक्षित भइसकेको हुन सक्छ। फेरि पेस गर्नुअघि क्लाउड पुनः पढ्नुहोस्।',rejected:'सुधार उपलब्ध छैन, विवरण अमान्य छ वा समय सकिएको छ। विवरण जाँचेर क्लाउड पुनः पढ्नुहोस्।',audit:'पहिले र पछिको विवरण',original:'पहिले',corrected:'पछि',blocked:'सुधार बाँकी छ: अंक र बढुवा बन्द छन्।',scope:'आफैँ दिएको परीक्षण सूचना · इमेल पठाइएको छैन · क्लाउड स्थिति'}
};
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
export const unresolvedSupplement=(state,id)=>(state.supplements||[]).some(s=>s.application_id===id&&s.status!=='completed');
export function appendSupplementUI(card,app,state,language,{action,api,load,status}){
 const role=state.actor.role;if(!['member','organizer'].includes(role))return;
 const t=words[language]||words.en,s=(state.supplements||[]).find(x=>x.application_id===app.id);
 const box=make('section',undefined,'supplement-panel');box.append(make('h4',t.title));
 const when=n=>new Date(n*1000).toLocaleString(language==='zh'?'zh-TW':language==='ne'?'ne-NP':'en-GB',{timeZone:'Asia/Kathmandu',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' (Nepal)';
 const feedback=make('p',undefined,'supplement-feedback');feedback.setAttribute('role','alert');
 const submit=(form,path,payload)=>{
  feedback.textContent=t.working;
  action(async()=>{try{await api(path,payload);await load();status('saved')}catch(e){feedback.textContent=[400,403,404,409,422].includes(e.httpStatus)?t.rejected:t.uncertain}});
 };
 if(s){
  box.append(make('strong',t[s.status]),make('p',t.deadline+': '+when(s.deadline_at)),make('p',t.scope,'micro'));
  if(s.reason)box.append(make('p',t.reason+': '+s.reason));
  if(role==='member'&&s.status==='pending'){
   const form=make('form',undefined,'supplement-form');form.append(make('p',t.help));
   for(const [key,label,type,max] of [['work_url',t.work,'url',1000],['contact_phone',t.phone,'tel',30],['contact_handle',t.contact,'text',100],['affiliation',t.affiliation,'text',100]]){
    const field=make('label'),input=make('input');input.name='correction_'+key;input.type=type;input.value=app[key]||'';input.maxLength=max;input.required=true;if(key==='contact_phone')input.minLength=8;field.append(make('span',label),input);form.append(field);
   }
   const button=make('button',t.save,'primary');button.type='submit';form.append(button);form.onsubmit=e=>{e.preventDefault();const payload={application_id:app.id};for(const input of form.querySelectorAll('input'))payload[input.name.replace('correction_','')]=input.value;submit(form,'supplement',payload)};box.append(form,feedback);
  }
  if(s.completed_at!==null){
   box.append(make('p',when(s.completed_at),'micro'));const audit=make('details'),summary=make('summary',t.audit,'supplement-audit');audit.append(summary);
   for(const [key,label] of [['original_values',t.original],['corrected_values',t.corrected]]){
    let values;try{values=JSON.parse(s[key])}catch{continue}const group=make('div');group.append(make('strong',label));for(const field of ['work_url','contact_phone','contact_handle','affiliation'])group.append(make('p',String(values[field]||''),'supplement-value'));audit.append(group);
   }
   box.append(audit);
  }
 }else if(role==='organizer'){
  if(app.phase!=='demo'||state.scores.some(x=>x.application_id===app.id)){box.append(make('p',t.locked,'micro'))}
  else{
   const form=make('form',undefined,'supplement-request'),label=make('label'),reason=make('textarea');reason.name='supplement_reason';reason.required=true;reason.maxLength=300;label.append(make('span',t.reason),reason);
   const checkLabel=make('label',undefined,'check'),check=make('input');check.type='checkbox';check.required=true;checkLabel.append(check,make('span',t.ack));
   const button=make('button',t.open);button.type='submit';form.append(label,checkLabel,button);form.onsubmit=e=>{e.preventDefault();submit(form,'supplement-request',{application_id:app.id,reason:reason.value,notified_manually:check.checked})};box.append(form,feedback);
  }
 }else return;
 card.append(box);
}
export function supplementBlockLabel(language){return (words[language]||words.en).blocked}
