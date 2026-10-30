# KeySuite V5.00.16 Upgrade

This overlay upgrades an existing complete KeySuite V5.00.15 installation to V5.00.16.

## Installation

1. Preserve a copy of the current V5.00.15 deployment.
2. Extract this ZIP.
3. Copy the contents of `KeySuite_V5.00.16_UPGRADE` over the root of the existing V5.00.15 installation, preserving the included folder structure.
4. Replace the listed files when prompted. Do not delete unrelated files.
5. Clear the KeySuite site/service-worker cache or reload twice, then confirm the displayed version is V5.00.16.
6. Run the smoke tests listed in `REGRESSION_TEST_REPORT_V50016.md` before general use.

## Supabase and data

No V5.00.16 database migration or Edge Function deployment is required. The production KeySuite project was verified as already containing the V5.00.15 safeguarded category-archive migration and RPC.

This package contains no pricing-data replacement, customer data, quotations, quotation revisions, SQL migration, or database reset operation.

## Frozen quotation layout

Quotation PDF layout V1.08 remains frozen. The upgrade does not replace `app.js`, `quotation-templates.js`, or `pdf-optimization.js`.

## Rollback

Restore the preserved V5.00.15 web files and clear the site/service-worker cache. No database rollback is required for this frontend-only upgrade.
