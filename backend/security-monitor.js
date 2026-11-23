// Privacy-preserving, read-only security telemetry for Golden Himal Voice TEST.
// This module never reads names, emails, OTP values, raw IPs or application contents.
// Cloudflare Workers observability must be configured separately to deliver alerts.
const WINDOW_SECONDS = 600;

const scalar = async (db, sql, values=[]) => {
  const row=await db.prepare(sql).bind(...values).first();
  return Number(row?.n||0);
};

export function evaluateSecuritySignals(metrics) {
  const alerts=[];
  if(metrics.staffRequestMax>=10)alerts.push('staff_request_burst');
  if(metrics.staffVerifyMax>=18)alerts.push('staff_verify_burst');
  if(metrics.exhaustedChallenges>=5)alerts.push('otp_guessing_pattern');
  if(metrics.staffDenied>=5)alerts.push('staff_authorization_denials');
  if(metrics.newChallenges>=100)alerts.push('otp_request_volume');
  if(metrics.adminDeletes>=10)alerts.push('admin_bulk_change_review');
  return alerts;
}

export async function securitySnapshot(db, at=Math.floor(Date.now()/1000)) {
  if(!db||typeof db.prepare!=='function')throw Error('security_monitor_database_unavailable');
  if(!Number.isSafeInteger(at)||at<=0)throw Error('security_monitor_invalid_time');
  const since=at-WINDOW_SECONDS;
  const metrics={
    staffRequestMax:await scalar(db,
      "SELECT COALESCE(MAX(n),0) AS n FROM (SELECT COUNT(*) n FROM e2e_staff_auth_attempts WHERE kind='request' AND created_at>? GROUP BY source_fingerprint)",[since]),
    staffVerifyMax:await scalar(db,
      "SELECT COALESCE(MAX(n),0) AS n FROM (SELECT COUNT(*) n FROM e2e_staff_auth_attempts WHERE kind='verify' AND created_at>? GROUP BY source_fingerprint)",[since]),
    exhaustedChallenges:await scalar(db,
      'SELECT COUNT(*) AS n FROM e2e_email_challenges WHERE created_at>? AND attempts>=4',[since]),
    newChallenges:await scalar(db,
      'SELECT COUNT(*) AS n FROM e2e_email_challenges WHERE created_at>?',[since]),
    staffDenied:await scalar(db,
      "SELECT COUNT(*) AS n FROM e2e_staff_audit WHERE occurred_at>? AND result='denied'",[since]),
    adminDeletes:await scalar(db,
      "SELECT COUNT(*) AS n FROM e2e_staff_audit WHERE occurred_at>? AND action='delete' AND result='success'",[since])
  };
  const alerts=evaluateSecuritySignals(metrics);
  return {event:'ghv_security_monitor',scope:'e2e_test',status:alerts.length?'attention':'ok',
    window_seconds:WINDOW_SECONDS,observed_at:at,metrics,alerts};
}

export async function monitorSecurity(env, logger=console, at=Math.floor(Date.now()/1000)) {
  if(env?.STAGING_SECURITY_MONITOR_ENABLED!=='true')return {status:'disabled'};
  try{
    const result=await securitySnapshot(env.E2E_DB,at);
    const emit=result.alerts.length?logger.warn:logger.info;
    emit.call(logger,JSON.stringify(result));
    return result;
  }catch{
    // A schema outage is itself observable. No SQL, secrets or contact data in logs.
    const result={event:'ghv_security_monitor',scope:'e2e_test',status:'unavailable',
      observed_at:at,alerts:['security_monitor_unavailable']};
    logger.error(JSON.stringify(result));
    return result;
  }
}
