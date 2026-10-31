# Upgrade to KeySuite V5.00.19

Supported baseline: V5.00.18.

Copy the upgrade overlay into the existing V5.00.18 web root, preserving paths and replacing files when prompted. Reload the site once online so the V5.00.19 service-worker cache is selected.

Apply `supabase/migrations/20261031121319_v50019_bgf_catalogue_metadata.sql` when upgrading another Supabase project. The production KeySuite project already contains migration `20261031121319`. Do not apply this overlay to an older baseline; use the full build instead.

The upgrade does not replace quotation PDF implementation files or CR selector assets.
