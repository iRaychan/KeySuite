# KeySuite V5.00.36

Baseline: the supplied Desktop KeySuite_V5.00.35_FULL_BUILD.zip. This is a complete application, not replacement snippets.

## Changes

- Bug 001: audit family detection now starts with the actual model, rather than searching unrelated document headings for short family substrings. CHC generation is retained; CR material selections are respected. Product, Curve and Selection call the shared family pricing functions with the active customer. Missing calculations report source/category/currency prerequisites instead of always blaming an unselected customer. Existing category selections are not changed to manufacture prices.
- Bug 002: ISO Product Cost resolves its model through the ISO module that owns the loaded catalogue and saved overrides. Source-only ISO lookup uses material variants, not nonexistent scalar price fields. ISO prefixes are normalized while independent material prices and rarity remain intact. The 50-32-160 CI / SS / SS / MS USD 260.39 record is retrieved, not hardcoded in the fix.
- Bug 003: workbook Price Column extraction found 178 models and 378 available M/MA/T/TA variants. The bundled availability map controls the four horizontal Price/Rarity groups. X has no controls; zero cannot become a calculated selling price. New saved prices use independent USD/RMB/MYR fields and rarity. BSW Product/Selection/Assembly/Quote and snapshot repricing call the shared pricing engine. Existing catalogue/performance records are retained. Existing complete descriptions and manual-price fallback remain available when a valid variant has no price.
- Bug 004: pink, text-only Cost actions added to Motor, Baseplate, Coupling and Manifold configuration actions. Existing Product row audits also dispatch GWS, KeyPLC and BSW lookups. Component audits use the existing selected configuration and existing pricing engine. Permission-hidden actions and backend costing permission checks remain in place.
- Bug 005: the actual five CHC Product configuration fields move above its Curve header while open and return on close. This reuses their existing options, event listeners, defaults and downstream payload behavior without copying state. Pump selection and engineering data are unchanged. C4 IE2, C6 IE3 and CR IE3 package rules remain in the existing engine.
- Improvement 006: Triangle → Remarks → Edit. Customer remarks use an append-only Supabase history with server-generated author/time. Views and additions depend on the existing ks_customers RLS visibility. Clients can insert only customer_id/body, so author/time cannot be spoofed. Existing personal/global Notes are untouched. Loading uses a request token to prevent responses for a previous customer appearing in the current popup. Editing/deletion is disabled for everyone to retain immutable history.

## Verification

PASS: `node tests/v50036-browser.cjs` in local headless Chrome, using isolated fixture customers and mocked persistence. Covers CHC C4/C6, CR, KV, ES, ISO, BFI, BGF, GWS and KeyPLC lookup/trails; BSW 178/378 availability, X/zero rejection, saved-source snapshot repricing, horizontal groups; CHC field move/restore; Motor Cost visibility and permission denial; remarks author display and insert payload excluding author/time fields.

PASS: inherited tests/v50010/pricing.cjs, tests/v50011/pricing.cjs, tests/v50012/regressions.cjs, tests/v50031-regression.cjs, tests/v50033-motor.cjs, tests/v42859-assembly-pricing-regression.cjs. These cover BGF pricing, ISO variants, CR variants, component/motor adjustments, manual overrides and Assembly/System pricing.

PASS: changed JavaScript syntax checks. BSW screenshot was inspected and control overlap corrected. ZIP packaging verifies all baseline selector/performance assets are unchanged and all baseline files are retained.

Read-only production inspection confirmed the existing customer RLS rule, BSW schema and 178 existing BSW records with no positive legacy prices. No production record was changed.

## Deployment and remaining verification

Two new migrations are supplied, **not deployed**. Runtime persistence tests above use a mock backend, not a deployed database. Run supabase/verify_v50036.sql after migration. Authenticated assigned/unassigned/cross-company user tests, actual cross-device persistence, concurrent-user acceptance, full end-to-end component action checks, Safari and physical-device acceptance remain staging/deployment checks. The tests do not claim exhaustive production verification of every model/configuration. BSW multiplier/category settings must be configured by the owner; zero/unentered variants stay unavailable until a positive source is saved.

No Edge Function or GitHub change is required. Historical reports retained in the archive describe their own releases and are not current deployment receipts.
