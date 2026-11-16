# Part 2｜2026-11-16 frontline Word registration migration (TEST ONLY)

## Authority & history
- Highest specification: 2026-11-16 Muse/Alan post-radio Word, stored in Drive.
- The 2026-11-12 Word remains as historical supplemental authority ONLY when not in conflict.
- One unified 2027 contest category; area A=Lumbini, B=Bagmati. Province of residence/study/work is a different field.
- Student vs graduate is a **qualification basis**, not a competition group. Historical e2e_applications.category remains a legacy compatibility key.
- Online audition January 2027 is free; do not require a real or simulated fee for a real judging pipeline. The old test-only fee fixture still exists and is not a 2027 production workflow.

## This PR scope
- Add optional and non-destructive `1011_frontline_2027_registration_STAGING_ONLY.sql` mapping to existing isolated TEST application IDs.
- Add validation for `frontline_2027=true`, `competition_region=A/B`, and `eligibility_basis=enrolled/graduated`.
- Use D1 batch to persist new region and eligibility atomically with the existing TEST application; read back on the user's own applications API.
- Gate the new user form behind `STAGING_FRONTLINE_2027_ENABLED=true` **and** confirmed TEST D1 tables: `e2e_frontline_2027_registration` and `e2e_application_locations`. If absent, keep legacy TEST form. A request claiming the new form when D1 is not ready must fail closed.
- Add Chinese, English, and Nepali field labels plus Browser/Node regression checks.
- All existing URLs, legacy TEST rows, email senders, role permissions, payment and scoring endpoints stay unchanged.

## Before enabling
1. Confirm operator is using isolated TEST D1; backup/export and restore-verify it, not a live personal-data database.
2. Apply migration 1011 only to that isolated staging D1 and verify schema/check constraints.
3. Independently verify 1010 locations migration exists, then set `STAGING_FRONTLINE_2027_ENABLED=true` in staging Worker ONLY.
4. TEST with fictional enrolled/graduate entrants from all Nepal provinces and both A/B areas; cross-check D1 readback, ownership, same person duplicate round, logout and 320/390/768/1280px.
5. Keep official registration off. **The form still accepts only ONE Demo link.** Up-to-five Demo videos, highest-scored-video logic, fee-waived reviewer eligibility, per-round payments, teams/PK, voucher and final vote are separate required work.
6. Do not silently turn the old April TEST second-audition into a new contest stage. Do not treat the legacy category compatibility value as one of two live competition groups.

## Explicit blocks
- Current legacy D1 has CHECK constraints for old Jan/Apr rounds, university/community categories, two provinces, promotion seat limits; do not destructive-alter for live rules.
- The new table deliberately separates A/B competition area from actual residential province and educational credential.
- Do not ship a live registration or payment promise until all current Word rules, compliance, privacy notices and operational validation pass.
