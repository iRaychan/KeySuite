# KeySuite V4.26.01 Upgrade Patch

Upgrade target: **V4.25.12 Full or later → V4.26.01**.

This patch is cumulative for the V4.25.13 / V4.25.14 Quick Selection placement fixes and adds the V4.26.01 split-view + Motor IE4/IE5 refresh.

## Web files
- `index.html` — V4.26.01 split-view responsive shell + cache references
- `v388-dashboard-keycore.js` — compact Flow / Head controls in half-screen
- `v40201-quick-selection.js` — V4.25.14 Check Pumps / Brand-Series placement
- `v41200-bootstrap.js`, `sw.js`, `manifest.json`, `VERSION.txt` — V4.26.01 version/cache

## Supabase Motor refresh
Run:
`supabase/migrations/20260911172200_v42601_motor_ie4_ie5_refresh.sql`

This migration now targets **`public.ks_products_motor` directly**. It uses the confirmed production keys:
- `UNIQUE(model)`
- `UNIQUE(efficiency_class, hp, pole)`

It preserves existing `id`, `source_row`, prices and rarity on existing business-key rows. Conflicting legacy model-name rows are retained under a unique legacy model name and set inactive. Only genuinely missing IE4/IE5 business-key rows are inserted.

Expected exact active coverage: **IE4 2P=31, IE4 4P=31, IE5 2P=26, IE5 4P=27**.

No Edge Function deployment is required.
