import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPracticePassBackup} from '../public/practice-pass-backup.js';
const roles=['member-a','member-b','judge-1','judge-2','judge-3','organizer'];
const passes=roles.map((actor_id,i)=>({actor_id,pass:String(i+1).repeat(64)}));
test('explicit backup preserves every role and its original pass without real account claims',()=>{
 const text=buildPracticePassBackup('TEST-WORKSPACE',passes);assert(text.includes('TEST-WORKSPACE'));
 for(const p of passes)assert(text.includes(p.actor_id+': '+p.pass));
 assert.match(text,/TEST ONLY/);assert.match(text,/PRIVATE/);
});
test('backup refuses missing, duplicate, unknown or malformed roles instead of exporting misleading credentials',()=>{
 for(const bad of [passes.slice(0,5),[...passes.slice(0,5),passes[0]],passes.map((x,i)=>i===0?{...x,actor_id:'admin'}:x),passes.map((x,i)=>i===0?{...x,pass:'short'}:x)])assert.throws(()=>buildPracticePassBackup('TEST-WORKSPACE',bad));
 assert.throws(()=>buildPracticePassBackup('',passes));
});
