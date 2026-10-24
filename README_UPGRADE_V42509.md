# KeySuite V4.25.09 Upgrade

Upgrade target: **V4.25.08 → V4.25.09**

## Changes

- Fixes duplicated Enhanced suffixes for CHC C4/G1, CHC C6/G2 and BFI.
- CHC model identity is normalized to the base model first, then exactly one `E` is added when Enhanced is active.
- BFI model identity strips any accumulated trailing `T` / `E` suffixes first, then applies exactly one correct phase variant: base for 1Ph, `T` for standard 3Ph, `E` for Enhanced 3Ph.
- Applies to selector display, PDF identity, Quick Selection presentation, quotation / assembly naming and pricing identity.
- Existing hydraulic curves, Enhanced calculations, motor selection and prices are unchanged.

No Supabase migration or Edge Function deployment is required.
