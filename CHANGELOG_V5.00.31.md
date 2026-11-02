# KeySuite V5.00.31 Changelog

Baseline: V5.00.30. Source workbook: `004 - KV 261102 - V1.3.xlsx`.

## Fixed

- BSW Product Curve now treats the iframe `load` event as a valid readiness handshake, so an already-loaded selector no longer leaves a blank curve dialog.
- KV pricing now keeps KVC, KV and KVN as independent identities. The existing `price_usd`, `price_rmb`, `price_myr` and rarity columns remain the KV price book; KVC/KVN start empty.
- Customer Brand/Series Price Preference entries are de-duplicated by canonical Brand + Price Group key without deleting stored preferences.
- ES descriptions include `Impeller Diameter: <value> mm (Trimmed)` only when the selected diameter is below the pump maximum. The trim flag and maximum diameter are stored with selection data.

## Improved

- Added a pink Cost action before Product Curve and Selection PDF, and after Assembly Quote/Delete.
- Added permission `View Costing Breakdown`, default Full for Owner and No for other roles.
- Added a read-only Costing Audit with Assembly and Individual USD/RMB/MYR columns, saved-source highlighting, BOM quantities, calculation trail, and quotation difference warning. Currencies are never summed.
- Added a database permission check for every audit open in a connected environment.

## KV V1.3

- Imported 171 complete models: KV1 39, KV2 31, KV3 35, KV4 29 and KV5 37.
- Added KV4 and KV5 to Selection and Product.
- Retained all workbook curve, efficiency, NPSHr, head and shutoff-power points exactly, including zero flow.
- Updated five D1 dimensions to 259 mm: KV 2-310, KV 2-320, KV 3-340, KV 3-350 and KV 3-360.
- Excluded blank/formula-error rows and all families without complete approved model rows.

No production database, Edge Function, storage bucket or deployed website was changed.
