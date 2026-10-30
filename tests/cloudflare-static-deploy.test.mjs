import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Cloudflare preview serves static assets and only isolated staging API',async()=>{
  const cfg=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(cfg.name,'golden-himal-voice-preview');
  assert.equal(cfg.assets.directory,'./dist');
  assert.equal(cfg.assets.binding,'ASSETS');
  assert.deepEqual(cfg.assets.run_worker_first,['/api/staging/*','/api/e2e/*']);
  assert.equal(cfg.vars.STAGING_E2E_ENABLED,undefined, 'E2E enable requires a separately provisioned Cloudflare secret');
  assert.equal(cfg.main,'./backend/staging-registration-worker.js');
  assert.equal(cfg.vars.STAGING_TEST_WRITE_ENABLED,'false');
  assert.equal(cfg.d1_databases[0].database_name,'ghv-staging');
  assert.equal(cfg.d1_databases[0].binding,'DB');
  assert.equal(JSON.stringify(cfg).includes('backend/src/index.js'),false,
     'Never deploy draft real voting backend in demo preview');
  assert.equal(JSON.stringify(cfg).includes('OTP_PEPPER'),false);
});
