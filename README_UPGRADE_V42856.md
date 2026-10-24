# KeySuite V4.28.56 Upgrade

Upgrade from V4.28.55 by replacing the files in this package.

## Change

- For every generated CHC C4/C6, BFI, and ES pump curve, Power Point 1 at `Q = 0` is now `Power Point 2 × 0.68`.
- Power curves now use a third-order polynomial across standard, enhanced, interactive, and generated PDF curves.
- Power Points 2-20 are unchanged.
- Flow, head, efficiency, NPSH, interpolation, selection, motor sizing, and the frozen PDF/print layout are unchanged.

No new database migration is required. Deploy the included `telegram-webhook` Edge Function only when KeyBot PDF curve generation is in use.
