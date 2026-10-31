import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceRankings} from '../backend/practice-ranking.js';
const app=(id,phase='demo')=>({id,stage_name:id,phase,category:'community',round_code:'2027-01'});
const panel=(id,phase,points)=>[1,2,3].map(n=>({application_id:id,judge_id:'judge-'+n,phase,technique:points[0],interpretation:points[1],stage_presence:points[2],appearance:points[3],recused:0}));
test('V2 entirely equal scorecards remain joint rank1 and require named ballot',()=>{const r=practiceRankings([app('a'),app('b')],[...panel('a','demo',[54,36,0,0]),...panel('b','demo',[54,36,0,0])],[]);assert.deepEqual(r.map(x=>[x.rank,x.tie_pending]),[[1,true],[1,true]]);});
test('V2 final tied combined totals compare jury mean before technique',()=>{const r=practiceRankings([app('a','final'),app('b','final'),app('normalizer','final')],[...panel('a','final',[40,30,20,10]),...panel('b','final',[20,15,10,4]),...panel('normalizer','final',[0,0,0,0])],[{application_id:'a',n:0},{application_id:'b',n:49},{application_id:'normalizer',n:100}]);assert.deepEqual(r.map(x=>x.id),['normalizer','a','b']);assert.equal(r[1].total_score,49);assert.equal(r[2].total_score,49);assert.equal(r[1].judges_mean,100);assert.equal(r[2].judges_mean,49);assert.equal(r[1].tie_pending,false);});
test('V2 a partly completed final never gets a combined score',()=>{const r=practiceRankings([app('a','final')],panel('a','final',[40,30,20,10]).slice(0,2),[{application_id:'a',n:100}]);assert.equal(r[0].ready,false);assert.equal(r[0].rank,null);assert.equal(r[0].total_score,null);});
