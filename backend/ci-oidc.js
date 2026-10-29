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
export async function verifyCiIdentity(token,{fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}){
  if(typeof token!=='string'||token.length>12000||token.length<100) return false;
  const parts=token.split('.');
  if(parts.length!==3)return false;
  try {
    const [header,claims]=parts.slice(0,2).map(decodeJson);
    if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||
       header.kid.length>200)return false;
    if(claims.iss!==ISSUER||claims.aud!==AUDIENCE)return false;
    for(const [field,expect] of Object.entries(TRUST)){
      if(String(claims[field])!==expect)return false;
    }
    if(!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||
      claims.iat>now+30||claims.iat<now-600||
      claims.exp<=now||claims.exp>now+650||
      (claims.nbf!=null&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30)))return false;
    // The JWKS URI is pinned to the trusted GitHub issuer: no user-supplied URLs.
    const response=await fetchImpl(JWKS,{
      headers:{Accept:'application/json'},
      redirect:'error',signal:AbortSignal.timeout(4500)
    });
    if(!response.ok)return false;
    const {keys}=await response.json();
    if(!Array.isArray(keys))return false;
    const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&
      k.use==='sig'&&(k.alg==null||k.alg==='RS256'));
    if(!jwk)return false;
    const key=await crypto.subtle.importKey('jwk',jwk,
      {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
      signatureBytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  }catch{return false}
}
export const ciTestAudience=AUDIENCE;
