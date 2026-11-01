# Upgrade to KeySuite V5.00.24 from V5.00.23

1. Back up the current V5.00.23 deployment.
2. Extract the upgrade package into the KeySuite web root and replace matching files.
3. Keep all other application and data files in place.
4. Reload once with the browser cache cleared or allow the V5.00.24 service worker to activate.
5. Confirm the suite footer shows `KeySuite V5.00.24` and run a KV selection.

No Supabase migration is required. CR MASTER, ES MASTER and quotation PDF layout 1.08 are not changed by this upgrade.
