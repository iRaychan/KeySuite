# Upgrade KeySuite V4.29.17 to V4.29.18

1. Back up the deployed site.
2. Upload every file listed in `UPGRADE_FILE_MANIFEST_V42918.txt`, preserving paths.
3. Confirm the login screen displays V4.29.18.
4. In Safari, reload the site and confirm the sign-in form or authenticated app appears without remaining on “Checking existing session…”.
5. Test logged-out, valid saved session, expired saved session and page refresh.
6. Confirm Dashboard, Quotation and KeyHQ open normally.

Upload the complete upgrade set together. No Supabase database migration or Edge Function deployment is required.
