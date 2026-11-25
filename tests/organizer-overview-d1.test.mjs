import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {bulkFixture} from './fixtures/registration-bulk.mjs';
import {handleE2E} from '../backend/staging-e2e.js';

test('organizer overview counts records beyond the roster limit and routes to their status list', async()=>{
 const f=bulkFixture(504);
 const get=(query,role='organizer')=>{
  const token=createHmac('sha256',f.env.STAGING_IDENTITY_SECRET).update(role).digest('hex');
  return handleE2E(new Request('https://example.invalid/api/e2e/organizer-queue?view=workbench'+query,{headers:{Cookie:'__Host-ghv-e2e='+token}}),f.env);
 };
 try{
  f.sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,1)').run(f.ids[500],'organizer');
  const correction=f.sqlite.prepare("INSERT INTO e2e_test_video_supplements VALUES(?,'organizer',?,?)");
  const now=Math.floor(Date.now()/1000);
  correction.run(f.ids[501],now-172800,null);
  correction.run(f.ids[502],now-100,null);
  correction.run(f.ids[503],now-100,now-99);
  f.sqlite.exec(readFileSync(new URL('../backend/migrations/1011_frontline_2027_registration_STAGING_ONLY.sql',import.meta.url),'utf8'));
  const region=f.sqlite.prepare("INSERT INTO e2e_frontline_2027_registration VALUES(?,?,'graduated',1)");
  region.run(f.ids[500],'A');region.run(f.ids[501],'B');region.run(f.ids[502],'B');
  const response=await get('');
  assert.equal(response.status,200);
  const first=await response.json();
  assert.equal(first.applications.length,500);
  assert.deepEqual(first.overview,{total:504,scores:0,status:{pending:501,supplement:1,expired:1,approved:1,unverified:0},regions:{A:1,B:2,other:501}});
  assert.deepEqual((await (await get('&status=expired')).json()).applications.map(row=>row.id),[f.ids[501]]);
  assert.deepEqual((await (await get('&status=pending&offset=500')).json()).applications.map(row=>row.id),[f.ids[503]]);
  f.sqlite.prepare("INSERT INTO e2e_registration_controls VALUES(?,'deleted','submitted',1,'audit-fixture')").run(f.ids[501]);
  const after=await (await get('&status=expired')).json();
  assert.equal(after.overview.total,503);
  assert.equal(after.overview.status.expired,0);
  assert.equal(after.overview.regions.B,1);
  assert.deepEqual(after.applications,[]);
  assert.equal((await get('&status=unknown')).status,422);
  assert.equal((await get('', 'reviewer')).status,403);
  assert.equal((await get('', 'member')).status,403);
 }finally{f.close()}
});
