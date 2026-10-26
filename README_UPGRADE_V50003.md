# Deploy / upgrade to KeySuite V5.00.03

This targeted KS-05 static HTML/JavaScript release preserves completed System Capacity and Head through save, seal, secure-history reload and PDF export. PDF V1.08 is otherwise unchanged.

## Full source deployment

1. Back up the existing website source and environment configuration. Keep the existing Supabase project, keys, accounts and data.
2. Extract `KeySuite_V5.00.03_FULL_CLEAN_GitHub.zip` into a clean source directory; `index.html` should be at the website root.
3. Preview on staging and confirm `Capacity: 8 L/s (28.8 m³/hr) @ 25 Mtr` remains immediately below the bold System title after save, seal and History reload.
4. Publish through the existing hosting process only after acceptance.
5. Reload open browser tabs so the V5.00.03 service worker and versioned entry point are active.

## Upgrade an existing V5.00.02 checkout

1. Back up the checkout. Extract the UPGRADE ZIP into a separate temporary directory.
2. Run `python3 tools/apply_v50003_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run.
3. If a local modification is reported, merge it manually and review; do not force an overwrite.
4. After a clean dry run, repeat with `--apply`. This copies only changed and new files; no files are deleted.

No Supabase database migration, Edge Function deployment or production deployment is required or included.
