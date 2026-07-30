# KeySuite V1.19

Base: KeySuite V1.18. The approved V1.08 quotation PDF/print layout remains fully frozen.

## Install in this order

1. In Supabase, open **SQL Editor → New query**.
2. Run the complete file: `setup/V119_SUPABASE_MIGRATION.sql`.
3. Extract this GitHub package.
4. Upload all files and folders to the root of the existing KeySuite repository, replacing matching files.
5. Keep the existing working `config.js`. This package intentionally does not include it.
6. Wait for GitHub Pages to deploy, then refresh using `Ctrl + Shift + R`.

## V1.19 highlights

- Category selection on the left reliably loads the saved category into the right panel.
- Protected Category fields can be unlocked directly by holding for 3 seconds, even when the editor starts read-only.
- CHC and GWS have independent USD and RMB multipliers.
- Price-list multipliers are protected by a 3-second hold and save automatically after editing.
- Category pricing rules now include `Normal` and `Rare` percentages for CHC and GWS.
- Every CHC/CHCS/CHCN and GWS pressure variant has a saved rarity: `Common`, `Many`, or `Rare`.
- Existing records default to `Many`, preserving the previous calculation.
- Many: base → margin → transport → optional commission/set/final/fuel → round.
- Common: base → margin → normal → transport → optional commission/set/final/fuel → round.
- Rare: base → margin → normal → rare → transport → optional commission/set/final/fuel → round.

## Security and data

- Only the Owner sees the gold Key button and protected Key modules.
- Customer ID and Category ID remain database-only and are not shown on dashboards.
- Source prices, rarity and multipliers are stored in Supabase, not embedded in the public GitHub files.
- Do not upload secret/service-role keys into the public repository.
