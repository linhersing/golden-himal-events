import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {handleE2E} from '../../backend/staging-e2e.js';

export function bulkFixture(count=23){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql','1009_test_video_supplements_STAGING_ONLY.sql','1014_demo_five_2027_STAGING_ONLY.sql','1016_january_demo_test_rosters_ONLY.sql','1017_staff_auth_limits_STAGING_ONLY.sql','1018_admin_registration_audit_STAGING_ONLY.sql'])sqlite.exec(readFileSync(new URL('../../backend/migrations/'+file,import.meta.url),'utf8'));
 let fail=false;
 const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}},execute(){return sqlite.prepare(sql).columns().length?this.all():this.run()}}},batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());if(fail)throw Error('fixture transaction failure');sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const identity='fictional-bulk-administration-secret-only',host='https://example.invalid',hash=s=>createHmac('sha256',identity).update(s).digest('hex');
 const roles={organizer:'organizer',other:'organizer',reviewer:'reviewer',member:'member'},tokens={};
 for(const [id,role] of Object.entries(roles)){
  tokens[id]=hash(id);sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(id,hash('email:'+id+'@example.invalid'),'fixture',role,1,1);
  sqlite.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash((role==='member'?'session:':'staff-session:')+tokens[id]),id,4102444800,1);
 }
 const env={DB,STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:identity,STAGING_PASSWORD_SIGNUP_ENABLED:'true',STAGING_STAFF_TURNSTILE_REQUIRED:'true',STAGING_ADMIN_MANAGEMENT_ENABLED:'true',STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',STAGING_ORGANIZER_EMAILS:'organizer@example.invalid,other@example.invalid',STAGING_REVIEWER_EMAILS:'reviewer@example.invalid',STAGING_ALLOWED_EMAILS:'member@example.invalid'};
 const ids=[];
 function add(index){
  const id='02000000-0000-4000-8000-'+String(index).padStart(12,'0'),account='entrant-'+index;
  sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(account,hash(account),'fixture','member',1,1);
  sqlite.prepare("INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,demo_url,phase,status,created_at,updated_at) VALUES(?,?,'2027-01','community','bagmati','work','TEST College',?,'TEST Song','TEST Artist','Nepali','Unknown','https://youtu.be/TEST_BULK01',?,?,1,1)").run(id,account,'TEST Singer '+index,index===2?'final':'demo',index===2?'shortlisted':'submitted');
  for(let position=1;position<=([1,3,5][index%3]);position++)sqlite.prepare('INSERT INTO e2e_demo_2027_videos VALUES(?,?,?,?,?,?,?)').run(id,position,'TEST Song '+position,'TEST Artist','Nepali','https://youtu.be/TEST_BULK0'+position,1);
  return id;
 }
 for(let index=1;index<=count;index++)ids.push(add(index));
 if(ids.length)sqlite.prepare('INSERT INTO e2e_judge_scores VALUES(?,?,55,35,1,1)').run(ids[0],'reviewer');
 const call=(operation,extra={},role='organizer',origin=host)=>handleE2E(new Request(host+'/api/e2e/organizer-registration-bulk',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(tokens[role]?{Cookie:'__Host-ghv-e2e='+tokens[role]}:{})},body:JSON.stringify({operation,...extra})}),env);
 return {sqlite,env,ids,add,call,setFail:value=>{fail=value},close:()=>sqlite.close()};
}
