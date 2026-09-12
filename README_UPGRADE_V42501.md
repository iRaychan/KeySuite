# KeySuite V4.25.01 Upgrade

## Browser / GitHub files
Deploy the full V4.25.01 release tree. The service-worker cache key and browser cache-busting query are updated to `42501`.

## Supabase migration
Apply the new migrations in order:

1. `supabase/migrations/20260908110000_v42501_bfi_multiplier_and_history_fix.sql`
2. `supabase/migrations/20260908110001_v42501_verify.sql`

The first migration replaces the existing BFI multiplier RPC with an explicit `where id='default'` update. No pricing formula, BFI model data, or quotation numbering rule is changed.

## V4.25.01 fixes
1. BFI multiplier save no longer triggers `UPDATE requires a WHERE clause`.
2. BFI USD/RMB multipliers are locked by default and require a 3-second hold before editing.
3. BFI Price List inputs show the selected currency for both 1 Phase and 3 Phase.
4. Quotation History delete removes the selected quotation from Supabase and local caches so it does not return after refresh. Exact duplicate storage rows of the same quotation reference are also removed.
