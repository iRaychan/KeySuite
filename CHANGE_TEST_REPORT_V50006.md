# KeySuite V5.00.06 change and test report

## Source verification

- Baseline SHA-256: recorded in `INTEGRITY_V50006.json`.
- BGF workbook SHA-256: `592d495ad36f6734ee72aa4b7912acb1d69af113519b06514fe1ff35f0e339d3`.
- Models/specifications were extracted from sheet `BGF`, rows 4:7.
- The BGF workbook contains no populated price values in columns I:Q. Seeded source prices are therefore 0/unpriced.
- The approved name BGF 500 is used; the conflicting detail-row name BGF 550 is retained as audit metadata.

## Automated checks

- V5.00.06 release regression checks model/spec mappings, blank-price handling, Messenger placement hooks, quotation five-row minimum and wrapped-content resizing.
- V5.00.05 KS-09..11 functional invariants are rechecked without retaining the superseded V5.00.05 version assertion.
- JavaScript syntax checks cover changed application modules.
- ZIP CRC, content lists, upgrade hashes and no-deletion checks run during packaging.

## Staging acceptance required

- Apply the BGF migration and confirm all four models load for authenticated staff.
- Confirm only an Owner can save BGF prices; non-Owners can view but cannot edit.
- Enter representative MYR, USD and RMB prices, reload, and confirm exact persistence.
- Open private and group Messenger conversations from Dashboard, Quotation and at least two other pages. Confirm Realtime updates, shared unread counts, notifications, history and failure isolation.
- Test quotation descriptions containing 5, 6 and 13 explicit rows plus long wrapped lines. Confirm no internal scrollbar, five-row minimum and unchanged `c/w` alignment in screen and PDF output.

## Production Supabase deployment — 2026-10-27

- Applied `v50006_bgf_pricelist` and the advisor-driven `v50006_bgf_rls_performance` policy refinement to the active KeySuite production project.
- Verified four active BGF records and their source specifications; source prices remain 0 because the workbook price cells are blank.
- Verified RLS is enabled, authenticated users receive read access, only approved price/rarity columns are update-granted, and the Owner update policy has both `USING` and `WITH CHECK` predicates.
- Verified private and group Messenger tables remain published to `supabase_realtime`.
- Supabase security and performance advisors report no findings for `ks_products_bgf` after deployment.
- No Edge Function, GitHub, or frontend-hosting deployment was required or performed.
