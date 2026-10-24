# KeySuite V4.29.02 Upgrade

## Change

The Product curve wrapper no longer suppresses the existing alternative-model recommendation panels for ES and BFI. The selectors' existing recommendation rules and candidate cards are reused without modification.

The embedded selector now remeasures its height whenever expandable settings or rendered results change, allowing Windows browsers to scroll below expanded Orifice settings and reach the restored recommendations.

## Scope

- Runtime changes: family-specific visibility in `v394411-product-curve.js` and embedded-selector visibility/height synchronization in `v40001-product-series-overhaul.js`.
- ES and BFI alternatives are restored.
- CHC and CR alternatives remain suppressed in Product curve views.
- No selector data, ranking, calculations, pricing, actions, PDF output or layout styling is changed.
- Release metadata is updated to V4.29.02.
- No database migration or edge-function deployment is required.
