// STAGING delivery adapters only. No API keys, inboxes or provider responses are logged.
// Resend is restricted to a single approved test recipient until a sender domain is verified.
const sandbox=env=>typeof env.STAGING_MAILGUN_DOMAIN==='string'&&/^sandbox[a-z0-9]+\.mailgun\.org$/.test(env.STAGING_MAILGUN_DOMAIN);
const emailAddress=v=>typeof v==='string'&&/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/.test(v);
export function mailProviderReady(env){
 if(env.STAGING_EMAIL_PROVIDER==='mailgun')return sandbox(env)&&
  typeof env.STAGING_MAILGUN_API_KEY==='string'&&env.STAGING_MAILGUN_API_KEY.length>=32&&
  ['us','eu'].includes(env.STAGING_MAILGUN_REGION||'us');
 if(env.STAGING_EMAIL_PROVIDER==='resend')return typeof env.STAGING_RESEND_API_KEY==='string'&&
  /^re_[A-Za-z0-9_-]{20,}$/.test(env.STAGING_RESEND_API_KEY)&&
  emailAddress(env.STAGING_RESEND_TEST_RECIPIENT);
 if(env.STAGING_EMAIL_PROVIDER&&env.STAGING_EMAIL_PROVIDER!=='cloudflare')return false;
 return typeof env.EMAIL?.send==='function';
}
export function mailSenderReady(env){
 const sender=env.STAGING_FROM_EMAIL;
 if(!emailAddress(sender))return false;
 if(env.STAGING_EMAIL_PROVIDER==='mailgun')return sandbox(env)&&sender.split('@')[1]===env.STAGING_MAILGUN_DOMAIN;
 if(env.STAGING_EMAIL_PROVIDER==='resend'){
  // This app has no verified custom email domain yet. Deliberately do not claim public delivery.
  return sender==='onboarding@resend.dev'&&emailAddress(env.STAGING_RESEND_TEST_RECIPIENT);
 }
 return true;
}
export async function sendTestEmail(env,message){
 if(!mailProviderReady(env)||!mailSenderReady(env)||message.from!==env.STAGING_FROM_EMAIL){
  console.error(JSON.stringify({event:'staging_email_send_failed',category:'configuration_not_ready'}));
  throw Error('test_email_service_unavailable');
 }
 try{
  if(env.STAGING_EMAIL_PROVIDER==='resend'){
   // Fail closed: Resend's shared test sender can send only to the owner's verified email.
   if(typeof message.to!=='string'||message.to.toLowerCase()!==env.STAGING_RESEND_TEST_RECIPIENT.toLowerCase())
    throw Error('test_recipient_not_allowed');
   console.info(JSON.stringify({event:'staging_email_fetch_start',provider:'resend'}));
   const response=await fetch('https://api.resend.com/emails',{
    // Workers supports follow/manual, not redirect:error. Reject 3xx below without following.
    method:'POST',redirect:'manual',credentials:'omit',
    headers:{
     'Authorization':'Bearer '+env.STAGING_RESEND_API_KEY,
     'Content-Type':'application/json',
     'User-Agent':'golden-himal-voice/1.0'
    },
    body:JSON.stringify({from:message.from,to:[message.to],subject:message.subject,text:message.text,html:message.html}),
    signal:AbortSignal.timeout(10000)
   });
   if(!response.ok){
    console.error(JSON.stringify({event:'staging_email_provider_rejected',provider:'resend',httpStatus:response.status}));
    throw Error('rejected');
   }
   const result=await response.json();
   if(typeof result.id!=='string'||!result.id)throw Error('missing_queue_ack');
   console.info(JSON.stringify({event:'staging_email_accepted',provider:'resend'}));
   // Resend accepted the send request; actual inbox delivery requires separate confirmation.
   return;
  }
  if(env.STAGING_EMAIL_PROVIDER!=='mailgun'){await env.EMAIL.send(message);return}
  const host=env.STAGING_MAILGUN_REGION==='eu'?'api.eu.mailgun.net':'api.mailgun.net';
  const body=new FormData();
  for(const key of ['from','to','subject','text','html'])body.set(key,message[key]);
  for(const key of ['o:tracking','o:tracking-clicks','o:tracking-opens','o:skip-verification'])body.set(key,'no');
  body.set('o:require-tls','yes');
  const response=await fetch('https://'+host+'/v3/'+env.STAGING_MAILGUN_DOMAIN+'/messages',{
   method:'POST',redirect:'manual',headers:{Authorization:'Basic '+btoa('api:'+env.STAGING_MAILGUN_API_KEY)},
   body,signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('rejected');
  const result=await response.json();if(typeof result.id!=='string'||!result.id)throw Error('missing_queue_ack');
  // Queued is provider acceptance, not proof that an inbox received the email.
 }catch(error){
  // Only emit fixed diagnostic categories: never log addresses, OTPs, API keys, request bodies or provider responses.
  const category=error instanceof Error&&['rejected','missing_queue_ack','test_recipient_not_allowed'].includes(error.message)
   ? error.message:'transport_or_unknown_error';
  console.error(JSON.stringify({event:'staging_email_send_failed',provider:env.STAGING_EMAIL_PROVIDER||'cloudflare',category}));
  throw Error('test_email_service_unavailable');
 }
}
