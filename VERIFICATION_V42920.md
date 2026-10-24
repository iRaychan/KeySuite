# KeySuite V4.29.20 verification

## Automated checks

- JavaScript syntax: PASS for `app.js`, `quotation-references.js`, `v41200-bootstrap.js`, the V4.29.19 compatibility shim, `v42920-version-lock.js` and `sw.js`.
- `v42920-release-regression.cjs`: PASS, including functional compaction of a simulated 900 KB embedded image.
- `v42920-version-lock.cjs`: PASS.
- `keyhq-integration-regression.cjs`: PASS.
- Directory comparison against V4.29.19: only the documented quotation, version, release and test files changed; unrelated modules and layouts are byte-preserved.

## Supabase production verification

- Migration `v42920_atomic_quotation_save`: deployed successfully to KeySuite project `skidqdixnnnuhvarekxp`.
- Function privileges: `PUBLIC` false, `anon` false, `authenticated` true; `search_path` is pinned empty.
- Current authoritative previews: R returns `R-2610-0236`; RC returns `RC-2610-0236`.
- Transaction rollback test: PASS. RC first save allocated `0236`; an R-owner update of that logical ID retained `RC-2610-0236` and the RC creator; a second new R quotation allocated `0237`; all test rows and the sequence update rolled back.
- Visibility test: RC Owner received all 35 company rows; a non-owner account received zero foreign rows.
- Security and performance advisors were reviewed after deployment. The project has existing advisory findings outside this release; V4.29.20 adds no table, view or RLS policy.

## Packaging

- Full and upgrade ZIP contents and SHA-256 checksums are verified during final packaging.
