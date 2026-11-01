# KeySuite V5.00.26 regression report

Result: **PASS**

## Automated verification

- `node tests/v50026-regression.cjs` — PASS.
- JavaScript syntax checks — PASS for the KV core/fixes/product code, BGF data/selector/product/curve code, pricing, and application routing.
- KV polynomial checks — PASS: NPSHr cubic, Efficiency fifth-order, Power cubic; all use polynomial-only evaluation and NPSHr produces 221 samples.
- BGF hydraulic sharing — PASS: Motor and Engine variants return identical head, efficiency, NPSHr, and shaft power at the same duty and speed.
- Locked masters — PASS: CR MASTER and ES MASTER SHA-256 hashes are unchanged from V5.00.25.
- CHC C4, CHC C6, Product → CR, and the existing quotation/PDF print layout — PASS: protected SHA-256 hashes are unchanged.
- Product → KV and Product → BGF routing/ready-handshake paths — PASS by release assertions and code-path inspection; the authenticated product UI remains behind the existing Supabase sign-in.

## Browser verification

- KV 1 m³/h @ 10 m selected `KV 1-20`, rendered all four curves, and displayed the corrected `DN25 (G1¼) x DN25 (G1¼)` connection.
- BGF 5 m³/h @ 40 m selected `BGF 350M` in default Motor mode.
- Switching Drive to Engine selected `BGF 350E`, exposed Engine Speed, removed motor electrical output, and retained the same hydraulic values.
- Full application start page displayed V5.00.26 and reached the existing Supabase-protected sign-in screen.

## Release scope

- No Supabase schema, RPC, RLS, Edge Function, Storage, or Auth change was introduced.
- No database migration or Supabase deployment is required.
- GitHub was not used.
