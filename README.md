# KeySuite V1.06

Upload this package over the existing GitHub repository and keep the current working root `config.js`. This package intentionally excludes the real Supabase URL and publishable key.

No new Supabase SQL is required when the V1.04 migration has already been completed.

## V1.06 changes

- Moves the Page 2 quotation logo 3 mm to the left.
- Restores **Add to Quotation** at the top-right of CHC Selector.
- The button adds the currently selected CHC pump to the quotation for the active quotation customer.
- Clarifies customer wording to **Use for Quotation** and **Quotation Customer**.
- Keeps the V1.02 quotation output base, with only the specifically requested logo adjustment.

## Customer selection purpose

The quotation customer is the customer used when a pump is sent from CHC Selector to Quotation. KeySuite automatically selects that company in the quotation and loads its contact persons and payment terms. Customer ownership and access permissions are separate from this selection.

## Upload

1. Extract the ZIP.
2. Upload all files and folders to the GitHub repository root.
3. Replace matching files.
4. Keep the existing `config.js`.
5. After GitHub Pages deploys, refresh with `Ctrl + Shift + R`.
