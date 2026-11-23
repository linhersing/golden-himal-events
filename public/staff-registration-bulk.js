(()=>{
'use strict';
window.GHVRegistrationBulk={create({api,t,onChanged,isAllowed}){
 let root=null,plan=null,result=null,busy=false,uncertain=false,message='',generation=0,recent=[];
 let selection=null,selectionAction='delete';
 const n=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
 const live=()=>root?.isConnected&&isAllowed();
 const stats=values=>{
  const list=n('dl',undefined,'staff-bulk-counts');
  for(const [label,value] of values){const item=n('div');item.append(n('dt',t(label)),n('dd',String(value??0)));list.append(item)}
  return list;
 };
 const button=(label,fn,cls='btn btn-soft')=>{const el=n('button',t(label),cls);el.type='button';el.disabled=busy;el.onclick=fn;return el};
 async function act(fn){
  if(busy||!live())return;
  const stamp=generation;busy=true;message=t('正在處理這一批…');paint();
  try{await fn(stamp)}catch(error){if(stamp===generation){uncertain=Boolean(plan?.batch_id);message=t(error.message==='admin_bulk_expired'?'預覽已過期，請重新預覽。':'結果尚未確認，請先查核這批結果。');}}
  finally{if(stamp===generation){busy=false;paint();}}
 }
 async function readRecent(stamp){const data=await api('organizer-registration-bulk',{operation:'recent'});if(stamp===generation)recent=data.batches||[];}
 async function preview(source){
  await act(async stamp=>{
   const data=await api('organizer-registration-bulk',{operation:source?'preview_restore':'preview',...(source?{batch_id:source}:selection?{ids:selection,action:selectionAction}:{})});
   if(stamp!==generation)return;
   plan=data;result=null;uncertain=false;message=t(data.total?'請核對筆數後輸入確認文字。':'沒有可處理的資料。');
   await readRecent(stamp);
  });
 }
 async function check(batch){
  await act(async stamp=>{
   const data=await api('organizer-registration-bulk',{operation:'status',batch_id:batch});
   if(stamp!==generation)return;
   plan=data;result=data;uncertain=false;message=t('已由資料庫確認這批結果。');
   await onChanged();
  });
 }
 async function apply(confirmation){
  await act(async stamp=>{
   const selected=plan;
   let offset=result?.next_offset??0;
   uncertain=true; // Until a server readback arrives, the outcome is unknown.
   while(live()&&stamp===generation){
    const data=await api('organizer-registration-bulk',{operation:'apply',batch_id:selected.batch_id,offset,confirmation});
    if(stamp!==generation)return;
    result=data;uncertain=false;
    message=t('已由資料庫確認這批結果。');paint();
    if(data.next_offset===null)break;
    offset=data.next_offset;
   }
   if(stamp!==generation)return;
   if(isAllowed())await onChanged();
   await readRecent(stamp);
  });
 }
 function paint(){
  if(!root||!isAllowed())return;
  root.replaceChildren();root.setAttribute('aria-busy',String(busy));
  root.append(n('h3',t(selectionAction==='restore'?'從資源回收桶還原':'移到資源回收桶')),
   n('p',t('這不是永久刪除。選手帳號、作品、成績、操作紀錄仍會保留，日後可以還原。'),'notice'),
   n('p',t(selection?'你明確勾選了 '+selection.length+' 筆，請核對實際可處理數量後再確認。':'請返回選手名單，勾選要整理的選手。'),'minor'));
  const feedback=n('p',message||t('先預覽，再確認；不會立即刪除。'),'feedback');feedback.setAttribute('role','status');root.append(feedback);
  if(plan){
   root.append(stats([['這次動作',t(plan.action==='delete'?'移到資源回收桶':'還原到主要名單')],['這次將處理',plan.total],['受保護，不處理',plan.protected_count]]));
   if(plan.batch_id){const id=n('p',t('批次編號')+' '+plan.batch_id,'minor');root.append(id);}
   if(result){
    root.append(stats(Object.entries({success:'寫入成功',current_applied:'目前仍生效',pending:'尚未處理',protected:'新評分或晉級，跳過',conflict:'資料變更，跳過',missing:'已不存在，跳過'}).map(([key,label])=>[label,result[key]])));
   }
   if(plan.batch_id){
    const actions=n('div',undefined,'form-actions');
    actions.append(button('查核這批結果',()=>check(plan.batch_id)));
    if(result?.action==='delete'&&result.current_applied>0)actions.append(button('預覽復原這一批',()=>preview(plan.batch_id)));
    root.append(actions);
   }
   if(plan.total>0&&!uncertain&&(!result||result.pending>0)){
    const form=n('form',undefined,'staff-bulk-confirm'),label=n('label',undefined,'field');
    const token=plan.action==='delete'?'DELETE TEST':'RESTORE TEST';
    const readable=plan.action==='delete'?'移到回收桶':'確認還原';
    label.append(n('span',t('為避免誤操作，請輸入')+'「'+t(readable)+'」'));
    const input=n('input');input.name='confirmation';input.autocomplete='off';input.spellcheck=false;input.required=true;input.disabled=busy;label.append(input);form.append(label);
    const send=n('button',t(plan.action==='delete'?'確認移到資源回收桶':'確認還原到名單'),'btn btn-danger');send.type='submit';send.disabled=busy;form.append(send);
    form.onsubmit=e=>{e.preventDefault();if(input.value===t(readable)&&!busy)apply(token)};root.append(form);
   }
  }
  const history=n('details');history.append(n('summary',t('最近的回收與還原紀錄')));
  const list=n('div',undefined,'roster-list');
  for(const batch of recent){
   const label=t(batch.action==='delete'?'移至回收區':'復原報名')+' · '+batch.total+' · '+batch.batch_id;
   const el=button('查核這批結果',()=>check(batch.batch_id));el.textContent=label;list.append(el);
  }
  history.append(list,button('重新讀取最近批次',()=>act(async stamp=>{await readRecent(stamp);message=t('已讀取最近批次。')})));root.append(history);
 }
 return {
  openSelection(ids,action){
   if(!Array.isArray(ids)||ids.length<1||ids.length>25||!['delete','restore'].includes(action))
    throw Error('invalid_selection');
   generation++;root=null;plan=null;result=null;busy=false;uncertain=false;recent=[];message='';
   selection=[...ids];selectionAction=action;
  },
  render(){
   root=n('section',undefined,'staff-bulk-workspace');paint();
   // Only the explicit checked selection is ever previewed.
   if(selection)queueMicrotask(()=>{if(live())preview()});
   return root;
  },
  clear(){generation++;root=null;plan=null;result=null;busy=false;uncertain=false;recent=[];message='';selection=null;selectionAction='delete'}
 };
}};
})();
