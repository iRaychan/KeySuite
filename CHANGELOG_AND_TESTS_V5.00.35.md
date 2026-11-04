# KeySuite V5.00.35 — new batch Bugs 001–004

Baseline: user-supplied KeySuite_V5.00.34_FULL_BUILD.zip. Date: 4 November 2026 (Asia/Kuala_Lumpur).

## Bug 001 — direct Product Cost customer/configuration resolution

Root cause: the generic Product audit adapter read CHC controls for ES. The CHC material string did not match any ES price variant, so lookup returned no result despite the active customer. Other family-specific controls were also omitted by the generic adapter.

Fix: resolve ES material plus MS/GP seal type and the selected seal/elastomer from the ES controls. Resolve CR, KV, BFI and ISO controls from their own forms. Use the active pricing customer explicitly; source-only inspection remains available when no active customer exists. Source snapshots reprice using saved customer/category identifiers when those are present. Brand Margin fallback uses the existing customer/default-brand resolver.

Files: costing-audit-v50032.js, pricing.js, v40001-multibrand.js.

Test: Chrome fixture, ES 32-13 with selected customer. Product Cost versus the shared source-snapshot route used by Curve produces identical Assembly/Individual finals. No-customer route still shows USD 134.49 and converted MYR 739.70. Permission denial and manual override retention tested. PASS.

## Bug 002 — initially blank Product Curve

Root cause: when the Product iframe was newly moved into the curve host, it was absent from the earlier host visibility loop and could retain display:none. Rendering could occur before the host had a usable width. A stale acknowledgement could also update the current model/pole state.

Fix: explicitly display and size the active frame after moving it; wait for a usable container width before posting the model; retain the native readiness/retry path. Reject acknowledgements for a different model/pole before updating state. Show loading and bounded failure messages.

File: v394411-product-curve.js.

Test: actual ES 32-13 native selector repeatedly loaded at 2P and 4P; Product Curve runtime repeatedly opened/closed/reopened with an initially hidden iframe. Valid selection payloads and rendered SVGs verified. PASS. Hydraulic datasets and interpolation code were not edited.

## Bug 003 — independent variants and component provenance

Root cause A: Selection Cost preferred base_model, discarding the CHCS/CHCN variant. Generic product and quotation paths could omit the selected material. The authoritative engine supports separate variant books, but these adapters supplied the wrong identity.

Fix A: preserve explicit CHCS/CHCN identity while using CHC only to locate the shared catalogue row; carry selected material through pricing and quotation requests. Preserve variant-specific rarity. Bare-shaft recalculation retains the original available currency candidates.

Root cause B: motor snapshots omitted source currency/price/rate and the bare-shaft branch retained only a motor ID/raw total. Component pricing returned only a combined surcharge. Standard complete-package motors returned before diagnostic details were recorded.

Fix B: retain source data in motor snapshots and detailed component pricelist entries. Expandable Assembly and Individual component trails show matched motor/specification, source values, conversion, inclusion/deduction, seal/component schedule and adjustments. Missing matches remain labelled unavailable. A standard included motor remains informational with no second addition. Existing motor substitution, seal surcharge and rounding formulas are preserved.

Reconciliation correction: Product/Selection audits no longer invent a saved quotation price from an unbranded intermediate calculation. An actual explicitly supplied saved quote price is still compared using the applicable route; opening the audit does not write back to quotations.

Files: costing-audit-v50032.js, pricing.js, component-prices-v50011.js, app.js.

Test: isolated catalogue fixture reproduces the supplied reference values 1560 / 2161 / 2348 for CHC / CHCS / CHCN 10-40 and independent common/many/rare settings. These are test fixtures only. Chrome bare-shaft audit verifies CHCN 2348 and the matched motor source sub-trail. Inherited complete/bare motor, component, currency, assembly and trimming regressions pass. PASS. Production price records were not read or overwritten for this build.

## Bug 004 — filename, metadata title and counter

Root cause: browser Print-to-PDF used document.title as both suggested filename and PDF title. Competing branding passes reassigned that title. The Item counter was consumed when reserving a name, before generation succeeded, and its context included the quotation number.

Fix: existing pump report pages now generate downloadable PDF bytes with a separate filename and PDF Info.Title. Customer filenames use Item NN + model + available duty; no-customer filenames use model + available duty. The metadata title uses generation date + model + available duty. Reservation does not increment; successful generation commits the Item number. The counter follows the active customer session and the existing Dashboard X reset.

The report markup and datasets remain unchanged. The new downloadable PDF preserves rendered pages as high-resolution images. Bundled, pinned html2canvas 1.4.1 and jsPDF 2.5.2 are included for offline rendering.

Files: app.js, v40001-selector-brand.js, v40001-product-series-overhaul.js, pump-pdf-download-v50035.js, vendor/html2canvas-1.4.1.min.js, vendor/jspdf-2.5.2.umd.min.js.

Test: actual native ES three-page report passed through the report-writing hook and downloaded successfully. Suggested filename contains Item 01; embedded Title inspected with pdfinfo contains generation date/model/duty and no Item number. All three A4 pages rendered and visually inspected. Counter reservation, commit, no-customer filename, and Dashboard X reset verified in Chrome. PASS. Adobe Acrobat itself and Safari were not available for UI acceptance; embedded metadata was verified directly from PDF bytes.

## Regression evidence and scope

- tests/v50035-browser.cjs: selected customer Product parity, independent variants, motor source trail, native ES pole switching, hidden-frame open/reopen, actual PDF download, naming/counter/reset, permission denial, no-customer source costs, manual override retention.
- Existing V5.00.10 currency pricing, V5.00.11 component/ISO pricing, V5.00.12 trimming/snapshot, V5.00.31 KV/permissions, V5.00.33 motor source deduction, V4.28.59 assembly/system pricing: PASS.
- Changed JavaScript syntax checks: PASS.
- Sample generated PDF and rendered page previews: tests/v50035-results/.

No authenticated production customer writes, quotation saves, database migration or Edge Function deployment was performed. Full authenticated multi-family acceptance, Adobe Acrobat UI inspection and Safari download acceptance remain deployment checks. Older release reports/tests are retained as historical reference; their version/hash assertions are not V5.00.35 release gates.
