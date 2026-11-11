# KeySuite V5.00.64 review build

Baseline: V5.00.63 FULL BUILD. This build is not deployed.

Changes: KV/CR material variant model identity in Product/Selection and quotations; CHCN description correction; uniform KeyPLC action buttons; separate ISO Baseplate price book and Product manual ISO entry. Existing engineering data, ES price book, navigation, and saved production data are not changed by packaging this build.

## Database review and rollout

Review `supabase/migrations/20261111090000_v50064_iso_baseplate_costing.sql` before applying it. It adds one nullable `iso_baseplate_costing` JSON column to `ks_app_settings` and one permission-checked save function. It does not set or copy any ISO prices and does not update ES balances or pricing. Apply only after explicit production approval and a database backup. Then deploy this build and enter verified ISO prices and fabrication quantities in Price List → Baseplate → ISO. Until then ISO remains unavailable for quotation.

## Rollback

Restore the previous V5.00.63 application build. The additive database column may remain unused. If a database rollback is separately approved, first export any newly entered ISO costing, then drop the V5.00.64 function and column. Do not drop the column if ISO values have been entered and need preserving.

## Verification

Local JavaScript syntax checks passed for modified modules and KV/CR inline scripts. Existing focused tests for V5.00.62 brand mapping and V5.00.63 pricing/KeyPLC passed. The ISO cost calculation was exercised with an empty book and a separate nonzero sample book. Browser regression tests requiring Playwright could not run because that package is not installed. Live browser quotations, PDFs, and production ISO saving are therefore not verified. See `SOURCE_PRICE_LINKAGE_V50064.md` for live read-only source checks.
