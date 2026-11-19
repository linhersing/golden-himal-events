import {isolatedStaffRuntime,checkCore} from '../tests/fixtures/staff-workerd.mjs';
import {writeFile} from 'node:fs/promises';
const runtime=await isolatedStaffRuntime(process.cwd(),process.argv[2]);
try {
 const result=await checkCore(runtime);
 const evidence=JSON.stringify(result,null,2)+'\n';
 if(process.argv[3])await writeFile(process.argv[3],evidence);
 console.log(evidence);
} finally { await runtime.close(); }
