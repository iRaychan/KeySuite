# KeySuite V5.00.35 upgrade from V5.00.34

Apply only over a complete V5.00.34 installation. Back up frontend and production
configuration, then extract this ZIP over the application root, preserving paths
and replacing matching files. Keep production config.js and hosting settings.
No deletions are needed. Include vendor/ and the new PDF download runtime.

Frontend upload is required; no Supabase SQL migration or Edge Function deployment
is required. Do not rerun historical migrations. Reload clients for service-worker
cache keysuite-v50035-20261104. Review CHANGELOG_AND_TESTS_V5.00.35.md and
DEPLOYMENT_V5.00.35.md for verification and remaining acceptance checks.

Rollback restores the backed-up V5.00.34 frontend. No database rollback is needed.
The manifest lists each changed release file and its SHA-256. Packaging verifies
that applying the release delta reconstructs the full V5.00.35 byte-for-byte.
