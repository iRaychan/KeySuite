# KeySuite V5.00.34 upgrade from V5.00.33

Apply only to a complete V5.00.33 installation. For older or uncertain versions,
use KeySuite_V5.00.34_FULL_BUILD.zip.

1. Back up the current frontend files and production configuration.
2. Extract this ZIP into a temporary folder.
3. Copy all contents over the existing V5.00.33 application root, keeping the
   relative paths and replacing matching files. No files need deletion.
4. Preserve the production Supabase URL/key configuration and hosting settings.
5. Publish using the existing hosting workflow, then reload clients to activate
   service-worker cache keysuite-v50034-20261104.
6. Review CHANGELOG_AND_TESTS_V5.00.34.md, BUILD_VERIFICATION_V50034.txt and
   DEPLOYMENT_V5.00.34.md; perform authenticated staging acceptance.

This upgrade contains the Phase 05 fixes for Brand Margin order, fixed Trimming,
Product Costing Audit without a customer, running calculation traces and route
reconciliation. Existing gross-margin recovery semantics are preserved.
No new SQL migration or Edge Function deployment is required. Do not rerun
historical SQL. Historical quotations and manual overrides need no data rewrite.

Rollback: restore the backed-up V5.00.33 frontend. No database rollback is needed.

UPGRADE_MANIFEST_V50034.json contains SHA-256 hashes for each release file.
Packaging verifies that overlaying these files on the V5.00.33 full archive
reconstructs V5.00.34 byte-for-byte. This is not a production deployment.
