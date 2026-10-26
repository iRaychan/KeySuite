# KeySuite V5.00.05 change and test report

Release baseline: user-supplied `KeySuite_V5.00.04_FULL_CLEAN_GitHub.zip` (SHA-256 `22adceaf4683de5963d0b228fc07f091f9529c39cdff22c341abb37f6c707800`).

## Implemented changes

### KS-09 - System and Pumpset capacity/head units

- Added the exact Dashboard Capacity and Head option sets and ordering to System and Pumpset/Quotation controls.
- Added bidirectional conversion through m³/hr and metres when the selected unit changes.
- Kept backward-compatible parsing for legacy unit labels.
- Preserved the selected label and converted numeric value through assembly metadata, quotation serialization and PDF description generation.

### KS-10 - safe PDF description expansion

- Changed only the dedicated System/Pumpset description continuation row: its single cell now spans Description, Qty, Unit Price and Total.
- Price values remain in the preceding item header row and are never overlaid.
- Updated pagination estimation for the wider continuation row.

### KS-11 - manifold language

- Updated the manifold description generator to emit `Isolation valves` and generic `Strainer` wording.

## Verification results

- PASS - JavaScript, JSON and Python syntax checks.
- PASS - KS-09 browser test: both System and Pumpset/Quotation show the exact five Dashboard units in the correct order; m³/hr to US gpm, Mtr to Ft, m³/hr to Imp gpm and Mtr to bar conversions matched the Dashboard factors.
- PASS - KS-09 sealed-history round trip: converted values and selected labels survived quotation serialization, sealed reload and PDF generation unchanged.
- PASS - KS-10 DOM geometry: the populated item header retained five cells and both price values; the separate description row contained one `colspan="4"` cell, stayed within the table boundary and kept the full `...each pump` phrase on one rendered line.
- PASS - KS-10 visual PDF review: A4 page, logo, header, prices, totals, rules and footer remained aligned with no overlap or clipping.
- PASS - KS-11 generator test for both-flexible/strainer configuration: `Isolation valves`, `Strainer`, and no legacy wording.
- PASS - retained KS-08 three-page pagination fixture: items 1-2 on the first item page, items 3-4 on the final page, no false continuation rule and three final summary rules.
- PASS - retained KS-04 deletion safety, auth bootstrap, assembly pricing, motor price, final-to-final motor replacement and tyre-coupling regressions.
- PASS - FULL CLEAN and UPGRADE ZIP CRC/file-list checks, dry-run/apply verification, and applied-upgrade/full-clean parity across all 830 release files.
- PASS - all 119 `supabase/` files are byte-identical to the supplied V5.00.04 baseline.
- No production service was contacted or changed.

## Deployment status

- Production Supabase: not modified.
- GitHub / hosting: not deployed.
- Edge Functions: not deployed and not required.
