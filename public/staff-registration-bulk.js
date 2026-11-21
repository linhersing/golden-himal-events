(()=>{
'use strict';
window.GHVRegistrationBulk={create({api,t,onChanged,isAllowed}){
 let root=null,plan=null,result=null,busy=false,uncertain=false,message='',generation=0,recent=[];
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
   const data=await api('organizer-registration-bulk',{operation:source?'preview_restore':'preview',...(source?{batch_id:source}:{})});
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
  root.append(n('h3',t('批次清理測試報名')),
   n('p',t('只移至回收區，保留帳號、作品、成績與歷史；已評分或晉級者會跳過。'),'notice'),
   n('p',t('這會處理所有可回收的測試報名，不受名冊搜尋與篩選限制。每批最多500筆。'),'minor'));
  const actions=n('div',undefined,'form-actions');
  actions.append(button('預覽全部可回收報名',()=>preview()));root.append(actions);
  const feedback=n('p',message||t('先預覽，再確認；不會立即刪除。'),'feedback');feedback.setAttribute('role','status');root.append(feedback);
  if(plan){
   root.append(stats([['操作類型',t(plan.action==='delete'?'移至回收區':'復原報名')],['可處理筆數',plan.total],['受保護，跳過',plan.protected_count],['超出本批筆數',plan.remaining_count]]));
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
    label.append(n('span',t('輸入以下文字確認')+' '+token));
    const input=n('input');input.name='confirmation';input.autocomplete='off';input.spellcheck=false;input.required=true;input.disabled=busy;input.pattern=token;label.append(input);form.append(label);
    const send=n('button',t(result?'繼續尚未處理項目':'確認處理這一批'),'btn btn-danger');send.type='submit';send.disabled=busy;form.append(send);
    form.onsubmit=e=>{e.preventDefault();if(input.value===token&&!busy)apply(token)};root.append(form);
   }
  }
  const history=n('section');history.append(n('h3',t('我的最近批次')));
  const list=n('div',undefined,'roster-list');
  for(const batch of recent){
   const label=t(batch.action==='delete'?'移至回收區':'復原報名')+' · '+batch.total+' · '+batch.batch_id;
   const el=button('查核這批結果',()=>check(batch.batch_id));el.textContent=label;list.append(el);
  }
  history.append(list,button('重新讀取最近批次',()=>act(async stamp=>{await readRecent(stamp);message=t('已讀取最近批次。')})));root.append(history);
 }
 return {
  render(){root=n('section',undefined,'staff-bulk-workspace');paint();return root},
  clear(){generation++;root=null;plan=null;result=null;busy=false;uncertain=false;recent=[];message=''}
 };
}};
})();
