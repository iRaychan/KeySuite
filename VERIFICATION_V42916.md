# KeySuite V4.29.16 Verification Notes

Verified on 21 October 2026 (Asia/Kuala_Lumpur) against the exact uploaded V4.29.15 archive SHA-256 `6a63f730f76d4765fc942bf13157f39ee772492ca09b07bc633f560af664c6e5`.

## Passed

- JavaScript syntax: `app.js`, `keyhq-launcher.js`, `keyhq/app.js`, bootstrap, version lock and service worker.
- `tests/v42916-release-regression.cjs`.
- `tests/keyhq-integration-regression.cjs`.
- Existing pricing regression (`v42821-pricing-regression.js`).
- Existing final-to-final motor price regression (`v42914-motor-final-price-regression.cjs`).
- Existing assembly/system pricing and BOM regression (`v42859-assembly-pricing-regression.cjs`).
- Existing curve timing regression (`v42875-curve-timing-regression.cjs`).
- Browser visual verification of the eight-floor KeyHQ, rooftop facilities, responsive layout, Kuala Lumpur clock and Day preview. Browser console reported no errors.
- Database migration contains authenticated-only RPC grants, anonymous revocation, company boundary checks, Owner role checks, immutable creator checks and quantity normalization. The paired verify migration asserts function presence and execute privileges after deployment.

## Preservation audit

- `keylargo-logo.png` matches V4.29.15 byte-for-byte: SHA-256 `5ab07e647741bc8bc79faf8237d6b2ce5ba77499ac3b4a75216d17acba8ba1b1`.
- `pricing.js`, `assembly.js`, `power-curve.js`, `quotation-templates.js`, `pdf-optimization.js`, `motor.js`, `coupling.js`, `baseplate.js` and `manifold.js` match the uploaded V4.29.15 baseline byte-for-byte.
- Source workbooks and selector/product data were not changed.

## Known baseline-only test

`tests/v42866-functional-regression.cjs` expects an obsolete literal `G1_DIMENSION_IMAGES['3']||Object.values`. It fails identically in the untouched uploaded V4.29.15 baseline. This is not a V4.29.16 regression and the related selector source was not modified.

## Deployment verification required

No production Supabase project was modified while building this package. Apply the two V4.29.16 migration files in order; the second file performs the database-side installation/privilege assertions. Then test one Owner account and one assigned user account before production rollout.
