# KeySuite V4.29.24 — Phase 1 avatars and visual corrections

## Install for testing

Back up the existing V4.29.23 project first. For the FULL CLEAN GitHub ZIP, use the contents of `KeySuite_V4.29.24/` as the complete site root. For the UPGRADE ZIP, overlay its files onto the V4.29.23 site root, preserving directory paths. The upgrade contains changed/new files only; it requires the supplied V4.29.23 baseline. Do not upload the enclosing ZIP folder as an extra nested website path.

Serve through HTTP(S), as with existing KeySuite. ES modules and GLB fetching do not work reliably from `file://`. The app is static and requires no npm build. All runtime Three.js files are included locally. Deploy assets and entry files together, then reload to activate the V4.29.24 service-worker cache. Verify the suite displays V4.29.24.

No new Supabase migration is required. Existing V4.29.23 account/profile functionality retains its original database dependencies and RPC names. Do not run historical migrations merely to try the local avatar prototype. No production deployment or database update has been performed.

## Try Phase 1

1. Open KeyHQ from KeySuite. Click **Start Phase 1 · 3D avatars**. This opens the existing Level 6 office and loads only the two prototype avatars.
2. Select Maya or Adam. **Stand**, **Talk**, **Wave**, **Sit** and **Work** control that avatar. Sit/Work navigate to the corresponding first or second office desk and face its monitor. The fictional avatars are visual test actors; employee desk assignments are unchanged.
3. Click **Move**, then click a clear office floor area. Furniture, meeting-room/pantry boundaries and the elevator/core area block navigation. Manual commands remain in charge until **Auto** is explicitly selected.
4. Click **Customize**. Select face/body presets, gender, hair/color, skin tone, business/casual/Keylargo outfit, shoes, glasses and name; save, then reload to verify persistence. Storage is local to this browser and website origin, shared across logins on that browser, and holds only fictional prototype profiles.
5. Rotate, zoom, return to normal framing with **Center Screen**, or use **Close-up**. Switch floors: the 3D prototype hides and its movement pauses. The original floors, rooftop and elevator remain available.
6. Open a sealed quotation through its existing authorized workflow. The surround is charcoal, the document white, and the existing Download PDF / Print / Close buttons remain.

## Workstation root cause

Opposite-facing workstation peripherals used a single direction, large shared divider panels appeared behind monitors, and the original chair offsets placed each chair inside the opposite desk. With user approval, only those chair offsets were reversed to the outside edge; desk coordinates, assignments and room layouts remain unchanged. Monitor/keyboard/mouse direction and seated avatar anchors follow the corrected chairs. Low divider rails retain the connected desk grouping.

Labels now use consistent screen-space typography and collision placement instead of seated/standing-dependent font sizes or avatar-parent scaling. Prototype name plates reserve space so desk labels do not collide with them.

## What remains Phase 2+

This is a hybrid renderer: the original building is preserved in its existing projected canvas renderer, with real skinned Three.js GLB avatars and depth-only furniture occlusion. It is not a replacement 3D building. Two fictional avatars operate only on Level 6. No live multiplayer, employee profile synchronization, AI integration or new business-action permissions are implemented. Existing legacy employee visualizations remain unchanged apart from label/seat alignment.

Read `keyhq/avatar/ARCHITECTURE.md` for the future authenticated profile, private Realtime, AI-decision and permission-gateway design. Those phases require separate approval.

## Validation and limitations

See `VERIFICATION_V42924.md` for tests, preservation checks, performance observations and inherited failures. In particular, the untouched baseline's Chrome PDF raster-download test triggers a tainted-canvas error; the original exporter is preserved, and successful end-to-end raster download is not certified by this release. Print remains available. Current acceptance tests are `node tests/v42924-avatar-controller.mjs` and `node tests/v42924-avatar-asset.cjs`; historical tests that pin earlier versions remain historical.

## Rollback

Restore the backed-up V4.29.23 files, including `index.html`, `sw.js` and the prior KeyHQ files. Remove only added paths listed in the manifest if desired. Reload the site and, if necessary, clear this site's service-worker/cache storage. Do not clear business local storage indiscriminately. The two prototype keys may be removed separately: `keyhq:phase1:avatar:v1:0` and `keyhq:phase1:avatar:v1:1`. No database rollback is required.

`UPGRADE_FILE_MANIFEST_V42924.txt` lists all upgrade files; `SHA256SUMS_V42924.txt` records their hashes. `avatar-build-tools/` is optional source tooling for rebuilding the original GLB and is not needed to run the application.
