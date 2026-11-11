# V5.00.64 source price linkage verification

Status: review build. No production prices, migrations, or deployment changed.

| Sample | Actual source record | Verified result | Limit |
| --- | --- | --- | --- |
| KV 1-20 | `ks_products_kv`, model `KV 1-20`: RMB KV 1000, KVC 2000, KVN 3000, KVD 4000, KVSD 5000 | Variant columns are distinct. Stored KV RMB multiplier is 0.65. Local pricing test: KVN RMB 3000 converts to MYR 1950 before margin/adjustments. | Live browser Costing Audit, final selling price, and quotation consistency not verified. |
| KV 1-50 | `ks_products_kv`, model `KV 1-50`: all five RMB variant columns are 0 | Missing source price confirmed; no positive price should be inferred from this row. | USD/MYR columns and other rows not exhaustively checked. |
| CR 3-9 | `ks_products_cr`, model `CR 3-9`: CR/CRS/CRN RMB columns all 0 | This row is unpriced in RMB; stored CR RMB multiplier is 0.65. | Other CR rows, currencies, final prices and quotations not verified. |
| CHC G1 3-9 | `ks_products_chc_g1`, model `CHC 3-9`: CHC/CHCS/CHCN MYR columns null | No MYR source price in this record; stored G1 RMB multiplier is 0.8668. | Other currencies, G2, final prices and quotation not verified. |
| ES Baseplate | `ks_app_settings.baseplate_costing` is present | Existing ES price book preserved in this build. | Live browser pricing and quotation not verified. |
| ISO Baseplate | `ks_app_settings.iso_baseplate_costing` is absent in production | Independent book and migration prepared. Local calculation verifies ISO starts unpriced and does not use ES money values. | Cannot save or verify production end-to-end until reviewed migration is applied and actual ISO prices/quantities are entered. |

Code review found the CR and KV pricing resolvers use material-specific source columns. Brand mapping applies to the customer-facing model after source-price selection. The new material identity correction changes presentation only, retaining the source model and its pricing snapshot. The full Brand → Pricing Category → Source Record → Audit → Selling Price → Quotation chain requires authenticated browser testing with a representative customer and configured brand mapping; it is **Not Verified** here.

No missing source price was filled in or borrowed from another variant. The ISO book has blank money values until supplied by the owner.
