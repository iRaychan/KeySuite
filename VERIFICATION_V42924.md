# V4.29.24 — verification and limitations

Release candidate for user testing. Baseline: supplied V4.29.23 FULL CLEAN GitHub ZIP. No deployment, push, production database access or migration was performed.

## Completed corrections

- Original eight floors, names, coordinates, room plans, rooftop and logo retained. Original logo and protected modules are byte-identical.
- Root cause: tall divider geometry, non-mirrored workstation peripherals, and inward chair offsets. The user approved reversing those chair offsets. Chairs now sit outside their assigned desktops; desk coordinates and employee assignments are unchanged. Monitor, keyboard, mouse and seating face consistently.
- All desk/employee name paths use consistent 11px/700/system-ui white text on dark screen-space labels. Collision stacking handles nearby desk and prototype nameplates independently of camera orientation and seated body scale.
- PDF surround uses screen-only charcoal overrides. White pages, logo, quotation contents, fonts and pagination code are untouched.

## Phase 1

Two fictional local avatars on existing Level 6. Original GLB with 15-joint shared skeleton, 491,092 bytes, six reusable clips (idle, walk, sit, work, talk, wave). Real skinned Three.js models, independent cross-fading mixers, local profile validation/save/reload, click-to-move, bounded navigation and manual priority until explicit Auto. Three.js and models load only when requested; no external asset requests. Other floors retain their original renderer. The legacy sprites for desks 1 and 2 are temporarily hidden in the office while the prototype uses those seats, to avoid visual overlap; their employee records and monitor workflows remain intact.

## Passed checks

- Chrome and WebKit 18.4: idle/talk/wave, save/reload customization, lazy load, pause/hide on other floors, resume, no JavaScript errors, no external requests.
- Chrome and WebKit: travel to chairs, seated and working states, visual alignment, standing transitions.
- Chrome: actual click-to-move route completion, persistent manual override and explicit Auto resume.
- Failed GLB loading leaves the original building and rooftop navigation usable.
- Controller: blocked targets rejected, paths complete, all four corrected chair approaches and work-facing directions correct; malformed customization inputs constrained.
- GLB: valid 2.0 container, 15-joint skinning, all six named clips, no textures, under 500 KiB.
- PDF screen surround charcoal, page white; print surround white, no added viewing padding or shadow. Close and Print callback work. Fixed-JPEG-input PDF encoding is identical between baseline and updated versions. The CSS extraction, JPEG rasterizer and PDF encoder source functions are byte-identical.
- Existing pricing, CR pricing/selection, assembly pricing, motor pricing/final pricing, tyre coupling, curve timing and authentication-bootstrap regression checks passed.
- Preservation: 583 existing files unchanged; 9 existing files changed. All Supabase source/migrations, product selectors, logo and business calculations are preserved.

## Local performance observations

At 1440×1000, Chrome prototype startup measured 490 ms; WebKit 451 ms. Mean sampled frame intervals were 16.46 ms / 16.40 ms, with p95 16.8 ms / 19 ms. These short local samples are not guarantees on other hardware or networks. WebKit automation checks Safari's engine family; the installed Safari application was not separately certified.

## Known limitations / inherited failures

- The untouched baseline's Chrome PDF raster-download fixture fails with a tainted-canvas SecurityError. The original JPEG exporter is preserved. Successful end-to-end PDF raster download parity is **not certified**; fixed-input encoding and Print/Close callbacks were tested separately. Print remains available. A separate exporter investigation is recommended.
- Three historical functional tests fail identically on the supplied baseline: v42865 (shared optimized-raster source expectation), v42866 (G1 dimension fallback source expectation), v42867 (historical CR geometry marker). These were not introduced by this update. Old release tests also pin obsolete version/visual strings.
- This is a preserved canvas building plus a real Three.js avatar layer, not a rebuilt building. Occlusion mirrors furniture boxes; avatar-to-avatar collision avoidance, foot IK, lip sync and fine hand IK are not implemented. Validate unusually dense dynamic desk layouts before broader rollout.
- Two fictional profiles use local browser storage, shared across users of that browser origin. They are not authenticated employee profiles. Multiplayer, Supabase synchronization, AI employees, KeyBot decisions and permission-controlled business actions are architecture planning only.
- Existing prototype portrait style is intentionally low-poly; further art-direction approval should precede expansion.

## Modified existing files

- `KEYHQ_RELEASE.json`
- `app.js`
- `index.html`
- `keyhq-launcher.js`
- `keyhq/app.js`
- `keyhq/index.html`
- `keyhq/styles.css`
- `manifest.json`
- `sw.js`

New files are listed in `UPGRADE_FILE_MANIFEST_V42924.txt`. Main additions: `keyhq/avatar/`, local pinned `keyhq/vendor/`, optional `avatar-build-tools/`, current version lock, tests and release documentation.

## Phase 2 recommendations

Approve appearance and seating on representative employee counts; test target Safari/Chrome hardware; review existing account/profile schema before any migration; add tenant- and floor-authorized profile/realtime adapters, then multiplayer reconciliation and chair reservations. Keep manual control authoritative and AI decisions separate from animation. Business actions must stay behind existing server permissions. See `keyhq/avatar/ARCHITECTURE.md`. Separate approval is required.
