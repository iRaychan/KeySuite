# V4.29.19 Upgrade

1. Preserve any browser-only quotation that must be recovered before refreshing or clearing that browser.
2. Back up the deployed site.
3. Apply `supabase/migrations/20261022170000_v42919_quotation_history_and_counter.sql` to Supabase.
4. Upload every file listed in `UPGRADE_FILE_MANIFEST_V42919.txt`, preserving paths.
5. Confirm the login screen displays V4.29.19.
6. Sign in with both owner accounts and confirm both can see the same secure company quotation history, including `RC-2610-0235`.
7. Confirm a full local browser backup produces a cache warning without replacing live Supabase history.
8. Confirm Save is blocked whenever secure quotation synchronization is unavailable.

Upload the complete upgrade set together. No Edge Function deployment is required.
