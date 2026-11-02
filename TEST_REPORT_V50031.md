# V5.00.31 Test Report

## Passed

- JavaScript syntax checks: pricing, KV Price List, BSW, Costing Audit, Assembly, customer settings, app, permissions and roles.
- Automated regression: 171 complete KV models, exact family counts, approved curves for every model, zero-flow points, KV4/KV5 availability, corrected V1.3 dimensions, and three independent price identities.
- Automated pricing test: KVC/KV/KVN source prices 100/200/300 remained distinct through the shared pricing engine.
- Browser regression in headless Chrome: Product showed KV1–KV5, Product action order was Cost/Curve/Assembly/Quote, ES trimmed text rendered, and BSW curve content was non-blank.
- Static security checks: permission default, Role Management row, database audit RPC, and variant-saving RPC are present.

## Not tested

- The migration was not applied to production or any live Supabase project.
- Real-account RLS, role persistence and the connected RPC response require staging verification after migration.
- Safari was not automated; headless Chrome covered the browser flow. The BSW fix is based on the standard iframe load event supported by Safari.
- No historical production quotation was modified. Historical audit accuracy depends on the pricing snapshot already saved with that quotation.
