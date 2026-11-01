# Regression test report — KeySuite V5.00.25

## Automated code/data checks

`node tests/v50025-regression.cjs` — PASS

- CR MASTER SHA-256 unchanged.
- ES MASTER SHA-256 unchanged.
- Frozen quotation PDF layout 1.08 hash unchanged.
- KV pre-script selector DOM matches CR MASTER after family/data normalization.
- All applicable CR controls and functions remain present in KV.
- KV is registered in the V4.28.72 first-visible responsive controller.
- KV exposes only 39 complete KV 1 models.
- `KV 1-50` model and curve lookup succeeds.
- Head degree 2 uses polynomial-only evaluation at exact source flows.
- Efficiency degree 5, Power degree 3, and NPSHr degree 3 retain exact-source behavior.
- Q=0 Power remains unchanged.
- Main Head rendering remains 221 samples.
- Shared Product ready/state handling includes KV.

## Browser checks

- Same 1280px browser viewport: KV and CR produced identical 1280px main width, `340px 893px` selector grid columns, 27px header title, 18px card padding, and 100% native max-width behavior.
- KV duty `0.2 m³/h @ 37 m` selected `KV 1-50`.
- Four chart cards rendered.
- Operating Point, BEP, and Q=0 power information were present.
- No CR or ES files were changed to achieve the result.

Safari-specific behavior is implemented through the existing V4.28.72 Safari path; final acceptance should still be repeated in the target Mac/Safari deployment at browser zoom 100%.
