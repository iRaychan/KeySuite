# KeySuite V1.04 — Customer, Signature and Alignment Corrections

V1.04 retains the V1.02 quotation design as its base and applies only the corrections requested after testing V1.03.

## Before uploading the website

Run this file once in **Supabase → SQL Editor**:

`setup/V104_SUPABASE_MIGRATION.sql`

It creates or repairs:

- `ks_customers` for secure customer saving
- Owner/Admin access to all company customers
- Normal-user access only to assigned customers
- `ks_user_profiles` for each user's signatory and signature attachment
- PostgREST schema-cache refresh

When Supabase displays the safety warning, choose **Run without RLS**. The SQL enables and configures its own Row Level Security policies.

## Upload to GitHub Pages

Upload all files and folders in this package to the repository root and allow matching files to be replaced.

Keep the working root `config.js` already present in GitHub. This package intentionally excludes the real `config.js` and publishable key.

## V1.04 changes

- Signature attachment and Signatory moved to User Settings
- Quotation editor no longer asks for a signature every time
- Quotation button and Quotation No. positioned together at the top-right
- Gold **Key** button moved next to the KeySuite name
- **GOLDEN KEY** removed from the embedded CHC Selector
- Customer table setup repaired
- Authorized Signature and prepared-by name removed from below the printed signature
- Page 1 closing section aligned with To/Attn
- Page 2 logo aligned with Page 1
- Sub-total, 0% SST and Total labels aligned from the Unit Price column
