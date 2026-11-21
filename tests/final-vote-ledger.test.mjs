import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
import {verifyVoteProof} from '../backend/final-vote-test-http.js';
import {voteLedger} from '../backend/final-vote-ledger.js';
const admin={id:'organizer',role:'organizer'},now=1800000000;
function fixture(){
 const f=bulkFixture(20);for(const name of ['1020_stage_ledger_ISOLATED_TEST_ONLY.sql','1021_final_vote_ISOLATED_TEST_ONLY.sql'])f.sqlite.exec(readFileSync(new URL('../backend/migrations/'+name,import.meta.url),'utf8'));
 f.sqlite.prepare('INSERT INTO stage_test_scope VALUES(?)').run('FICTIONAL_STAGE_TEST_ONLY');
 const panel=['reviewer','judge2','judge3'];for(const id of panel.slice(1))f.sqlite.prepare("INSERT INTO e2e_accounts VALUES(?,?,?,'reviewer',1,1)").run(id,id,'fixture');
 f.sqlite.prepare("INSERT INTO stage_test_rounds(code,status,panel,config) VALUES('final','open',?,'{}')").run(JSON.stringify(panel));
 for(let i=0;i<10;i++){const id=f.ids[i];f.sqlite.prepare("INSERT INTO stage_test_units VALUES('final',?,?,'A',1)").run(id,'TEST Finalist '+i);f.sqlite.prepare("INSERT INTO stage_test_members VALUES('final',?,?)").run(id,id);for(const judge of panel)f.sqlite.prepare("INSERT INTO stage_test_scores VALUES('final',?,1,?,?,?,1)").run(id,judge,JSON.stringify({technique:40-i,interpretation:25,stage_presence:15,appearance:5}),'grade-'+i+'-'+judge)}
 let count=0;const command=(body,actor=admin,options={})=>voteLedger(f.env.DB,actor,{request_id:'request-'+(++count),...body},{now,secret:'fictional-vote-secret-at-least-32-characters',...options});
 return {...f,command,panel};
}
async function initialized(f){await f.command({operation:'initialize'});const s=await f.command({operation:'read'});return s;}
async function opened(f){const s=await initialized(f);await f.command({operation:'ready',version:s.version});await f.command({operation:'open',version:1,opens_at:now-1,closes_at:now+100});return f.command({operation:'read'});}
test('voting opens only with ten ready fictional finalist videos and authorized organizer',async()=>{
 const f=fixture();try{const s=await initialized(f);assert.equal(s.candidates.length,10);assert.equal(new Set(s.candidates.map(c=>c.public_id)).size,10);await assert.rejects(f.command({operation:'open',version:0,opens_at:now-1,closes_at:now+100}),/videos_not_ready/);await assert.rejects(f.command({operation:'issue',person_key:'TEST-person-1'},{id:'member',role:'member'}),/organizer_only/);const publicView=await f.command({operation:'read'},null);assert.equal(publicView.candidates.length,0);assert(!JSON.stringify(publicView).includes('application_id'));assert(!JSON.stringify(publicView).includes('credential_hash'));}finally{f.close()}
});
test('one independent TEST eligibility, authenticated receipt, duplicate/retry protection and transactional audit',async()=>{
 const f=fixture();try{const s=await opened(f),issued=await f.command({operation:'issue',person_key:'TEST-person-1'});await assert.rejects(f.command({operation:'issue',person_key:'TEST-person-1'}),/already_issued/);
 const body={operation:'cast',candidate_id:s.candidates[0].public_id,credential:issued.credential,request_id:'same-ballot'},saved=await f.command(body,null,{verified:true});assert(saved.receipt);assert.equal((await f.command(body,null,{verified:true})).receipt,saved.receipt);await assert.rejects(f.command({...body,candidate_id:s.candidates[1].public_id},null,{verified:true}),/ballot_conflict/);await assert.rejects(f.command({...body,request_id:'different-ballot'},null,{verified:true}),/already_voted/);
 assert.equal((await f.command({operation:'receipt',credential:issued.credential},null)).receipt,saved.receipt);await assert.rejects(f.command({...body,credential:'bad'},null,{verified:true}),/invalid_credential/);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_ballots').get().n,1);assert.throws(()=>f.sqlite.exec('DELETE FROM vote_test_audit'),/immutable_vote_audit/);
 }finally{f.close()}
});
test('unverified, revoked, late and failed-transaction votes never become successful ballots',async()=>{
 const f=fixture();try{const s=await opened(f),issued=await f.command({operation:'issue',person_key:'TEST-person-1'}),body={operation:'cast',candidate_id:s.candidates[0].public_id,credential:issued.credential};await assert.rejects(f.command(body,null),/human_verification_required/);f.setFail(true);await assert.rejects(f.command(body,null,{verified:true}));f.setFail(false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_ballots').get().n,0);await f.command({operation:'revoke',eligibility_id:issued.eligibility_id,reason:'evidence_review'});await assert.rejects(f.command(body,null,{verified:true}),/ineligible/);
 const other=await f.command({operation:'issue',person_key:'TEST-person-2'});await assert.rejects(f.command({...body,credential:other.credential},null,{verified:true,now:now+100}),/voting_closed/);
 }finally{f.close()}
});
test('closed snapshot excludes invalid ballots, freezes51/49 against exact final judge scores and forbids late changes',async()=>{
 const f=fixture();try{const s=await opened(f),issued=await f.command({operation:'issue',person_key:'TEST-person-1'}),saved=await f.command({operation:'cast',candidate_id:s.candidates[0].public_id,credential:issued.credential},null,{verified:true});await f.command({operation:'decide',receipt:saved.receipt,verdict:'invalidate',reason:'evidence_review'});let current=await f.command({operation:'read'});await f.command({operation:'close',version:current.version});current=await f.command({operation:'read'});const result=await f.command({operation:'freeze',version:current.version});assert.equal(result.result.rows[0].votes,0);assert.equal(result.result.rows[0].total_score,41.65);assert.equal(f.sqlite.prepare("SELECT status FROM stage_test_rounds WHERE code='final'").get().status,'frozen');await assert.rejects(f.command({operation:'decide',receipt:saved.receipt,verdict:'reinstate',reason:'operator_error'}),/voting_frozen/);assert.throws(()=>f.sqlite.exec('DELETE FROM vote_test_ballots'),/immutable_vote_ballot/);
 }finally{f.close()}
});

test('six independent valid voters cast concurrently without global-version contention',async()=>{
 const f=fixture();try{const s=await opened(f),issued=[];for(let i=0;i<6;i++)issued.push(await f.command({operation:'issue',person_key:'TEST-person-concurrent'+i}));const results=await Promise.all(issued.map((r,i)=>f.command({operation:'cast',candidate_id:s.candidates[i].public_id,credential:r.credential},null,{verified:true})));assert.equal(results.length,6);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_ballots').get().n,6);}finally{f.close()}
});
test('lost credential-delivery response is recoverable only by original issuer and same request',async()=>{
 const f=fixture();try{await opened(f);const body={operation:'issue',person_key:'TEST-person-recovery',request_id:'same-issuance'},first=await f.command(body),recovered=await f.command(body);assert.equal(recovered.credential,first.credential);assert.equal(recovered.audit_id,first.audit_id);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_eligibility').get().n,1);await assert.rejects(f.command({...body,request_id:'different-request'}),/already_issued/);}finally{f.close()}
});

test('server human proof binds hostname/action and throttles repeated credential attempts',async()=>{
 const f=fixture();try{const request=new Request('https://test.invalid/api/vote-test',{headers:{'CF-Connecting-IP':'192.0.2.1'}}),env={E2E_DB:f.env.DB,FINAL_VOTE_CREDENTIAL_SECRET:'fictional-vote-secret-at-least-32-characters',FINAL_VOTE_TURNSTILE_SECRET:'fictional-turnstile-secret-at-least-32-characters'},payload={turnstile_token:'TEST-proof',credential:'TEST-credential'},proof=value=>async()=>Response.json(value);
 assert.equal(await verifyVoteProof(request,env,payload,proof({success:true,hostname:'wrong.invalid',action:'ghv_final_vote'})),false);
 assert.equal(await verifyVoteProof(request,env,payload,proof({success:true,hostname:'test.invalid',action:'wrong-action'})),false);
 assert.equal(await verifyVoteProof(request,env,payload,proof({success:true,hostname:'test.invalid',action:'ghv_final_vote'})),true);
 let result;for(let i=0;i<10;i++)result=await verifyVoteProof(request,env,payload,proof({success:true,hostname:'test.invalid',action:'ghv_final_vote'}));assert.equal(result,false);
 }finally{f.close()}
});
test('failed final snapshot transaction preserves closed vote state, unfrozen grades and all audit counts',async()=>{
 const f=fixture();try{await opened(f);let current=await f.command({operation:'read'});await f.command({operation:'close',version:current.version});current=await f.command({operation:'read'});const before=f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_audit').get().n;f.setFail(true);await assert.rejects(f.command({operation:'freeze',version:current.version}));f.setFail(false);assert.equal((await f.command({operation:'read'})).state,'closed');assert.equal(f.sqlite.prepare("SELECT status FROM stage_test_rounds WHERE code='final'").get().status,'open');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM vote_test_audit').get().n,before);
 }finally{f.close()}
});
