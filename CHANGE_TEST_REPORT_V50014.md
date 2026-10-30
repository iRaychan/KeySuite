# KeySuite V5.00.14 Change and Test Report

Date: 30 October 2026 (Asia/Kuala_Lumpur)

## Baseline and scope

- Baseline SHA/source: the user-approved `deliverables/KeySuite_V5.00.13_FULL_BUILD.zip`.
- Work was performed in a separate `work/v50014/KeySuite_V5.00.14` directory.
- The original ZIP and synced project reference files were not modified.
- No Supabase change or deployment was required or performed.

## Automated results

All executed checks passed:

1. `tests/v50014-release-regression.cjs`
   - All eight V5.00.14 requirements.
   - Numeric quotation sequence sorting with mixed `R-` / `RC-` prefixes.
   - Fixed brand grid ordering and symbol-last behavior.
   - ISO series/model/action structure.
   - ISO/ES responsive CSS contract equivalence.
2. `tests/v50012/regressions.cjs`
   - ES/ISO trimming and pricing order.
   - CR RMB mapping.
   - ISO price editing/multipliers and responsive rules.
3. `tests/v50011/history.cjs`
   - Effective date, original sequence and revision order.
4. `tests/v50011/pricing.cjs`
   - Component pricing, generation pricing, CR variants and ISO imports/dimensions.
5. `tests/v50013/user-archive.cjs`
   - Existing archive/restore and access protections.
6. `tests/v42922-tyre-coupling-regression.cjs`
7. `tests/v42859-assembly-pricing-regression.cjs`
8. `tests/v42858-cr-pricing-regression.cjs`
9. JavaScript syntax validation for every modified runtime script.

## Browser and Safari layout verification

- Native Safari was reset to Actual Size (100%) with `Command-0`.
- The local V5.00.14 ISO selector visibly contained Required Duty, Pump Curve, Efficiency, Power and NPSH without horizontal clipping.
- No artificial zoom/scale is present; computed zoom was `1`.
- Independent responsive measurements:

| Viewport | Document width | Scroll width | Horizontal overflow |
|---:|---:|---:|---|
| 1440 | 1440 | 1440 | No |
| 1280 | 1280 | 1280 | No |
| 1100 | 1100 | 1100 | No |
| 1024 | 1024 | 1024 | No |

- At 1280 px, ISO and ES produced the same main-panel geometry: left 378 px, right 1266 px, width 888 px.
- The standalone npm Playwright package was not present in the uploaded build, so legacy Playwright scripts could not be launched from Node. The native Safari check and in-app browser measurements above were used instead.

## Regression/protection verification

- Diff review confirms the quotation print/PDF layout block was not edited.
- `selector-iso/index.html`, ISO data, ES data and shared selector algorithms were not changed.
- Pricing tables, category rules, permissions, customer assignments and quotation records are not rewritten by this upgrade.
- Version, manifest and service-worker cache were advanced to V5.00.14.

## Release result

- Full build: `KeySuite_V5.00.14_FULL_BUILD.zip`
- Upgrade: `KeySuite_V5.00.14_UPGRADE_from_V5.00.13.zip`
- Database migration: none
- Deployment: not performed

