import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizedEmail, sixDigitCode, hmacHex, isActive, getSecureCode } from '../backend/src/vote-core.js';
import worker from '../backend/src/index.js';

test('emails are normalized and malformed addresses rejected',()=>{
  assert.equal(normalizedEmail(' EXAMPLE@Example.COM  '),'example@example.com');
  assert.equal(normalizedEmail('invalid'),null);
  assert.equal(normalizedEmail('a@b'),null);
  assert.equal(normalizedEmail(''),null);
});
test('codes are six digits, secure random and rejection sampling avoids modulo bias',()=>{
  assert.equal(sixDigitCode(new Uint32Array([42])),'000042');
  assert.equal(sixDigitCode(new Uint32Array([4294967295])),null);
  assert.match(getSecureCode(),/^[0-9]{6}$/);
});
test('identity hashes are deterministic and depend on secret',async()=>{
  const a=await hmacHex('test-secret-a','test@example.org');
  const b=await hmacHex('test-secret-a','test@example.org');
  const c=await hmacHex('test-secret-b','test@example.org');
  assert.equal(a,b);assert.notEqual(a,c);
});
test('round must be specifically open in its time window',()=>{
  assert.equal(isActive({state:'open',opens_at:100,closes_at:200},150),true);
  assert.equal(isActive({state:'paused',opens_at:100,closes_at:200},150),false);
  assert.equal(isActive({state:'open',opens_at:100,closes_at:200},200),false);
});
test('unconfigured Worker fails closed',async()=>{
  const request=new Request('https://test.example/api/v1/vote/request',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:'demo@example.com'})
  });
  const res=await worker.fetch(request,{});
  assert.equal(res.status,503);
  assert.equal((await res.json()).error,'service_not_live');
});
test('health does not return secrets or private data',async()=>{
  const res=await worker.fetch(new Request('https://test.example/health'),{});
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{service:'golden-himal-vote-api',live:false});
});
