import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,summarizeScores,rankAudition,rankRegional,selectUnits,comparePk,pkFinalists,rankFinal,updateTraining} from '../backend/frontline-stage-rules.js';
const panel=['j1','j2','j3'];
const scores=(total=80,judges=panel)=>judges.map(judgeId=>({judgeId,technique:Math.min(40,total-40),interpretation:20+Math.min(10,Math.max(0,total-80)),stage_presence:15+Math.min(5,Math.max(0,total-90)),appearance:5+Math.max(0,total-95)}));
const entry=(id,region='A',total=80)=>({id,region,members:[id],scores:scores(total)});

test('actual stages are distinct and training is never a scored stage',()=>{
 assert.deepEqual(Object.keys(STAGES),['audition','qualifier_one','qualifier_two','regional_pk','final']);
 assert.equal(STAGES.qualifier_one.date,'2027-02-12');assert.equal(STAGES.qualifier_two.date,'2027-03-05');assert.equal(STAGES.regional_pk.date,'2027-03-12');assert.equal(STAGES.final.date,'2027-04-14');
 assert.throws(()=>summarizeScores('training',scores(),panel),/invalid_stage/);
});
test('assigned panels require complete3–5 coverage, reject duplicates/outsiders and do not count recusal as zero',()=>{
 assert.equal(summarizeScores('qualifier_one',scores(),panel).value,80);
 assert.equal(summarizeScores('qualifier_one',scores().slice(0,2),panel).complete,false);
 assert.throws(()=>summarizeScores('qualifier_one',scores(),['j1','j2']),/invalid_panel/);
 assert.throws(()=>summarizeScores('qualifier_one',[...scores(),scores()[0]],panel),/duplicate_score/);
 assert.throws(()=>summarizeScores('qualifier_one',scores(80,['outsider']),panel),/unassigned_judge/);
 const p=['j1','j2','j3','j4'],rows=[...scores(80),{judgeId:'j4',recused:true,reason:'TEST conflict'}];
 const s=summarizeScores('qualifier_one',rows,p);assert.equal(s.complete,true);assert.equal(s.count,3);assert.equal(s.value,80);
 assert.throws(()=>summarizeScores('qualifier_one',[{...scores()[0],technique:41}],panel),/invalid_score/);
});
test('audition selects highest video mean, only one seat, no summing demos or previous stage points',()=>{
 const demo=(position,total)=>({position,scores:panel.map(judgeId=>({judgeId,technique:total-40,interpretation:40}))});
 const ranked=rankAudition([{id:'a',region:'A',members:['a'],demos:[demo(1,80),demo(2,90),demo(3,70),demo(4,60),demo(5,85)]}],panel);
 assert.equal(ranked[0].value,90);assert.equal(ranked[0].position,2);assert.equal(ranked[0].members.length,1);
 assert.throws(()=>rankAudition([{id:'a',region:'A',members:['a'],demos:Array.from({length:6},(_,i)=>demo(i+1,80))}],panel),/invalid_demo_count/);
 const next=rankRegional('qualifier_one',[{...entry('a','A',75),previous_score:10000},entry('b','A',80)],panel);assert.equal(next[0].id,'b');
});
test('second qualifier uses whole-unit SUM, while first qualifier uses mean and each region stays separate',()=>{
 const p=['j1','j2','j3','j4'];const a={...entry('a'),scores:scores(80,p)},b={...entry('b'),members:['b','c'],scores:scores(85,p)};
 const first=rankRegional('qualifier_one',[a,entry('d','B',90)],p);assert.equal(first.find(x=>x.id==='a').value,80);
 const second=rankRegional('qualifier_two',[a,b],p);assert.equal(second[0].value,340);assert.deepEqual(second[0].members,['b','c']);
 assert.throws(()=>rankRegional('qualifier_two',[a,{...b,members:['a','b']}],p),/duplicate_member/);
 const unequal=[a,{...b,scores:[...scores(85),{judgeId:'j4',recused:true,reason:'TEST conflict'}]}];
 assert(selectUnits(rankRegional('qualifier_two',unequal,p),{A:10,B:10},{maxTeamSize:3}).blockers.includes('unequal_judge_coverage'));
});
test('unknown quotas/team policy, ties and overflow block publication without splitting a team',()=>{
 const units=rankRegional('qualifier_two',Array.from({length:4},(_,i)=>({...entry('t'+i,'A',80-i),members:['one'+i,'two'+i,'three'+i]})),panel);
 assert(selectUnits(units,{A:10,B:10},{maxTeamSize:3}).blockers.includes('team_overflow'));
 assert(selectUnits(units,{A:10,B:10},{}).blockers.includes('team_size_policy_pending'));
 assert(selectUnits(rankRegional('qualifier_one',[entry('a')],panel),{A:null,B:null}).blockers.includes('quota_pending'));
 const tied=rankRegional('qualifier_one',[entry('a'),entry('b')],panel);assert(selectUnits(tied,{A:1,B:0}).blockers.includes('cutoff_tie'));
 assert.equal(selectUnits(tied,{A:2,B:0}).selected.length,2);
});
test('PK pair wins by current stage mean/criteria, unresolved ties and incomplete pairings cannot advance',()=>{
 assert.equal(comparePk(entry('a','A',80),entry('b','A',90),panel).winner,'b');
 assert.equal(comparePk(entry('a'),entry('b'),panel).blocker,'named_panel_ballot_required');
 assert.throws(()=>comparePk(entry('a','A'),entry('b','B'),panel),/cross_region_pair/);
 const entrants=Array.from({length:20},(_,i)=>entry('p'+i,i<10?'A':'B',i%2?90:80));
 const pairs=Array.from({length:10},(_,i)=>({id:'pair'+i,ids:['p'+i*2,'p'+(i*2+1)]}));
 const selected=pkFinalists(entrants,pairs,panel);assert.equal(selected.finalists.length,10);assert.deepEqual(selected.blockers,[]);
 assert(pkFinalists(entrants,pairs.slice(1),panel).blockers.includes('pk_pairing_incomplete'));
 assert.throws(()=>pkFinalists(entrants,[...pairs,{...pairs[0],id:'extra'}],panel),/duplicate_pair_member/);
});

test('regional advancement counts people not teams and refuses incomplete region/score coverage',()=>{
 const entries=['A','B'].flatMap(region=>Array.from({length:10},(_,i)=>entry(region+i,region,100-i)));
 const rows=rankRegional('qualifier_two',entries,panel),selected=selectUnits(rows,{A:10,B:10});assert.equal(selected.ready,true);assert.equal(selected.selected.length,20);
 assert.equal(selectUnits(rows.filter(r=>r.region==='A'),{A:10,B:10}).ready,false);
 assert.equal(selectUnits(rows,{A:11,B:10}).ready,false);
});
test('selection sorts its own input and rejects overlapping cohorts instead of advancing a lower score twice',()=>{
 const ranked=rankRegional('qualifier_one',[entry('high','A',90),entry('low','A',80)],panel);
 assert.deepEqual(selectUnits([...ranked].reverse(),{A:1,B:0}).selected,['high']);
 assert.throws(()=>selectUnits([...ranked,ranked[0]],{A:3,B:0}),/invalid_or_duplicate_entry/);
 assert.throws(()=>selectUnits([{...ranked[0],sum:9999}],{A:1,B:0}),/invalid_summary/);
});
test('final fractional averages are retained until final half-up rounding, and namespace-like IDs stay safe',()=>{
 const entries=Array.from({length:10},(_,i)=>entry(i===0?'constructor':'f'+i,i<5?'A':'B',80));
 entries[0].scores=panel.map((j,i)=>scores(i?81:80,[j])[0]);
 assert.equal(rankFinal(entries,panel,{constructor:1,f1:3}).rows.find(r=>r.id==='constructor').total_score,56.53);
 assert.equal(rankFinal(entries,panel,{}).rows.find(r=>r.id==='constructor').total_score,39.53);
 assert.throws(()=>summarizeScores('constructor',[],panel),/invalid_stage/);
});
test('final is a single group, zero votes normalize to zero, no previous scores; final ties use judge mean then panel',()=>{
 const finalists=Array.from({length:10},(_,i)=>({...entry('f'+i,i<5?'A':'B',80),category:i%2?'community':'university',previous_score:i*999}));
 let result=rankFinal(finalists,panel,{'f0':10,'f1':5});assert.equal(result.rows[0].id,'f0');assert.equal(result.rows[0].total_score,90.2);assert.equal(result.rows.find(r=>r.id==='f1').total_score,64.7);
 result=rankFinal(finalists,panel,{});assert(result.rows.every(r=>r.total_score===39.2));assert(result.blockers.includes('named_panel_ballot_required'));
 assert.throws(()=>rankFinal(finalists.slice(0,9),panel,{}),/ten_finalists_required/);
 assert.throws(()=>rankFinal(finalists,panel,{f0:-1}),/invalid_votes/);
 const different=finalists.map((r,i)=>i===1?{...r,scores:scores(90)}:r);assert.equal(rankFinal(different,panel,{}).rows[0].id,'f1');
});
test('training opt-in/out changes no qualifier eligibility or score and rejects nonfinalists',()=>{
 const eligible=['a','b'],before=JSON.stringify(eligible);let training=updateTraining(eligible,[],{id:'a',optIn:true});
 training=updateTraining(eligible,training,{id:'a',optIn:false});assert.equal(training[0].optIn,false);assert.equal(JSON.stringify(eligible),before);
 assert.throws(()=>updateTraining(eligible,training,{id:'outsider',optIn:true}),/finalist_required/);
 assert.throws(()=>updateTraining(eligible,training,{id:'a',optIn:true,score:100}),/training_has_no_score/);
});
