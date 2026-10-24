# KeySuite V4.25.08 Upgrade

Upgrade target: **V4.25.07 → V4.25.08**

## Changes

- Smoothly extends missing low-flow Power curves back to 0 m³/hr.
- Uses the first usable section of the fitted power curve to estimate non-zero shut-off power.
- Does not alter the original valid power data, pump selection, duty calculation, or motor sizing.
- Covers CHC C6/G2, CHC C4/G1, BFI and ES, in selector/product screen and PDF curve output.

No Supabase migration or Edge Function deployment is required.
