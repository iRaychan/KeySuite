# KeySuite V4.28.67 Verification

## Automated checks

- `node tests/v42867-functional-regression.cjs`
- `node tests/v42867-release-regression.cjs`
- V4.28.65 and V4.28.66 functional/release regression suites
- Pricing, CR Selector, assembly/system pricing, and CR seal-editor behavior suites retained from earlier releases
- JavaScript syntax checks for changed runtime files
- Archive content and checksum verification

## Covered behavior

- macOS CR has no separate zoom/grid override; Windows CR CSS remains unchanged.
- Quotation filename examples cover base and revision forms, and the version lock preserves the active print title.
- Selector customer filtering ignores restored quotation form state while explicit Dashboard customer filtering remains.
- Both CR PDF routes use cached drawing assets, wait for decode, and retain the frozen Page 3 geometry.
- CHC generation preparation is Windows-only and hides only a stale generation frame until its replacement loads.
- V4.28.66 regression suites were run in addition to the V4.28.67 targeted tests.

No live database or production deployment was performed.
