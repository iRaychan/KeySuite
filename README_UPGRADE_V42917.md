# Upgrade KeySuite V4.29.16 to V4.29.17

1. Back up the deployed site.
2. Upload every file listed in `UPGRADE_FILE_MANIFEST_V42917.txt`, preserving paths.
3. Confirm the site displays V4.29.17.
4. In Safari, reload the site and confirm an existing session enters KeySuite or the sign-in form appears within eight seconds if session recovery cannot complete.
5. Sign in and confirm the Dashboard, Quotation and KeyHQ open normally.

V4.29.17 must be deployed as a complete set. In particular, upload `index.html`, `auth.js`, `sw.js`, `v41200-bootstrap.js` and `v42917-version-lock.js` together so Safari cannot mix the new Auth code with an older cached shell.

No new Supabase migration or Edge Function deployment is required.
