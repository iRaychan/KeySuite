# KeyHQ V0.8 campus upgrade for KeySuite V4.29.25

This package upgrades the KeyHQ module. The KeySuite business application stays at V4.29.25.

## Choose your ZIP

- FULL: complete KeySuite V4.29.25 source with the new KeyHQ campus included.
- UPGRADE_from_V4.29.25: only changed/new files. Apply to an existing V4.29.25 source folder.

## Upgrade

1. Back up your existing V4.29.25 website/source folder, including your deployment configuration.
2. Extract the UPGRADE ZIP into that folder's root (the folder containing index.html). Merge folders and replace the listed files. Do not replace the entire keyhq folder: its existing vendor, avatar and other files are still required.
3. Preserve your existing config.js and Supabase configuration. Neither is included in the upgrade ZIP.
4. No NEW SQL migration or Edge Function deployment is required by this upgrade. Existing V4.29.25 avatar-profile database setup remains a prerequisite for account-synced appearances.
5. Upload/deploy the merged source through your usual website workflow. This package does not deploy itself.
6. Reload the website, open KeyHQ, and test your authorized account. If a tab retains the old view, close and reopen it or perform a hard refresh.

## Acceptance checks

- Rooftop Keylargo logo is visible with a transparent background and blue neon in night mode.
- Three floors plus rooftop, sports campus, maps, Adam and Eve, and appearance controls load.
- Pan positions the scene freely; at Basketball, Orbit stays anchored to the court even off-centre. Double-click selects a new pivot. Home resets the overview.
- Return to KeySuite works. Existing quotation, pricing, product-selection and KeyLab workflows remain available.
- Verify employee self-only controls and real authorized enquiry data using your staging accounts before production release.

The original logo file is unchanged. Maya's demo slot remains slot 0, now displayed as Eve; Adam remains slot 1. No workforce records are duplicated or renamed in the database.

## Verification and limitations

ZIP integrity, per-file hashes, baseline matching and upgrade reconstruction were checked. Local Chrome/WebKit interaction and access-boundary tests are documented in CAMPUS_REVIEW.md. The final rooftop and camera revisions were visually checked in the browser. Live company data, real account writes and production deployment were not tested.

This remains a stylized 3D campus review build. Employee movement is browser-local; full multiplayer travel, playable sports and connected cinema are not included. See CAMPUS_REVIEW.md for details and the pre-existing seal-editor regression failure.

## Rollback

Restore the backed-up website/source folder, then reload. The upgrade makes no database changes to reverse. Do not clear browser storage if you want to retain saved companion appearances.

## Package files

UPGRADE_MANIFEST.json lists added and replaced files with before/after SHA-256 hashes. SHA256SUMS.txt beside the ZIPs verifies the ZIP downloads themselves.
