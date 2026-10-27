# Upgrade V5.00.07 to V5.00.08

Use this upgrade only over the supplied V5.00.07 FULL CLEAN release. Back up the installed files and database first.

1. Extract the upgrade ZIP over the existing application root, preserving directory paths. It contains changed/new files only; no deletions are required. Alternatively deploy the complete FULL CLEAN ZIP as the application root.
2. Apply `supabase/migrations/20261027135328_v50008_bgf_category_rule.sql` to the existing Supabase project using your normal migration workflow. This is the BGF-only upgrade approved for this release. Existing functions and migrations are not replaced. No source costs or pricing rules are seeded.
3. As Owner, enter real BGF source prices and configure BGF under Key → Category Pricing for the quotation customer's existing category. Select applicable currencies and factors. BGF uses existing shared USD/RMB rates and MYR = 1. Create a category through the existing workflow before configuring its BGF rule.
4. Refresh the application. The V5.00.08 service worker uses a new cache and includes the new campus modules. Confirm the displayed version is 5.00.08.
5. Verify a BGF quote, monitor quotation history, a vehicle exit and the intended browser/network setup in your authenticated environment.

The files are prepared for deployment; this delivery does not claim that the website or live database was updated. No GitHub repository operation was performed.

Read `CHANGELOG_V50008.md`, `MODIFIED_FILES_V50008.md`, and `VERIFICATION_V50008.md` for the exact changes and test limits. PDF layout code is unchanged.
