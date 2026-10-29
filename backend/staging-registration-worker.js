/*
 * Golden Himal Voice — SAFE STAGING SMOKE TEST ONLY.
 *
 * Never collect names, emails, files, receipts, payments, or votes here.
 * The public registration form remains a client-side demonstration.
 * For test operations only, a fixed fictional row can be read or inserted.
 * No production registration API and no admin endpoints are exposed.
 */

const SAMPLE = Object.freeze({
  display_name: 'TEST-SINGER-API-001',
  category: 'university',
  round_code: '2027-03',
});
const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
function json(payload, status=200) {
  return Response.json(payload, {status, headers: HEADERS});
}
function failure(error, status) {
  return json({ok:false, error}, status);
}
function sameOrigin(request) {
  // Browser-originated POSTs must originate from the Worker host.
  // CORS/origin are not authentication, so this endpoint accepts ONLY a
  // deterministic synthetic payload and cannot create arbitrary rows.
  const origin = request.headers.get('Origin');
  return !!origin && origin === new URL(request.url).origin;
}
async function tableReady(db) {
  // Read-only query: safe to run while write mode remains disabled.
  try {
    await db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='ghv_test_registrations' LIMIT 1"
    ).first();
    const row=await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ghv_test_registrations' LIMIT 1"
    ).first();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}
async function handleHealth(request,env) {
  if(request.method!=='GET') return failure('method_not_allowed',405);
  if(!env.DB) return failure('database_not_bound',503);
  const ready=await tableReady(env.DB);
  return json({ok:ready, testOnly:true, tableReady:ready,
    canWrite:env.STAGING_TEST_WRITE_ENABLED==='true'});
}
// Read-only end-to-end evidence from the manually-created fictional D1 row.
// This never returns real registrations or allows user-supplied search terms.
async function handleSampleRead(request,env) {
  if(request.method!=='GET') return failure('method_not_allowed',405);
  if(!env.DB) return failure('database_not_bound',503);
  if(!await tableReady(env.DB)) return failure('test_table_missing',503);
  try {
    const row=await env.DB.prepare(
      'SELECT id,display_name,category,round_code,status FROM ghv_test_registrations '+
      'WHERE display_name=? AND round_code=? ORDER BY id ASC LIMIT 1'
    ).bind('TEST-SINGER-001','2027-03').first();
    if(!row)return failure('fictional_fixture_missing',404);
    return json({ok:true,testOnly:true,source:'d1-staging',sample:row});
  }catch{return failure('test_database_unavailable',503)}
}
async function handleSampleRegistration(request,env) {
  if(request.method!=='POST') return failure('method_not_allowed',405);
  if(!env.DB) return failure('database_not_bound',503);
  if(env.STAGING_TEST_WRITE_ENABLED!=='true') return failure('staging_write_disabled',503);
  if(!sameOrigin(request))return failure('origin_not_allowed',403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return failure('json_required',415);
  const contentLength=Number(request.headers.get('content-length')||0);
  if(contentLength>100) return failure('body_too_large',413);
  let raw;
  try {raw=await request.text();} catch {return failure('invalid_body',400)}
  if(raw.length>100) return failure('body_too_large',413);
  let body;
  try {body=JSON.parse(raw)} catch {return failure('invalid_json',400)}
  if(!body || typeof body!=='object' || Array.isArray(body) ||
      Object.keys(body).length!==1 || body.sample!=='TEST-SINGER-API-001')
    return failure('fictional_sample_only',400);

  if(!await tableReady(env.DB))return failure('test_table_missing',503);
  try {
    // One conditional INSERT statement: repeating the same request never
    // creates an unbounded number of fictional registrations.
    // An eventual formal registration table must use a DB UNIQUE constraint.
    await env.DB.prepare(
      'INSERT INTO ghv_test_registrations (display_name,category,round_code) '+
      'SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM ghv_test_registrations '+
      'WHERE display_name=? AND round_code=?)'
    ).bind(SAMPLE.display_name,SAMPLE.category,SAMPLE.round_code,
      SAMPLE.display_name,SAMPLE.round_code).run();
    const row=await env.DB.prepare(
      'SELECT id,display_name,category,round_code,status,created_at FROM '+
      'ghv_test_registrations WHERE display_name=? AND round_code=? '+
      'ORDER BY id ASC LIMIT 1'
    ).bind(SAMPLE.display_name,SAMPLE.round_code).first();
    if(!row)return failure('test_row_not_found',503);
    return json({ok:true, testOnly:true, stored:row});
  }catch{
    return failure('test_database_unavailable',503);
  }
}
export default {
  async fetch(request,env) {
    const pathname=new URL(request.url).pathname;
    if(pathname==='/api/staging/health')return handleHealth(request,env);
    if(pathname==='/api/staging/sample-read')return handleSampleRead(request,env);
    if(pathname==='/api/staging/registration-test')return handleSampleRegistration(request,env);
    if(pathname.startsWith('/api/'))return failure('not_found',404);
    return env.ASSETS.fetch(request);
  }
};
