# KeySuite V5.00.10 — verification report

Date: 28 October 2026. Final source is in KeySuite_V5.00.10; no frontend deployment or GitHub push was performed.

## Automated checks passed

- `pricing.cjs`: shared BGF currency conversion, margin/calculation path, RM10 rounding, snapshot repricing, duty-independent pricing and missing-cost protection.
- `basketball.mjs`: six modes, three dunk styles, configurable shot/time limits, manual movement/sprint, pass, steal, jump and charged shot.
- JavaScript syntax and package integrity checks are recorded in `tests/v50010/results/release-audit.json` and the external package verification manifest.

## Automated local browser tests passed

These used headless Google Chrome, the actual local application and deterministic synthetic data. KeyHQ account/social responses came from the included test host, not authenticated production users.

- `acceptance.cjs`: delayed-presence manual mode, Auto/Manual switch, real keyboard input during basketball, score, failed initialization recovery, zoom restoration; indoor upstairs/downstairs with maximum sampled height change 0.022 m and NPC stair routing. All 17 appearance selectors produce distinct variants, all four color controls affect geometry/materials, preview/save payload parity and iframe reload against the simulated account profile. Visitor assignment changes retain 12 unique identities and remove desks.
- `campus-extra.cjs`: same-system vehicle mounting and animated dismounting, empty-path idle, blocked-path retries and idle termination; visitor office/door/ownership denial with public routes allowed; nine finite dives; coffee/beer/cigarette props and table/hand transitions while seated; Follow upper-floor/roof cutaway and restoration; invalid-coordinate recovery.
- `regression-browser.cjs`: all six outdoor tower stair flights, 10/20/30 m platform edges, nine dive styles and return-to-ground movement, guided 30 m ascent, persistent Explore setting, seven entrance routes, wall cutaway and Free-mode restoration.
- `quotation.cjs`: BFI/BGF/CHC/KeyPLC/Assembly row edit preservation, cursor stability at start/middle/end, exact multiline roundtrip and unchanged unit price; nested System component brands, no invented brand and no duplicate printed brand; mixed manual items, capacity, custom units, copy/delete/reorder and 470.35 expected total; Original/Revised dates, revised-date history sort and requested brand ordering.
- `product-browser.cjs`: four actual BGF Product Quote buttons, unit conversions, quantity changes and unchanged selling price.
- `regression-sealed-pdf.cjs`: retained sealed KeyPLC/Assembly capacity description and output structure.
- `regression-continuation-pdf.cjs`: three-page quote, continuation item distribution, borders and final-page summary rules.
- `regression-quotation-layout.cjs`: expandable multiline descriptions and existing Note/Messenger controls.

Rendered evidence is under `tests/v50010/results/`: court, desks, stairs, male/female avatars, tower/entrances and quotation/sealed/continuation PDFs. Court, staircase, desk and avatar images were reviewed. The first quotation PDF page was reviewed; labels were widened to accommodate the two required dates.

## Connected database checks passed

Both migrations were explicitly approved by the user and applied to KeySuite (`skidqdixnnnuhvarekxp`):

1. `20261028093313_keyhq_v50010_avatar_pose_height_coffee.sql`: private pose validator accepts heights through 31 m and coffee carry mode. Existing checks retained. Anonymous execute privilege remains false.
2. `20261028145829_keysuite_v50010_quotation_revisions.sql`: revision-only branch in the established save function, source/ownership validation, serialized reference allocation and original/revised date fields. Anonymous execute remains false; authenticated execute remains true.

A rollback-only test transaction used an active owner identity context and synthetic quotations to call the real save functions. It verified R1 from the original, R2 from R1, R3 from the original, unchanged original document, exact item content, separate dates and unchanged normal sequence table. All fixture writes were rolled back. This is a database integration test, not a browser login test or a concurrency stress test. Historical quotation rows were not migrated or renumbered.

Initial migration compilation was rejected due to a missing statement terminator; corrected before successful application. An initial revision assertion expected lowercase while the established saver canonicalizes references to uppercase; the corrected assertion passed. Earlier browser-test setup failures (unfinished animated dismount, stale blocked-route flag and actors still loading after refresh) were corrected and affected suites rerun. No unresolved failure remains in the final executed suites.

## Not performed / remaining limitations

- No authenticated production browser end-to-end run, logout/login persistence test, two-user multiplayer or real invitation exchange. Profile persistence was tested through a simulated service roundtrip and reload, not a real account logout/login.
- No real concurrent revision-save stress test. The live branch uses a transaction advisory lock and existing uniqueness safeguards; the live test covered sequential allocation.
- Product/Selection/Assembly/System metadata and row paths were tested with synthetic fixtures plus actual BGF Product buttons. Full live selector catalogs, every assembly configuration and all customer-specific pricing permissions require authenticated acceptance.
- Visitor source uses the existing company-scoped selection-assignment RPC; full production assignment changes across multiple live sessions were not exercised. Missing scope records retain existing staff behavior rather than inventing assignments.
- Smoke/cup/bottle transitions passed geometry/state assertions, but naturalness and clipping for every body/seat combination require visual acceptance. The previously approved leisure reference image was not available in the supplied accessible files; no exact visual-match claim is made.
- Avatar controls, rendering and refresh parity were tested. Premium styling is subjective; no claim of matching Apple's character assets. No extended low-end-device performance benchmark was run.
- Pole relocation and new desk styling received source/render review; exhaustive driving clearance on every road was not tested. Tablet/mobile/Safari were not tested in this release.
- Existing unrelated modules were preserved; the regression checks listed above are not exhaustive coverage of all KeySuite functions.

## Release integrity

The package audit compares every baseline file, records changed/added SHA-256 hashes, verifies that baseline files were not deleted, syntax-checks changed JavaScript, excludes build dependencies and checks that applying the upgrade to V5.00.09 produces the same file bytes as the FULL CLEAN archive. The original Keylargo logo asset is byte-identical to the baseline. The archive verification JSON gives final counts and archive hashes.
