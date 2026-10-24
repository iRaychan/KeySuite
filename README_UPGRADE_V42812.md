# KeySuite V4.28.12 UPGRADE

Baseline: **V4.28.11 FULL CLEAN**

## Fix

V4.28.11 still showed a vertical line to zero at the final flow point of KeyBot-generated ES PDFs. The raw hydraulic data was valid; the fault occurred during final polynomial sampling.

At the final sample, floating-point arithmetic could produce an `x` value microscopically above `fit.max`. `ESCore.polyEval(..., false)` correctly returned `null` for that out-of-range value, but the PDF helper treated `null` as finite because `Number(null) === 0`. This appended a false zero point to every ES metric series.

V4.28.12:
- pins the first sample exactly to `fit.min`;
- pins the final sample exactly to `fit.max`;
- explicitly rejects `null` and `undefined` polynomial results;
- preserves the true final Head / Efficiency / Power / NPSH values;
- anchors `Selected Ø...` at the true final Head point.

Regression check for `ES 80-32H`, 100 HP, 2P, 500 IGPM, selected Ø280 mm:
- final flow ≈ **231.88 m³/hr**
- Head ≈ **84.08 m**
- Efficiency ≈ **66.83%**
- Power ≈ **106.81 HP**
- NPSH ≈ **10.07 m**

## Preserved

- Global Power polynomial: **5th order**
- KeySuite PDF curve width: **1.8 SVG units**
- KeyBot PDF curve width: **1.35 pt (~1.8 px)**
- KeySuite CHC/BFI screen curve visibility fix from V4.28.11
- ES original-unit duty display, e.g. `500 IGPM (136.4 m³/hr) @ 103 mtr`
- Motor-safe impeller selection and all hydraulic calculations

## Deployment

No database migration is required.

Redeploy KeyBot:

```powershell
npx.cmd supabase@latest link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase@latest functions deploy telegram-webhook
```
