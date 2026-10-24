# KeyHQ coastal campus — local review build

Built from the supplied KeySuite V4.29.25 archive on 24 October 2026. Local preview: http://127.0.0.1:8766/keyhq/

## Included

Three-storey 3D headquarters with a rooftop terrace; floor cutaways; reception, pump showroom, KeyLab, training, office, meeting rooms, AI Studio, executive suite, gym and rooftop areas. Outdoor campus includes a 105 × 68 m football pitch, two-hoop basketball court, tennis, pickleball, covered badminton, pool, café, fountain garden, parking and an electric cart tour.

The original logo PNG remains byte-identical (SHA-256 5ab07e647741bc8bc79faf8237d6b2ce5ba77499ac3b4a75216d17acba8ba1b1). The main sign is mounted above the rooftop parapet. Rendering makes only its near-white background transparent; the original asset is not rewritten. Blue neon sign and architectural lighting are enabled in the default night view. Daylight and golden hour remain selectable.

Adam appears first; Eve retains the old Maya storage slot 0 and its saved appearance. Adam retains slot 1. Custom names are not bulk-renamed. The existing avatar rig supports standing, walking, sitting, working, talking and waving. Local companion options include tied hair and a dress. Authenticated employee choices stay within the existing database appearance schema; unsupported new options are not sent to it.

Pan is the default camera mode. Screen position is independent of the world rotation point. Destination selection anchors rotation at that destination, including basketball. Pan/Orbit buttons, right-drag orbit, Shift-drag pan, pinch zoom, zoom buttons and double-click pivot selection are available. Trackpad scrolling pans; Ctrl/Command-scroll zooms. Home explicitly resets the overview and screen offset.

The existing KeySuite parent bridge supplies authorized workforce and enquiry context. No new login or Telegram manual control is introduced. The legacy office tools remain accessible from the footer, including existing business workflows. No business module, database schema, production service or authentication connection was changed.

## Verification completed

- Original source: all 630 files matched the supplied archive before modification.
- Chrome 155 and WebKit 18.4: scene loading, floor/roof visibility, customization, persistence/reload, local activities, map travel, cart toggle, lighting/quality, and layouts at 1600, 1000, 768 and 390 pixels.
- Local parent fixture: self-only employee control, other-employee and AI manual-control denial, forged child-message rejection, restricted enquiry filtering, demo filtering, owner visibility, logout cleanup, exact nine-field profile-save payload, and save rejection handling. No production accounts were used.
- Pure state tests: Maya-to-Eve identity, saved appearance/custom-name preservation, denied permissions, feed filtering, obstructed route rejection and a valid walking path.
- Subsequent rooftop-neon revision: Chrome rendered without JavaScript errors; the in-app preview displayed the transparent rooftop sign with no browser error logs.
- Subsequent camera revision: in-app UI drag and orbit test held basketball pivot at [57, 1, 8], preserved screen offset [-130, 100], and changed the orbit angle. Screenshot: `screenshots/free-pan-basketball.png`.
- Existing CR pricing, assembly/system pricing, curve timing and auth bootstrap regressions passed.
- The old V4.28.58 seal-editor layout test fails its half-width assertion on BOTH the untouched V4.29.25 baseline and this build. It is a pre-existing failure, not reported as passing.
- Logo hash verified unchanged. Changed-file manifest is in `source-integrity.json`.

## Review limits

This is a stylized interactive review build, not a photorealistic match to the approved image. More detailed architecture, landscaping, facial/clothing assets and leisure animations remain visual refinement work. Sports courts and cinema are modeled spaces, not playable sports or a connected media player. Golf-cart transport is currently for the local preview companions.

Employee movement is browser-local; cross-client position synchronization and autonomous inter-floor employee travel are not implemented in this new scene. The existing workforce and profile persistence are retained through the parent adapter; real company enquiries, real account saves, quotation PDF workflows and end-to-end production behavior were not exercised. Original business-module preservation was checked by hashes and the listed local regressions.

Outdoor details are deferred until the first render; avatars load asynchronously. Instancing, coarse distant foliage geometry and quality settings reduce scene cost. These are not a full streaming-campus implementation. Automated browser checks do not establish sustained real Safari/Apple Silicon GPU performance.

## Files and use

- Development checkout: `build/campus-preview/KeySuite`.
- Full local review archive: `KeyHQ_Campus_Review_FULL.zip`.
- Scoped changed/new files: `KeyHQ_Campus_Review_PATCH.zip`.
- Patch is for a staging copy of V4.29.25, not automatic production deployment. Back up the existing module before applying it. The accompanying new `keyhq/campus` directory is required.
- Serve the full checkout with a local HTTP server and visit `/keyhq/`. ES modules require HTTP; double-clicking the HTML file is insufficient.
- No new SQL migration, dependency installation, hosting publication or GitHub push is part of this package.
