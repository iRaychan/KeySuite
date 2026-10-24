# V4.29.21 Upgrade

1. Start from a complete V4.29.20 installation.
2. Apply `supabase/migrations/20261022213000_v42921_keyhq_company_config.sql` and then `20261022213001_v42921_verify.sql`.
3. Deploy the updated `supabase/functions/keysuite-keyai` Edge Function. This is required for company-scoped KeyHQ enquiries.
4. Upload every file listed in `UPGRADE_FILE_MANIFEST_V42921.txt`, preserving paths.
5. Clear the old site/service-worker cache or reload twice, then confirm the login screen and KeyHQ both display V4.29.21.
6. Open KeyHQ as an authorized role and verify that a failed or unauthorized feed is labelled unavailable/locked, an empty connected inbox is labelled Connected with no enquiries, and live content contains only the signed-in company's records. No demo record is substituted into a live feed.

Do not skip the migration or Edge Function deployment. Existing KeySuite functions and V4.29.20 quotation data are preserved.
