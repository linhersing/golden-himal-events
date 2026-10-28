import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

test('D1 schema strictly prevents a second vote by the same verified email in a round',async()=>{
  const sql=await readFile(new URL('../backend/migrations/0001_core.sql',import.meta.url),'utf8');
  const db=new DatabaseSync(':memory:');
  try{
    db.exec('PRAGMA foreign_keys=ON;');
    db.exec(sql);
    const createRound=db.prepare("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES(?,?,?,?,?)");
    createRound.run('test-round-a','Test round',100,9999999999,'open');
    createRound.run('test-round-b','Second round',100,9999999999,'open');
    const candidate=db.prepare('INSERT INTO contestants(id,round_id,public_name,approved) VALUES(?,?,?,1)');
    candidate.run('a1','test-round-a','Sample One');
    candidate.run('a2','test-round-a','Sample Two');
    candidate.run('b1','test-round-b','Sample Three');
    const challenge=db.prepare('INSERT INTO challenges(id,round_id,voter_hash,code_hash,contestant_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?)');
    challenge.run('challenge-a1','test-round-a','hashed-verified-email','hashed-code','a1',1000,1600);
    challenge.run('challenge-a2','test-round-a','hashed-verified-email','hashed-code-2','a2',1000,1600);
    challenge.run('challenge-b1','test-round-b','hashed-verified-email','hashed-code-3','b1',1000,1600);
    const vote=db.prepare('INSERT INTO votes(id,round_id,contestant_id,voter_hash,created_at,challenge_id) VALUES(?,?,?,?,?,?)');
    vote.run('test-vote-a1','test-round-a','a1','hashed-verified-email',1200,'challenge-a1');
    assert.throws(()=>vote.run('test-vote-a2','test-round-a','a2','hashed-verified-email',1200,'challenge-a2'),/UNIQUE constraint failed/);
    vote.run('test-vote-b1','test-round-b','b1','hashed-verified-email',1200,'challenge-b1');
    const saved=db.prepare('SELECT COUNT(*) AS total FROM votes').get();
    assert.equal(saved.total,2);
  }finally{db.close()}
});
