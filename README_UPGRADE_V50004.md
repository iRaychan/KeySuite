# Deploy / upgrade to KeySuite V5.00.04

This release implements KS-06, KS-07 and KS-08 on the supplied V5.00.03 baseline.

## Full source deployment

1. Back up the existing website source and environment configuration. Keep the existing Supabase project, keys, accounts and data.
2. Extract `KeySuite_V5.00.04_FULL_CLEAN_GitHub.zip` into a clean source directory; `index.html` should be at the website root.
3. Preview on staging and complete the KS-06..08 acceptance checks in `QA_V50004.md`.
4. Publish through the existing hosting process only after acceptance.
5. Reload open browser tabs so the V5.00.04 service worker and versioned entry point are active.

## Upgrade an existing V5.00.03 checkout

1. Back up the checkout. Extract the UPGRADE ZIP into a separate temporary directory.
2. Run `python3 tools/apply_v50004_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run.
3. If a local modification is reported, merge it manually and review; do not force an overwrite.
4. After a clean dry run, repeat with `--apply`.

## Supabase approval gate

KS-06 requires both V5.00.04 migrations, in filename order: `20261026170000_v50004_ks06_reuse_deleted_quotation_numbers.sql` and `20261026172000_v50004_ks06_owner_delete_reuse_queue.sql`. The second migration restricts reuse to the audited Owner-deletion queue and seeds only the confirmed RC-2610-0235..0239 range. The website safely falls back to V4.29.20 behavior until the RPC is installed. Review and test the SQL on staging first. Applying it to production requires separate explicit approval; this package does not run the migration.

No Edge Function, GitHub, Vercel or production deployment is performed by the build.
