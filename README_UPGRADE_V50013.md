# Upgrade to KeySuite V5.00.13

This package upgrades the user-uploaded V5.00.12 review build to V5.00.13. It is not production deployment authorization.

## Before applying

1. Keep untouched copies of V5.00.11 and the uploaded V5.00.12 package.
2. Back up the target database and test with a staging clone.
3. Review `proposals/user_archive_v50013.sql` and the `keysuite-manage-user-status` Edge Function.
4. Confirm the target `ks_user_access` table and existing role-list RPC return inactive rows to the Owner.

## Staging sequence

1. Apply `proposals/pricing_v50012.sql` if the V5.00.12 pricing proposal has not yet been accepted in staging.
2. Apply `proposals/user_archive_v50013.sql` in staging.
3. Deploy `supabase/functions/keysuite-manage-user-status` with the standard Supabase environment variables.
4. Publish the frontend to staging and clear the old service-worker cache.
5. Test archive, immediate data denial, refresh-token revocation, login rejection, Archived Users visibility, restore, and re-login.
6. Confirm quotation history and role/audit records remain present.

Do not apply the SQL, deploy the Edge Function, or publish the frontend to production without explicit approval.
