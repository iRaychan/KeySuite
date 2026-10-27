# KeySuite V5.00.07 upgrade from V5.00.06

This ZIP contains only changed/new V5.00.07 release files, plus upgrade instructions, a manifest and a verification helper. Use the FULL CLEAN ZIP for a new installation or an older baseline.

## Apply safely

1. Back up your existing V5.00.06 website folder.
2. Extract this upgrade ZIP into a separate temporary folder.
3. From the extracted folder, validate your installation:

   `python3 tools/apply_v50007_upgrade.py /absolute/path/to/KeySuite`

4. If validation passes, apply the files:

   `python3 tools/apply_v50007_upgrade.py /absolute/path/to/KeySuite --apply`

5. Publish the updated website folder through your existing hosting process, then reload browser tabs to activate the new cache/version.

The helper refuses to overwrite locally modified release files and performs all validation before copying. It can safely be run again. It does not delete files, publish a website, change GitHub, or access Supabase.

For manual upload, use only paths listed in `UPGRADE_MANIFEST_V50007.json` under `files`, preserving folder paths. Keep every other existing application file. Do not replace your whole installation with this smaller ZIP. The manifest and helper remain in the temporary folder; the helper copies only release payload files.

## Supabase

No migration or Edge Function deployment is required for V5.00.07. The existing BGF migrations and four active models were verified on the live KeySuite project. This upgrade contains no backend changes.

## Verification

Package CRC and SHA-256 checks passed. Applying this upgrade to a fresh extraction of the supplied V5.00.06 FULL CLEAN ZIP produced files byte-for-byte identical to the supplied V5.00.07 FULL CLEAN ZIP. Repeat application passed. A locally edited target file and a tampered payload were each rejected before copying.

See `CHANGELOG_V50007.md`, `VERIFICATION_V50007.md`, and `MODIFIED_FILES_V50007.md` for the release changes, functional tests and limitations.
