/*
 * Golden Himal Voice: closed final-vote security foundation (NOT ROUTED / NOT DEPLOYED).
 * Requires an independently verified, single-person eligibility credential.
 * Email/Turnstile/IP are NOT proof that two voters are different people.
 */
export const FINAL_VOTE_ACTION = 'ghv_final_vote';
const asText = value => typeof value === 'string' ? value : '';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const validCredential = value => typeof value === 'string' && /^[A-Za-z0-9_-]{40,180}$/.test(value);
const requiredSecret = value => typeof value === 'string' && value.length >= 32;

export function finalVoteReadiness(env = {}) {
  return {
    // A closed rehearsal is the only supported mode. No public route calls this module.
    rehearsalEnabled: env.FINAL_VOTE_REHEARSAL_ENABLED === 'true',
    isolatedDatabaseBound: Boolean(env.FINAL_VOTE_REHEARSAL_DB),
    credentialSecretPresent: requiredSecret(env.FINAL_VOTE_CREDENTIAL_SECRET),
    turnstileSecretPresent: requiredSecret(env.FINAL_VOTE_TURNSTILE_SECRET),
    allowedOriginPresent: /^https:\/\/[^/?#]+$/.test(asText(env.FINAL_VOTE_ALLOWED_ORIGIN)),
    rateLimiterBound: Boolean(env.FINAL_VOTE_RATE_LIMITER?.limit),
  };
}

async function hmac(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(signed, b => b.toString(16).padStart(2, '0')).join('');
}

// Used by an *authorized, independent* eligibility issuer before any ballot is cast.
// Never derive a person's unique eligibility hash from Email alone.
export async function finalVoteCredentialHash(credential, secret) {
  if (!validCredential(credential) || !requiredSecret(secret)) throw new Error('invalid_credential_or_secret');
  return hmac('ghv-final-credential-v1:' + credential, secret);
}

export async function verifyFinalVoteTurnstile(token, request, env, fetcher = fetch) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) return false;
  const origin = asText(env.FINAL_VOTE_ALLOWED_ORIGIN);
  try {
    const hostname = new URL(origin).hostname;
    const data = new URLSearchParams({ secret: env.FINAL_VOTE_TURNSTILE_SECRET, response: token });
    const clientIp = request.headers.get('CF-Connecting-IP');
    if (clientIp) data.set('remoteip', clientIp);
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: data, signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true && result.action === FINAL_VOTE_ACTION && result.hostname === hostname;
  } catch { return false; }
}

const fail = (status, error) => ({ ok: false, status, error });

/**
 * Explicitly disconnected from the deployed staging Worker. Rehearsal-only D1 write.
 * Data tables are those in 0001_core.sql + 0002_eligibility_credentials.sql.
 * Every accepted ballot gets an audit event in the SAME database transaction.
 * No user-supplied identity, candidate, tally, or voting time is trusted directly.
 */
export async function castFinalVoteRehearsal({ request, env, payload, now = Math.floor(Date.now() / 1000), fetcher = fetch }) {
  const ready = finalVoteReadiness(env);
  if (!Object.values(ready).every(Boolean)) return fail(503, 'rehearsal_not_configured');
  const origin = env.FINAL_VOTE_ALLOWED_ORIGIN;
  if (new URL(request.url).origin !== origin || request.headers.get('Origin') !== origin)
    return fail(403, 'origin_not_allowed');
  if (!payload || !validId(payload.roundId) || !validId(payload.contestantId) ||
      !validCredential(payload.credential) || !Number.isSafeInteger(now) || now < 0)
    return fail(400, 'invalid_ballot');
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !/^[a-f0-9:.]{3,45}$/i.test(ip)) return fail(403, 'edge_identity_required');

  const credentialHash = await finalVoteCredentialHash(payload.credential, env.FINAL_VOTE_CREDENTIAL_SECRET);
  const ipHash = await hmac('ghv-vote-ip:' + ip, env.FINAL_VOTE_CREDENTIAL_SECRET);
  // Two distinct controls: credential throttling does not prevent random-token floods.
  try {
    const limiter = env.FINAL_VOTE_RATE_LIMITER;
    const first = await limiter.limit({ key: 'ip:' + ipHash });
    if (!first.success) return fail(429, 'rate_limited');
    const second = await limiter.limit({ key: 'credential:' + credentialHash });
    if (!second.success) return fail(429, 'rate_limited');
  } catch { return fail(503, 'limiter_unavailable'); }

  if (!await verifyFinalVoteTurnstile(payload.turnstileToken, request, env, fetcher))
    return fail(403, 'human_verification_required');

  const receiptId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const db = env.FINAL_VOTE_REHEARSAL_DB;
  try {
    const result = await db.batch([
      db.prepare(`INSERT INTO credential_votes (id,round_id,contestant_id,eligibility_id,cast_at)
        SELECT ?,r.id,c.id,e.id,? FROM rounds r
        JOIN contestants c ON c.round_id=r.id AND c.id=? AND c.approved=1
        JOIN voter_eligibilities e ON e.round_id=r.id AND e.credential_hash=? AND e.state='issued'
        WHERE r.id=? AND r.state='open' AND r.opens_at<=? AND r.closes_at>?`).bind(
          receiptId, now, payload.contestantId, credentialHash, payload.roundId, now, now),
      db.prepare(`INSERT INTO audit_events(id,created_at,event,round_id,ref_id)
        SELECT ?,?,'rehearsal_ballot_accepted',round_id,id FROM credential_votes WHERE id=?`)
        .bind(auditId, now, receiptId)
    ]);
    if (result?.[0]?.meta?.changes !== 1 || result?.[1]?.meta?.changes !== 1)
      return fail(409, 'ineligible_or_voting_closed');
    return { ok: true, status: 201, rehearsalOnly: true, receipt: receiptId };
  } catch {
    // Do not leak eligibility, duplicates, or SQL details to the caller.
    return fail(409, 'ballot_not_accepted');
  }
}
