import {hasTestApproval} from './test-application-approval.js';

const maxBytes=5*1024*1024;
const leaseSeconds=300;
const replayCleanupSeconds=900;
const formats={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const respond=(value,status=200)=>Response.json(value,{status,headers});
const fail=(error,status)=>respond({ok:false,error},status);
const publicDocument=row=>row?{revision:row.id,mime:row.mime,size:row.size,expires_at:row.expires_at}:null;
const hex=bytes=>Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
const table='e2e_private_eligibility_objects';
const eligible=`p.round_code='2027-01' AND p.phase='demo' AND p.status NOT IN ('withdrawn','rejected')
 AND ${hasTestApproval('p')} AND EXISTS(SELECT 1 FROM e2e_frontline_2027_registration f
  WHERE f.application_id=p.id AND f.eligibility_basis IN ('enrolled','graduated'))`;
const current=(db,id,now)=>db.prepare(`SELECT * FROM ${table} WHERE application_id=? AND state='current' AND expires_at>?`).bind(id,now).first();
const requested=(db,id,key)=>db.prepare(`SELECT * FROM ${table} WHERE application_id=? AND request_id=?`).bind(id,key).first();
const isLocal=url=>['localhost','127.0.0.1','[::1]'].includes(url.hostname);
const nowSeconds=()=>Math.floor(Date.now()/1000);

export function syntheticReady(url,env){
 const retention=Number(env.ELIGIBILITY_RETENTION_SECONDS);
 return isLocal(url)&&env.ELIGIBILITY_TEST_MODE==='synthetic'&&env.ELIGIBILITY_TEST_D1&&env.ELIGIBILITY_TEST_R2&&
  /^\d+$/.test(env.ELIGIBILITY_RETENTION_SECONDS||'')&&retention>=60&&retention<=86400;
}

function matchesSignature(bytes,mime){
 const has=(sequence,at=0)=>sequence.every((octet,index)=>bytes[at+index]===octet);
 if(mime==='image/jpeg')return bytes.length>=12&&has([255,216,255])&&has([255,217],bytes.length-2);
 if(mime==='image/png')return bytes.length>=45&&has([137,80,78,71,13,10,26,10])&&has([73,69,78,68,174,66,96,130],bytes.length-8);
 const decoder=new TextDecoder('latin1');
 if(!decoder.decode(bytes.subarray(0,8)).startsWith('%PDF-'))return false;
 if(!decoder.decode(bytes.subarray(-1024)).trimEnd().endsWith('%%EOF'))return false;
 // This basic rejection is not a malware scanner. Never preview document contents inline.
 return !/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|RichMedia|XFA|Encrypt)\b/i.test(decoder.decode(bytes));
}

async function readUpload(request,type){
 const length=request.headers.get('content-length');
 if(length!==null&&Number(length)>maxBytes)return {error:fail('file_too_large',413)};
 if(!request.body)return {error:fail('invalid_file_signature',415)};
 const reader=request.body.getReader(),parts=[];
 let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();return {error:fail('file_too_large',413)}}
   parts.push(value);
  }
 }catch{return {error:fail('upload_interrupted',400)}}
 const bytes=new Uint8Array(size);
 let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 return matchesSignature(bytes,type)?{bytes}:{error:fail('invalid_file_signature',415)};
}

async function storeDocument(request,env,app,actor,now,expected){
 const db=env.ELIGIBILITY_TEST_D1,bucket=env.ELIGIBILITY_TEST_R2;
 const type=(request.headers.get('content-type')||'').trim().toLowerCase();
 if(!Object.hasOwn(formats,type))return fail('unsupported_document_type',415);
 const key=request.headers.get('idempotency-key');
 if(!uuid(key)||request.headers.get('x-eligibility-test-consent')!=='yes')return fail('synthetic_consent_required',422);
 const {bytes,error}=await readUpload(request,type);
 if(error)return error;
 const checksum=await crypto.subtle.digest('SHA-256',bytes),digest=hex(new Uint8Array(checksum));
 const objectValid=async row=>(await bucket.head(row.object_key))?.size===row.size;
 let row=await requested(db,app.id,key);
 if(!row){
  const id=crypto.randomUUID(),sealedKey='eligibility-private/'+crypto.randomUUID();
  await db.prepare(`INSERT INTO ${table}(id,application_id,request_id,expected_revision,object_key,digest,mime,size,state,expires_at,lease_until)
   SELECT ?,p.id,?,?,?,?,?,?,'staged',?,? FROM e2e_applications p
   WHERE p.id=? AND p.account_id=? AND ${eligible} AND COALESCE((
    SELECT id FROM ${table} WHERE application_id=p.id AND state='current' AND expires_at>?
   ),'none')=?
   ON CONFLICT(application_id,request_id) DO NOTHING`)
   .bind(id,key,expected,sealedKey,digest,type,bytes.byteLength,now+Number(env.ELIGIBILITY_RETENTION_SECONDS),now+leaseSeconds,app.id,actor.id,now,expected).run();
  row=await requested(db,app.id,key);
 }
 if(!row||row.expected_revision!==expected||row.digest!==digest||row.mime!==type||row.size!==bytes.byteLength)
  return fail('document_conflict',409);
 if(row.expires_at<=now)return fail('document_conflict',409);
 if(row.state==='current'){
  if(!await objectValid(row))return fail('document_storage_unavailable',503);
  return respond({ok:true,document:publicDocument(row),testOnly:true});
 }
 if(row.state!=='staged'||row.lease_until<=now)return fail('document_conflict',409);
 // Retry a disconnected PUT safely with the same scoped idempotency key and checksum.
 await bucket.put(row.object_key,bytes,{onlyIf:{etagDoesNotMatch:'*'},sha256:checksum});
 if(!await objectValid(row))return fail('document_storage_unavailable',503);
 const at=nowSeconds();
 const changed=await db.prepare(`UPDATE ${table} SET state='current' WHERE id=? AND state='staged'
  AND lease_until>? AND expires_at>? AND EXISTS(SELECT 1 FROM e2e_applications p
  WHERE p.id=? AND p.account_id=? AND ${eligible} AND COALESCE((
   SELECT id FROM ${table} WHERE application_id=p.id AND state='current' AND expires_at>?
  ),'none')=?)`).bind(row.id,at,at,app.id,actor.id,at,expected).run();
 const observed=await current(db,app.id,at);
 if(observed?.id===row.id)return respond({ok:true,document:publicDocument(observed),testOnly:true},changed.meta?.changes?201:200);
 await db.prepare(`UPDATE ${table} SET state='removed',delete_after=lease_until,digest=NULL WHERE id=? AND state='staged'`).bind(row.id).run();
 return fail('document_conflict',409);
}

export async function handleEligibility(request,env,actor){
 const url=new URL(request.url),db=env.ELIGIBILITY_TEST_D1,bucket=env.ELIGIBILITY_TEST_R2;
 if(!actor)return fail('login_required',401);
 if(!['member','organizer'].includes(actor.role)||!env.ELIGIBILITY_TEST_ACCOUNT_IDS?.split(',').includes(actor.id))
  return fail('role_not_allowed',403);
 const id=url.searchParams.get('id');
 if(!uuid(id))return fail('document_not_found',404);
 const read=request.method==='GET',download=url.pathname.endsWith('/download');
 if(download&&!read||!['GET','PUT','DELETE'].includes(request.method))return fail('method_not_allowed',405);
 if(!read&&(actor.role!=='member'||request.headers.get('origin')!==url.origin))return fail('origin_or_role_not_allowed',403);
 const app=await db.prepare(`SELECT p.id,p.account_id,CASE WHEN ${eligible} THEN 1 ELSE 0 END AS eligible
  FROM e2e_applications p WHERE p.id=? AND (?='organizer' OR p.account_id=?)`).bind(id,actor.role,actor.id).first();
 if(!app)return fail('document_not_found',404);
 const now=nowSeconds();
 if(read){
  const row=app.eligible?await current(db,id,now):null;
  if(!row)return download?fail('document_not_found',404):respond({ok:true,enabled:Boolean(app.eligible)&&actor.role==='member',document:null,testOnly:true});
  const object=await (download?bucket.get(row.object_key):bucket.head(row.object_key));
  if(!object||object.size!==row.size)return fail('document_storage_unavailable',503);
  const valid=await db.prepare(`SELECT o.id FROM ${table} o JOIN e2e_applications p ON p.id=o.application_id
   WHERE o.id=? AND o.state='current' AND o.expires_at>? AND ${eligible} AND (?='organizer' OR p.account_id=?)`)
   .bind(row.id,nowSeconds(),actor.role,actor.id).first();
  if(!valid){if(download)await object.body?.cancel?.();return fail('document_not_found',404);}
  if(!download)return respond({ok:true,enabled:actor.role==='member',document:publicDocument(row),testOnly:true});
  return new Response(object.body,{headers:{...headers,'Content-Type':'application/octet-stream',
   'Content-Disposition':`attachment; filename="eligibility-document.${formats[row.mime]}"`,
   'Content-Security-Policy':"default-src 'none'; sandbox",'Content-Length':String(row.size)}});
 }
 const expected=request.headers.get('if-match')?.match(/^"([^"]+)"$/)?.[1];
 if(expected!=='none'&&!uuid(expected))return fail('document_revision_required',428);
 if(request.method==='PUT')return app.eligible?storeDocument(request,env,app,actor,now,expected):fail('application_not_approved',409);
 const previous=await current(db,id,now);
 if(!previous)return respond({ok:true,document:null,testOnly:true});
 const removed=await db.prepare(`UPDATE ${table} SET state='removed',delete_after=0,digest=NULL
  WHERE id=? AND application_id=? AND state='current' AND EXISTS(
   SELECT 1 FROM e2e_applications WHERE id=? AND account_id=?
  )`).bind(expected,id,id,actor.id).run();
 return removed.meta?.changes?respond({ok:true,document:null,testOnly:true}):fail('document_conflict',409);
}

export async function cleanupEligibility(env,now=nowSeconds()){
 const db=env.ELIGIBILITY_TEST_D1,bucket=env.ELIGIBILITY_TEST_R2;
 await db.prepare(`UPDATE ${table} SET state='removed',delete_after=0,digest=NULL
  WHERE (state='staged' AND lease_until<=?) OR (state='current' AND expires_at<=?)`).bind(now,now).run();
 const {results}=await db.prepare(`SELECT id,object_key,state FROM ${table}
  WHERE state IN ('removed','deleted') AND delete_after<=? ORDER BY delete_after LIMIT 50`).bind(now).all();
 for(const row of results){
  try{await bucket.delete(row.object_key)}catch{continue}
  if(row.state==='removed'){
   await db.prepare(`UPDATE ${table} SET state='deleted',delete_after=? WHERE id=? AND state='removed'`).bind(now+replayCleanupSeconds,row.id).run();
  }else await db.prepare(`DELETE FROM ${table} WHERE id=? AND state='deleted' AND delete_after<=?`).bind(row.id,now).run();
 }
}
