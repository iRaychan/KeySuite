# KeySuite V5.00.04 change and test report

Release baseline: user-supplied `KeySuite_V5.00.03_FULL_CLEAN_GitHub.zip`.

## Implemented changes

### KS-06 — safe reuse of Owner-deleted quotation numbers

- Added an audited Owner-deletion reuse queue. Normal numbering continues after the company/year high-water mark; older unexplained gaps are never allocated. Only Owner-deleted numbers absent from both `ks_quotations` and `ks_quotation_archive_v409` may be reused.
- Seeded only the Owner-confirmed RC-2610-0235..0239 range. Numbers 0232..0234 remain protected and cannot be offered.
- The save RPC takes the same company/year advisory transaction lock as the existing V4.29.20 allocator and rechecks availability before insert. Concurrent saves therefore cannot claim the same running number.
- A displayed preview is kept when it is still valid and free; if another session has claimed it, save assigns the next safe free number and returns the final saved reference.
- Existing logical quotations keep their original number and creator. The company/year sequence remains a monotonic high-water mark and is never reduced.
- Reused numbers add a `quotation_number_reused` event to the new quotation's existing audit array.
- The website calls V5.00.04 RPCs first and retains the existing V4.29.20/V4.29.10 fallback until the migration is approved and installed.

### KS-07 — Safari CHC 32-20 selector curve zoom

- Restored the V4.28.72 Standard Selector responsive contract for Dashboard quick-selection navigation.
- The parent iframe and child HTML/body return to natural 100% width; stale Safari zoom, transform and forced-width styles are removed. No scale compensation is applied.

### KS-08 — quotation PDF continuation line

- Removed the absolutely positioned table-header pseudo-rule that Safari could place at the bottom of a continuation page.
- The repeated item header now owns its real bottom border. The existing final summary rule immediately before totals remains unchanged.

## Verification results

- PASS — V5.00.04 release regression and JavaScript/Python syntax checks.
- PASS — KS-06 static SQL safety contract: both stores checked, shared advisory lock, sequential high-water allocation, Owner-only reuse queue, immutable existing reference/creator, monotonic sequence and reuse audit.
- PASS — KS-07 browser test of the macOS Safari code path: Standard mode, natural-width iframe and all stale scaling styles cleared.
- PASS — KS-08 generated three-page browser/PDF fixture: items 1-2 on page 2 with no false closing line; items 3-4 on page 3 with the final line before totals. Rendered pages visually checked.
- PASS — targeted retained regressions for KS-01..05, quotation deletion, quantity/coupling, auth bootstrap, final motor price and KeyHQ elevator.
- BASELINE-MATCH — the legacy KeyHQ activity fixture's ball-motion assertion fails on both untouched V5.00.03 and V5.00.04, while activities enter play, props appear and vehicle checks pass. No KeyHQ source changed.
- PASS — release builder rejects source deletions, baseline Supabase changes and extra migration files; both release ZIPs pass CRC and exact file-list verification.
- PASS — production Supabase post-migration check: last number 0240, next preview 0235, reuse queue exactly 0235..0239, 0232..0234 absent, RPCs installed, and the queue has no direct authenticated table access.

## Approval and deployment status

- Production Supabase migrations: **applied with explicit user approval on 2026-10-26**. Migration history records `v50004_ks06_reuse_deleted_quotation_numbers` and `v50004_ks06_owner_delete_reuse_queue`.
- GitHub deployment: **not performed**.
- Vercel/hosting deployment: **not performed**.
- Edge Function deployment: **not required and not performed**.
- Existing production quotation/customer changes: **none**; only the private 0235..0239 reuse queue was seeded.

Real Safari at 100% zoom and a staging Supabase concurrency run remain production acceptance checks, as documented in `QA_V50004.md`.
