# KeySuite V4.23.05 Upgrade

Upgrade base: V4.23.04.

## Changes

- BFI Product list now matches CHC row layout: model + Curve / Assembly / Quote on one row.
- BFI Curve uses the same inline Product Curve navigation/return behavior as CHC; the old BFI popup route is no longer used.
- BFI PDF Page 2: Type = HMS Pump.
- BFI PDF Page 3: family drawing reduced to 80% of the V4.23.04 size.
- BFI Currency & Multipliers now expands/collapses like the other Price List currency panels.
- BFI gets the same Enhanced tick flow as CHC in Quick Selection Brand / Series Settings.
- Enhanced BFI selection state is passed through Quick Selection and exact-model opening.
- BFI product phase is carried into the exact product-curve frame.
- Telegram/KeyBot BFI PDF is updated to the same HMS/80% drawing rules.

## Deployment

1. Overwrite the V4.23.04 web files with this upgrade.
2. No `supabase db push` is required.
3. Redeploy:
   `npx.cmd supabase functions deploy telegram-webhook`
4. Hard-refresh KeySuite after GitHub Pages updates.
