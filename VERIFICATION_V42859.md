# V4.28.59 Verification

- PASS: JavaScript syntax checks for pricing, Baseplate, shared Product Curve, and CR Product modules.
- PASS: V4.28.24 pricing regression.
- PASS: V4.28.58 CR selector regression (454 models, 22 curve families).
- PASS: V4.28.58 CR pricing regression.
- PASS: V4.28.59 CR seal editor persistence/security regression with the requested 288px input width.
- PASS: V4.28.59 Assembly/System component pricing, MAX Fuel, summed Transport, and nested BOM regression.
- PASS: V4.28.59 release wiring regression for version, 288px seal inputs, CR actions, and Baseplate Assembly.
- EXPECTED SUPERSEDED CHECK: the historical V4.28.58 seal-editor test still asserts the old compact width; its persistence/security coverage is carried forward by the V4.28.59 test above.
- PASS: both release ZIP archives pass compressed-data integrity checks.
