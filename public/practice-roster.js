// Only render within an authenticated Organizer's own temporary TEST workspace.
// All personal test fields come from /api/staging/practice/me (HttpOnly role session).
const byId=id=>document.getElementById(id);
const el=(tag,value,cls)=>{
 const n=document.createElement(tag);
 if(value!==undefined)n.textContent=String(value);
 if(cls)n.className=cls;
 return n;
};
const dictionary={
 zh:{
  judges:'評審',active:'有有效的測試登入',inactive:'目前沒有有效登入（不代表從未登入）',
  scored:'已評不同選手',cards:'評分卡',recusal:'迴避',empty:'目前還沒有測試報名。請先使用會員測試身分送出一筆，再切換管理員查看。',
  noMatch:'找不到符合搜尋條件的測試報名。',id:'報名編號',round:'梯次',category:'組別',
  province:'省份',phone:'測試電話',handle:'測試WhatsApp／聯絡方式',affiliation:'學校／單位',
  song:'歌曲',artist:'原唱',key:'調性',phase:'目前階段',fee:'測試繳費',unpaid:'未模擬付款',
  mockPaid:'模擬付款完成（沒有實際扣款）',open:'▶ 開啟作品試聽',invalid:'作品網址不是可安全開啟的 YouTube 或 Google Drive 連結',
  judgeDetails:'三位評審各階段給分',none:'尚未評分',recused:'已迴避',reason:'原因',sum:'總分',
  rank:'目前排名（僅供測試）',notLive:'只顯示這個測試空間的資料；不能當成正式報名或真實付款。',
  scorePhase:'評分階段',noSessions:'此帳號不是網站正式會員；目前使用的是測試角色通行碼。'
 },
 en:{
  judges:'Judge',active:'Has an unexpired test session',inactive:'No unexpired session (not proof of never logging in)',
  scored:'Distinct singers scored',cards:'Scorecards',recusal:'Recusals',empty:'No fictional entry yet. Submit as a test member, then switch to Organizer.',
  noMatch:'No matching fictional entry.',id:'Application ID',round:'Round',category:'Category',
  province:'Province',phone:'Test phone',handle:'Test WhatsApp/contact',affiliation:'Affiliation',
  song:'Song',artist:'Original artist',key:'Song key',phase:'Current stage',fee:'Test fee',unpaid:'Not simulated',
  mockPaid:'Simulated only (no actual charge)',open:'▶ Open performance',invalid:'Only safe YouTube or Google Drive links may open',
  judgeDetails:'Scorecards by judge and phase',none:'Not scored',recused:'Recused',reason:'Reason',sum:'Total',
  rank:'Practice rank',notLive:'This workspace only — not official entries or real payments.',
  scorePhase:'Scoring stage',noSessions:'Role passes are not real email/password accounts.'
 }
};
export function safePerformance(raw){
 try{
  const u=new URL(raw);
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password)return null;
  if(host==='youtu.be'||host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com'||
   host==='drive.google.com'||host==='docs.google.com')return u.href;
 }catch{}
 return null;
}
const display=v=>v===undefined||v===null||v===''?'—':String(v);
function field(root,label,value){
 const div=el('div',undefined,'roster-field');
 div.append(el('dt',label),el('dd',display(value)));
 root.append(div);
}
function judgeMonitor(state,t){
 const dest=byId('organizer-judge-monitor');
 dest.replaceChildren();
 const statuses=Array.isArray(state.judge_status)?state.judge_status:[];
 for(let i=1;i<=3;i++){
  const id='judge-'+i;
  const judge=statuses.find(x=>x.actor_id===id);
  const scores=(state.scores||[]).filter(x=>x.judge_id===id);
  const box=el('section',undefined,'roster-judge');
  box.append(el('strong',t.judges+' '+i));
  // A session existing is not proof someone is online right now.
  box.append(el('p',judge?(Number(judge.active_session)===1?t.active:t.inactive):t.inactive,'roster-muted'));
  box.append(el('p',t.scored+': '+(judge?Number(judge.scored_apps||0):new Set(scores.filter(x=>!x.recused).map(x=>x.application_id)).size)));
  box.append(el('p',t.cards+': '+(judge?Number(judge.scorecards||0):scores.length)));
  box.append(el('p',t.recusal+': '+(judge?Number(judge.recusal_count||0):scores.filter(x=>x.recused).length)));
  dest.append(box);
 }
}
function roster(state,t){
 const root=byId('organizer-roster');
 root.replaceChildren();
 const query=(byId('organizer-roster-search')?.value||'').trim().toLocaleLowerCase();
 const all=Array.isArray(state.applications)?state.applications:[];
 const applications=all.filter(a=>[a.id,a.stage_name,a.contact_phone,a.contact_handle,a.song_title,
  a.affiliation,a.province,a.round_code,a.category,a.phase].some(x=>String(x||'').toLocaleLowerCase().includes(query)));
 if(!applications.length){root.append(el('p',all.length?t.noMatch:t.empty));return}
 for(const a of applications){
  const box=el('article',undefined,'roster-entry');
  box.append(el('h4',display(a.stage_name)),el('span',display(a.id),'roster-id'));
  const dl=el('dl',undefined,'roster-fields');
  [
   [t.round,a.round_code==='2027-01'?'2027-01':a.round_code==='2027-04'?'2027-04':a.round_code],
   [t.category,a.category],[t.province,a.province],[t.phase,a.phase],
   [t.phone,a.contact_phone],[t.handle,a.contact_handle],[t.affiliation,a.affiliation],
   [t.song,a.song_title],[t.artist,a.original_artist],[t.key,a.song_key],
   [t.fee,a.fee_status==='simulation_only'?t.mockPaid:t.unpaid]
  ].forEach(([k,v])=>field(dl,k,v));
  box.append(dl);
  const href=safePerformance(a.work_url);
  if(href){
   const link=el('a',t.open,'roster-play');
   link.href=href;link.target='_blank';link.rel='noopener noreferrer';
   box.append(link);
  }else{
   box.append(el('p',t.invalid,'roster-muted'));
  }
  const scoresBlock=el('section',undefined,'roster-scores');
  scoresBlock.append(el('h5',t.judgeDetails));
  const appScores=(state.scores||[]).filter(s=>s.application_id===a.id);
  if(!appScores.length)scoresBlock.append(el('p',t.none,'roster-muted'));
  else{
   for(const phase of ['demo','qualifier','final']){
    const rows=appScores.filter(s=>s.phase===phase).sort((a,b)=>a.judge_id.localeCompare(b.judge_id));
    if(!rows.length)continue;
    scoresBlock.append(el('p',t.scorePhase+': '+phase,'roster-muted'));
    for(const score of rows){
     const total=Number(score.technique||0)+Number(score.interpretation||0)+Number(score.stage_presence||0)+Number(score.appearance||0);
     const line=score.recused?
       score.judge_id+' · '+t.recused+(score.reason?' · '+t.reason+': '+score.reason:''):
       score.judge_id+' · '+t.sum+': '+total+'/100 ('+[score.technique,score.interpretation,score.stage_presence,score.appearance].join('/')+')';
     scoresBlock.append(el('p',line));
    }
   }
  }
  const ranking=(state.rankings||[]).find(x=>x.id===a.id&&x.phase===a.phase);
  if(ranking?.ready)scoresBlock.append(el('p',t.rank+': '+display(ranking.rank)));
  box.append(scoresBlock);
  root.append(box);
 }
}
export function renderOrganizerRoster(state,language){
 if(!state||state.actor?.role!=='organizer')return;
 const t=dictionary[language]||dictionary.en;
 if(!byId('organizer-roster')||!byId('organizer-judge-monitor'))return;
 judgeMonitor(state,t);
 roster(state,t);
 byId('roster-warning').textContent=t.notLive+' '+t.noSessions;
}
