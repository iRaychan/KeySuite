# KeySuite V5.00.17 Regression Test Report

## Result

PASS — KV integration and applicable V5.00.16 behavioural regressions.

## Verified

- Exactly 39 complete KV1 models are exposed; incomplete KV families remain hidden.
- KV selector selects a valid pump using the CR ranking method and renders head, power, efficiency and NPSHr curves.
- Workbook zero-flow power is exact: `KV 1-20 = 0.088 kW`; `KV 1-400 = 1.760 kW`.
- KV Category, Price List, Assembly and quotation-pricing hooks are present and the quotation calculation uses saved currency/category rules.
- KV appears under B.G.Reich in dynamic Selection and Product navigation, without a standalone Selection entry.
- KV selector uses the CHC 1480 px panel geometry and main-plus-stacked four-chart arrangement.
- KV Material and O-Ring Price List add-ons are stored independently and add to quotation pricing while Ca SiC and Viton remain zero-cost defaults.
- Production Material/O-Ring table has RLS enabled; authenticated read access is enabled, anonymous read/execute access is revoked, and Owner-only mutation is exposed through the checked RPC.
- Production KV Category save was executed successfully inside a rolled-back transaction after removing the invalid `updated_at` reference.
- JavaScript syntax, inline scripts, unique HTML IDs and service-worker KV asset entries were checked.
- Browser smoke test at 1.2 m³/h and 80 m selected `KV 1-100`, rendered all four curves and reported no console warnings or errors.
- Existing V5.00.16 CR/pricing behavioural regression passed.
- CR selector, product, data, hydraulic core, product pricing and CR price-list files are byte-identical to the V5.00.16 baseline.
- Frozen quotation print markup and `pdf-optimization.js` are byte-identical to the V5.00.16 baseline; PDF version remains `1.08`.

## Command

`node tests/v50017-kv-regression.cjs`
