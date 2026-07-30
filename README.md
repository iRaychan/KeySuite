# KeySuite V1.16

Base: KeySuite V1.14 with the V1.08 PDF output fully frozen.

## V1.16 changes

- Fixed the New Category action so the editor visibly resets and opens for input.
- Reduced the Category list to Category and Edit only.
- Enlarged the Edit Category area.
- Commission, Set Discount and Final Discount are on one row.
- Currency, Multiply, CHC Margin and Transport are on one row.
- Added USD/RMB selection and a multiplier saved separately for every category.
- Company & Pricing uses the selected customer's category currency and multiplier.
- The PDF output layout remains unchanged.

## Installation

1. Run `setup/V115_SUPABASE_MIGRATION.sql` in Supabase SQL Editor.
2. Extract this package.
3. Upload all public files and folders to the GitHub repository root, replacing matching files.
4. Keep the existing working `config.js`; this package does not include it.
5. Refresh KeySuite with `Ctrl + Shift + R` after GitHub Pages completes deployment.


## V1.16 setup
Run `setup/V116_SUPABASE_MIGRATION.sql` in Supabase before testing Price List or saving user signatory settings. Keep the existing working `config.js`.
