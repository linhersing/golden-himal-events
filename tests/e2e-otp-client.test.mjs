import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('late resend cannot relabel a recipient, replace a newer request, or re-enable its pending button',async()=>{
 const elements=new Map(),el=id=>{
  if(!elements.has(id))elements.set(id,{id,value:'',hidden:false,disabled:false,textContent:'',className:'',focus(){},querySelector(){return el(id+'-button')}});
  return elements.get(id);
 };
 let count=0,release;const delayed=new Promise(resolve=>{release=resolve});
 const context=vm.createContext({document:{body:{dataset:{role:'member'}},documentElement:{},getElementById:el,querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){}},setInterval(){return 1},clearInterval(){},Date,URL,console,
  async fetch(){const n=++count;if(n===2)await delayed;return Response.json({ok:true,challenge_id:'test-challenge-'+n,request_ref:'ref-'+n})}
 });
 const source=await readFile(process.env.GHV_AUTH_TEST_SOURCE||new URL('../public/e2e-stage.js',import.meta.url),'utf8');
 vm.runInContext(source.replace(/^import .*\n/,'').replace('locale(lang);session();',''),context);
 el('email').value='qa+old@gmail.com';
 await vm.runInContext("requestVerification($('send-form').querySelector('button'))",context);
 vm.runInContext('resendUntil=0;updateResend()',context);
 const pending=vm.runInContext("requestVerification($('resend-code'))",context);
 vm.runInContext("locale('zh')",context);
 assert.equal(el('resend-code').disabled,true,'a language change cannot re-enable a pending resend');
 el('change-email').onclick();el('email').value='qa+new@gmail.com';
 await vm.runInContext("requestVerification($('send-form').querySelector('button'))",context);
 release();await pending;
 assert(el('verify-mailbox').textContent.includes('qa+new@gmail.com'));
 assert(el('verify-mailbox').textContent.includes('ref-3'));
 assert.equal(vm.runInContext('challenge',context),'test-challenge-3');
});
