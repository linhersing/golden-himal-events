import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { castFinalVoteRehearsal, finalVoteCredentialHash, finalVoteReadiness, verifyFinalVoteTurnstile } from '../backend/final-vote-security.js';

class D1Mock {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(sql) { return { bind: (...args) => ({ sql, args }) }; }
  async batch(steps) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = steps.map(({ sql, args }) => ({ meta: { changes: this.sqlite.prepare(sql).run(...args).changes } }));
      this.sqlite.exec('COMMIT');
      return result;
    } catch (err) { this.sqlite.exec('ROLLBACK'); throw err; }
  }
}
const request = () => new Request('https://vote.example/api/vote', {
  method: 'POST', headers: { Origin: 'https://vote.example', 'CF-Connecting-IP': '203.0.113.7' }
});
const verified = async (_url, opts) => {
  assert.match(String(opts.body), /response=token-/);
  return new Response(JSON.stringify({ success: true, action: 'ghv_final_vote', hostname: 'vote.example' }), { status: 200 });
};
const unverified = async () => new Response(JSON.stringify({ success: true, action: 'ghv_signup', hostname: 'vote.example' }), { status: 200 });
const secret = 'a long different secret used only for this rehearsal';
const credential = 'TOKEN_' + 'A'.repeat(52);

async function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_core.sql', '0002_eligibility_credentials.sql']) {
    db.exec(await readFile(new URL('../backend/migrations/' + file, import.meta.url), 'utf8'));
  }
  db.prepare("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES('final-2027','Final',100,200,'open')").run();
  db.prepare("INSERT INTO contestants(id,round_id,public_name,approved) VALUES('singer1','final-2027','Singer 1',1)").run();
  db.prepare("INSERT INTO contestants(id,round_id,public_name,approved) VALUES('singer2','final-2027','Singer 2',1)").run();
  db.prepare('INSERT INTO voter_eligibilities(id,round_id,eligibility_hash,credential_hash,issued_at,issued_by,eligibility_method) VALUES(?,?,?,?,?,?,?)')
    .run('eligible1','final-2027','independent-one-person-digest',await finalVoteCredentialHash(credential,secret),101,'independent-issuer','remote_reviewed');
  const env = {
    FINAL_VOTE_REHEARSAL_ENABLED:'true', FINAL_VOTE_REHEARSAL_DB:new D1Mock(db),
    FINAL_VOTE_CREDENTIAL_SECRET:secret, FINAL_VOTE_TURNSTILE_SECRET:'different-secure-turnstile-test-key-123456',
    FINAL_VOTE_ALLOWED_ORIGIN:'https://vote.example',
    FINAL_VOTE_RATE_LIMITER:{limit:async()=>({success:true})}
  };
  const payload = { roundId:'final-2027', contestantId:'singer1', credential,turnstileToken:'token-123' };
  return {db,env,payload};
}

test('closed by default, no credential issue path and no public routing',async()=>{
  assert.equal(finalVoteReadiness({}).rehearsalEnabled,false);
  const f=await fixture();try {
    const result=await castFinalVoteRehearsal({request:request(),env:{...f.env,FINAL_VOTE_REHEARSAL_ENABLED:'false'},payload:f.payload,now:150,fetcher:verified});
    assert.deepEqual([result.status,result.error],[503,'rehearsal_not_configured']);
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,0);
  } finally {f.db.close()}
});

test('one valid eligibility credential casts exactly one ballot with atomic audit',async()=>{
  const f=await fixture();try {
    const first=await castFinalVoteRehearsal({request:request(),env:f.env,payload:f.payload,now:150,fetcher:verified});
    assert.equal(first.ok,true);
    assert.equal(first.rehearsalOnly,true);
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,1);
    assert.equal(f.db.prepare("SELECT count(*) n FROM audit_events WHERE event='rehearsal_ballot_accepted'").get().n,1);
    const repeated=await castFinalVoteRehearsal({request:request(),env:f.env,payload:{...f.payload,contestantId:'singer2'},now:151,fetcher:verified});
    assert.equal(repeated.status,409,'changing the contestant must not create a second ballot');
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM audit_events').get().n,1);
  }finally{f.db.close()}
});

test('server rejects closed windows, revoked credentials and fake candidates',async()=>{
  const f=await fixture();try {
    for(const [now,payload] of [[99,f.payload],[200,f.payload],[150,{...f.payload,contestantId:'missing'}]]){
      const r=await castFinalVoteRehearsal({request:request(),env:f.env,payload,now,fetcher:verified});
      assert.equal(r.status,409);
    }
    f.db.prepare("UPDATE voter_eligibilities SET state='revoked' WHERE id='eligible1'").run();
    const revoked=await castFinalVoteRehearsal({request:request(),env:f.env,payload:f.payload,now:150,fetcher:verified});
    assert.equal(revoked.status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM audit_events').get().n,0);
  }finally{f.db.close()}
});

test('Turnstile must match vote action and hostname; wrong origins blocked',async()=>{
  const f=await fixture();try {
    assert.equal(await verifyFinalVoteTurnstile('token-123',request(),f.env,unverified),false);
    assert.equal((await castFinalVoteRehearsal({request:request(),env:f.env,payload:f.payload,now:150,fetcher:unverified})).status,403);
    const wrongOrigin = new Request('https://vote.example/api/vote',{method:'POST',headers:{Origin:'https://evil.example','CF-Connecting-IP':'203.0.113.7'}});
    assert.equal((await castFinalVoteRehearsal({request:wrongOrigin,env:f.env,payload:f.payload,now:150,fetcher:verified})).status,403);
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,0);
  }finally{f.db.close()}
});

test('limiter failures stop voting before Siteverify or database',async()=>{
  const f=await fixture();try {
    let keys=[];f.env.FINAL_VOTE_RATE_LIMITER={limit:async ({key})=>{keys.push(key);return {success:keys.length!==2}}};
    const blocked=await castFinalVoteRehearsal({request:request(),env:f.env,payload:f.payload,now:150,fetcher:verified});
    assert.equal(blocked.status,429);
    assert.equal(keys.length,2);
    assert.ok(keys.every(key=>!key.includes('203.0.113.7')&&!key.includes(credential)));
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,0);
  }finally{f.db.close()}
});

test('database audit failure rolls back accepted ballot in one transaction',async()=>{
  const f=await fixture();try {
    f.db.exec('DROP TABLE audit_events');
    const broken=await castFinalVoteRehearsal({request:request(),env:f.env,payload:f.payload,now:150,fetcher:verified});
    assert.equal(broken.status,409);
    assert.equal(f.db.prepare('SELECT count(*) n FROM credential_votes').get().n,0);
  }finally{f.db.close()}
});

test('one independent person cannot be issued multiple credentials',async()=>{
  const f=await fixture();try {
    const another=await finalVoteCredentialHash('TOKEN_'+ 'B'.repeat(52),secret);
    assert.throws(()=>f.db.prepare('INSERT INTO voter_eligibilities(id,round_id,eligibility_hash,credential_hash,issued_at,issued_by,eligibility_method) VALUES(?,?,?,?,?,?,?)')
      .run('eligible2','final-2027','independent-one-person-digest',another,102,'independent-issuer','remote_reviewed'),/UNIQUE/);
    assert.equal(f.db.prepare('SELECT count(*) n FROM voter_eligibilities').get().n,1);
  }finally{f.db.close()}
});
