# KeySuite V4.23.04 Upgrade

Upgrade base: V4.23.03.

## V4.23.04

- BFI PDF material is fixed to Stainless Steel 304 for casing, impeller and shaft.
- BFI suction/discharge display separate inlet/outlet values (for example G2 / G2, not G2 x G2 on each row).
- BFI motor efficiency class defaults to and is fixed at IE2 in the BFI selector/PDF path.
- BFI Page 2 pumpset dimensions follow the BFI workbook rules: L = max L1-L6; W = max BFI Dimension-sheet W/B1/B2; H = max BFI Dimension-sheet H/H2/H.
- BFI Page 3 uses the supplied BFI family drawing for BFI 1, 2/3, 4/5, 8/11/12/13, 10 and 15/20 and shows only populated L1-L6 / B1/B2/H/H2 rows plus weight.
- Product > CHC > Curve routing has a safe shared-runtime/native fallback so the Curve button is not swallowed when the shared dialog cannot open.
- KeyBot BFI PDF follows the same material, IE2, dimension summary and family-drawing rules.

## Deployment

- No database migration is included.
- Deploy the web files to GitHub Pages.
- Because `supabase/functions/telegram-webhook/curve-pdf.ts` changed, redeploy `telegram-webhook` after the web assets are live.
