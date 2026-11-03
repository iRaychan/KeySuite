# KeySuite V5.00.33 — change and verification report
Source: user-supplied V5.00.32 FULL BUILD. Date: 3 November 2026.
Only Bugs 001, 003–009 and 011 were addressed. Existing model punctuation and KeyLab RM50 behavior were retained.

| Bug | Root cause and changes | Verification |
|---|---|---|
|001|Selector report title locks continued to assign the downloaded Item filename after parent metadata transforms. Report title locks now use generation-date/model metadata separately from filenames; ES/ISO report windows also set the date/model title.|Generated ES PDF inspected with pdfinfo: Title = 261103 - ES 65-26. All nine selector inline scripts compiled. Other family print dialogs and Safari need acceptance.|
|003|Dashboard had a truncated family list and routed every non-CHC/BFI family to ES. Shared hydraulic registry now supplies eligible entries and family-specific frames; BGF/BSW copied acknowledgements corrected from KV.|Registry and routing inspected; live account preference round-trip remains acceptance.|
|004|Customer curve entries and selection-key mapping omitted BGF/BSW. Both preference surfaces now use the shared hydraulic registry. Price and Curve controls remain separate and existing keys retained.|Static path checks; real customer save/reload not exercised. No stored preferences modified.|
|005|ES payload construction called an undefined dmax helper, aborting Dashboard responses after successful selection.|Chrome: direct Select and Dashboard request both return ES 65-26 at 90 m³/hr @ 90 m, with zero page errors.|
|006|Flex rows shifted remaining actions when Curve was omitted.|Fixed four-column action grid with reserved Curve slot. Browser fixture checks equal Cost x-coordinate with/without Curve.|
|007|Parent styles did not apply inside selector frames. Header actions were enhanced independently and could split groups.|Frame stylesheet plus a single PDF-parent action group; cost retains permission gate. Shared rules cover all selector frames. Full live-family viewport review remains acceptance.|
|008|Product audit inferred a source ID/generation from decorated labels, and numeric conversion treated null as zero.|Product route resolves technical CHC aliases, generation, source product ID and current options using the same find/reprice engine. Browser fixture verifies a nonzero CHC C4 result; unresolved context displays unavailable values.|
|009|Audit only exposed the chosen source currency, omitted conversion rows, and did not include the existing brand-price wrapper.|Six source columns now show available engine candidates, conversion ratios and MYR conversions; highest conversion highlighted green. Shared trail includes brand/motor/seal rows. Uses existing commercial brand calculation; reports its after-Transport application in the label. System uses flattened BOM and assembly reconciliation route.|Browser multi-currency fixture and existing pricing regression passed. Full production System BOM, manual overrides and all customer/category permutations need acceptance.|
|011|Bare-shaft adjustment was subtracted from the final selling price and snapshot repricing omitted bare_shaft. Brand wrapper could restore motor-inclusive base.|Motor source cost is deducted from converted pump cost before pricing stages. Snapshot preserves the deduction and bare flag; brand wrapper uses adjusted source. Complete standard motor is not added twice.|Isolated engine fixture: complete 2500, bare 2000 (test values only), and bare snapshot reprice 2000. Existing pricing regressions passed. Actual CHC 8-6 production Motor Pricelist matching requires account acceptance.|

## Tests actually run
- Syntax checks: pricing, costing audit, shared registry, customer preferences, Dashboard, branding, version/service worker.
- All inline script blocks compiled in selector, selector-g1, CR, KV, BFI, BGF, BSW, ES and ISO.
- tests/v50031-regression.cjs: PASS (existing catalogue/curve/permission/DB-contract regression).
- tests/v50010/pricing.cjs: PASS (existing multi-currency pricing regression).
- tests/v50033-motor.cjs: PASS.
- tests/v50033-es-browser.cjs: PASS.
- tests/v50033-audit-browser.cjs: PASS (isolated pricing fixture and Cost column alignment).
- tests/v50033-pdf-browser.cjs: generated a real ES report; pdfinfo Title verified above. First page rendered and visually inspected.
Test prices are fixtures, not application data. Browser fixture screenshot is not production account acceptance.

## Remaining limitations
No authenticated production quotation/customer writes, full System BOM end-to-end checks, Safari print checks, or exhaustive per-family UI acceptance were performed. These remain required before production promotion. The inherited v50032 static test is version-pinned and is retained as historical test material; it is not the V5.00.33 acceptance suite.
No production data, historical quotation or pump curve dataset was edited.

## Deployment
Frontend upload is required. Deploy the complete FULL BUILD through the existing hosting workflow, preserving Supabase connection configuration. Refresh clients for service-worker cache keysuite-v50033-20261103.
No new SQL migration, Edge Function deployment, secret or Supabase configuration change is required. Existing V5.00.31 costing-permission RPC/migration is a prerequisite and was confirmed present in the earlier production review.
No website publication or Supabase mutation was performed for this build.
