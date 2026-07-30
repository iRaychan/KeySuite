# KeySuite V1.17

Base: KeySuite V1.16. The approved V1.08 quotation PDF layout remains frozen.

## Changes in V1.17

- Dashboard navigation changed to `Selector > CHC`.
- Added `Product > CHC` for direct model browsing by CHC series.
- Product CHC supports View Curve, Export / Share PDF and Add to Quotation without a duty point.
- Added a mobile Export / Share PDF control beside Add to Quotation.
- Category list now shows only category names. Selecting a category loads its saved values; Edit is in the editor header.
- Customer details from Classification through Notes can be collapsed.
- Added Quote selection beside each contact email.
- Quote selection automatically updates the quotation Customer and Customer Name.
- Customer & Quotation Details opens collapsed by default.

## Supabase

V1.17 has no new database migration. The V1.16 migration must already be installed for Price List and signatory profile saving:

`setup/V116_SUPABASE_MIGRATION.sql`

Do not rerun older migrations unless the corresponding earlier version was never installed.

## Installation

1. Extract this package.
2. Upload all files and folders to the GitHub repository root, replacing matching files.
3. Keep the existing working `config.js`; this package intentionally does not include it.
4. Wait for GitHub Pages deployment to finish.
5. Refresh KeySuite using `Ctrl + Shift + R`.

## Mobile PDF sharing

On supported mobile browsers, Export / Share PDF opens the device's native PDF/print sharing workflow, where WhatsApp or email may be selected. Browser and device support varies; standard PDF save/print remains the fallback.
