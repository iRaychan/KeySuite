# KeySuite V5.00.34 — Phase 05 change and verification report

Source baseline: V5.00.33 reconstructed from the supplied V5.00.32 FULL BUILD plus the official V5.00.33 upgrade package. No synced reference files, production data, customer records, or quotations were edited.

## Fixes

1. **Bug 001 — Brand Margin order and transparent fixed Trimming**
   - Confirmed KeySuite percentages use gross-margin recovery (`value ÷ (1 − rate)`), not markup or deduction.
   - Brand Margin now runs immediately after Converted MYR and the source-stage motor adjustment, before category Margin.
   - ES/ISO Trimming remains a fixed RM value after Margin/Normal/Rare. It is not capped, hidden, reduced, or included in the Brand Margin base.
   - The brand wrapper now carries Trimming through Commission, discounts, fuel, unrounded price, and final price.

2. **Bug 002 — Product Costing Audit without customer**
   - The audit resolves catalogue USD/RMB/MYR source prices and conversion ratios without requiring a selected customer.
   - When customer/category rules are unavailable, the audit shows source costs and Converted MYR, then labels selling-price stages unavailable. It never substitutes a zero price.

3. **Bug 003 — Running calculation traces and reconciliation**
   - Each route now shows adjustment and resulting running total for Assembly and Individual independently.
   - Motor adjustment is shown at the source stage; Brand Margin, Margin, Normal, Rare, Trimming, Transport, Commission, Set Discount, Final Discount, fuel, component/seal adjustment, unrounded price, and rounding follow the actual calculation path.
   - Reconciliation states whether the saved quotation is compared with Assembly or Individual. Manual overrides are retained and explicitly identified; the audit does not write prices.

## Compatibility and data safety

- Existing percentage semantics were preserved.
- Existing quotation values and manual overrides are not mutated by the audit.
- No database migration, Supabase deployment, secret change, or production write is required.
- V5.00.33 historical reports and tests remain in the full build as reference material.

## Verification

- JavaScript syntax checks for changed runtime files.
- Existing pricing, trimming, motor-source deduction, and pricing regression suites.
- V5.00.34 focused fixture for Brand Margin order, RM19,950 fixed Trimming, customer-free ES source costs, running-trace labels, manual-override reconciliation, and version lock.
- Browser audit fixture and full static regression suite are run during release packaging; results are recorded in `BUILD_VERIFICATION_V50034.txt`.
