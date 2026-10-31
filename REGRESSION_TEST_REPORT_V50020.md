# Regression Test Report — V5.00.20

Date: 2026-10-31

- PASS: Compare View returns `CR`, `KV`, `BFI`, `BGF`, `ISO`, `ES` and `GWS` unchanged in uppercase.
- PASS: `CHC G1`, `CHC G2`, `KeyPLC`, Manifold, Motor, Coupling and Baseplate labels remain unchanged.
- PASS: V5.00.20 page, manifest, version-lock and service-worker cache markers agree.
- PASS: JavaScript syntax checks for the modified formatter and version lock.
- PASS: The original V5.00.19 KV/BGF regression suite passes against the untouched V5.00.19 baseline.
- PASS: `app.js`, which contains the frozen quotation PDF workflow, is byte-identical to V5.00.19.

No database migration or Edge Function deployment is required. Live Safari will retain V5.00.19 until the frontend package is published through its GitHub Pages workflow.

