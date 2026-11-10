# KeySuite V5.00.62 review build

Baseline: KeySuite V5.00.61 DEVELOPMENT FULL BUILD supplied by the user. Scope: Brand Mapping Bugs 001–003 only. This build has not been deployed and does not add a database migration.

## Changes

- Added a frontend-only Brand filter with All Brands and Unassigned choices. Add Mapping and all row actions remain available.
- Fixed the mapping table's column widths and enabled horizontal scrolling on narrow screens.
- Resolved CHC material variants through the selected Brand and exact CHC G1/G2 Price Group. An exact active variant mapping takes priority; otherwise one active CHC master mapping derives CHCS/CHCN and the corresponding selling series. Ambiguous exact/master mappings return no identity.
- Corrected Product and Selection Costing Audit to look up CHC source models instead of OEM selling aliases, and added the resolved selling/source identity to the audit.

## Verification

- `node --check` passed for the modified JavaScript and bootstrap/service worker.
- `node tests/v50062-brand-mapping.cjs` passed: Standard, SS304, SS316, another CHC brand, G1/G2 isolation, explicit precedence, ambiguity, ES isolation, and the Costing Audit source-model handoff.
- `python3 tools/build_pages.py` passed: 415 published runtime files and 558 local reference edges checked. Its report lists 71 baseline unresolved literals already present in the supplied V5.00.61 build.
- File comparison against the supplied V5.00.61 ZIP found only nine changed source/metadata files; no baseline file is missing.
- No authenticated live Supabase pricing calculation or interactive Safari test was run in this local review build.

## Rollback

Restore the supplied `KeySuite_V5.00.61_DEVELOPMENT_FULL_BUILD.zip` to the static hosting source and republish its website bundle. No database rollback is needed for V5.00.62. Preserve the current hosting bundle until this build is approved and validated.
