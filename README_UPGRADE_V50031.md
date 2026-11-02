# KeySuite V5.00.31 Upgrade

1. Back up the current V5.00.30 website and Supabase database.
2. Apply `supabase/migrations/20261102190000_v50031_kv_costing_audit.sql` to the target Supabase project.
3. Extract this upgrade package over a clean V5.00.30 deployment, preserving the included folder paths and replacing matching files.
   If the installed version is not exactly V5.00.30, use the V5.00.31 full-build package instead.
4. Clear the old service-worker cache or reload twice after deployment.
5. In Role Management, explicitly grant `View Costing Breakdown` to any non-Owner role that requires it.
6. Verify KVC and KVN prices before quoting those variants. They intentionally begin at zero; existing KV values remain unchanged.

The migration is idempotent for schema and model seeds. It never copies KV prices into KVC/KVN and never overwrites existing KV price or rarity values. No Edge Function deployment is required.

Post-deployment acceptance:

- Open a BSW Product curve and confirm the chart is populated.
- Confirm KV Price List switches independently among KVC, KV and KVN.
- Confirm Product shows KV1–KV5 and no incomplete family.
- Select a trimmed ES duty point and verify its quotation description.
- Confirm Cost is invisible to an unpermitted role and that a direct audit RPC call returns false.
- Compare an Assembly audit against its saved BOM and quotation price.
