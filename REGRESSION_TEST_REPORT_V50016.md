# KeySuite V5.00.16 Regression Test Report

Test date: 2026-10-31 (Asia/Kuala_Lumpur)

## Automated tests — passed

- JavaScript syntax checks for the modified runtime scripts.
- `tests/v50016-phase3-regression.cjs`:
  - Category Edit/Done labels, five-second countdown, early-release reset contract, and unchanged three-second pricing-editor unlock.
  - All 13 Compare View product groups and font-weight 700 rule.
  - CR, CRS, and CRN material descriptions with exactly one Material line.
  - CR Product and Selection payload defaults are IE3, with no remaining IE2 default state.
  - CR 5-36 RMB 3,793 × 0.650 = RM 2,465.45 base-package conversion.
  - CR standard IE3, CHC C4/G1 standard IE2, and CHC C6/G2 standard IE3 without Motor Pricelist dependency.
  - Exact included/replacement motor requirements and precise missing-price errors for substitutions.
- `tests/v42821-pricing-regression.js` — passed.
- `tests/v50010/pricing.cjs` — passed, including currency conversion, shared pricing calculation, rounding, snapshot repricing, and missing-cost blocking.
- `tests/v50011/pricing.cjs` — passed, including CR variants and duplicate-add-on guards.
- `tests/v50012/regressions.cjs` — passed, including CR RMB source/multiplier and quotation snapshot coverage.
- Local quotation browser regression (`tests/v50010/quotation.cjs`) — passed.
- Quotation layout browser regression (`tests/v50007/quotation-layout.cjs`) — passed.
- Multi-page continuation PDF browser regression (`tests/v50007/continuation-pdf.cjs`) — passed and produced a three-page PDF.

## Verified in a live local browser — passed

Browser: installed Google Chrome in headless local-browser mode against the unpacked V5.00.16 build served from localhost.

- Category button initially displayed `Edit`.
- During a hold, the visible countdown reached `4` after the first second.
- Early pointer release reset to `Edit` and did not unlock deletion controls.
- Five uninterrupted seconds changed the button to `Done` and unlocked deletion controls.
- `Done` returned to `Edit` and hid deletion controls.
- Compare View rendered 13 tabs; computed font weight was 700 for every tab.
- Quotation item creation and frozen layout/continuation behavior passed the existing local browser suites.

Safari was not used for this build verification; no claim of Safari-session access is made.

## Frozen quotation PDF V1.08 verification — passed

- `app.js`, `quotation-templates.js`, and `pdf-optimization.js` are byte-for-byte identical to the V5.00.15 source archive.
- The only `index.html` changes are release/version references, approved cache references, and the Category Edit label; no print-layout CSS changed.
- The existing quotation layout and continuation PDF browser tests passed.

## Not completed against production

- Category archival/deletion against the live production database, including a genuinely in-use category. The unchanged confirmation and `keysuite_archive_pricing_category_v50015` safeguarded archival path were source-verified instead.
- Saving a newly created quotation to the production database and reopening production quotation history/revisions.
- Production-data verification of margins, discounts, rarity, and rounding for every customer/category combination.

These were intentionally excluded because the release was not deployed and the build restrictions require existing pricing, customers, quotations, and revisions to remain untouched. They should be performed in an approved staging environment or controlled post-deployment smoke test.

## Result

All executable automated and local-browser tests run for this build passed. No known Phase 3 defect remains. The remaining items are production-backed verification steps, not known failures.
