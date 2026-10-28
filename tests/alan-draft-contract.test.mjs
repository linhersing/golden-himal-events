import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('2027 stages and category fields are explicitly drafts, not payment collection',async()=>{
 const [html,js]=await Promise.all([read('index.html'),read('src/scripts/main.js')]);
 for(const val of ['season-preview','seasonDisclaimer','name="category"','name="round"','payment-preview']){
   assert.ok(html.includes(val),val);
 }
 assert.match(html,/This is not an invitation to apply or pay/);
 assert.match(html,/No payment or receipt upload is accepted/);
 assert.doesNotMatch(html,/<input[^>]*type="file"/i);
 assert.doesNotMatch(html,/NPR\s*500|51\s*%|49\s*%|12\s*finalists/i);
 for(const lang of ['en','ne','zh']){
   assert.match(js,new RegExp('Object\\.assign\\(translations\\.'+lang+'\\s*,'));
 }
});

test('SQL insert/select parameter count and audit event exist: independent review finding triage',async()=>{
 const [source,migration]=await Promise.all([read('backend/src/index.js'),read('backend/migrations/0001_core.sql')]);
 assert.match(source,/INSERT INTO votes\(id,round_id,contestant_id,voter_hash,created_at,challenge_id\)/);
 assert.match(source,/INSERT INTO audit_events\(id,created_at,event,ref_id\)/);
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec(migration);
  db.exec("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES('draft-round','Draft',100,20000,'open')");
  db.exec("INSERT INTO contestants(id,round_id,public_name,approved) VALUES('draft-candidate','draft-round','Test',1)");
  db.exec("INSERT INTO challenges(id,round_id,voter_hash,code_hash,contestant_id,created_at,expires_at) VALUES('draft-ch','draft-round','voter-hash','code-hash','draft-candidate',1000,1500)");
  // Same columns and select placeholders as backend/index.js. Test is SQL-only, not a live Worker.
  const insert='INSERT INTO votes(id,round_id,contestant_id,voter_hash,created_at,challenge_id) '+
    'SELECT ?,ch.round_id,ch.contestant_id,ch.voter_hash,?,ch.id '+
    'FROM challenges ch JOIN rounds r ON ch.round_id=r.id '+
    'JOIN contestants c ON c.id=ch.contestant_id AND c.round_id=ch.round_id '+
    'WHERE ch.id=? AND ch.code_hash=? AND ch.consumed_at IS NULL AND ch.attempts<=5 AND ch.expires_at>? '+
    "AND r.state='open' AND r.opens_at<=? AND r.closes_at>? AND c.approved=1";
  const result=db.prepare(insert).run('vote-test',1100,'draft-ch','code-hash',1100,1100,1100);
  assert.equal(result.changes,1);
  db.prepare("INSERT INTO audit_events(id,created_at,event,ref_id) SELECT ?,?,'vote_accepted',id FROM votes WHERE id=?").run('audit-test',1100,'vote-test');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_events').get().n,1);
 }finally{db.close()}
});
