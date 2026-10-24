# V4.29.20 Upgrade

1. Back up the deployed site.
2. Apply `supabase/migrations/20261022170000_v42919_quotation_history_and_counter.sql`, then `supabase/migrations/20261022193000_v42920_atomic_quotation_save.sql` to Supabase. The first is safe to reapply when V4.29.19 is already installed.
3. Upload every file listed in `UPGRADE_FILE_MANIFEST_V42920.txt`, preserving paths.
4. Confirm the login screen displays V4.29.20.
5. Sign in as R and RC. Before either account saves, both should preview the same four-digit running number with their own prefix.
6. Save a new quotation from one account and confirm the other account previews the following number.
7. Open the saved quotation, save it again, and confirm the same reference is updated rather than inserted again.
8. Confirm Owners see the whole company history and non-owner users see only quotations created by their own account.
9. Confirm Safari no longer reports a quota warning after live history loads.

Upload the complete upgrade set together. No Edge Function deployment is required.
