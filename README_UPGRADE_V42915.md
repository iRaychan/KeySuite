# KeySuite V4.29.15 Upgrade

Upgrade from V4.29.14.

## Changes

- Removes the `Motor price adjustment` line from quotation descriptions without changing the corrected motor-substitution unit price.
- Claims quotation numbers during the secure save transaction. If another user has already saved the same running number, KeySuite shows only the four digits, inserts the next available number, and asks the user to save again.
- A manually edited description becomes yellow for review, keeps its calculated unit price and may still be sealed.
- CHC Product duty points now populate Display Capacity, Capacity and Head in the quotation and PDF.
- CHC C4 now uses the standard responsive Selector layout on first open and at Safari zoom.

## Deployment

1. Apply `supabase/migrations/20261018190000_v42910_company_wide_quotation_sequence.sql` in Supabase.
2. Apply `supabase/migrations/20261021194500_v42915_atomic_quotation_claim.sql` in Supabase.
3. Overlay the V4.29.15 upgrade package on V4.29.14.

No Edge Function redeployment is required.
