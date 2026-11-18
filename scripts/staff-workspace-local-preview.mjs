
import {createServer} from 'node:http';
import {isolatedStaffRuntime} from '../tests/fixtures/staff-workerd.mjs';

const toolsRoot=process.argv[2];
if(!toolsRoot)throw Error('Provide the directory containing the pinned Wrangler test runtime tools.');
const runtime=await isolatedStaffRuntime(process.cwd(),toolsRoot);
const port=4188;
const host='127.0.0.1:'+port;
const server=createServer(async(request,response)=>{
 try{
  if(request.headers.host!==host||
   request.headers.origin&&request.headers.origin!=='http://'+host){
   response.writeHead(403);response.end();return;
  }
  const url=new URL(request.url,'http://'+host);
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  if(url.pathname==='/'){
   response.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});
   response.end('<!doctype html><html lang="zh-Hant"><meta name="viewport" content="width=device-width"><title>Golden Himal Voice 本機隔離 TEST</title><body><h1>本機隔離 TEST</h1><p>20 位虛構選手。此資料庫會於結束測試後移除。</p><p><a href="/__test-role?role=organizer">進入主辦工作台</a></p><p><a href="/__test-role?role=reviewer">進入評審工作台</a></p></body></html>');
   return;
  }
  if(url.pathname==='/__test-role'&&request.method==='GET'){
   const role=url.searchParams.get('role');
   if(!['organizer','reviewer','reviewer-two','member'].includes(role)){
    response.writeHead(400,headers);response.end();return;
   }
   response.writeHead(302,{...headers,Location:'/backoffice.html','Set-Cookie':'ghv-local-fictional-role='+role+'; HttpOnly; SameSite=Strict; Path=/'});
   response.end();return;
  }
  const role=request.headers.cookie?.match(/(?:^|;\s*)ghv-local-fictional-role=(organizer|reviewer|reviewer-two|member)(?:;|$)/)?.[1]||'guest';
  if(url.pathname.startsWith('/api/e2e/')){
   if(!['GET','POST'].includes(request.method)){response.writeHead(405,headers);response.end();return;}
   let body,bytes=0;
   const chunks=[];
   for await(const chunk of request){
    bytes+=chunk.length;
    if(bytes>32768){response.writeHead(413,headers);response.end();return;}
    chunks.push(chunk);
   }
   if(request.method==='POST')body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
   const result=await runtime.fetchFor(role,url.pathname+url.search,body);
   response.writeHead(result.status,{...headers,'Content-Type':'application/json'});
   response.end(JSON.stringify(result.data));return;
  }
  if(request.method!=='GET'){response.writeHead(405,headers);response.end();return;}
  const result=await fetch(runtime.origin+url.pathname+url.search);
  response.writeHead(result.status,{...Object.fromEntries(result.headers),...headers});
  response.end(Buffer.from(await result.arrayBuffer()));
 }catch{response.writeHead(503,{'Cache-Control':'no-store'});response.end('Local TEST unavailable');}
});
server.listen(port,'127.0.0.1',()=>console.log('Fictional local TEST ready at http://'+host));
async function stop(){server.close();await runtime.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
