# Deploy / upgrade to KeySuite V5.00.02

This static HTML/JavaScript release preserves the existing quotation PDF V1.08 layout and carries completed System Capacity and Head values through to the quotation PDF.

## Full source deployment

1. Back up the existing website source and environment configuration. Keep the existing Supabase project, keys, accounts, and data.
2. Extract `KeySuite_V5.00.02_FULL_CLEAN_GitHub.zip` into a clean source directory; `index.html` should be at the website root.
3. Preview on staging and confirm the System → Quotation → PDF duty point appears in the Description area.
4. Publish through the existing hosting process.
5. Reload open browser tabs so the V5.00.02 service worker and versioned entry point are active.

## Upgrade an existing V5.00.01 checkout

1. Back up the checkout. Extract the UPGRADE ZIP into a separate temporary directory.
2. Run `python3 tools/apply_v50002_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run.
3. If a local modification is reported, merge it manually and review; do not force an overwrite.
4. After a clean dry run, repeat with `--apply`. This copies only changed and new files; no files are deleted.

No database migration or Edge Function deployment is required.
