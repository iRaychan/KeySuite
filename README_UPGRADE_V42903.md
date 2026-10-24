# KeySuite V4.29.03 Upgrade

## Change

Motor HP values below 1 now display with two decimal places, so `0.75 HP` is no longer rounded to `0.8 HP`. Motor HP values of 1 or above retain meaningful precision without unnecessary trailing zeros.

## Scope

- `0.50 HP`, `0.75 HP`, `1 HP`, `1.5 HP`, `2 HP` and `7.5 HP` display as written.
- The existing kW display format is unchanged, including `0.55 kW` beside `0.75 HP` where applicable.
- The change applies to CHC C4/C6, CHC G1, BFI and CR selector result and Product displays.
- No calculations, selector data, pricing, actions, layout styling, database migrations or edge functions are changed.

