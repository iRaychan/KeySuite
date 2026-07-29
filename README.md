# KeySuite V1.10

Upload this package over the existing GitHub repository and keep the current working root `config.js`. This package intentionally excludes the real Supabase URL and publishable key.

## Before uploading

Run `setup/V110_SUPABASE_MIGRATION.sql` in Supabase SQL Editor. It adds:

- Customer Distance (km)
- Owner/Admin-only distance protection
- CHC Margin field
- Persistent Fuel Price
- Owner/Admin-only Fuel Price update access

## V1.10 pricing

1. USD Price × Currency Rate
2. ÷ (1 − Margin)
3. + Transport
4. ÷ (1 − Commission)
5. ÷ (1 − Set Discount)
6. ÷ (1 − Final Discount)
7. + Customer Distance × max(Fuel Price − RM2.00, 0)
8. Round upward to the next RM10

## Upload

1. Extract the ZIP.
2. Run the V1.10 Supabase migration.
3. Upload all files and folders to the GitHub repository root.
4. Replace matching files.
5. Keep the existing `config.js`.
6. After GitHub Pages deploys, refresh with `Ctrl + Shift + R`.

The V1.08 PDF output layout remains frozen on all pages.
