# KeySuite V5.00.15 Change and Test Report

## Automated validation

- JavaScript syntax: PASS for all modified JavaScript files.
- Phase 2 regression contract: PASS across all 14 mandatory areas.
- Existing user archive/restore regression: PASS.
- Existing tyre coupling regression: PASS.
- Existing final-to-final motor replacement regression: PASS.
- Existing version-lock regression: PASS.
- Hydraulic source preservation: PASS; ISO/ES selector data/core and `power-curve.js` are byte-identical to V5.00.14.
- Upgrade installation test: PASS; the upgrade payload was overlaid on a clean V5.00.14 copy and the V5.00.15 regression/syntax checks passed from the installed result.
- ZIP integrity: PASS for both the full-build and upgrade archives.

## Safari validation

Safari was used locally at 100% browser zoom (`Command-0`) against the V5.00.15 files. The standalone ISO and ES selector pages were compared at the same window width. Their field/header structure and responsive panel layout matched, with no visible horizontal page overflow or clipped control/graph cards.

The user's authenticated live KeySuite session was not available in the Safari window used for this build, so this report does not claim an authenticated live-suite deployment test. Product-page integration and quotation/database scenarios were validated by source/regression contracts; final authenticated acceptance should be performed after staging the build and database migration.

## Database-dependent acceptance still required on staging

- Category dependency blocking against real assigned customers.
- Normal/expired-session/timeout quotation saves and retry read-back against Supabase.
- Full History/revision Copy/Paste flow under two distinct user accounts.
- ISO Product Curve model loading inside the authenticated KeySuite shell.

