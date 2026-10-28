import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

test('one verified person cannot receive 20 credentials or cast 20 votes by rotating emails',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  try{
    for(const file of ['0001_core.sql','0002_eligibility_credentials.sql']){
      db.exec(await readFile(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
    }
    db.prepare("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES(?,?,?,?,?)")
      .run('demo-round','Demo round',100,20000,'open');
    db.prepare('INSERT INTO contestants(id,round_id,public_name,approved) VALUES(?,?,?,?)')
      .run('approved-artist','demo-round','Artist',1);
    const issue=db.prepare("INSERT INTO voter_eligibilities(id,round_id,eligibility_hash,credential_hash,issued_at,issued_by,eligibility_method) VALUES(?,?,?,?,?,?,?)");
    const cast=db.prepare('INSERT INTO credential_votes(id,round_id,contestant_id,eligibility_id,cast_at) VALUES(?,?,?,?,?)');
    // One human passes verification ONCE even with 20 emails. The verified identity
    // digest must be HMAC-derived from an independent eligibility authority, not email.
    issue.run('ticket-1','demo-round','same-person-hmac','token-hash-1',1000,'authorised-staff','on_site_checked');
    for(let i=2;i<=20;i++){
      assert.throws(()=>issue.run('ticket-'+i,'demo-round','same-person-hmac','token-hash-'+i,1000,'authorised-staff','on_site_checked'),
        /UNIQUE constraint failed/);
    }
    cast.run('valid-vote-1','demo-round','approved-artist','ticket-1',1100);
    for(let i=2;i<=20;i++){
      assert.throws(()=>cast.run('fake-vote-'+i,'demo-round','approved-artist','ticket-1',1100),
        /UNIQUE constraint failed/);
    }
    assert.equal(db.prepare('SELECT count(*) total FROM voter_eligibilities').get().total,1);
    assert.equal(db.prepare('SELECT count(*) total FROM credential_votes').get().total,1);
  }finally{db.close()}
});

test('eligibility revocation, round mismatch and closed rounds reject votes',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  try{
    for(const file of ['0001_core.sql','0002_eligibility_credentials.sql']){
      db.exec(await readFile(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
    }
    db.prepare("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES('round-one','round one',100,20000,'open')").run();
    db.prepare("INSERT INTO rounds(id,label,opens_at,closes_at,state) VALUES('round-two','round two',100,20000,'open')").run();
    db.prepare("INSERT INTO contestants(id,round_id,public_name,approved) VALUES('artist-1','round-one','Artist One',1)").run();
    db.prepare("INSERT INTO contestants(id,round_id,public_name,approved) VALUES('artist-2','round-two','Artist Two',1)").run();
    db.prepare("INSERT INTO voter_eligibilities(id,round_id,eligibility_hash,credential_hash,issued_at,issued_by,eligibility_method) VALUES('ticket-1','round-one','hmac-one','tok-1',100,'admin','remote_reviewed')").run();
    const cast=db.prepare('INSERT INTO credential_votes(id,round_id,contestant_id,eligibility_id,cast_at) VALUES(?,?,?,?,?)');
    assert.throws(()=>cast.run('wrong-round','round-two','artist-2','ticket-1',1000),/credential_not_eligible/);
    db.prepare("UPDATE voter_eligibilities SET state='revoked' WHERE id='ticket-1'").run();
    assert.throws(()=>cast.run('revoked','round-one','artist-1','ticket-1',1000),/credential_not_eligible/);
    db.prepare("UPDATE voter_eligibilities SET state='issued' WHERE id='ticket-1'").run();
    db.prepare("UPDATE rounds SET state='closed' WHERE id='round-one'").run();
    assert.throws(()=>cast.run('closed','round-one','artist-1','ticket-1',1000),/credential_not_eligible/);
    assert.equal(db.prepare('SELECT count(*) total FROM credential_votes').get().total,0);
  }finally{db.close()}
});
