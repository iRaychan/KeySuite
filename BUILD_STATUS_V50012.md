# KeySuite V5.00.12 — review build

Built 30 October 2026 from the preserved V5.00.11 baseline. This is a review build, not a production deployment. The V5.00.11 folder was not modified. No production deployment or database migration was performed for V5.00.12.

## Implemented

- CR source-price handling continues to use `cr_rmb` and the CR RMB multiplier. Regression coverage confirms the source currency and conversion path.
- Product labels and category display use the existing approved display behavior; product identifiers and database keys are unchanged.
- Fixed CR family switching by routing to the correct selector and resetting series-specific state.
- Matched ISO Price List card styling to the neighboring price-list cards.
- Reworked CHC O-ring surcharges into compact Viton/EPDM group tables.
- Reworked CR seal surcharge editing into size-group rows with Ca/SiC standard, SiC/SiC add-on, and TC/TiC add-on columns; retained CR 320. CR O-rings use the compact CHC layout.
- Added BFI currency and multiplier controls using the existing CHC-style currency pattern.
- Added ISO Price List currency and multiplier controls, model search, rarity and material selection, selected-currency price display, and price saving while retaining other currency values.
- Reworked ES/ISO seal and O-ring surcharge editors into separate compact tables.
- Added ES/ISO trimming immediately before transport and included it in Many pricing and quotation price snapshots, in the approved sequence.
- Applied brand priority and the approved two-column display sequence to Customer Brand / Series Price Preference and Quotation Quick Pump Selection.
- Preserved the V4.28.72 Standard Selector Responsive Layout. The ISO selector uses the shared responsive layout and does not add zoom or scaling overrides.
- Retained quotation-history ordering by effective date, original reference, and numeric revision.
- Confirmed the frozen quotation PDF artifacts and selector-family files are byte-identical to V5.00.11.

## Requirements that remain unresolved

- **004 — Archive user / revoke login:** The summary does not define whether “archive” means the existing `active` flag or a separate archived state, nor the required session-revocation behavior and historical-record access. No user-role or authentication behavior was changed. The current app's active toggle does not revoke already-issued sessions.
- **017 — ISO Product series navigation:** The current ISO catalog does not supply a verified series field/mapping for the requested left-side series list. No series groups were inferred and the ISO Product layout was not changed.
- Discussion Logs 001–019 and their screenshots were not available in the source archive or this project mirror. The build follows the consolidated approved summary; any screenshot-only detail could not be checked.

These items require verified requirements before the affected features can be completed.

## Verification

Passed: JavaScript syntax checks for changed application modules; focused V5.00.12 regressions; existing V5.00.11 pricing and history regressions; CR pricing, CR selector, CR seal editor, V5.00.08 pricing regressions; byte comparisons for the frozen PDF artifacts and selector folders; Safari visual inspection of ISO selector at default 100% zoom.

Not run successfully: database integration suite because `@electric-sql/pglite` is unavailable; Playwright browser suite because `playwright` is unavailable. No dependency installation was attempted. See `VERIFICATION_V50012.md`.

The proposed SQL migration is packaged for review but unapplied. Existing live database prices and settings were not modified by this build process.
