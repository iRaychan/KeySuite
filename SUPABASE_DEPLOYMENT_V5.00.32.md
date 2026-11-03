# Supabase and Deployment — V5.00.32

## Upgrade from V5.00.31

- New SQL migration required: **No**.
- Edge Function deployment required: **No**.
- Supabase configuration or secret change required: **No**.
- Existing data reset or historical quotation update: **No**.

V5.00.32 reuses the V5.00.31 costing permission RPC, `keysuite_can_view_costing_breakdown_v50031`. The V5.00.31 migration `supabase/migrations/20261102190000_v50031_kv_costing_audit.sql` must already be applied. Sites upgrading from a version older than V5.00.31 must apply that existing migration before deploying V5.00.32.

## Static application deployment

1. Back up the currently deployed application and confirm the Supabase project/database backup policy.
2. Deploy the complete contents of the V5.00.32 FULL BUILD, or overlay the V5.00.32 UPGRADE package onto an intact V5.00.31 deployment.
3. Preserve the deployment's existing Supabase URL/key configuration.
4. Do not run data-reset scripts and do not rewrite saved quotations.
5. Purge the hosting/CDN cache if used. The service-worker cache changes to `keysuite-v50032-20261103`; users should reload after deployment.
6. Verify login, permissions, Dashboard preferences, Product/Selection/System audit, PDF generation and quotation save on a staging deployment before production promotion.

No live Supabase migration or production deployment was performed as part of packaging this build.
