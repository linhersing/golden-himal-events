import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

const module=await import('../backend/frontline-finalist-preview.js').catch(error=>{
 if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;
});
const actor={id:'organizer',role:'organizer'};
const id=n=>`01000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const input={application_ids:Array.from({length:10},(_,i)=>id(i+1)),source_reference:'frontline-paper-20261121'};
const preview=(...args)=>{assert.equal(typeof module.previewFrontlineFinalists,'function','read-only finalist preview module must exist');return module.previewFrontlineFinalists(...args)};

async function fixture(t){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 for(const name of ['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql',
  '1011_frontline_2027_registration_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql',
  '1016_january_demo_test_rosters_ONLY.sql','1018_admin_registration_audit_STAGING_ONLY.sql'])
  sqlite.exec(await readFile(new URL('../backend/migrations/'+name,import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(actor.id,'TEST organizer fingerprint','PRIVATE organizer hint','organizer',1,1);
 for(let n=1;n<=10;n++){
  sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run('member-'+n,'TEST fingerprint '+n,'PRIVATE member hint','member',1,1);
  sqlite.prepare(`INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,
   song_title,original_artist,song_language,song_key,demo_url,created_at,updated_at) VALUES(?,?,'2027-01','community',
   'gandaki','residence','PRIVATE school','TEST identical stage name','PRIVATE song','PRIVATE artist','Nepali','C','https://youtu.be/TEST_video',1,1)`)
   .run(id(n),'member-'+n);
  sqlite.prepare('INSERT INTO e2e_frontline_2027_registration VALUES(?,?,?,?)').run(id(n),n<=5?'A':'B','graduated',1);
  sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,?)').run(id(n),actor.id,1);
 }
 const queries=[];
 const db={prepare(sql){queries.push(sql);let args=[];return {bind(...values){args=values;return this},
  all(){return {results:sqlite.prepare(sql).all(...args)}},run(){throw Error('Preview attempted a write')}}}};
 const snapshot=()=>JSON.stringify(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
  .map(({name})=>[name,sqlite.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
 return {sqlite,db,queries,snapshot};
}

test('10 explicit IDs with 5A/5B produce only a stable read-only TEST manifest, preserving every DB row',async t=>{
 const f=await fixture(t),before=f.snapshot();const result=await preview(f.db,actor,input);
 assert.equal(result.ok,true);assert.equal(result.mode,'PREVIEW_ONLY');assert.equal(result.blocked,false);
 assert.equal(result.qualification_established,false);assert.equal(result.mutation_allowed,false);
 assert.equal(result.manifest.eligibility_scope,'existing_test_approval_only');
 assert.deepEqual(result.region_counts,{A:5,B:5});assert.deepEqual(result.blocking_reasons,[]);
 assert.equal(result.manifest.entries.length,10);assert.equal(result.manifest.entries[0].application_id,id(1));
 assert.equal(result.fingerprint,createHash('sha256').update(JSON.stringify(result.manifest)).digest('hex'));
 assert.equal(f.snapshot(),before);assert.equal(f.queries.length,1);assert.match(f.queries[0],/^SELECT\s/);
 assert.doesNotMatch(f.queries[0],/score|email|contact|affiliation|stage_name|song_title/i);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|TEST identical stage name|member-/);
});

for(const role of [undefined,'member','reviewer'])test(`role ${role??'missing'} is rejected before DB access`,async()=>{
 let reads=0;const db={prepare(){reads++;throw Error('must not query')}};
 const result=await preview(db,role?{id:'other',role}:null,input);
 assert.equal(result.ok,false);assert.equal(result.status,role?403:401);assert.equal(reads,0);
 if(!role){assert.equal((await preview(db,{role:'organizer'},input)).status,401);assert.equal(reads,0);}
});

for(const [name,body] of Object.entries({
 null:null,array:[],extra:{...input,publish:true},empty:{...input,application_ids:[]},
 tooMany:{...input,application_ids:Array.from({length:11},(_,i)=>id(i+1))},
 names:{...input,application_ids:['TEST identical stage name']},
 sql:{...input,application_ids:["x') OR 1=1 --"]},missingSource:{application_ids:input.application_ids},
 privateSource:{...input,source_reference:'person@example.invalid'},
 pathSource:{...input,source_reference:'C:\\PRIVATE\\paper.pdf'}
}))test(`malformed ${name} input is rejected before querying`,async()=>{
 let reads=0;const result=await preview({prepare(){reads++;throw Error('must not query')}},actor,body);
 assert.equal(result.ok,false);assert.equal(result.status,422);assert.equal(reads,0);
});

test('duplicate application IDs return explicit blockers without reading or counting the duplicate twice',async t=>{
 const f=await fixture(t),result=await preview(f.db,actor,{...input,application_ids:[id(1),id(1)]});
 assert.equal(result.status,422);assert.deepEqual(result.blocking_reasons,[{code:'duplicate_application_id',application_id:id(1)}]);
 assert.equal(f.queries.length,0);
});

test('incomplete selection reports total and region conflicts; same stage names never deduplicate IDs',async t=>{
 const f=await fixture(t),result=await preview(f.db,actor,{...input,application_ids:[id(1),id(6)]});
 assert.equal(result.blocked,true);assert.equal(result.manifest.entries.length,2);assert.deepEqual(result.region_counts,{A:1,B:1});
 assert.deepEqual(result.blocking_reasons.map(r=>r.code),['selected_count_conflict','region_count_conflict','region_count_conflict']);
});

test('missing, inactive, withdrawn, rejected, unapproved and missing region are reported without writes',async t=>{
 const f=await fixture(t);
 f.sqlite.prepare('DELETE FROM e2e_applications WHERE id=?').run(id(1));
 f.sqlite.prepare("INSERT INTO e2e_registration_controls VALUES(?,'disabled','submitted',1,'TEST control')").run(id(2));
 f.sqlite.prepare("UPDATE e2e_applications SET status='withdrawn' WHERE id=?").run(id(3));
 f.sqlite.prepare("UPDATE e2e_applications SET status='rejected' WHERE id=?").run(id(4));
 f.sqlite.prepare('DELETE FROM e2e_test_application_approvals WHERE application_id=?').run(id(5));
 f.sqlite.prepare('DELETE FROM e2e_frontline_2027_registration WHERE application_id=?').run(id(6));
 const before=f.snapshot(),result=await preview(f.db,actor,input),codes=result.blocking_reasons.map(r=>r.code);
 for(const code of ['application_missing','registration_inactive','application_withdrawn','application_rejected','test_approval_missing','competition_region_missing','region_count_conflict'])assert(codes.includes(code),code);
 assert.equal(result.blocked,true);assert.equal(f.snapshot(),before);
 assert.deepEqual(result.manifest.entries[0],{application_id:id(1),found:false});
});

test('6A/4B blocks the paper preview even when all ten entries have TEST approval',async t=>{
 const f=await fixture(t);f.sqlite.prepare("UPDATE e2e_frontline_2027_registration SET competition_region='A' WHERE application_id=?").run(id(6));
 const result=await preview(f.db,actor,input);assert.equal(result.blocked,true);assert.deepEqual(result.region_counts,{A:6,B:4});
 assert.deepEqual(result.blocking_reasons,[{code:'region_count_conflict',competition_region:'A',expected:5,actual:6},
  {code:'region_count_conflict',competition_region:'B',expected:5,actual:4}]);
});

test('same entrant represented by different applications blocks without exposing the account identifier',async t=>{
 const f=await fixture(t);f.sqlite.prepare("UPDATE e2e_applications SET account_id='member-1',round_code='2027-04' WHERE id=?").run(id(2));
 const result=await preview(f.db,actor,input);
 assert(result.blocking_reasons.some(r=>r.code==='duplicate_entrant'&&JSON.stringify(r.application_ids)===JSON.stringify([id(1),id(2)])));
 assert.doesNotMatch(JSON.stringify(result),/member-1/);
});

test('input order is canonical; source, timestamps, phase, approval and control version change the snapshot fingerprint',async t=>{
 const f=await fixture(t),first=await preview(f.db,actor,input);
 assert.equal((await preview(f.db,actor,{...input,application_ids:[...input.application_ids].reverse()})).fingerprint,first.fingerprint);
 assert.notEqual((await preview(f.db,actor,{...input,source_reference:'frontline-paper-revised'})).fingerprint,first.fingerprint);
 let previous=first.fingerprint;
 for(const sql of ["UPDATE e2e_applications SET updated_at=2 WHERE id=?",
  "UPDATE e2e_applications SET phase='qualifier' WHERE id=?",
  "UPDATE e2e_test_application_approvals SET approved_at=2 WHERE application_id=?",
  "INSERT INTO e2e_registration_controls VALUES(?,'active','submitted',1,'TEST restore')",
  "UPDATE e2e_registration_controls SET version=2 WHERE application_id=?"]){
  f.sqlite.prepare(sql).run(id(1));const next=await preview(f.db,actor,input);assert.notEqual(next.fingerprint,previous);previous=next.fingerprint;
 }
});

test('missing required schema fails closed without leaking database diagnostics or pretending approval',async t=>{
 const f=await fixture(t);f.sqlite.exec('DROP TABLE e2e_test_application_approvals');const before=f.snapshot();
 const result=await preview(f.db,actor,input);
 assert.equal(result.ok,false);assert.equal(result.status,503);assert.equal(result.error,'frontline_preview_unavailable');
 assert.equal(result.mode,'PREVIEW_ONLY');assert.equal(result.qualification_established,false);
 assert.doesNotMatch(JSON.stringify(result),/no such table|SELECT|email|PRIVATE/);assert.equal(f.snapshot(),before);
});

test('score records do not select entrants or affect the manifest',async t=>{
 const f=await fixture(t),before=await preview(f.db,actor,input);
 f.sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run('reviewer','TEST judge fingerprint','PRIVATE hint','reviewer',1,1);
 f.sqlite.prepare('INSERT INTO e2e_judge_scores VALUES(?,?,?,?,1,?)').run(id(1),'reviewer',60,40,1);
 const snapshot=f.snapshot(),after=await preview(f.db,actor,input);
 assert.equal(after.fingerprint,before.fingerprint);assert.deepEqual(after.manifest.entries,before.manifest.entries);
 assert.equal(f.snapshot(),snapshot);
});

test('deleted registrations are explicitly inactive even when their status was not yet withdrawn',async t=>{
 const f=await fixture(t);f.sqlite.prepare("INSERT INTO e2e_registration_controls VALUES(?,'deleted','submitted',1,'TEST deletion')").run(id(1));
 const result=await preview(f.db,actor,input);
 assert(result.blocking_reasons.some(r=>r.code==='registration_inactive'&&r.state==='deleted'&&r.application_id===id(1)));
});

test('SQLite query-only mode accepts preview with unchanged rows and phases',async t=>{
 const f=await fixture(t),before=f.snapshot();f.sqlite.exec('PRAGMA query_only=ON');
 const result=await preview(f.db,actor,input);assert.equal(result.ok,true);assert.equal(f.snapshot(),before);
 assert(f.sqlite.prepare('SELECT phase FROM e2e_applications').all().every(row=>row.phase==='demo'));
});

test('January source preview accepts January and blocks ten approved April entries despite correct region counts',async t=>{
 const f=await fixture(t),january=await preview(f.db,actor,input);
 assert.equal(january.blocked,false);assert.deepEqual(january.blocking_reasons,[]);
 f.sqlite.prepare("UPDATE e2e_applications SET round_code='2027-04'").run();
 const snapshot=f.snapshot(),april=await preview(f.db,actor,input);
 assert.equal(april.blocked,true);assert.deepEqual(april.region_counts,{A:5,B:5});
 assert.deepEqual(april.blocking_reasons,input.application_ids.map(application_id=>({code:'registration_round_conflict',
  application_id,expected:'2027-01',actual:'2027-04'})));
 assert(april.manifest.entries.every(row=>row.round_code==='2027-04'&&row.test_approval_state==='approved'));
 assert.equal(f.snapshot(),snapshot);assert.notEqual(april.fingerprint,january.fingerprint);
});
