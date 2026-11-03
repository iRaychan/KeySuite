# KeySuite V5.00.33 upgrade from V5.00.32

Apply only to a complete V5.00.32 installation. For older or uncertain versions,
use KeySuite_V5.00.33_FULL_BUILD.zip instead.

1. Back up the current frontend files and production configuration.
2. Extract this ZIP to a temporary folder.
3. Copy its contents over the existing V5.00.32 application root, preserving
   relative paths and replacing matching files. No files need deletion.
4. Preserve your production Supabase URL/key configuration and hosting settings.
5. Publish through your existing hosting workflow and refresh/reload the browser
   to activate service-worker cache keysuite-v50033-20261103.
6. Follow the authenticated acceptance checks in DEPLOYMENT_V5.00.33.md and read
   CHANGELOG_AND_TESTS_V5.00.33.md for test results and remaining limitations.

This package contains every changed or added file from the full release,
including its test evidence. It contains no new SQL migration or Edge Function.
No new Supabase configuration change is required. Do not rerun historical SQL.
Applying this frontend upgrade does not require rewriting historical quotations.

Rollback: restore the backed-up V5.00.32 frontend. No database rollback is needed.

UPGRADE_MANIFEST_V50033.json lists SHA-256 hashes for each release file.
Packaging verification overlays this delta on the source V5.00.32 archive and
checks every resulting file byte-for-byte against the V5.00.33 full archive.
This packaging check does not constitute production deployment or live UI testing.
