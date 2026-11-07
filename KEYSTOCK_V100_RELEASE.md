# KeySuite V5.00.51 — KeyStock V1.00

Prepared 8 November 2026, Malaysia time. Production has not been deployed or migrated.

## Baseline and scope

The supplied `KeySuite_V5.00.50_FULL_BUILD.zip` matched all 1,368 files on GitHub `main`, commit `dec3a1c032b1b3527e04e5e608be78bde3c63644`, with no differences. This release starts from that exact baseline.

KeyStock adds Stock Check, Stock Item Management, Stock Input, Dropdown Management and Stock by Location. All catalogue models initially appear with quantity 0, Unconfigured, Not Assigned and Not Configured. Source models are virtual references until they need stock configuration; an empty warehouse does not need thousands of duplicate inventory records.

The existing Product, Selection, Curve, Pricelist, Quotation, PDF, Assembly, Customer and KeyHQ application files remain unchanged. `app.js`, `pricing.js`, `pricelist.js`, `auth.js` and `assembly.js` are byte-identical to the baseline. No existing price, customer, quotation or company configuration is overwritten by the migration.

`.github/workflows/pages.yml`, `tools/build_pages.py`, `.gitignore` and `CNAME` remain byte-identical to the successful Pages baseline.

## Using KeyStock

1. Open **KeyStock → Stock Item Management** to add locations such as A01. Existing Pricelist models need no manual creation. Use Add Independent Item only for spare parts absent from the Pricelist.
2. Open **Dropdown Management**, choose a family and model, then Add Group. Choose Critical, Pricelist Linked or Normal; enter labels and add as many options as needed. Edit Group supports renaming, option reordering and retirement. Stable UUIDs preserve saved identities when labels change.
3. For price-linked groups, select one option from **every** linked group and choose an exact existing Pricelist configuration. Save each valid combination. A single linked group uses the same mapping editor. Other combinations show **Unmapped**; KeyStock never substitutes another variant or copies prices into a second price book.
4. Copy Setup / Apply Setup to Selected Models appends groups and options using fresh IDs. Existing target setup is retained. Confirm the target model's mappings explicitly; mappings are not guessed across models.
5. Open **Stock Input** or click a model in Stock Check. Select configurations, quantity and location. Critical Parts starts collapsed. Optional supplier, purchase cost and remarks are available. Blank purchase cost remains unknown; entering 0 explicitly records zero.
6. Save Opening Balance once for each initial physical lot. Quantities are separated by model, selected option IDs, mapped variant and location. Independent spare parts have no Pricelist mapping. Unmapped stock can be recorded and is visibly marked Unmapped.
7. Use Opening balance history → Correct for recounts or entry mistakes. Supply a reason. The original remains in history and is marked corrected; its replacement is recorded atomically. Repeating the same submitted request ID does not create another balance.
8. Stock Check supports family, model/brand search and stock-status filters. Stock by Location lists the selected location's configurations and totals. Refresh rereads current source models and stock.

The server stores missing critical quantities per opening entry and option. This supports a future `Total Stock − MAX(Missing Critical Part Quantities)` calculation after aggregation at the appropriate physical configuration/location. V1.00 does not implement cannibalisation, assembly transformations, stock issue, FIFO, receiving, transfers or automatic quotation deductions.

## Catalogue reconciliation

Reconciled against read-only production source metadata and V5.00.50 file-defined catalogues. No customer, user, purchase-cost or source-price values are in the test fixture.

| Family | Model/reference count | Preserved pricing identity |
|---|---:|---|
| BASEPLATE | 6 | C-channel reference; existing dimension-based costing remains separate |
| BFI | 63 | BFI/BFIN and supported 1Ph/3Ph combinations |
| BGF | 4 | Existing model/SKU |
| BSV | 4 | MA and T choices used by the V5.00.50 Pricelist |
| BSW | 178 | 378 available model/variant combinations from the existing availability table |
| CHC G1 | 412 | Independent G1 IDs, CHC/CHCS/CHCN |
| CHC G2 | 409 | Independent G2 IDs, CHC/CHCS/CHCN |
| COMPONENT | 42 | Family, component kind, size group and material |
| COUPLING | 42 | Source ID and component type |
| CR | 439 | CR/CRS/CRN |
| ES | 56 | All six current Pricelist material configurations |
| GWS | 43 | SKU, series and pressure |
| ISO | 39 | Existing file-defined material configurations |
| KEYPLC | 18 | P1–P6 pump-quantity configurations |
| KV | 216 | KV/KVC/KVN |
| MANIFOLD | 94 | Source section and variant code, including material/connection/pressure |
| MOTOR | 682 | Existing source IDs, which preserve rating/efficiency/pole distinctions |
| **Total** | **2,747** | **No duplicate catalogue keys** |

ES choices: CI / SS / SS / MS; CI / SS / SS / GP; CI / CI / SS / MS; CI / CI / SS / GP; SS304; SS316. ES rarity is still managed once per model by the existing Pricelist. KeyStock does not change rarity or currency multipliers.

Reconciliation differences found in the existing baseline:

- The BSV database contains legacy M availability rows. V5.00.50's actual Pricelist exposes MA/T, so KeyStock exposes those same choices.
- Some ES database JSON contains older brass, dynamic-seal or duplex entries outside the six choices offered by V5.00.50. KeyStock follows the current six-choice Pricelist and leaves the other database data untouched.
- BFI, CR, KV and BSW model-name sets match their file-defined V5.00.50 catalogues exactly.

Database-backed model additions appear on the next Refresh without a KeyStock import. **File-defined ISO and Baseplate catalogue changes need regenerated reference metadata during a future application release.** The included generator reads those application sources automatically, but V1.00 does not monitor source-file edits in a deployed browser or invent new database records. This is the remaining limit on the future-model automation requirement. Never regenerate an already-applied migration; put future reference updates in a new reviewed migration.

## Database and permissions

The new private `keystock` schema contains 11 tables: `static_refs`, `items`, `groups`, `options`, `mappings`, `configurations`, `locations`, `opening_balances`, `critical_quantities`, `purchase_costs` and `audit`.

All tables have RLS enabled and no direct grants to `anon` or `authenticated`. The application calls `public.keysuite_stock_v100`, a security-invoker wrapper around a narrow private command function. The private function intentionally uses definer privileges to validate and perform atomic writes; it has an empty search path, explicit approved-user/UID/company checks and restricted EXECUTE grants. No arbitrary SQL or table names come from clients. Tenant writes are serialized during validation and commit. Composite company foreign keys and immutable group/option ownership prevent cross-company reference substitution.

Approved active KeySuite users can read their own company's stock. Owners and Admins can maintain catalogue-only spare parts, dropdowns, locations and opening balances. This is the simple V1.00 authority model; no new role-permission administration screen is introduced.

Purchase costs live in a separate table. The existing **view_costing_breakdown** permission is checked by the backend. Users without it receive no purchase-cost collection in the API response and cannot supply a cost in a stock write. Generic audit payloads exclude purchase cost. A non-costing Admin correcting a balance retains the protected original cost without receiving its value. Renaming options does not rewrite the labels captured in older opening snapshots.

The access design follows Supabase's guidance on combining grants and row security: https://supabase.com/docs/guides/database/postgres/row-level-security. The private schema must remain excluded from the exposed Data API schemas.

## Test results

| Test | Result |
|---|---|
| Baseline ZIP versus GitHub main, all 1,368 files | PASS, exact match |
| SQL migration execution in isolated PostgreSQL/PGlite | PASS |
| All 2,747 catalogue keys unique; family counts reconciled | PASS |
| CHC generations independent; all three variants | PASS |
| All six ES materials available on every ES model | PASS |
| Multiple linked groups with complete exact mappings; invalid/incomplete mapping rejection | PASS |
| Multiple normal groups separate physical configurations | PASS |
| Critical quantities saved; negative/excessive quantities rejected | PASS |
| Opening persistence, idempotent retry, unknown cost, configuration separation | PASS |
| Rename history, setup copying with fresh IDs | PASS |
| Atomic correction, previous entry retained, repeated correction rejected | PASS |
| Non-costing API response and direct-table denial | PASS |
| Unauthorized writes, cross-company selections, anonymous/signed-out denial | PASS |
| Newly inserted database Pricelist model appears automatically | PASS |
| Chrome UI: browse, groups/options, combined mappings, critical section, save, correction, refresh, location filters | PASS |
| Native Mac Safari: catalogue, search, persisted quantity/location and form layout | PASS, local fixture |
| V5.00.50 quotation fields, unit persistence, totals, save/reopen, revision/clone and PDF labels | PASS |
| V5.00.49 manual legacy capacity, PDF preview/download byte identity and non-Safari routing | PASS |
| V4.28.59 Assembly/System pricing regression | PASS |
| Pages staging | PASS: 399 published files, 398 byte-identical copies plus generated .nojekyll |
| Existing Pages literal-reference warnings | 71 baseline warnings; no new unresolved literals |

Database tests use the real new SQL, PostgreSQL roles and a local PostgreSQL engine, with synthetic authenticated-user context and source metadata. Browser writes go only to that isolated database. Native Safari checks cover navigation/layout and reading the persisted test entries; full form creation was automated in Chrome. These checks do not claim production PostgREST/login validation or exhaustive interaction testing of every historical KeySuite module. Existing business logic files are unchanged, and targeted quotation/PDF/Assembly regressions passed.

Reproducible tests: `tests/v50051-db.cjs`, `tests/v50051-browser.cjs`, `tests/v50051-server.cjs`. Database tests require `@electric-sql/pglite@0.3.14`; browser tests require Playwright and Chrome. Start the local server, then run the browser test once against a fresh test database. Test-only server/fixtures are excluded from GitHub Pages by the existing publishing tool.

## Files changed

Runtime/metadata: `index.html`, `keystock-v100.js`, `keystock-v100.css`, `VERSION.txt`, `RELEASE.json`, `manifest.json`, `sw.js`, `v41200-bootstrap.js`, `v50051-version-lock.js`.

Database/release support: `supabase/migrations/20261107174314_v50051_keystock_v100.sql`, `supabase/rollback_keystock_v100.sql`, this report.

Full-build development support: `supabase/keystock-schema.sql`, `tools/build_keystock_migration.cjs`, `tests/v50051-db.cjs`, `tests/v50051-browser.cjs`, `tests/v50051-server.cjs`, `tests/fixtures/v50051-source-catalog.json`.

The UPGRADE ZIP includes only the runtime/metadata changes, the dated migration, non-destructive rollback SQL and this report. Development/test support is in the FULL BUILD ZIP. No files need deletion.

## Installation and upgrade — approval required before production

1. Keep a backup of GitHub main, the V5.00.50 full ZIP and a current Supabase backup. Review this report and the new SQL. Test in a non-production project with the existing V5.00.50 schema first.
2. Apply **only** `supabase/migrations/20261107174314_v50051_keystock_v100.sql` once to the intended database after approval. It is transactional and creates only new KeyStock objects/reference metadata. Do not run the entire historical migration directory or the schema-generator input file. No Edge Function deployment is required. Keep `keystock` out of exposed Data API schemas; only the public RPC is used.
3. Sign in to the staged application with an Owner/Admin and an ordinary account. Verify the catalogue, one sample configuration, one test opening and cost restrictions through the hosted API. Check that real cost values never appear in a non-costing user's response.
4. Create a branch from the latest main and overlay the UPGRADE ZIP at the repository root. Review the diff. Preserve the current `.github/workflows/pages.yml`, `tools/build_pages.py`, `.gitignore` and `CNAME`; this upgrade contains none of them. If main has moved beyond the baseline, reconcile its changes before merging.
5. Stage the changed/new files and run `python3 tools/build_pages.py`. The publisher uses Git's tracked-file inventory, so new files must be staged. Confirm `_site/` includes the two KeyStock assets and the V5.00.51 version lock.
6. Only after deployment approval, merge/push the reviewed branch to main. The existing Pages workflow publishes `_site/`; do not upload the complete source archive as the Pages artifact.
7. Verify the Actions run is green for the intended commit, both artifact upload and Pages deployment succeeded, and the environment URL opens correctly. At `https://suite.keylargo.com.my/`, refresh and confirm V5.00.51, KeyStock navigation, catalogue loading and a previously saved quotation/PDF. Check the browser network response for the two KeyStock assets and the RPC. A green workflow alone is not an application acceptance test.

For a new checkout use the FULL BUILD ZIP as source, retaining all hidden files. It includes the corrected Pages publishing configuration. The same database steps apply. Keep deployment credentials and user data outside these packages.

## Rollback and limitations

To roll back the application, revert the release commit or restore V5.00.50 through the preserved Pages workflow. KeyStock data can stay in its private schema. To disable its API without deleting data, run `supabase/rollback_keystock_v100.sql` only after approval; it revokes the two EXECUTE grants. Re-enable with the commented grants in that file after review. Export/back up the entire `keystock` schema before any later removal. No destructive schema-removal script is supplied.

Opening balances are initial stock counts, not a perpetual inventory ledger. Additional entries increase the displayed total; use Correct for mistakes. There are no stock movements, valuation, reservations, automatic deduction, relocation or advanced assembly/cannibalisation workflows. Price links identify existing configurations; V1.00 does not display or recalculate customer selling prices. Baseplate references do not replace dimension-based costing. Retired options remain in history; a correction using retired options must select valid current options before it can be saved. The shared audit API returns the latest 100 audit events, while all events remain in the database.

No production write, deployment or migration was performed. Activation requires the new database migration and a website deployment after approval.

**GitHub Pages Deployment Required? YES**

**Supabase Deployment Required? YES — database objects/RPC only; no Edge Functions.**

**Supabase Database Migration Required? YES**
