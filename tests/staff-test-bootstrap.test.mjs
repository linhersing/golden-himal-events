import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const deploy=readFileSync(new URL('../scripts/deploy-staff-test.mjs',import.meta.url),'utf8');
const inventory=deploy.match(/const existing=d1Rows\("([^"]+)"/)[1];

test('fresh remote D1 system table does not suppress TEST bootstrap',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE _cf_KV(key TEXT PRIMARY KEY, value BLOB)');
  assert.equal(db.prepare(inventory).get().n,0);
 }finally{db.close()}
});

test('any application or unknown table still prevents empty TEST bootstrap',()=>{
 for(const name of ['e2e_accounts','external_data','_cf_unknown']){
  const db=new DatabaseSync(':memory:');
  try{
   db.exec('CREATE TABLE _cf_KV(key TEXT PRIMARY KEY, value BLOB)');
   db.exec('CREATE TABLE '+name+'(id INTEGER PRIMARY KEY AUTOINCREMENT)');
   assert.equal(db.prepare(inventory).get().n,1);
  }finally{db.close()}
 }
});

