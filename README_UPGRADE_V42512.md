# KeySuite V4.25.12 Upgrade Patch

Upgrade path: **V4.25.11 → V4.25.12**

## Changes

- Smooth Power curves for CHC C6/G2, CHC C4/G1, BFI and ES using a shape-preserving cubic display interpolation.
- Retain the non-zero 0-flow shut-off power extension and blend it smoothly into the first real power point.
- Keep the existing power points unchanged; only the plotted line between those points is changed.
- Apply the same display smoothing to selector, Product Curve and PDF power charts, including parallel power references.
- No change to pump selection, duty calculations, motor sizing, pricing or source hydraulic data.
- Cache/version references are updated to V4.25.12.

**No Supabase migration or Edge Function deployment is required.**

Apply this patch over a complete **V4.25.11** installation.
