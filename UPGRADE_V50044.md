# KeySuite V5.00.44 upgrade

Use this overlay on the supplied V5.00.43 BSV Review Build. Back up the deployed files and stage the overlay at the application root. Preserve your environment settings. If your installation diverges from the supplied baseline, merge the changed files before applying them.

With approval, apply only `supabase/migrations/20261107000000_v50044_submersible_multipliers.sql` to a KeySuite database that already has the V5.00.43 BSV schema. It adds nullable, independent BSV and BSW multiplier fields and a permission-gated save RPC. Unset rates use the existing KeySuite defaults. Existing price, rarity and currency settings are preserved. Existing legacy M records are retained and excluded from the BSV interface.

Verify both multiplier panels, owner-only BSV row saving, role restrictions, and BSV quotation and assembly behavior in staging before publishing. No Supabase Edge Function deployment is needed. The existing backend must already have the V5.00.43 BSV price table and RLS policies.

The BSV workbook supplied no curves. BSV 32G05 MA and BSV 100G30 T commercial actions remain gated pending resolution of conflicting source specifications. The two explicit quotation examples in the V5.00.44 brief override base-table HP only for those named configurations.

To roll back the web application, restore the original V5.00.43 files. Leave the additive database fields in place to retain any rates entered during testing.
