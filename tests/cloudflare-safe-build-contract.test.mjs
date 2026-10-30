import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('active Cloudflare config uses verified isolated D1 resources without auto-provisioning or enabling invitations',async()=>{
 const active=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 const legacy=active.d1_databases.find(db=>db.binding==='DB');
 const isolated=active.d1_databases.find(db=>db.binding==='E2E_DB');
 assert.equal(legacy.database_name,'ghv-staging');
 assert.equal(legacy.database_id,'93f23f1e-0c2b-41a6-8d8d-fb1a35d4a93a');
 assert.ok(isolated?.database_id,'E2E_DB must use the existing, migrated account resource');
 assert.equal(isolated.database_name,'golden-himal-voice-preview-e2e-db');
 assert.equal(isolated.database_id,'2f7851ec-fb0b-43be-9958-b63bf04a9c6b');
 assert.notEqual(isolated.database_id,legacy.database_id);
 for(const db of active.d1_databases){
  assert.ok(db.database_name&&db.database_id,'No implicit D1 auto-provisioning in Workers Builds');
 }
 assert.equal(active.vars.STAGING_TEST_WRITE_ENABLED,'false');
 assert.equal(active.vars.STAGING_E2E_ENABLED,undefined);
 assert.equal(active.r2_buckets,undefined);
 assert.equal(active.send_email,undefined);
});
test('future private R2 remains inactive while the template pins the verified isolated D1',async()=>{
 const raw=await readFile(new URL('../wrangler.e2e.provision.jsonc',import.meta.url),'utf8');
 const template=JSON.parse(raw.replace(/^\/\/[^\n]*(?:\n|$)/gm,''));
 assert.equal(template.d1_databases[0].binding,'DB');
 assert.equal(template.d1_databases[1].binding,'E2E_DB');
 assert.equal(template.d1_databases[1].database_id,'2f7851ec-fb0b-43be-9958-b63bf04a9c6b');
 assert.equal(template.r2_buckets[0].binding,'STAGING_MEDIA');
 assert.equal(template.vars.STAGING_E2E_ENABLED,undefined);
});
