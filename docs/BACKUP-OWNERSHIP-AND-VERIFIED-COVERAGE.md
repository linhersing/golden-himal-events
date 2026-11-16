# Golden Himal Voice — backups: verified ownership and coverage

Checked 2026-11-17 (Asia/Taipei).

## Single schedule owner
An existing enabled ChatGPT task **Golden Himal 每日備份與歸檔** runs daily at 18:00 Asia/Taipei for GitHub backup and at 23:00 for meeting and conversation archival. It is the only scheduled Drive backup owner. The task's logs and destination are:

- Folder: https://drive.google.com/drive/folders/1Fw74rAAP8FIWRFggM842nBkIiAI_K8i1
- Existing append-only backup log: https://docs.google.com/document/d/1i_RvAupfcrJG1hA0TFuZ_QutjA05bNuvQ0pekum_Z_A/edit

The Drive folder already contains a 33,772,201-byte Git bundle produced on 2026-11-16. Its prior log reports a successful checksum/download/restore verification. The GitHub source's branch has changed since that snapshot, so future runs must generate new versions when needed.

## Why Gemini's ae46be1 workflow was not activated
The first Actions run failed with no jobs. Its YAML placed `secrets.*` directly in step `if` expressions, which GitHub rejects. It also:
- skipped Drive upload when credentials were absent, allowing a green run without a usable Drive backup;
- used Google service-account ownership for a folder in personal My Drive, which cannot be assumed to work;
- requested Cloudflare/Resend credentials without verified least-privilege scope;
- did not back up R2 objects or deployed Worker code;
- duplicated the already-enabled 18:00 scheduled task.

## Current GitHub workflow
`.github/workflows/daily-backup.yml` is **manual Git integrity verification only**, with PR validation for edits to this workflow. It creates and verifies a Git bundle and SHA-256 on the temporary Actions runner. It does not use secrets, upload to Drive, or run daily.

## Coverage truth
| Data | Status |
| --- | --- |
| Git tracked site code and commit/ref history | Prior restore-tested bundle exists in Drive; automated task handles version changes |
| Live Cloudflare Worker deployed version | Not verified backed up |
| Remote D1 actual SQL data | Not verified backed up |
| R2 media objects | Not verified backed up |
| Resend account settings | Not verified backed up |
| Google Drive meeting records | Separate 23:00 archival task; not part of Git bundle |

No additional API keys need to be pasted into chat or created for this GitHub verification workflow. **Do not call the entire website disaster-recovery backup complete** until D1, R2, Workers live version, recovery testing and appropriate encrypted access-controlled storage have been independently verified. Retain the existing backup task; a new scheduled uploader may replace it only after testing and intentionally disabling the old scheduled owner.
