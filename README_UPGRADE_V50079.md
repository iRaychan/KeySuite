# KeySuite V5.00.79 — Phase 01 review candidate

Baseline: KeySuite V5.00.78. This package contains the Phase 01 repairs and actual test findings. It is **not a claim that all nine issues have completed production acceptance**. Read TEST_REPORT_V50079.md before use.

No GitHub deployment, live Supabase migration, production record change or data reset was performed.

## Upgrade

1. Back up the V5.00.78 application files and retain the current database backup policy.
2. Extract the UPGRADE archive over the V5.00.78 application root, retaining paths. It contains changed/new files only. Do not delete other application files.
3. FULL is the complete application at the same paths. Both packages produce an identical application tree when the upgrade is overlaid on the verified baseline.
4. Refresh the application to pick up V5.00.79 assets and service-worker cache. Normal authentication is still required.
5. Do not import/reset customer, quotation, inventory or pricing data.

These steps are instructions only; the release was not deployed.

## ES duplex price configurations

The existing ES save RPC updates existing material entries; it cannot create an absent entry. OPTIONAL_V50079_ES_DUPLEX.sql appends only missing Duplex 2205/2507 entries with null USD/RMB/MYR prices. It is idempotent and preserves existing prices. It has **not been executed**, including against a disposable PostgreSQL database. Review it and validate against a database backup/test environment before separately authorizing application. The UI reports an absent configuration instead of claiming a successful save.

ISO already contains independent duplex configurations in the baseline; their existing prices are preserved. No new prices were invented.

## Acceptance limits

- Secure save recovery, draft retention, stable retry IDs and permission failures passed isolated browser tests with an in-memory RPC substitute. End-to-end Supabase persistence/RLS tests in a disposable environment remain outstanding.
- macOS Safari and Chrome were exercised. Windows Chrome/Edge were unavailable.
- Every BFI catalogue model was opened. Exhaustive tests of every configured brand/customer/series price and all CR/BSW variants, and final generated PDF inspection, remain outstanding.
- The SQL configuration step and remaining acceptance tests prevent unconditional release sign-off.

See CHANGELOG_V50079.md, ROOT_CAUSES_V50079.md and TEST_REPORT_V50079.md. Check archive SHA-256 values against the accompanying delivery report.
