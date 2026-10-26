# Deploy / upgrade to KeySuite V5.00.01

This is a static HTML/JavaScript source application; no root npm install or transpilation step is required. The full ZIP is the website source root. Do not deploy test fixtures as a public entry point.

## Full source deployment
1. Back up the existing website source and environment configuration. Keep your existing Supabase project, keys, accounts and data.
2. Extract `KeySuite_V5.00.01_FULL_CLEAN_GitHub.zip` into a clean source directory; `index.html` should be at the website root.
3. Retain the existing hosting configuration and required secrets. Preview on a staging origin using the same authorized integration setup.
4. Review `QA_V50001.md` and complete the remaining real-account/visual acceptance checks.
5. Publish through your existing hosting process only after separate approval. This delivery does not deploy anything.
6. Reload open browser tabs so the V5.00.01 service worker and versioned entry point are active. Do not clear application storage or reset data. Verify version, a quotation, and KeyHQ.

## Upgrade an existing V5.00.00 checkout
1. Back up the checkout. Extract the UPGRADE ZIP into a separate temporary directory (not over your current source).
2. From that extracted directory run `python3 tools/apply_v50001_upgrade.py /absolute/path/to/existing/KeySuite` for a dry run. This validates every package file and checks each existing changed file against its V5.00.00 hash or already-upgraded hash.
3. If a local modification is reported, merge it manually and review; do not force an overwrite. Unrelated files are left alone.
4. After a clean dry run, repeat with `--apply`. This copies only changed/new files. No deletes, network, database or hosting operations occur.
5. Follow the staging checks and publishing steps above. Roll back by restoring your saved V5.00.00 source snapshot, retaining the same database.

No new migration, data reset, seed, account creation or Edge Function deployment is needed. Existing V5.00.00 database prerequisites remain unchanged; do not rerun historical SQL merely because it is included in the full archive.

## Reproduce local checks
- `node tests/v50001/pricing.cjs`
- `python3 -m http.server 8261 --bind 127.0.0.1`
- With Playwright and Chrome installed: `node tests/v50001/browser.cjs`
- Package: `python3 tools/build_v50001_release.py --base /path/to/KeySuite_V5.00.00_FULL_CLEAN_GitHub.zip --output /path/to/output`

Local browser tests use the pre-existing test host only. They do not connect to production Supabase. ZIP checksums are in the delivery's `SHA256SUMS.txt`; source checksums and baseline guards are inside each package.
