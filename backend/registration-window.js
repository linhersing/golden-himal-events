// Golden Himal Voice launch window, Nepal standard time (UTC+05:45).
// The official 2027 entry database has NOT been provisioned. This module
// never pretends STAGING E2E_DB test writes are official entries.
//
// The "scheduled" mode stops accepting TEST applications; reaching January 1
// yields "awaiting_launch_approval", never silently turns test data into live.
// Actual official admissions require a separate audited release.
export const OFFICIAL_START_UTC=Date.parse('2026-12-31T18:15:00Z'); // 2027-01-01 00:00 Nepal
export const OFFICIAL_END_UTC=Date.parse('2027-01-31T18:15:00Z');   // 2027-02-01 00:00 Nepal
const MODES=['testing','paused','scheduled'];

export function registrationWindow(env={},now=Date.now()){
 const mode=MODES.includes(env.GHV_REGISTRATION_WINDOW_MODE)
   ?env.GHV_REGISTRATION_WINDOW_MODE:'testing';
 if(!Number.isFinite(now))throw Error('registration_window_invalid_time');
 const within=now>=OFFICIAL_START_UTC&&now<OFFICIAL_END_UTC;
 const phase=mode==='testing'?'testing'
  :mode==='paused'?'paused'
  :now<OFFICIAL_START_UTC?'countdown'
  :within?'awaiting_launch_approval':'closed';
 return {
  phase,mode,serverNow:new Date(now).toISOString(),
  opensAt:new Date(OFFICIAL_START_UTC).toISOString(),
  closesAt:new Date(OFFICIAL_END_UTC).toISOString(),
  timeZone:'Asia/Kathmandu',
  testSubmissionsAllowed:mode==='testing',
  officialSubmissionsAllowed:false, // no official D1 backend is bound to this E2E API
  publicCountdownVisible:mode==='scheduled'||mode==='paused',
  note:'Official opening requires approved real-registration backend deployment; countdown alone never opens TEST writes.'
 };
}
