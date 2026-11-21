import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/human-verification-status.js';
const {humanVerificationError}=globalThis.GHVHumanVerification;

test('domain and sitekey configuration errors request organizer repair rather than browser troubleshooting',()=>{
 for(const code of ['110200','400021'])assert.deepEqual(humanVerificationError(code),{key:'signupHumanDomain',code,retryable:false});
 for(const code of ['110100','110110','400020','400070'])assert.deepEqual(humanVerificationError(code),{key:'signupHumanConfiguration',code,retryable:false});
});
test('challenge failure, timeout and network issues remain distinct and safely retryable',()=>{
 for(const code of ['300000','600010'])assert.deepEqual(humanVerificationError(code),{key:'signupHumanFailed',code,retryable:true});
 for(const code of ['110600','110620'])assert.equal(humanVerificationError(code).key,'signupHumanExpired');
 assert.equal(humanVerificationError('200100').key,'signupHumanClock');
 assert.equal(humanVerificationError('200500').key,'signupHumanBlocked');
});
test('only public six-digit numeric codes can be reflected into the interface',()=>{
 for(const value of [null,undefined,{},'secret-token','110200<script>','110200\n','12345678']){
  assert.deepEqual(humanVerificationError(value),{key:'signupHumanBlocked',code:'',retryable:true});
 }
 assert.equal(humanVerificationError(110200).key,'signupHumanDomain');
});
