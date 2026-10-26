# Deploy / upgrade to KeySuite V5.00.06

## Full source deployment

1. Back up the existing website source and Supabase project.
2. Apply `supabase/migrations/20261026190000_v50006_bgf_pricelist.sql`, followed by `supabase/migrations/20261027100000_v50006_bgf_rls_performance.sql`, to staging first.
3. Extract `KeySuite_V5.00.06_FULL_CLEAN_GitHub.zip` into a clean source directory.
4. Complete the checks in `CHANGE_TEST_REPORT_V50006.md` before production publication.
5. Reload open browser tabs so the V5.00.06 service worker and version lock activate.

## Upgrade from V5.00.05

1. Back up the checkout and database.
2. Extract `KeySuite_V5.00.06_UPGRADE_from_V5.00.05.zip` into a temporary directory.
3. Run `python3 tools/apply_v50006_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run.
4. Resolve any locally modified target file reported by the dry run.
5. Repeat with `--apply`, then apply the two included BGF migrations in filename order.

## Database boundary

The BGF Price List uses one additive schema/data migration plus one policy-performance migration. Together they create four product rows, explicit authenticated grants, RLS staff-read and Owner-update policies, and statement-cached JWT evaluation. They do not alter existing product, pricing, quotation, user or KeyHQ tables. No Edge Function deployment is required. Both migrations were deployed and verified on the production KeySuite Supabase project on 2026-10-27; frontend hosting was not deployed.
