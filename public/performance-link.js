// Validate link syntax only. No URL is fetched, embedded, or certified reachable.
export function validPerformanceLink(value){
 if(typeof value!=='string'||value.length>2048||!value.startsWith('https://')||/[\s\u0000-\u001f\u007f]/.test(value))return false;
 try{
  const u=new URL(value),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
  if(!host.includes('.')||host.startsWith('[')||/^\d+\.\d+\.\d+\.\d+$/.test(host))return false;
  if(/\.(localhost|local|internal|lan|home|test|invalid|example|onion)$/.test(host))return false;
  return host.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part));
 }catch{return false}
}
