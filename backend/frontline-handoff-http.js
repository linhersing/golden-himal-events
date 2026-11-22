import {handleE2E,account} from './staging-e2e.js';
import {frontlineHandoff} from './frontline-manual-handoff.js';
const json=(body,status)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function handleFrontlineHandoff(request,env){
 if(env.STAGING_FRONTLINE_HANDOFF_ENABLED!=='true')return json({ok:false,error:'isolated_test_required'},404);
 const url=new URL(request.url);
 if(!['GET','POST'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);
 if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')))return json({ok:false,error:'origin_or_type_not_allowed'},403);
 const auth=await handleE2E(new Request(new URL('/api/e2e/me',url),{headers:request.headers}),{...env,DB:env.E2E_DB});
 if(!auth.ok)return json({ok:false,error:'login_required'},401);
 const actor=await account(request,{...env,DB:env.E2E_DB});
 if(actor?.role!=='organizer')return json({ok:false,error:'organizer_only'},403);
 let body;
 try{
  if(request.method==='GET')body={operation:'list',page:Number(url.searchParams.get('page')||0)};
  else{
   if(Number(request.headers.get('Content-Length')||0)>6000)return json({ok:false,error:'request_too_large'},413);
   const reader=request.body?.getReader(),chunks=[];let length=0;
   if(reader)try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>6000){void reader.cancel().catch(()=>{});return json({ok:false,error:'request_too_large'},413)}chunks.push(part.value)}}finally{reader.releaseLock()}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}body=JSON.parse(new TextDecoder().decode(bytes));
  }
 }catch{return json({ok:false,error:'invalid_json'},422)}
 const result=await frontlineHandoff(env.E2E_DB,actor,body);return json(result,result.status||503);
}
