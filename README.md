# KeySuite V1.14

Secure KeySuite release with an Owner-only Key Dashboard and fully frozen V1.08 PDF output.

## V1.14 changes

- Added **Category** as the second module in the Key Dashboard.
- Owner can create and edit pricing categories for different customers.
- Category fields: Name, CHC Margin, Transport, Commission, Set Discount and Final Discount.
- Customer ID and Category ID remain hidden from all user-facing screens.
- Fuel Price is relocated beside the **Company & Pricing** title.
- Fuel Price uses a compact RM input and Save icon.
- No Refresh Pricing / Refresh Data button is included.
- Selector PDF filename uses the selected model name only.
- The V1.08 PDF/print layout is unchanged.

## Installation

1. Keep the existing working `config.js` in the GitHub repository.
2. Run `setup/V114_SUPABASE_MIGRATION.sql` in Supabase SQL Editor.
3. Upload all V1.14 public files to the repository root, replacing matching files.
4. Refresh the deployed page using `Ctrl + Shift + R`.
