import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

test('draft 2027 season registration: one category per year, no duplicate per round, finalist locked',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 try{
  db.exec(await readFile(new URL('../backend/migrations/0003_season_registrations.sql',import.meta.url),'utf8'));
  const addRound=db.prepare('INSERT INTO season_rounds(id,season_year,round_key,round_type) VALUES(?,?,?,?)');
  addRound.run('q1',2027,'march','qualifier');
  addRound.run('q2',2027,'june','qualifier');
  const addYear=db.prepare('INSERT INTO applicant_year_registry(season_year,applicant_hash,category) VALUES(?,?,?)');
  addYear.run(2027,'a-vetted-identity-hash','university');
  const addReg=db.prepare('INSERT INTO registrations(id,season_round_id,season_year,applicant_hash,category,stage_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  addReg.run('a-march','q1',2027,'a-vetted-identity-hash','university','Demo Singer',100,100);
  assert.throws(()=>addReg.run('a-repeat','q1',2027,'a-vetted-identity-hash','university','Demo Singer',101,101),/UNIQUE/);
  assert.throws(()=>addReg.run('a-mismatch','q2',2027,'a-vetted-identity-hash','community','Demo Singer',101,101),/category_conflict/);
  addReg.run('a-june','q2',2027,'a-vetted-identity-hash','university','Demo Singer',102,102);
  db.prepare('UPDATE applicant_year_registry SET finalist_locked=1 WHERE applicant_hash=?').run('a-vetted-identity-hash');
  assert.throws(()=>addReg.run('a-locked','q2',2027,'a-vetted-identity-hash','university','Demo Singer',103,103),/category_conflict_or_finalist_locked|UNIQUE/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM registrations WHERE applicant_hash='a-vetted-identity-hash'").get().n,2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM registrations WHERE payment_status='confirmed'").get().n,0);
 }finally{db.close()}
});
