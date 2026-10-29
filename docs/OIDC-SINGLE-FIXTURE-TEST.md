# COMPLETED AND REMOVED — One-time authenticated D1 write

Evidence: GitHub Actions Run 40811874921, retry attempt 2, job log at 2026-10-29T03:25:23Z:
PASS live OIDC-authenticated D1 synthetic INSERT + independent SELECT readback.

The only written record was TEST-SINGER-API-001 in ghv-staging. The OAuth/OIDC CI write endpoint and id-token: write permission were subsequently removed from the deployed branch in the cleanup PR. Public staging writes remain disabled. Do NOT use the following historical procedure to send any new writes.

---

# One-time D1 INSERT/SELECT via GitHub OIDC

STAGING-ONLY. This test never accepts customer information, uploads, payments or votes.

## Trust boundary
POST /api/staging/ci-fixture-write accepts only an RS256-signed GitHub OIDC token:
- Signature verified with GitHub's pinned OIDC JWKS endpoint
- Exact issuer and custom audience ghv-d1-staging-smoke
- Exact repository, immutable repository ID 1406943966, branch, push event, and workflow reference
- Valid short-lived iat, exp and nbf fields
- No request body or user-supplied values

The only possible insertion is TEST-SINGER-API-001, university, 2027-03 into the existing ghv_test_registrations table. Conditional insert prevents repeats from creating further matching rows. GET /api/staging/ci-read independently retrieves this fixed dummy row. The existing public sample-write path remains disabled, with STAGING_TEST_WRITE_ENABLED=false.

GitHub Actions receives a short-lived token via id-token: write; no Cloudflare API token or long-lived secret is stored in public GitHub. No token is printed in test logs. An invalid/absent token is rejected before D1 queries.

## Temporary test only
Once a live authorized insert, readback and public-write rejection have passed, remove the CI-write route and the workflow OIDC permission, restoring read-only staging endpoints. Protect the branch and account; authenticated CI access still depends on repository ownership. Neither this fixture nor the test proves real registration security or concurrency capacity.

References:
https://docs.github.com/en/actions/reference/security/oidc
https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
