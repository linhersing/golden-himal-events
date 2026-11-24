#!/usr/bin/env node
// Golden Himal Voice: offline encryption + restore verification of a Wrangler D1 SQL export.
// Local file only; does not connect to Cloudflare or retain a plaintext copy.
// Usage: GHV_D1_BACKUP_KEY_HEX=<64 hex chars> node scripts/secure-d1-export.mjs export.sql backup.enc manifest.json
import {readFileSync,writeFileSync,unlinkSync,statSync} from 'node:fs';
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const requiredTables=['e2e_accounts','e2e_applications','e2e_email_challenges','e2e_staff_audit'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const assert=(yes,message)=>{if(!yes)throw Error(message)};

export function validateD1Export(sql) {
  assert(Buffer.isBuffer(sql)&&sql.length>0&&sql.length<256*1024*1024,'invalid_export_size');
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(sql.toString('utf8')); // Actual SQLite restore rehearsal, not just parsing.
    const integrity=db.prepare('PRAGMA integrity_check').all();
    assert(integrity.length===1&&integrity[0]?.integrity_check==='ok','integrity_check_failed');
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
    assert(requiredTables.every(x=>tables.includes(x)),'missing_required_e2e_tables');
    const counts={};
    for(const name of requiredTables)counts[name]=Number(db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n);
    return {counts,table_count:tables.filter(x=>x.startsWith('e2e_')).length};
  }finally{db.close()}
}

export function sealD1Export(bytes,key) {
  assert(Buffer.isBuffer(key)&&key.length===32,'invalid_encryption_key');
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
  const tag=cipher.getAuthTag();
  const sealed=Buffer.concat([Buffer.from('GHV1'),iv,tag,ciphertext]);
  const verify=createDecipheriv('aes-256-gcm',key,iv);
  verify.setAuthTag(tag);
  const recovered=Buffer.concat([verify.update(ciphertext),verify.final()]);
  assert(digest(recovered)===digest(bytes),'encrypted_roundtrip_failed');
  return sealed;
}

export function encryptVerifiedExport(bytes,key) {
  const restored=validateD1Export(bytes);
  const sealed=sealD1Export(bytes,key);
  return {sealed,manifest:{
    format:'GHV1-AES-256-GCM',scope:'E2E_DB_SQL_EXPORT',
    verified_utc:new Date().toISOString(),plaintext_sha256:digest(bytes),
    encrypted_sha256:digest(sealed),plaintext_bytes:bytes.length,
    encrypted_bytes:sealed.length,restored_tables:restored.table_count,
    row_counts:restored.counts,restore_rehearsal:'PASS'}};
}

const isCli=process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url;
if(isCli){
  const [input,output,manifestPath]=process.argv.slice(2);
  try{
    assert(input&&output&&manifestPath,'usage: secure-d1-export.mjs export.sql backup.enc manifest.json');
    assert(input!==output&&input!==manifestPath&&output!==manifestPath,'distinct_paths_required');
    const keyHex=process.env.GHV_D1_BACKUP_KEY_HEX;
    assert(typeof keyHex==='string'&&/^[0-9a-fA-F]{64}$/.test(keyHex),'missing_32byte_backup_key');
    assert(statSync(input).size<256*1024*1024,'export_too_large');
    const {sealed,manifest}=encryptVerifiedExport(readFileSync(input),Buffer.from(keyHex,'hex'));
    writeFileSync(output,sealed,{flag:'wx',mode:0o600});
    try{writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600})}
    catch(error){unlinkSync(output);throw error}
    process.stdout.write(JSON.stringify({status:'PASS',restore_rehearsal:'PASS',
      encrypted_sha256:manifest.encrypted_sha256,table_count:manifest.restored_tables})+'\n');
  }catch{
    process.stderr.write('BACKUP_VERIFY_FAILED: no unencrypted backup exported or published by this tool\n');
    process.exitCode=1;
  }
}
