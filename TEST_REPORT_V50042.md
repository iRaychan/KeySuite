# KeySuite V5.00.42 Test Report

## Automated regression

Run `node tests/v50042-bug03-regression.cjs` from the Full Build root.

The test checks:

- New KV model request is sent before the Curve panel opens.
- Request identity is echoed by the KV selector.
- A fresh event/payload wins over cached presentation identity.
- Late responses from older Curve requests are rejected.
- Model identity is pinned only after a successful fresh response.
- KV Curve PDF, Assembly and Quote use the current selector payload.
- Existing Back behaviour remains present and unchanged in purpose.
- Hydraulic calculation, pricing, CR, ES and ISO source hashes match V5.00.41.

The V5.00.42 Bug 03 regression and JavaScript/inline-selector syntax checks passed. Several historical tests bundled in V5.00.41 still contain frozen expectations for older catalogue counts, selector hashes and asset versions; the same tests fail unchanged against the original V5.00.41 baseline and are not regressions introduced by V5.00.42.

## Acceptance matrix

| Test | Expected |
| --- | --- |
| KV 4-30 → Curve | Title and selected pump show KV 4-30 |
| KV 4-30 → Back | Product KV returns with KV 4 and options retained |
| KV 4-50 → Curve | Title and selected pump show KV 4-50 |
| KV 4-30 → Back → KV 10-90 → Curve | Shows KV 10-90; no KV 4-30 identity remains |
| Repeated Curve → Back → Curve | No stale model identity |
| Curve → PDF | Newly selected model in payload/report identity |
| Curve → Assembly | Newly selected model in routed payload |
| Curve → Quote | Newly selected model in routed payload |

## Supabase

No migration is required.
