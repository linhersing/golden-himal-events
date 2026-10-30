/* Golden Himal Voice: browser-only TEST account and registration state machine.
 * This is NOT user authentication, not a payment processor and not a real API.
 * No passwords, personal information, bank details, or video files are accepted.
 */
export const FEE_NPR=500;
export const ROUNDS=Object.freeze(['2027-03','2027-06','2027-09']);
export const CATEGORY=Object.freeze(['university','community']);
export const PERSONAS=Object.freeze(Array.from({length:20},(_,i)=>Object.freeze({
 code:'T'+String(i+1).padStart(3,'0'),
 alias:'TEST-SINGER-'+String(i+1).padStart(3,'0'),
 email:'singer-'+String(i+1).padStart(3,'0')+'@example.invalid',
 age:i===19?17:18+(i%8),
 category:i%2===0?'university':'community'
})));
export const blankPortal=()=>({
 version:1,memberSeq:1,applicationSeq:1,orderSeq:1,
 members:[],applications:[],orders:[],audit:[]
});
const persona=code=>PERSONAS.find(p=>p.code===code);
const MAX_AUDIT_EVENTS=200;
function recordAudit(s,event,ref){
 // A bounded ring-style history: never let a verbose TEST session wipe members.
 s.audit.push({event,ref});
 if(s.audit.length>MAX_AUDIT_EVENTS)
  s.audit.splice(0,s.audit.length-MAX_AUDIT_EVENTS);
}
export function signUpMock(s,code){
 const p=persona(code);
 if(!p)return {error:'請從20位固定虛構人物中選擇。'};
 if(s.members.some(m=>m.person===code))return {error:'此虛構人物已有一個測試會員帳號，請使用模擬登入。'};
 // Keep a record of attempted account creation but never collect an under-age applicant.
 if(p.age<18)return {error:'此測試人物未滿18歲，不符合現行草案報名資格。'};
 if(s.members.length>=20)return {error:'已達20位測試會員上限。'};
 const id='MEM-TEST-'+String(s.memberSeq++).padStart(4,'0');
 const member={id,person:code,alias:p.alias,email:p.email,age:p.age,
  category:p.category,emailVerified:'MOCK_ONLY'};
 s.members.push(member);
 recordAudit(s,'fake_signup',id);
 return {member};
}
export function applyMock(s,memberId,round,demo){
 const member=s.members.find(m=>m.id===memberId);
 if(!member)return {error:'請先選擇並模擬登入會員。'};
 if(!ROUNDS.includes(round))return {error:'場次無效。'};
 if(!['TEST-DEMO-60S','TEST-DEMO-90S'].includes(demo))return {error:'請選擇固定測試Demo，不允許上傳真人影片。'};
 if(member.age<18)return {error:'未滿18歲不得報名。'};
 if(s.applications.some(a=>a.memberId===memberId&&a.round===round))
  return {error:'同一會員同一場次不可重複報名。'};
 if(s.applications.some(a=>a.memberId===memberId&&a.status==='finalist'))
  return {error:'已晉級年度決賽，不可報名後續初賽。'};
 const application={id:'APP-TEST-'+String(s.applicationSeq++).padStart(4,'0'),
  memberId,round,category:member.category,demo,status:'submitted',
  feeRequiredNpr:FEE_NPR};
 s.applications.push(application);recordAudit(s,'fake_application',application.id);
 return {application};
}
export function getOrCreateOrder(s,appId){
 const app=s.applications.find(a=>a.id===appId);
 if(!app)return {error:'必須先有測試報名。'};
 const existing=s.orders.find(o=>o.applicationId===appId);
 if(existing)return {order:existing,existing:true};
 const order={id:'ORD-TEST-'+String(s.orderSeq++).padStart(4,'0'),applicationId:app.id,
  amountNpr:FEE_NPR,currency:'NPR',status:'unpaid',mode:'FAKE_NO_BANK'};
 s.orders.push(order);recordAudit(s,'fake_order',order.id);
 return {order,existing:false};
}
export function simulatePayment(s,orderId,event){
 const order=s.orders.find(o=>o.id===orderId);
 if(!order)return {error:'找不到測試付款單。'};
 const transitions={
  unpaid:{success:'paid',fail:'failed'},
  failed:{retry:'unpaid'},
  paid:{request_refund:'refund_pending'},
  refund_pending:{refund_complete:'refunded',refund_reject:'paid'}
 };
 const next=transitions[order.status]?.[event];
 if(!next){
  if((event==='success'&&order.status==='paid')||
     (event==='refund_complete'&&order.status==='refunded'))
   return {order,duplicate:true};
  return {error:'不允許這項測試付款狀態轉換。'};
 }
 order.status=next;
 recordAudit(s,'fake_payment_'+event,order.id);
 return {order,duplicate:false};
}
export function reviewMock(s,appId,next){
 const app=s.applications.find(a=>a.id===appId);
 if(!app)return {error:'找不到測試報名。'};
 if(!['needs_info','shortlisted','rejected','finalist'].includes(next))
  return {error:'審核狀態無效。'};
 const order=s.orders.find(o=>o.applicationId===appId);
 if(next==='shortlisted'||next==='finalist'){
  if(order?.status!=='paid')return {error:'必須先確認模擬付款，才可通過審核。'};
  if(app.status==='rejected')return {error:'退件需先重新進入補件流程。'};
 }
 if(next==='finalist'&&app.status!=='shortlisted')
  return {error:'必須先通過Demo初篩，不能直接進入年度決賽。'};
 // This is an operator mock. No role authentication is implied.
 app.status=next;
 recordAudit(s,'fake_review_'+next,app.id);
 return {application:app};
}
export function summary(s){
 const payment=s.orders.filter(o=>o.status==='paid'||o.status==='refund_pending');
 return {members:s.members.length,applications:s.applications.length,
  paidOrders:payment.length,pendingOrders:s.orders.filter(o=>['unpaid','failed'].includes(o.status)).length,
  grossTestNpr:(payment.length+s.orders.filter(o=>o.status==='refunded').length)*FEE_NPR,
  testNetNpr:payment.length*FEE_NPR,
  shortlist:s.applications.filter(a=>a.status==='shortlisted'||a.status==='finalist').length};
}
export function seed20(s){
 const results=[];
 for(let i=0;i<20;i++){
  const p=PERSONAS[i];
  const signup=signUpMock(s,p.code);
  if(signup.error){results.push({code:p.code,error:signup.error});continue;}
  const round=ROUNDS[i%3];
  const application=applyMock(s,signup.member.id,round,'TEST-DEMO-60S');
  if(application.error){results.push({code:p.code,error:application.error});continue;}
  const order=getOrCreateOrder(s,application.application.id);
  if(i%3===0){simulatePayment(s,order.order.id,'success');reviewMock(s,application.application.id,'shortlisted');}
  else if(i%3===1){simulatePayment(s,order.order.id,'fail');}
  results.push({code:p.code,memberId:signup.member.id,applicationId:application.application.id});
 }
 return results;
}
export function safeParsePortal(raw){
 try{
  const p=JSON.parse(raw);
  if(!p||p.version!==1||!Array.isArray(p.members)||!Array.isArray(p.applications)||
   !Array.isArray(p.orders)||!Array.isArray(p.audit)||
   p.members.length>20||p.applications.length>60||p.orders.length>60||
   !Number.isSafeInteger(p.memberSeq)||p.memberSeq<1||p.memberSeq>100||
   !Number.isSafeInteger(p.applicationSeq)||p.applicationSeq<1||p.applicationSeq>100||
   !Number.isSafeInteger(p.orderSeq)||p.orderSeq<1||p.orderSeq>100)return blankPortal();
  const memberIds=new Set();
  for(const m of p.members){
   const fixed=persona(m.person);
   if(!fixed||memberIds.has(m.id)||m.alias!==fixed.alias||m.email!==fixed.email||
    m.age!==fixed.age||m.category!==fixed.category||m.emailVerified!=='MOCK_ONLY'||
    !/^MEM-TEST-\d{4}$/.test(m.id))return blankPortal();
   memberIds.add(m.id);
  }
  const appIds=new Set();
  for(const a of p.applications){
   const member=p.members.find(m=>m.id===a.memberId);
   if(!member||!ROUNDS.includes(a.round)||a.category!==member.category||
    !['TEST-DEMO-60S','TEST-DEMO-90S'].includes(a.demo)||
    !['submitted','needs_info','shortlisted','rejected','finalist'].includes(a.status)||
    appIds.has(a.id)||!/^APP-TEST-\d{4}$/.test(a.id)||a.feeRequiredNpr!==FEE_NPR)return blankPortal();
   appIds.add(a.id);
  }
  const orderIds=new Set(), orderedApps=new Set();
  for(const o of p.orders){
   if(!appIds.has(o.applicationId)||orderedApps.has(o.applicationId)||orderIds.has(o.id)||
    !/^ORD-TEST-\d{4}$/.test(o.id)||o.amountNpr!==FEE_NPR||
    o.currency!=='NPR'||o.mode!=='FAKE_NO_BANK'||
    !['unpaid','paid','failed','refund_pending','refunded'].includes(o.status))return blankPortal();
   orderedApps.add(o.applicationId);orderIds.add(o.id);
  }
  for(const a of p.applications){
   if(['shortlisted','finalist'].includes(a.status)&&
    !p.orders.some(o=>o.applicationId===a.id&&['paid','refund_pending','refunded'].includes(o.status)))
    return blankPortal();
  }
  if(!p.audit.every(x=>typeof x.event==='string'&&/^fake_/.test(x.event)&&
    typeof x.ref==='string'&&x.ref.length<64))return blankPortal();
  if(p.audit.length>MAX_AUDIT_EVENTS)
   p.audit=p.audit.slice(-MAX_AUDIT_EVENTS); // preserve valid old sessions with >400 logs
  return p;
 }catch{return blankPortal();}
}
