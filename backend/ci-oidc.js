// GitHub Actions OIDC verifier for a ONE-FIXTURE staging-only smoke test.
// No Cloudflare API token or long-lived secret is placed in GitHub.
const ISSUER='https://token.actions.githubusercontent.com';
const JWKS='https://token.actions.githubusercontent.com/.well-known/jwks';
const AUDIENCE='ghv-d1-staging-smoke';
const TRUST={
  repository:'linhersing/golden-himal-events',
  repository_id:'1406943966',
  ref:'refs/heads/codex/initial-site',
  event_name:'push',
  workflow_ref:'linhersing/golden-himal-events/.github/workflows/live-d1-smoke.yml@refs/heads/codex/initial-site'
};
function decodeJson(b64url) {
  if(!/^[A-Za-z0-9_-]{1,16000}$/.test(b64url))throw new Error('invalid_base64url');
  const str=atob(b64url.replace(/-/g,'+').replace(/_/g,'/')+
    '='.repeat((4-b64url.length%4)%4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(str,c=>c.charCodeAt(0))));
}
function signatureBytes(encoded) {
  if(!/^[A-Za-z0-9_-]{64,15000}$/.test(encoded))throw new Error('invalid_signature');
  const str=atob(encoded.replace(/-/g,'+').replace(/_/g,'/')+
    '='.repeat((4-encoded.length%4)%4));
  return Uint8Array.from(str,c=>c.charCodeAt(0));
}
export async function verifyCiIdentity(token,{
  fetchImpl=fetch,now=Math.floor(Date.now()/1000),onFailure=null
}={}){
  const reject=reason=>{onFailure?.(reason);return false};
  if(typeof token!=='string'||token.length>12000||token.length<100) return reject('invalid_shape');
  const parts=token.split('.');
  if(parts.length!==3)return reject('invalid_structure');
  let stage='decode';
  try {
    const [header,claims]=parts.slice(0,2).map(decodeJson);
    if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||
       header.kid.length>200)return reject('invalid_header');
    if(claims.iss!==ISSUER||claims.aud!==AUDIENCE)return reject('issuer_or_audience');
    for(const [field,expect] of Object.entries(TRUST)){
      if(String(claims[field])!==expect)return reject('claim_'+field);
    }
    if(!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||
      claims.iat>now+30||claims.iat<now-600||
      claims.exp<=now||claims.exp>now+650||
      (claims.nbf!=null&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30)))
      return reject('time_window');
    stage='jwks_fetch';
    const response=await fetchImpl(JWKS,{headers:{Accept:'application/json'}});
    if(response.url && new URL(response.url).origin!=='https://token.actions.githubusercontent.com')
      return reject('jwks_untrusted_redirect');
    if(!response.ok)return reject('jwks_http_'+response.status);
    stage='jwks_parse';
    const {keys}=await response.json();
    if(!Array.isArray(keys))return reject('jwks_format');
    const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&
      k.use==='sig'&&(k.alg==null||k.alg==='RS256'));
    if(!jwk)return reject('jwks_kid_missing');
    stage='crypto_import';
    const key=await crypto.subtle.importKey('jwk',jwk,
      {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    stage='crypto_verify';
    const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
      signatureBytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
    return good||reject('invalid_signature');
  }catch(error){return reject(stage+'_'+(error?.name||'Error')+'_'+String(error?.message||'').slice(0,120).replace(/[^a-zA-Z0-9_-]/g,'_'))}
}
export const ciTestAudience=AUDIENCE;
