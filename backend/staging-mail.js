// STAGING delivery adapters only. No API keys, inboxes or provider responses are logged.
const sandbox=env=>typeof env.STAGING_MAILGUN_DOMAIN==='string'&&/^sandbox[a-z0-9]+\.mailgun\.org$/.test(env.STAGING_MAILGUN_DOMAIN);
export function mailProviderReady(env){
 if(env.STAGING_EMAIL_PROVIDER==='mailgun')return sandbox(env)&&
  typeof env.STAGING_MAILGUN_API_KEY==='string'&&env.STAGING_MAILGUN_API_KEY.length>=32&&
  ['us','eu'].includes(env.STAGING_MAILGUN_REGION||'us');
 if(env.STAGING_EMAIL_PROVIDER&&env.STAGING_EMAIL_PROVIDER!=='cloudflare')return false;
 return typeof env.EMAIL?.send==='function';
}
export function mailSenderReady(env){
 const sender=env.STAGING_FROM_EMAIL;
 if(typeof sender!=='string'||!/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/.test(sender))return false;
 return env.STAGING_EMAIL_PROVIDER!=='mailgun'||(sandbox(env)&&sender.split('@')[1]===env.STAGING_MAILGUN_DOMAIN);
}
export async function sendTestEmail(env,message){
 if(!mailProviderReady(env)||!mailSenderReady(env)||message.from!==env.STAGING_FROM_EMAIL)throw Error('test_email_service_unavailable');
 try{
  if(env.STAGING_EMAIL_PROVIDER!=='mailgun'){await env.EMAIL.send(message);return}
  const host=env.STAGING_MAILGUN_REGION==='eu'?'api.eu.mailgun.net':'api.mailgun.net';
  const body=new FormData();
  for(const key of ['from','to','subject','text','html'])body.set(key,message[key]);
  for(const key of ['o:tracking','o:tracking-clicks','o:tracking-opens','o:skip-verification'])body.set(key,'no');
  body.set('o:require-tls','yes');
  const response=await fetch('https://'+host+'/v3/'+env.STAGING_MAILGUN_DOMAIN+'/messages',{
   method:'POST',redirect:'error',headers:{Authorization:'Basic '+btoa('api:'+env.STAGING_MAILGUN_API_KEY)},
   body,signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('rejected');
  const result=await response.json();if(typeof result.id!=='string'||!result.id)throw Error('missing_queue_ack');
  // Queued is provider acceptance, not proof that an inbox received the email.
 }catch{throw Error('test_email_service_unavailable')}
}
