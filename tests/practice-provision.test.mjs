import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
// Catch an accidental privileged migration in normal builds/PRs: it must exit before loading any credentials or CLI.
test('practice provisioning is inert outside the designated Cloudflare deployment build',()=>{const r=spawnSync(process.execPath,['scripts/provision-practice.mjs'],{env:{PATH:process.env.PATH,WORKERS_CI:'1',WORKERS_CI_BRANCH:'untrusted-feature'},encoding:'utf8'});assert.equal(r.status,0);assert.match(r.stdout,/SKIPPED/);assert(!r.stdout.includes('bookmark'));});
