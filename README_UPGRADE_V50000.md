# Upgrade to KeySuite V5.00.00

This upgrade is for the delivered V4.29.26 consolidated amendment. It preserves the complete V4.29.26 master and adds the shared KeyHQ Messenger surface in KeySuite.

1. Back up the current deployed project.
2. Extract `KeySuite_V5.00.00_UPGRADE.zip` into a separate directory.
3. Run `python3 tools/apply_v50000_upgrade.py /absolute/path/to/current/project` for a dry run.
4. Resolve any reported local modification. The helper will not overwrite an unknown file.
5. Repeat with `--apply`, then publish the resulting full project using the existing frontend workflow.
6. Clear or refresh the old service worker and complete the deployed smoke test in `QA_V50000.md`.

No new V5 database migration is required. Do not reapply the already-deployed V0.9, V0.10 or V4.29.26 migrations to the same Supabase project.

The upgrade does not publish hosting, push GitHub, contact Supabase or alter data. FULL CLEAN is the complete project; UPGRADE contains only V5 changed/new files plus the guarded installer and manifest.
