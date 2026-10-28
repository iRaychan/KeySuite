# Upgrade KeySuite V5.00.08 → V5.00.09

Use the upgrade ZIP only with V5.00.08. Back up the existing website folder, then extract the upgrade into its root and replace the matching files. No files need deletion. Keep deployment-specific configuration and existing data. The full ZIP contains the complete source tree.

Publish these files to the same web host used by the existing application. Reload once online; the V5.00.09 service worker/cache and version lock are included. Check that the page displays V5.00.09.

No new Supabase migration, Edge Function deployment, data import or GitHub step is required. Do not rerun historical database bootstrap scripts for this upgrade. V5.00.08's existing BGF category support and access rules are retained. BGF 550 uses the existing saved `bgf-500` record ID; source prices and historical quotations are not modified.

This delivery is a source build, not a claim that the live website has been published. See CHANGELOG_V50009.md and VERIFICATION_V50009.md for changes, tests and limitations.
