# KeySuite V5.00.54 and KeyStock V1.02

V5.00.54 continues from the V5.00.53 review build. The approved cyan KeyStock button and the existing KeySuite navigation are carried forward. KeyStock uses the existing left-panel structure, approved colours and familiar working forms.

## What to install

| Archive | Starting point | Database |
| --- | --- | --- |
| V5.00.53 Upgrade | V5.00.52 source and site | Existing KeyStock V1.01 prerequisites |
| V5.00.54 Full Build | Clean source checkout | Existing V1.01 prerequisites plus the V1.02 migration after approval |
| V5.00.54 Upgrade | Exact V5.00.53 source | Same V1.02 migration after approval |

The full and upgrade V5.00.54 archives contain the same migration. Apply it only once after approval. The upgrade ZIP overlays the repository root. Keep the existing deployment workflow, domain configuration and prior migration history.

## Workflow status

- **Stock Check.** Current physical quantity and reservations come from the ledger. The view retains location-prefix, supplier and model filters and adds active serial search. Batch details display independent location and configuration rows, known receiving dates and the authorised green plus, yellow Reserve and red Stock Out actions. On Hand is physical stock and includes reserved stock. Calculated Not Complete remains unknown.
- **Add Stock.** One atomic multi-row receiving form for the 11 confirmed series. The General and Stock sections collapse independently. Each row records its own model, configuration, quantity, location, MYR cost when authorised, notes and optional or required serials. A short model is accepted when the chosen series resolves it unambiguously.
- **Reservations.** Search existing KeySuite customers, reserve exact configuration stock, confirm partial or full stock out, or return the remaining allocation to available stock. Creation uses no serials. Stock out requires the actual serials where the allocated batches track them. Allocation and stock changes commit in one transaction.
- **Stock Movement.** Stock out, return against an original delivery, write-off, transfer, one-option reconfiguration, and positive batch adjustments. The movement audit records the operator, dates, stock positions, serials, reason and reference. Transfer and reconfiguration retain the original lot, cost and receiving date. Reconfiguration changes only a Normal Group option.
- **Stock History.** Opening balances, corrections, receipts, reservations, releases, deliveries, returns, transfers, reconfigurations, write-offs and adjustments. Model and serial searches combine. Lifetime purchases are receipts only and delivered is gross stock-out quantity. Returns are separate. Internal moves do not affect company totals. The ledger does not infer pre-existing purchase or delivery activity from opening balances.
- **Serial settings.** Dropdown Management allows a series rule and product override for new receipts. Existing lots retain the policy they had when recorded. Optional serial capture is allowed and serialised receipt rows require one unique serial per unit. Delivered and written-off serials remain searchable in history.
- **Permissions.** Stock view, receiving, dropdowns, reserving and releasing, stock-out confirmation, adjustments and transfers/reconfiguration have distinct server checks. Receiving and dropdown management are hidden without their permissions. Existing costing access controls still apply. Existing dropdown definitions remain model-scoped and support the baseline setup-copy workflow. A shared, live series-level dropdown inheritance model is outside this ledger change.
- **Deferred.** Calculated Missing Parts and component allocation await actual component requirements. The Missing Parts screen continues to show historical, manually recorded shortages. Existing Pricelist mappings and stock-to-price logic are carried forward without the deferred ES/CHC repair or quotation-cost comparison.

## Review the additive migration

Review `supabase/migrations/20261108083803_keystock_v102_ledger.sql` and the read-only `supabase/verification/keystock_v102_reconcile.sql`. The migration targets PostgreSQL 15 or newer and requires the V1.01 schema. It adds eight private, row-protected tables. It copies one lot and position for each unvoided opening balance, including zero-quantity entries. Original records, mappings, costs, corrections and audit rows are retained. An unknown receiving date stays unknown. Legacy FIFO uses the recorded opening date as its fallback. FIFO orders by date, legacy provenance on the same day, recorded time, and a stable ID.

The opening source is briefly locked for seeding and then protected from further edits. It remains available as history. A legacy KeyStock client must refresh into V1.02 after migration. A V5.00.54 site with the V1.01 database continues to show its pre-ledger mode.

1. In staging, confirm the target has the actual V1.01 schema, PostgreSQL 15 or newer and a current backup. Capture the baseline opening, cost and mapping counts and grouped physical totals.
2. Apply only the dated V1.02 migration in staging. Run the reconciliation script and require zero discrepancies. Test representative production-shaped data, permission profiles and historical dates. Validate a pair of competing requests through separate hosted connections.
3. Review schema exposure and grants, the role permission defaults, customer access and performance with production-sized stock history. The current stock API returns tenant history together with inventory state. Verify response size and latency for the expected data volume.
4. After separate production approval, take a current backup and schedule the database and matching V5.00.54 site rollout together. Verify the build version, zero reconciliation discrepancies, and approved role visibility after activation.

## Rollback

Before any production migration, revert to the exact V5.00.53 app if needed. After migration, suspend KeyStock transaction access if a rollback is needed and retain the ledger and original data. An older app cannot serve live stock once the ledger is active. Restore the reviewed V5.00.54 site or ship a corrected ledger-aware build. Any database restore or disabling of the ledger requires separate approval and a plan to preserve or reconcile transactions recorded since rollout.

## Local test evidence

- PGlite exercised the actual migration on the legacy fixture, including a corrected opening balance. Opening records, historical costs, critical quantities and mapping rows were compared for exact equality.
- Database tests covered atomic multi-row receipts, invalid-row rollback, retry and conflicting request IDs, FIFO, insufficient free stock, partial fulfillment and release, transfer and reconfiguration, linked returns, write-off and adjustments, serial policy precedence, duplicate serials, tenant and role denial, cost redaction, historical client protection and reconciliation.
- Chrome exercised all seven module entries for an owner, configurable serials, collapsing receiving sections, two-row receipt, customer search, reservation and partial stock-out, release, transfer, serial history, lifetime totals and filtered Back navigation. An ordinary-user fixture verified restricted controls and cost redaction. Quotation units, save/reopen, revision, clone, manual items and PDF regressions passed.
- The Assembly/System pricing regression and local Pages staging checks passed. Hosted Supabase authentication, separate-connection concurrency and production deployment remain staging or rollout checks.

Use `node tests/v50054-db.cjs` with PGlite 0.3.14. For Chrome, start `KEYSTOCK_V102=1 KEYSTOCK_TEST_PORT=8304 node tests/v50051-server.cjs` and run `node tests/v50054-browser.cjs` with Playwright and Chrome. Start a fresh fixture per run and set `KEYSTOCK_READ_ONLY=1` on both the fixture server and test to exercise an ordinary user.
