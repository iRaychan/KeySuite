# KeySuite V4.28.11 UPGRADE

Baseline: **V4.28.10 FULL CLEAN**

## Fix

V4.28.10 introduced a PDF-only curve-width override, but JavaScript converted the default `null` override to numeric `0`. This made CHC C4, CHC C6 and BFI screen curves invisible while duty/operating-point markers remained visible.

V4.28.11 changes the override rule so only a non-null, non-empty, finite **positive** `curveWidth` is used. Otherwise the renderer keeps its existing normal on-screen width.

Affected renderers:
- `selector/index.html` — CHC C6
- `selector/product.html` — CHC C6 Product/Quick Selection
- `selector-g1/index.html` — CHC C4
- `selector-g1/product.html` — CHC C4 Product/Quick Selection
- `selector-bfi/index.html` — BFI
- `selector-bfi/product.html` — BFI Product/Quick Selection

## Preserved from V4.28.10

- KeySuite PDF curve lines: **1.8 SVG units**
- KeyBot PDF curve lines: **1.35 pt (~1.8 px)**
- Global Power polynomial: **5th order**
- ES false trailing-zero/end-drop correction
- ES original flow-unit display, e.g. `500 IGPM (136.4 m³/hr) @ 103 mtr`

## Deployment

No database migration is required.

After uploading the web files, redeploy KeyBot to keep the deployed runtime/version aligned:

```powershell
npx.cmd supabase@latest link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase@latest functions deploy telegram-webhook
```
