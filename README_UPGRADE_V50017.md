# KeySuite V5.00.16 → V5.00.17 Upgrade

This overlay upgrades an existing complete V5.00.16 installation to V5.00.17. Copy the contents over the V5.00.16 website root while preserving the included paths, then refresh the site twice so the `keysuite-v50017-20261031` service-worker cache takes control.

The production KeySuite Supabase project was migrated successfully as version `20261031063308`. No Edge Function changed and no Edge Function deployment is required. For another Supabase environment, apply `supabase/migrations/20261031143000_v50017_kv_integration.sql` before using KV Price List or Category management.

The website remains a GitHub Pages deployment. Per the deployment request, this package does not push or modify GitHub.

Rollback: restore the V5.00.16 web files. The added KV database objects can safely remain unused; do not delete production pricing data during a frontend rollback.
