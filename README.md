# KeySuite V1.11

Secure KeySuite release based on V1.10 with the V1.08 PDF output frozen.

## V1.11 changes

- Model / Item shows pump model and selected duty point.
- Non-metric duty inputs show both entered and converted units.
- Duty point is no longer repeated in Description.
- Customer and assigned Pricing Category are required before pricing, saving or PDF generation.
- Key Company & Pricing lists customer/company records and shows the address saved in Customers.
- Owner/Admin assigns the Pricing Category for each customer/company.

## Installation

1. Keep the existing working `config.js` in the GitHub repository.
2. Run `setup/V111_SUPABASE_MIGRATION.sql` in Supabase SQL Editor.
3. Upload all V1.11 public files to the repository root, replacing matching files.
4. Refresh the deployed page using `Ctrl + Shift + R`.

The migration assigns the existing single pricing category to older customers. New customers remain without a pricing category until Owner/Admin assigns one in Key.
