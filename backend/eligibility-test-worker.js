import {handleE2E} from './staging-e2e.js';
import {cleanupEligibility,handleEligibility,syntheticReady} from './eligibility-documents.js';

const route='/api/e2e/eligibility-document';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const fail=(error,status)=>Response.json({ok:false,error},{status,headers});

// Isolated loopback test worker only. The site's regular Worker never imports it.
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!syntheticReady(url,env))return fail('not_found',404);
  if(request.method==='GET'&&['/eligibility-test.html','/eligibility-test.css','/eligibility-test.js'].includes(url.pathname)&&env.ELIGIBILITY_TEST_ASSETS){
   const asset=await env.ELIGIBILITY_TEST_ASSETS.fetch(request);
   const safe=new Headers(asset.headers);
   for(const [key,value] of Object.entries(headers))safe.set(key,value);
   safe.set('Content-Security-Policy',"default-src 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
   safe.set('Referrer-Policy','no-referrer');
   return new Response(asset.body,{status:asset.status,headers:safe});
  }
  if(![route,route+'/download'].includes(url.pathname))return fail('not_found',404);
  try{
   const cookies=request.headers.get('cookie');
   const session=await handleE2E(new Request(new URL('/api/e2e/me',url),{headers:cookies?{Cookie:cookies}:{}}),{...env,DB:env.ELIGIBILITY_TEST_D1});
   if(session.status===401)return fail('login_required',401);
   if(!session.ok)return fail('eligibility_test_unavailable',503);
   return await handleEligibility(request,env,(await session.json()).account);
  }catch{return fail('eligibility_test_unavailable',503);}
 },
 async scheduled(_event,env){
  if(syntheticReady(new URL('http://localhost'),env))await cleanupEligibility(env);
 }
};
