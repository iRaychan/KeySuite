# KeySuite V5.00.06 changes

Built from the user-supplied V5.00.05 FULL CLEAN GitHub ZIP. This release contains exactly the three approved changes.

## 1. BGF Price List

- Added BGF 350M, BGF 350E, BGF 400 and BGF 500 to a dedicated Owner-maintained Price List.
- Preserved the supplied workbook in `source/` and recorded each technical row in the additive Supabase migration.
- The workbook's detail table calls the fourth model `BGF 550`, while its summary and the approved release request call it `BGF 500`. The release uses BGF 500 and retains `BGF 550` as `source_model` for audit.
- All workbook price cells are blank. V5.00.06 seeds zero/unpriced values rather than inventing prices. Owners may enter MYR, USD or RMB source prices after deployment.

## 2. Messenger on every page

- Added the authenticated KeyHQ Messenger button directly beside Important Note on every KeySuite page.
- Reused the existing protected private/group chat, history, presence, unread-count and Supabase Realtime implementation.
- Shared unread totals are shown on every Messenger button. Messenger initialization and connection failures remain isolated from the main KeySuite application.

## 3. Quotation description auto-expand

- Quotation Description starts at a five-row minimum.
- It expands to fit explicit rows and browser-wrapped lines as content is entered, restored, duplicated or resized.
- Description values are not rewritten by the sizing logic, preserving existing `c/w` tab alignment and quotation/PDF text behavior.

All other V5.00.05 functions, layouts, formulas, existing prices, permissions and modules are preserved.
