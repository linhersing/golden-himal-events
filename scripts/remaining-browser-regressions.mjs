// Run specs omitted from the workflow's initial explicit browser list, once.
// This keeps new/legacy P0 regressions in CI without repeating its selected suite.
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function additionalBrowserSpecs(workflow,files){
 const line=workflow.match(/^\s*(?:-\s*)?run: pnpm exec playwright test ([^\r\n]+)/m)?.[1];
 if(!line)throw Error('Configured browser suite not found');
 const selected=new Set(line.trim().split(/\s+/).filter(x=>/^tests\/[a-zA-Z0-9_./-]+\.spec\.mjs$/.test(x)));
 if(!selected.size)throw Error('Configured browser suite is empty');
 return [...new Set(files.map(name=>name.replaceAll('\\','/')))]
  .filter(name=>/^tests\/[a-zA-Z0-9_./-]+\.spec\.mjs$/.test(name)&&!selected.has(name)).sort();
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const workflow=await readFile('.github/workflows/sandbox-browser.yml','utf8');
 const files=(await readdir('tests',{recursive:true})).map(name=>'tests/'+name);
 const remaining=additionalBrowserSpecs(workflow,files);
 console.log('Additional browser specs: '+JSON.stringify(remaining));
 if(remaining.length){
  const require=createRequire(import.meta.url),cli=require.resolve('@playwright/test/cli');
  // A second Playwright run must not erase the first suite's/workerd evidence.
  const result=spawnSync(process.execPath,[cli,'test',...remaining,'--output=test-results/additional-browser'],{encoding:'utf8',timeout:300000});
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
  if(result.error)console.error('Additional browser run did not complete: '+result.error.code);
  process.exitCode=result.status??1;
 }
}
