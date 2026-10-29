# KeySuite V5.00.12 verification

## Passed

- `node --check` on changed JavaScript modules: passed.
- `tests/v50012/regressions.cjs`: trimming sequence and snapshot, CR RMB source/multiplier, brand priority and display order, ISO selected-currency editing, ISO multipliers, and responsive selector rules: passed.
- `tests/v42858-cr-seal-editor-regression.cjs`: passed.
- `tests/v42858-cr-pricing-regression.cjs`: passed.
- `tests/v42858-cr-selector-regression.cjs`: passed.
- `tests/v50011/pricing.cjs`: passed.
- `tests/v50011/history.cjs`: passed.
- `tests/v50008/pricing.cjs`: passed.
- `assets/`, `selector/`, `selector-es/`, `selector-cr/`, and `selector-iso/` match V5.00.11 byte-for-byte.
- `tests/v50010/results/quotation.pdf`, `sealed.pdf`, and `continuation.pdf` match V5.00.11 byte-for-byte.
- `pdf-optimization.js`, the quotation PDF layout/optimization module, is byte-identical to V5.00.11.
- Safari visual inspection: ISO selector loaded at default 100% zoom. Pump Curve, Efficiency, Power, NPSH and Alternative Selections containers are within the page width with no visible horizontal overflow or clipped edges. Plots are blank when no model/duty is selected.

## Blocked by unavailable local dependencies

- `tests/v50008/database.cjs` could not run because `@electric-sql/pglite` is not installed.
- `tests/v50010/quotation.cjs` could not run because `playwright` is not installed.

No dependency installation was attempted. Database writes and the proposed migration were not tested in a local database during this build. Existing suite results from the V5.00.11 baseline are documented separately and are not a substitute for V5.00.12 staging acceptance.

## Not verified from accessible evidence

- Discussion Logs 001–019 and original screenshots were unavailable; the consolidated summary was used as the source specification.
- User archive and session-revocation behavior (item 004) remains undefined and unimplemented.
- ISO model-series mapping for the left-series/right-model Product layout (item 017) is absent from the current verified catalog and remains unimplemented.
- Full authenticated staging persistence, cross-family browser navigation, ISO Product assembly/quotation actions, and end-to-end saved preference behavior were not covered by the automated tests above.
