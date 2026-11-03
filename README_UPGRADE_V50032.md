# Upgrade V5.00.31 to V5.00.32

The UPGRADE ZIP contains only files changed or added for V5.00.32. Apply it only over a complete V5.00.31 deployment.

1. Back up the existing deployment.
2. Extract the upgrade ZIP at the V5.00.31 application root, preserving directories and replacing matching files.
3. No new SQL migration, Edge Function deployment or Supabase configuration change is required when upgrading from V5.00.31.
4. Purge hosting/CDN cache if applicable and reload clients so the V5.00.32 service worker is installed.
5. Run the acceptance checklist in `TEST_REPORT_V50032.md` before production promotion.

For clean installations, deploy the FULL BUILD instead.
