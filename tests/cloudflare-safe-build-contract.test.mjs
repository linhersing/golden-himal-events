import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('active Cloudflare builds config remains non-destructive and deployable without account provisioning',async()=>{
 const active=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(active.d1_databases.length,1);
 assert.equal(active.d1_databases[0].binding,'DB');
 assert.equal(active.d1_databases[0].database_name,'ghv-staging');
 assert.equal(active.vars.STAGING_TEST_WRITE_ENABLED,'false');
 assert.equal(active.vars.STAGING_E2E_ENABLED,undefined);
 assert.equal(active.r2_buckets,undefined);
 assert.equal(active.send_email,undefined);
});
test('future isolated D1 and private R2 bindings are preserved in an inactive template only',async()=>{
 const raw=await readFile(new URL('../wrangler.e2e.provision.jsonc',import.meta.url),'utf8');
 const template=JSON.parse(raw.replace(/^\/\/[^\n]*(?:\n|$)/gm,''));
 assert.equal(template.d1_databases[0].binding,'DB');
 assert.equal(template.d1_databases[1].binding,'E2E_DB');
 assert.equal(template.r2_buckets[0].binding,'STAGING_MEDIA');
 assert.equal(template.vars.STAGING_E2E_ENABLED,undefined);
});
