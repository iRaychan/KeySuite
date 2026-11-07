# KeySuite V5.00.47 deployment

Do not deploy directly to production. Back up the deployed frontend and database, then use a staging environment cloned from the V5.00.46 production state.

1. Publish the complete V5.00.47 frontend directory to staging using the existing hosting workflow. Preserve the environment-specific `config.js` values.
2. With explicit approval, apply `supabase/migrations/20261107000300_v50047_product_family_registry.sql` to staging. This is required for newly selectable families to save through the OEM mapping RPC.
3. Run `supabase/verify_v50047.sql`. Review the returned function definition and mapping/series counts against the pre-migration backup. The migration itself does not change those counts.
4. Sign in as an Owner/Admin. In Product Family Mapping, confirm all 16 families appear, then save and reload test mappings for BSV and BSW. Use disposable staging mappings only.
5. Open Category Management and Category Compare. Confirm the same families appear, existing rules load, and BSV/BSW remain functional.
6. Compare representative V5.00.46 and V5.00.47 quotation/assembly outputs using the same customer, category, products, quantities, and source prices. Totals must match exactly.
7. Confirm category, customer-assignment, price, percentage, and OEM mapping row counts against the backup before production approval.
8. Only after acceptance, repeat the frontend publication and migration in the approved production window, then hard-refresh clients to clear old cached scripts.

Frontend rollback: restore the backed-up V5.00.46 frontend. The migration only broadens validation and may remain installed; it does not rewrite records. If policy requires database rollback, restore the prior function definition from `20260906160000_v42302_bfi_global.sql` only after confirming no new-family mappings were created, because reverting the validator would prevent those mappings from being edited through the old UI.

No Edge Function deployment or data seed is required.
