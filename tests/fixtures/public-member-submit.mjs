import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {handleE2E} from '../../backend/staging-e2e.js';
export function publicMemberFixture(){
 const sqlite=new DatabaseSync(':memory:');
  const dir=new URL('../../backend/migrations/',import.meta.url);
  for(const name of readdirSync(dir).filter(n=>/^10(?:00|03|04|05|07|09|10|11|12|13|14|15|16|17|18)_.*\.sql$/.test(n)).sort())sqlite.exec(readFileSync(new URL(name,dir),'utf8'));
  const DB={prepare(sql){let values=[];return {bind(...v){values=v;return this},first(){return sqlite.prepare(sql).get(...values)},all(){return {results:sqlite.prepare(sql).all(...values)}},run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}}},batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
  const secret='fictional-public-signup-regression-identity-only';
  const hash=value=>createHmac('sha256',secret).update(value).digest('hex');
  const env={DB,STAGING_IDENTITY_SECRET:secret,STAGING_E2E_ENABLED:'true',STAGING_PUBLIC_SIGNUP_ENABLED:'true',STAGING_TEST_APPROVAL_ENABLED:'true',STAGING_SUBMISSION_MODE:'links',STAGING_FRONTLINE_2027_ENABLED:'true',STAGING_FIVE_DEMO_REHEARSAL:'true',STAGING_MUSE_AUDITION_ENABLED:'true',STAGING_EMAIL_PROVIDER:'resend',STAGING_RESEND_API_KEY:'re_fictional_public_regression_only',STAGING_RESEND_VERIFIED_DOMAIN:'mail.example.org',STAGING_FROM_EMAIL:'test@mail.example.org',STAGING_TURNSTILE_SITE_KEY:'0xfictionalpublicsitekey',STAGING_TURNSTILE_SECRET_KEY:'0xfictionalpublicsecret'};
  const host='https://example.invalid';
  const call=(person,body,path='applications')=>handleE2E(new Request(host+'/api/e2e/'+path,{method:body?'POST':'GET',headers:{Cookie:'__Host-ghv-e2e='+hash(person),...(body?{Origin:host,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);

 const id='public-browser',mailbox=hash('email:'+id+'@example.invalid');
 sqlite.prepare('INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)').run(id,mailbox,'fixture','member',1,1);
 sqlite.prepare('INSERT INTO e2e_public_signup_accounts(account_id,mailbox_fingerprint) VALUES(?,?)').run(id,mailbox);
 sqlite.prepare('INSERT INTO e2e_sessions VALUES(?,?,?,?)').run(hash('session:'+hash(id)),id,9999999999,1);
 return {sqlite,call:(body,path)=>call(id,body,path),close:()=>sqlite.close()};
}
