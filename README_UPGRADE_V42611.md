# Upgrade to KeySuite V4.26.11

Apply over V4.26.10.

CHC and BFI motor-price changes:
- When the selected motor IE class differs from the included motor, KeySuite and KeyBot calculate:
  `Adjusted pump quote = current pump quote - included motor raw cost + replacement motor quoted price`.
- Included motor defaults are CHC C4 IE2, CHC C6 IE3, BFI 1-phase IE1 and BFI 3-phase IE2.
- Motor matching uses the same pole and closest priced HP. If two ratings are equally close, the higher HP is selected.
- The replacement motor uses the Motor Category Pricing rule, customer factors and normal quotation rounding.
- If either required motor has no usable input price, the adjusted quotation is blocked.
- BFI 3-phase selection supports IE2, IE3, IE4 and IE5. BFI 1-phase remains IE1.

KeyBot Fast Search changes:
- Preferred layout: Brand / Series / Model / Duty first, one blank row, then Company / Customer.
- Product-only input still searches the user's assigned products.
- `BG` resolves to B.G.Reich.
- Standalone `OK`, O.K.Pump and M.O.S aliases are handled as Brands before Customer matching.

No `db push` is required.

Deployment order:
1. Upload the V4.26.11 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp --no-verify-jwt`.
