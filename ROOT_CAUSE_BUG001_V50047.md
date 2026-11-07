# KeySuite V5.00.47 — Bug 001 root-cause analysis

## Confirmed baseline

The supplied complete archive identifies itself as KeySuite V5.00.46 in `index.html`, `v41200-bootstrap.js`, `v50037-version-lock.js`, and `manifest.json`. V5.00.47 is therefore based on the requested V5.00.46 build.

## Database identifiers confirmed from the build

The configured commercial identifiers used by Category Management, pricing rules, secure multiplier loading, product payloads, and migrations are:

`BASEPLATE`, `BFI`, `BGF`, `BSV`, `BSW`, `CHC_G1`, `CHC_G2`, `COUPLING`, `CR`, `ES`, `GWS`, `ISO`, `KEYPLC`, `KV`, `MANIFOLD`, `MOTOR`.

Display names are deliberately separate. In particular, `ES` displays as **End Suction** in OEM mapping, `KEYPLC` displays as **KeyPLC**, and legacy `CHC` continues to resolve to `CHC_G2`. These identifiers were confirmed from the supplied schema migrations and application code; the live database was not queried or modified.

## Root causes

1. `v40001-multibrand.js` declared `PRICE_GROUP_OPTIONS` as a seven-item hardcoded dropdown (`CHC_G1`, `CHC_G2`, `CR`, `KV`, `BFI`, `ES`, `MOTOR`). BSV, BSW, BGF, ISO, GWS, KeyPLC, Manifold, Coupling, and Baseplate could not be selected.
2. `index.html` independently hardcoded the 16 Category Management buttons, while `pricing.js` independently hardcoded a similar pricing/compare registry. The three interfaces could drift.
3. The latest definition of `public.keysuite_save_oem_series_mapping_v41503(jsonb)` in `20260906160000_v42302_bfi_global.sql` accepted only `CHC_G1`, `CHC_G2`, `BFI`, `ES`, and `MOTOR`. Even if the frontend offered BSV or BSW, the save RPC would reject it as an unsupported price group.
4. `pricing.js` had no pre-authentication fallback multiplier entry for BSV. Secure data supplied the real BSV multiplier after login, but the fallback registry was incomplete.

The `Invalid product family` exception in `20261107000200_v50045_submersible_category.sql` is limited to the dedicated BSV/BSW category save RPC and is correct for that function. It is not the source of the OEM mapping dropdown omission.

## Correction

- Added `product-family-registry-v50047.js` as the single 16-family UI registry.
- `categories.js`, `pricing.js`, and `v40001-multibrand.js` now consume that registry.
- Removed the static Category Management family buttons from `index.html`; they are generated from the registry.
- Added the missing BSV/Baseplate safe fallback multiplier entries without changing any calculation formula or stored rate.
- Added `20261107000300_v50047_product_family_registry.sql`, which replaces only the OEM mapping save-function definition and expands its accepted identifiers. The function's existing authorization, insert/update behavior, legacy CHC alias, and return shape are preserved.

No existing category, mapping, price, percentage, customer assignment, quotation formula, or product record is changed by the migration.
