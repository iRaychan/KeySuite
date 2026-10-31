# KeySuite V5.00.17 — KV Integration

## Delivered

- Added KV to Selection and Product using the established CR hydraulic selection method.
- Imported the 39 complete KV1 models (`KV 1-20` through `KV 1-400`) from `004 - KV 261029 - V1.0 - Copy.xlsx`.
- Added workbook-derived head, power, efficiency and NPSHr curves, motor data, connections, weights and dimensions.
- Preserved the workbook impeller-power value at zero flow: 0.044 kW per full KV1 impeller.
- Added KV Category Pricing Rules, Category Compare support, independent price-list currencies and multipliers, rarity, Assembly routing and quotation pricing.
- Nested KV under B.G.Reich in both Selection and Product, including the dynamic Brand/Series navigation.
- Matched the KV selector display panel to the established CHC width, control/result proportions and main-plus-stacked chart layout.
- Added workbook-approved KV Material and O-Ring controls: Ca SiC, SiC SiC, TC TC, Viton, EPDM and NBR.
- Added separate Owner-editable MYR Material and O-Ring add-on rows to the KV Price List and applied those add-ons to Assembly and quotation pricing.
- Kept KV2 and later families hidden because the supplied workbook does not include complete corresponding model tables.

## Preserved

- Existing CR selector, product, curve, pricing and price-list assets are unchanged.
- Frozen quotation PDF version remains `1.08`; its print markup and PDF optimization asset are unchanged.

## Database

Production project `skidqdixnnnuhvarekxp` was migrated successfully as version `20261031063308`, followed by category-save compatibility hotfix `20261031064259` and KV Material/O-Ring pricing migration `20261031075208`. Apply all three included V5.00.17 migrations only for another environment.
