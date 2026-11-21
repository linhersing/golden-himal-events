/* Public error codes only. Shared by classic member/staff/password scripts.
 * No token, sitekey, mailbox or device identifier is accepted or retained.
 * Reference: developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
 */
(()=>{'use strict';
 function humanVerificationError(value){
  const raw=typeof value==='string'||typeof value==='number'?String(value):'';
  const code=raw.length===6&&/^\d{6}$/.test(raw)?raw:'';
  let key='signupHumanBlocked',retryable=true;
  if(['110200','400021'].includes(code)){key='signupHumanDomain';retryable=false;}
  else if(['110100','110110','400020','400070'].includes(code)){key='signupHumanConfiguration';retryable=false;}
  else if(['110600','110620'].includes(code))key='signupHumanExpired';
  else if(code==='200100')key='signupHumanClock';
  else if(/^[36]\d{5}$/.test(code))key='signupHumanFailed';
  return {key,code,retryable};
 }
 globalThis.GHVHumanVerification=Object.freeze({humanVerificationError});
})();
