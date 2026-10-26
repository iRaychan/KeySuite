# Deploy / upgrade to KeySuite V5.00.05

This targeted frontend release implements KS-09, KS-10 and KS-11 on the supplied V5.00.04 baseline.

## Full source deployment

1. Back up the existing website source and environment configuration. Keep the existing Supabase project, keys, accounts and data.
2. Extract `KeySuite_V5.00.05_FULL_CLEAN_GitHub.zip` into a clean source directory; `index.html` should be at the website root.
3. Preview on staging and complete the checks in `CHANGE_TEST_REPORT_V50005.md`.
4. Publish through the existing hosting process only after acceptance.
5. Reload open browser tabs so the V5.00.05 service worker and versioned entry point are active.

## Upgrade an existing V5.00.04 checkout

1. Back up the checkout. Extract `KeySuite_V5.00.05_UPGRADE_from_V5.00.04.zip` into a separate temporary directory.
2. Run `python3 tools/apply_v50005_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run.
3. If a local modification is reported, merge it manually and review; do not force an overwrite.
4. After a clean dry run, repeat with `--apply`.

## Production and database boundary

No database migration or Edge Function deployment is required. This package does not connect to, alter or deploy production Supabase, GitHub or hosting.
