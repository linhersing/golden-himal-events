#!/usr/bin/env node
// Controlled offline recovery of a Golden Himal Voice encrypted D1 SQL backup.
// Writes plaintext only to a caller-chosen local private directory, never to Git.
import {readFileSync,writeFileSync} from 'node:fs';
import {createDecipheriv} from 'node:crypto';
import {validateD1Export} from './secure-d1-export.mjs';

const fail=()=>{process.stderr.write('BACKUP_RECOVERY_BLOCKED: invalid snapshot or key\n');process.exitCode=1};

export function unsealAndVerify(archive,key){
 if(!Buffer.isBuffer(archive)||archive.length<33||
    archive.subarray(0,4).toString()!=='GHV1'||!Buffer.isBuffer(key)||key.length!==32)
    throw Error('invalid_archive_or_key');
 const decipher=createDecipheriv('aes-256-gcm',key,archive.subarray(4,16));
 decipher.setAuthTag(archive.subarray(16,32));
 const restored=Buffer.concat([decipher.update(archive.subarray(32)),decipher.final()]);
 validateD1Export(restored); // Actual in-memory SQL restoration and schema validation.
 return restored;
}

const isCli=process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url;
if(isCli){
 const [source,dest]=process.argv.slice(2);
 try{
  const hex=process.env.GHV_D1_BACKUP_KEY_HEX;
  if(!source||!dest||source===dest||!hex||!/^[\da-fA-F]{64}$/.test(hex))
   throw Error('invalid_args');
  const restored=unsealAndVerify(readFileSync(source),Buffer.from(hex,'hex'));
  writeFileSync(dest,restored,{flag:'wx',mode:0o600});
  process.stdout.write('OFFLINE_RESTORE_VERIFIED: copy is ready for isolated staging import only\n');
 }catch{fail()}
}
