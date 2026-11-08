# KeySuite V5.00.53 Phase 2 audit and handoff

The full build is a local review build based on the attached KeySuite V5.00.52 ZIP, SHA-256 `642c0cce98d18b8ee60790a0c5592992ffb5876fa525dccfe32be91056f0f509`. See [confirmed requirements](KEYSTOCK_V100_CONFIRMED_REQUIREMENTS.md) for the item-by-item status and the [Phase 2 bug register](KEYSTOCK_PHASE2_BUG_REGISTER.md) for Bug 001.

## Inventory and database audit

The supplied Phase 1 migrations define private tenant-scoped catalogue, groups, options, mappings, configurations, locations, suppliers, opening balances, critical quantities, protected costs and audit data. The existing API can correct an opening balance while retaining its original record. It has no receiving, reservation, movement, component requirement or serial ledger. An opening-entry timestamp records when the opening entry was created. It cannot establish when the goods originally arrived.

This build reads the existing data contract. The review build needs the existing V5.00.52 / KeyStock V1.01 database prerequisites and adds zero migrations. The existing migration files are byte-identical to the supplied ZIP. Test writes used synthetic fixtures in a disposable local database.

## Database impact for the remaining work

The next change requires an additive database migration. Preserve every existing opening-balance ID, configuration, recorded variant, quantity, supplier, location, timestamp, cost, correction and audit entry. Use active balances as initial physical stock, with their provenance retained separately from purchase receipts. Keep voided balances in history. Preserve existing company boundaries.

- Add receipt batches, per-batch balances, an append-only movement ledger, reservation allocations and serial history. Retain the originating batch identity, cost and receiving date across transfers. Use a deterministic FIFO order for exact configurations. Unknown historical dates and costs need explicit treatment in the migration review.
- Add separate, default-restricted server permissions and use the existing tenant-scoped customer source. Use one database transaction for each receipt, reservation fulfillment or stock movement. Scope request IDs by company and action to prevent retry-based double deductions. Validate a customer's company and protect cost data at the API boundary.
- Define component requirements and component stock identities before allocating components. A calculation must track which assemblies consume each available part. Unknown configurations should remain unknown. Confirm which items require serial numbers and how to handle legacy stock without serials before enforcing serial requirements.
- Preview a read-only reconciliation per company, model, configuration and location. Check counts, batch IDs and physical totals before and after a synthetic-data migration test. Test concurrency, role denials, FIFO, retries, partial fulfillment and rollback before requesting production migration or deployment approval.

The attached V5.00.52 schema is enough to establish these gaps. If a newer transaction schema or existing Stock Movement form exists elsewhere, supply its schema/migrations and screenshot or source. Component requirements and serial applicability can be supplied as a sanitized example or configuration specification. Production credentials and customer exports are unnecessary.

## Files and verification

- Runtime: `keystock-v100.js`, `keystock-v100.css`.
- Release version and cache: `index.html`, `VERSION.txt`, `RELEASE.json`, `manifest.json`, `sw.js`, `v41200-bootstrap.js`, `v50051-version-lock.js`.
- Test support: `tests/v50051-server.cjs`, `tests/v50053-browser.cjs`.
- The build includes this audit, the separate confirmed-requirements record and the Phase 2 bug register.

Chrome owner and ordinary-user fixture tests passed for sidebar order/style, navigation, model/location/supplier filters, separate opening batches, preserved Back filters, missing parts display, time-frame controls, history, dropdown filters, restricted controls, and data preservation while browsing. The isolated Phase 1 database regression passed for stock history, tenant isolation, cost permissions and existing mappings. Quotation save/reopen, revision/clone, units, manual lines and PDF regression passed. Assembly/System pricing regression passed. Pages staging produced 399 files and the same 71 unresolved reference notices reported by V5.00.52.

The archived V5.00.47 product-family test requires a literal V5.00.47 asset query string and fails identically on the V5.00.52 baseline. Product, Selection, Pricelist and Quotation runtime sources were compared with the supplied baseline. That source check is not full interactive coverage of every module. Receiving, reservation, movement, serial, FIFO, calculated shortages and production sign-in acceptance tests remain outstanding.

To reproduce the KeyStock browser checks, run the existing local fixture server with `KEYSTOCK_V101=1` and `KEYSTOCK_TEST_PORT=8302` using PGlite 0.3.14, then run `node tests/v50053-browser.cjs` with Playwright and Chrome. Use a fresh fixture for each run. Run the fixture server and test with `KEYSTOCK_READ_ONLY=1` to exercise the ordinary-user path.

## Rollback

For local review, reopen the original V5.00.52 archive. If a later approved deployment needs rollback, redeploy the exact V5.00.52 site and verify the displayed version and cache refresh. No database rollback is required for V5.00.53 review changes. A future ledger rollout needs a separate rollback plan that preserves transaction history created after activation.
