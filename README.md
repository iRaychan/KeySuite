# KeySuite V1.18

Base: KeySuite V1.17. The approved V1.08 quotation PDF/print layout remains fully frozen.

## Install in this order

1. In Supabase, open **SQL Editor → New query**.
2. Run the complete file: `setup/V118_SUPABASE_MIGRATION.sql`.
3. Extract this GitHub package.
4. Upload all files and folders to the root of the existing KeySuite repository, replacing matching files.
5. Keep the existing working `config.js`. This package intentionally does not include it.
6. Wait for GitHub Pages to deploy, then refresh using `Ctrl + Shift + R`.

## V1.18 highlights

- Category Name at the top, with vertically stacked `CHC` and `GWS` pricing-rule buttons.
- Separate CHC and GWS rules for margin, transport, commission, set discount, final discount and fuel charge.
- Hold a protected field for 3 seconds to unlock it for editing.
- Optional formula components are controlled by checkboxes; unchecked components are omitted from costing.
- Independent USD, RMB and MYR source prices for each model/variant.
- Highest converted MYR source price is used before margin and the remaining category formula.
- GWS Tank models: 8LX, 12LX, 18LX, 24LX, 35LX, 60LV, 80LV, 100LV, 130LV, 150LV, 200LV and 300LV.
- GWS pressure prices: 10 Bar, 16 Bar and 25 Bar.
- Product > CHC uses one model per row with Curve, PDF and Quote controls.
- Product > GWS Tank can add the selected model and pressure to a quotation.
- Mobile landscape now shows Export / Share PDF beside Add to Quotation.
- Quotation items open collapsed and Export Center labels are shortened.
- A saved quotation keeps its internal pricing customer even when another customer is selected for the next quotation.
- Printed customer/contact wording can be edited independently.

## Security and data

- Only the Owner sees the gold Key button and the protected Key modules.
- Customer ID and Category ID remain database-only and are not shown on dashboards.
- Source prices are stored in Supabase, not embedded in the public GitHub files.
- Do not upload SQL, Excel source files or secret/service-role keys into the public repository.
