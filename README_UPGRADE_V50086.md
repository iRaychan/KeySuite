# KeySuite V5.00.86 — review build

Baseline: KeySuite_V5.00.85_CORRECTED_FULL.zip (Corrected R1). KeyStock V1.04.

This package has not been deployed. No production database changes were made.
Use UPGRADE only over that exact baseline; FULL includes the complete baseline plus this release.

## What changed

- Four adjacent Finder columns with horizontal scrolling on narrow screens.
- Dynamic series, with CHC C4 and CHC C6 separate. Exactly three grouping categories.
- Direct shared Critical/Normal option management, stable IDs, duplicate checks and reference protection.
- Series-level Pricelist dropdown arrangements, selection options, exact combination mappings, revision checks and soft deletion.
- Configuration mapping status and per-model applicability. Missing, invalid and conflicting combinations are rejected by the database when receiving stock.
- ES reads every material code actually present on each model instead of the old six-code allowlist. Prices are unchanged.
- Three-second editing gesture and existing server permissions retained. Failed saves show the error and retain the form.

Stock Input layout is unchanged. Shared Pricelist arrangements appear as required single choices; shared Normal options retain their independent multi-select behavior. Historical opening balances remain read-only.

## Database changes prepared, not applied

Only the new migration is required on an existing V1.03 KeyStock database:

`supabase/migrations/20261123091710_keystock_v104_pricelist_links.sql`

It adds `keystock.series_mappings`, adds `groups.revision`, permits multiple shared linked arrangements and updates the private catalogue/validation/API helpers. It retains the preceding helper implementations for guarded rollback. It enables RLS on the new table and denies direct client table/helper access. All writes use the existing authenticated, permission-checked tenant gateway and transaction lock.

The migration contains no catalogue, price, account, permission, inventory or reset DML. It inserts no default dropdown data. Existing table rows are not deleted. A rerun is tested to preserve state.

Prerequisite: the V1.02 ledger and V1.03 series-option schema already exist. Migration-history timestamps may differ from the packaged development filenames; verify actual function/table structure before applying. Do not blindly run the historical migrations included in the full source archive.

After separate deployment approval:

1. Back up the current deployed files and database; verify restoration in an isolated database before changing production.
2. Test this single migration against that isolated database copy and check current tenant permissions and catalogue counts.
3. In a maintenance window, apply the single V1.04 migration, then overlay UPGRADE files at the application root (or publish FULL). Preserve site configuration and unrelated files.
4. Reload clients to receive the new asset/cache version. Check KeySuite V5.00.86 / KeyStock V1.04, save and refresh a test configuration, and verify the expected model applicability.

Production approval is still required. No deployment command is executed by either ZIP.

## Rollback

Before any V1.04 shared linked setup or newly exposed ES configuration has been used, the tested `supabase/rollback_keystock_v104_before_use.sql` restores the V1.03 helpers/schema. Restore the V5.00.85 Corrected application files and refresh caches in the same maintenance window.

After setup/use, that script deliberately refuses to run. Do not force it or remove its guards. Restore a verified pre-upgrade database/application backup with a reviewed plan for preserving or replaying subsequent stock transactions, or prepare a specific data-preserving downgrade. Retiring mappings does not alter already recorded stock identities.

## Verification

From `tests`, install the pinned dependencies with `npm ci`, then run:

```
npm run test:v50086
npm run test:ledger:v104
node v50085-corrective.cjs
node v50085-corrective-boundaries.cjs
node commercial-identity.cjs
node v50085-bsw.cjs
node v50084-brands.cjs
node v50083.cjs
node v50082/verify.cjs
```

Local browser preview: `npm run preview:v50086`, then open `http://127.0.0.1:8386/__safari_fixture.html` and select **Open local KeyStock test**. This fixture uses only an isolated PGlite database, blocks remote connections with CSP and adds no data to production. The illustration shown in review screenshots is disposable local test data; it is not seeded by the migration.

See `V5.00.86_REPORT.md`, `CHANGED_FILES_V50086.md`, `UPGRADE_MANIFEST_V50086.json`, `tests/v50086-logs/` and `review-v50086/` for results and the exact payload.
