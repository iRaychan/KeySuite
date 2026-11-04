# V5.00.36 deployment

Database changes are required. Neither migration has been applied by this build task.

1. Retain the existing application and database backup. Test against staging with the existing V5.00.35 schema first.
2. Apply only these new migrations, in order:
   - supabase/migrations/20261104130000_v50036_customer_remarks.sql
   - supabase/migrations/20261104130100_v50036_bsw_variant_prices.sql
   - supabase/migrations/20261104130200_v50036_rls_advisor_hardening.sql
3. Run supabase/verify_v50036.sql. Expect 378 valid BSW variants, zero phantom M/MA variants for BSW 50F40-2, RLS enabled on all three new tables and no anonymous remarks read or authenticated remark update/delete grants.
4. Verify with actual staging accounts: owner, assigned user, unassigned user and another company. Customer remark reads/additions must follow existing customer visibility. Non-owner BSW writes must fail. X variants must fail FK validation. Test save/reload from a second session/device.
5. Upload the complete frontend contents while preserving production config.js and hosting settings. Reload clients to activate keysuite-v50036-20261104. Include all new JS files and the existing vendor libraries.
6. Confirm V5.00.36, direct/Curve/Selection costing parity for each enabled family, component Cost actions, CHC configuration propagation to Quote/Assembly/PDF, BSW variant source selection and customer switching in Remarks.

No Edge Function deployment is required. GitHub has not been used. No existing table is dropped, and no existing prices, customers, quotations or assemblies are overwritten. Migrations are repeatable; availability seeds use ON CONFLICT DO NOTHING. New tables retain their contents on rerun.

Rollback: restore the V5.00.35 frontend while retaining the additive tables/history. Do not delete the remarks or saved BSW prices during a frontend rollback.
