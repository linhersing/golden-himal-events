import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {strFromU8,unzipSync} from 'fflate';
import {handleE2E} from '../backend/staging-e2e.js';
import {bulkFixture} from './fixtures/registration-bulk.mjs';

const origin='https://example.invalid';
function download(f,role,scope,requestOrigin=origin,locale='en'){
 const token=role?createHmac('sha256',f.env.STAGING_IDENTITY_SECRET).update(role).digest('hex'):null;
 const headers={Origin:requestOrigin,'Content-Type':'application/json'};
 if(token)headers.Cookie='__Host-ghv-e2e='+token;
 return handleE2E(new Request(origin+'/api/e2e/'+scope+'-export?lang='+locale,{method:'POST',headers,body:'{}'}),f.env);
}
async function workbook(response){
 assert.equal(response.status,200,await response.clone().text().then(s=>s.startsWith('{')?s:''));
 assert.match(response.headers.get('content-type'),/spreadsheetml/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 return Object.fromEntries(Object.entries(unzipSync(new Uint8Array(await response.arrayBuffer()))).map(([name,bytes])=>[name,strFromU8(bytes)]));
}

test('staff workbook downloads are audited, complete beyond 500 rows and role scoped',async()=>{
 const f=bulkFixture(502);
 try{
  for(const file of ['1011_frontline_2027_registration_STAGING_ONLY.sql','1013_muse_audition_details_STAGING_ONLY.sql','1015_muse_contact_handle_STAGING_ONLY.sql']){
   f.sqlite.exec(readFileSync(new URL('../backend/migrations/'+file,import.meta.url),'utf8'));
  }
  f.env.STAGING_MUSE_AUDITION_ENABLED='true';
  f.env.STAGING_FIVE_DEMO_REHEARSAL='true';
  const personal='EXAMPLE private legal name';
  f.sqlite.prepare("INSERT INTO e2e_muse_audition_details(application_id,full_name,contact_phone,contact_email,city,street_address,educational_background,short_description,musical_training,updated_at,contact_handle) VALUES(?,?,?,?,?,?,?,?,?,1,?)")
   .run(f.ids[1],personal,'+977 9870000000','private@example.invalid','Fictional City','Private Address','Example School','Example Bio','Example Training','Private Chat');
  f.sqlite.prepare("UPDATE e2e_applications SET stage_name='=1+1',payment_status='simulated_paid' WHERE id=?").run(f.ids[1]);
  f.sqlite.prepare('INSERT INTO e2e_test_application_approvals VALUES(?,?,1)').run(f.ids[1],'organizer');

  assert.equal((await download(f,null,'organizer')).status,401);
  assert.equal((await download(f,'member','organizer')).status,403);
  assert.equal((await download(f,'reviewer','organizer')).status,403);
  assert.equal((await download(f,'organizer','reviewer')).status,403);
  assert.equal((await download(f,'organizer','organizer','https://wrong.example')).status,403);
  const org=await workbook(await download(f,'organizer','organizer'));
  assert.match(org['xl/worksheets/sheet1.xml'],/<f>COUNTIF/);
  assert.ok(org['xl/charts/chart1.xml'].includes('<c:doughnutChart>'));
  assert.ok(org['xl/charts/chart2.xml'].includes('<c:barChart>'));
  const roster=org['xl/worksheets/sheet2.xml'];
  assert.match(roster,/<autoFilter ref="A1:[A-Z]+503"/);
  assert.match(roster,/<c r="[^"]+" t="inlineStr"><is><t xml:space="preserve">=1\+1<\/t>/);
  assert.match(roster,/EXAMPLE private legal name/);
  assert.match(roster,/private@example\.invalid/);
  assert.match(roster,/TEST Singer 502/);
  assert.doesNotMatch(roster,/entrant-502/);
  assert.ok(org['xl/worksheets/_rels/sheet2.xml.rels'].includes('TEST_BULK05'));
  const judge=await workbook(await download(f,'reviewer','reviewer'));
  const judgeText=Object.values(judge).join('');
  assert.match(judgeText,/02000000-0000-4000-8000-000000000002/);
  assert.doesNotMatch(judgeText,/TEST Singer 502|Private Address|private@example\.invalid|EXAMPLE private legal name/);
  const audit=f.sqlite.prepare("SELECT actor_role,diff FROM e2e_staff_audit WHERE json_extract(diff,'$.access')='staff_excel_export' ORDER BY rowid").all();
  assert.deepEqual(audit.map(e=>[e.actor_role,JSON.parse(e.diff).entries]),[['organizer',502],['reviewer',1]]);
  assert.doesNotMatch(JSON.stringify(audit),/private@example\.invalid|Private Address/);
  const zh=await workbook(await download(f,'organizer','organizer',origin,'zh'));
  assert.ok(zh['xl/worksheets/sheet2.xml'].includes('觀看影片 5'));
  const ne=await workbook(await download(f,'reviewer','reviewer',origin,'ne'));
  assert.ok(ne['xl/worksheets/sheet1.xml'].includes('अङ्क दिन बाँकी'));
  f.sqlite.exec('DROP TABLE e2e_staff_audit');
  assert.equal((await download(f,'organizer','organizer')).status,503);
 }finally{f.close()}
});

test('an oversized workbook is refused without an audit success or partial rows',async()=>{
 const f=bulkFixture(2001);
 try{
  const response=await download(f,'organizer','organizer');
  assert.equal(response.status,413);
  assert.equal((await response.json()).error,'staff_excel_export_too_large');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM e2e_staff_audit').get().n,0);
 }finally{f.close()}
});
