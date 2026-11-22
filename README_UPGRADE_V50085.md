# KeySuite V5.00.85 UPGRADE

Apply only to an extracted KeySuite V5.00.84 FULL package. Keep a backup, then extract the UPGRADE contents over that folder, preserving paths and replacing listed files. The archive has no enclosing directory and contains the required changed/new files plus release documentation and tests. No baseline files need deleting.

Do not run an old release's build/import/migration commands as part of this overlay. This release requires no new database schema migration or seed. No deployment is performed by extracting either archive.

The full package includes inherited historical migrations and optional proposals unchanged; their presence does not authorize execution. All original V5.00.84 files that are not listed as modified remain byte-identical.

After a future authorized installation, reload the application so the V5.00.85 service worker and versioned assets can refresh. Existing saved BSW editable currency prices retain normal precedence. Zero workbook prices are unpriced, not authorization for free products.

SHA256SUMS_V50085.txt lists release-file hashes. UPGRADE_MANIFEST_V50085.json records the baseline, modified and added paths. ZIP checksums are provided in the delivery checksum file. The packager validates CRCs, safe unique paths, member hashes, and exact V5.00.84 + UPGRADE = FULL equivalence.

Verification: Node.js with jsdom 26 is needed for the isolated JavaScript tests. Python with openpyxl is needed for the workbook check; pass the original V1.3 workbook path. No production credentials are needed. Browser/PDF-export verification remains outstanding as detailed in V5.00.85_TEST_REPORT.md.
