# KeySuite V4.28.10 UPGRADE

Upgrade baseline: **V4.28.09**.

## Changes

- Power curve = **5th-order polynomial** globally for CHC C4, CHC C6, BFI and ES in KeySuite and KeyBot.
- Visible Power plotting now follows the 5th-order polynomial directly rather than the legacy cubic display smoother.
- KeySuite PDF plotted curve lines = **1.8 SVG units**; screen curve widths are unchanged.
- KeyBot PDF plotted curve lines = **1.35 pt** (approximately 1.8 px visual equivalent).
- ES motor-trimmed curves remove invalid trailing zero hydraulic points.
- ES motor + flow-only Fast Search preserves the input flow unit, shows the m³/hr conversion and rounds derived displayed head to the nearest metre.
- Example: `500 IGPM (136.4 m³/hr) @ 103 mtr`.

## Deployment

No database migration is required.

After uploading the web files, redeploy the Supabase Edge Function:

```powershell
npx.cmd supabase@latest link --project-ref skidqdixnnnuhvarekxp
npx.cmd supabase@latest functions deploy telegram-webhook
```
