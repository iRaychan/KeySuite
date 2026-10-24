# KeySuite V4.28.58 Upgrade

1. Back up the current V4.28.57 deployment and database.
2. Upload the contents of the V4.28.58 upgrade package over the existing application.
3. Run `supabase/migrations/20261005090000_v42858_cr_mechanical_seal_addons.sql` once in Supabase.
4. Optionally run `supabase/migrations/20261005090001_v42858_verify_cr_mechanical_seal_addons.sql` to verify all 15 CR seal/group values, the save function and RLS.
5. Sign in as an owner and confirm that Price List → CR allows each Mechanical Seal Add-On row to be edited and saved.
6. Confirm Product → CR opens the CR model search/selector and that CHC G1 displays the amended V1.3 data.

The V4.28.58 database migration seeds the supplied CR defaults without overwriting existing rows. Only owners can save changes; authenticated users retain view-only access.
