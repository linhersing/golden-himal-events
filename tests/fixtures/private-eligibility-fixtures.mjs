import {createHmac} from 'node:crypto';
export const HOST='http://localhost';
export const applicationId='11111111-2222-4333-8444-555555555555';
export const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=','base64'));
export const files=['1000_e2e_staging_acceptance_ONLY.sql','1007_test_application_approval_STAGING_ONLY.sql','1011_frontline_2027_registration_STAGING_ONLY.sql','1019_private_eligibility_documents_STAGING_ONLY.sql'];
export const accounts={owner:{id:'fictional-member-a',mail:'first@example.invalid',token:'a'.repeat(64),role:'member'},other:{id:'fictional-member-b',mail:'other@example.invalid',token:'b'.repeat(64),role:'member'},reviewer:{id:'fictional-reviewer',mail:'reviewer@example.invalid',token:'c'.repeat(64),role:'reviewer'},organizer:{id:'fictional-organizer',mail:'organizer@example.invalid',token:'d'.repeat(64),role:'organizer'}};
export const identity='test-only-fictional-eligibility-worker';
export const hash=value=>createHmac('sha256',identity).update(value).digest('hex');
export const envVars={STAGING_E2E_ENABLED:'true',STAGING_IDENTITY_SECRET:identity,STAGING_PASSWORD_SIGNUP_ENABLED:'true',
 STAGING_ALLOWED_EMAILS:[accounts.owner.mail,accounts.other.mail].join(','),STAGING_REVIEWER_EMAILS:accounts.reviewer.mail,STAGING_ORGANIZER_EMAILS:accounts.organizer.mail,
 ELIGIBILITY_TEST_MODE:'synthetic',ELIGIBILITY_RETENTION_SECONDS:'300',ELIGIBILITY_TEST_ACCOUNT_IDS:Object.values(accounts).map(a=>a.id).join(',')};
export const seed=[
 ...Object.values(accounts).flatMap(a=>[
  ['INSERT INTO e2e_accounts VALUES(?,?,?,?,?,?)',[a.id,hash('email:'+a.mail),'fixture',a.role,1,1]],
  ['INSERT INTO e2e_sessions VALUES(?,?,?,?)',[hash('session:'+a.token),a.id,4102444800,1]]
 ]),
 ["INSERT INTO e2e_applications(id,account_id,round_code,category,province,location_basis,affiliation,stage_name,song_title,original_artist,song_language,song_key,created_at,updated_at) VALUES(?,?,'2027-01','community','bagmati','work','fixture','fixture','fixture','fixture','ne','C',1,1)",[applicationId,accounts.owner.id]],
 ["INSERT INTO e2e_frontline_2027_registration VALUES(?,'B','graduated',1)",[applicationId]],
 ['INSERT INTO e2e_test_application_approvals VALUES(?,?,?)',[applicationId,accounts.organizer.id,1]]
];
export function request(path,{role='owner',method='GET',revision='none',key=crypto.randomUUID(),body,type='image/png',host=HOST,origin=host}={}){
 const headers={};
 if(role)headers.Cookie='__Host-ghv-e2e='+accounts[role].token;
 if(method!=='GET')Object.assign(headers,{Origin:origin,'If-Match':'"'+revision+'"'});
 if(body)Object.assign(headers,{'Content-Type':type,'Idempotency-Key':key,'X-Eligibility-Test-Consent':'yes'});
 return new Request(host+'/api/e2e/eligibility-document'+path+'?id='+applicationId,{method,headers,body});
}
