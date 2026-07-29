# KeySuite V1.00 – Company & Pricing

GitHub Pages-ready V1.00 foundation build.

## Linked source files

- `002 - Company 260729 - V1.0.xlsx`
- `003 - Category 260729 - V1.0.xlsx`
- `010 - CHC (Pricelist) - 260729 - V1.0.xlsx`

The original Excel files are retained under `source-data/`.

## Data relationship

`Company → Company Category → Category Pricing Rule → CHC Product Price → Quotation Final Price`

Current imported records:

- 1 company
- 2 company users
- 1 pricing category
- 409 CHC model rows
- 64 priced material variants across 52 models

## V1.00 pricing formula

```text
Local Base MYR = Source USD × 5.8
Landed Cost = Local Base MYR × CHC Factor + Transport
Quotation List = Landed Cost ÷ (1 − Commission) ÷ (1 − Set Discount)
Final Price = Quotation List × (1 − Final Discount)
```

For category `Special`:

- Final Discount: 8%
- Set Discount: 6.8%
- Commission: 3%
- CHC Factor: 0.38
- Transport: RM30.00

## ID normalization

The source company ID is `COID00001`, while both user rows used `COID000001`. V1.00 normalizes the two user links to `COID00001` and keeps the original source ID for audit traceability.

## Files

- `index.html` – V1.00 application
- `app.js` – Company, pricing and quotation logic
- `data/master-data.js` – browser-ready linked data
- `data/master-data.json` – system-neutral linked data
- `data/keysuite-v1.00-supabase.sql` – Supabase/PostgreSQL schema and seed data
- `integration/keysuite-pricing-engine.js` – reusable bridge for the existing KeySuite application
- `KeySuite_Master_Data_V1.00.xlsx` – consolidated review workbook with pricing preview formulas
- `source-data/` – original uploaded Excel files

## GitHub Pages

Upload all files and folders to the repository root, then enable GitHub Pages from the main branch and root folder.
