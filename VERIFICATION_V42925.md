# KeySuite V4.29.25 — test results and release notes

Release candidate for testing, built from the existing V4.29.24 source on 24 October 2026. No production database changes, deployment or GitHub push were performed.

## Implementation

Inspection confirmed that V4.29.24 used a Canvas building and legacy Canvas employee sprites, with Maya and Adam in a separate transparent Three.js overlay. V4.29.25 extracts the working GLB loading, skeleton cloning, materials, camera alignment and depth masking into one shared rig module. Both the original demo and the real workforce use it. The original 491,092-byte GLB and six clips are unchanged.

Existing enabled employees retain names, roles, desk assignments and permissions. Each signed-in user edits only their own face/body presets, hair/color, skin tone, clothing, shoes and glasses. The parent frame uses the existing authenticated Supabase client; no new login or credentials are introduced. New profiles use company + Auth UUID keys, self-only RLS, strict appearance validation, a revision counter and Realtime-triggered directory refresh. The existing 20-second context refresh is a fallback. Saves have explicit errors when the migration or connection is unavailable.

Workforce and Location Tracker now occupy one vertically flowing sidebar with equal width, spacing and independent scrollable lists. Owner-only tracker visibility remains unchanged. The mobile layout places the same ordered column below the office, preserves floor/camera controls, and shows scene names on selection while retaining the full employee names in the lists. Desktop/tablet nameplates retain the consistent dark background and white 11px/700 system font, with a top overlay preventing 3D models from covering their text.

## Verification results

| Check | Result |
| --- | --- |
| Chrome 155.0.8059.39 | Passed local browser suite, zero uncaught JavaScript errors |
| WebKit 18.4 | Passed the same local suite, zero uncaught JavaScript errors |
| Responsive sidebar | Passed at widths 1600, 1000, 768 and 390; no panel overlap or horizontal document overflow |
| Workforce rendering | 12 fixture employees rendered using shared skinned models; AI fixture labelled AI; demo remains available |
| Identity / editor | Self profile shown, nine appearance fields, name/role/desk preserved; appearance refresh handled |
| Actual movement | Chrome + WebKit: click-to-move completes, Work reaches assigned chair, manual mode persists, Auto resumes |
| Appearance / skeletal rig | Long/short hair visibility, glasses and skin color verified; wave changes bone rotation; six clips present |
| Performance sample | Approximately 60 animation frames/sec in short local four-avatar samples in both engines; not a performance guarantee |
| Floor navigation | All eight floors, roof, overview and return to office passed; rigs restricted to current view |
| Failure isolation | Aborted GLB load leaves workforce information and roof navigation usable; no uncaught errors |
| Role UI preservation | Normal-user Owner Room refusal and hidden owner-only tracker passed |
| PostgreSQL security | 21 checks passed in ephemeral PGlite PostgreSQL: self save/update, cross-user/company denial, anonymous denial, disabled membership, identity/delete denial, strict JSON validation, directory boundaries, backfill, non-overwriting rerun, revision and publication registration |
| Appearance sync adapter | 7 checks passed using two simulated Supabase clients: both-way updates, reconnect/reload, sign-out clearing, rejected unauthenticated save, migration error and listener cleanup |
| Business regression | Existing pricing, CR pricing, CR selector, assembly, curve timing, CHC motor pricing, final motor price, two auth-bootstrap suites, tyre coupling and avatar-controller checks passed |
| Preservation | Complete main app/PDF source, Auth, pricing, assembly, KeyLab, KeyBot, logo, GLB and controller byte-identical to V4.29.24 |
| Building preservation | Desk-position generator, chairs, desks, shell, floor furnishing functions, KeyBot studio, rooftop and seat destinations unchanged |
| Packaging | Full ZIP CRC and hashes verified; applying upgrade over V4.29.24 reproduces full release file-for-file |

Browser screenshots use local test accounts and simulated presence, not production employees. Supabase synchronization transport was simulated; RLS and SQL functions were actually executed in PostgreSQL locally. Installed Safari and live staging Supabase Auth/PostgREST/Realtime end-to-end tests remain required before production acceptance. WebKit results must not be presented as an installed-Safari test.

## Modified files

- `keyhq/avatar/rig.js`: shared original model/animation/camera/depth core.
- `keyhq/avatar/workforce.js`: visible-floor workforce rigs, appearance application and animation mapping.
- `keyhq/avatar/appearance.js`: canonical appearance mapping and self-service field builder.
- `keyhq/avatar/prototype.js`: Maya/Adam reuses shared core; original local profiles retained.
- `keyhq/avatar-sync.js`: existing-client Auth/RPC/Realtime adapter, cleanup and stale-session guards.
- `keyhq/app.js`: workforce render bridge, own-avatar controls/editor, profile messages and label overlay.
- `keyhq/index.html`, `keyhq/styles.css`: ordered sidebar, responsive controls and current release UI.
- `keyhq-launcher.js`: secure profile bridge and closed-view render suspension.
- `supabase/migrations/20261024030000_keyhq_user_avatar_profiles_v42925.sql`: additive profile storage/RLS/RPCs/backfill/publication membership.
- `supabase/verification/verify_keyhq_v42925.sql`: optional read-only review queries.
- Root entrypoint, manifest, service worker, version lock and release metadata updated to V4.29.25.
- Upgrade instructions and reproducible tests under `tests/v42925/` included. Exact file list: `UPGRADE_FILE_MANIFEST_V42925.txt`.

## Limits and next acceptance steps

1. Apply only the supplied new migration to staging after approval; test two real authenticated accounts, reload, Realtime updates and permission denial. Nothing has been applied to production.
2. Character appearance is synchronized. Movement/activity is still local visual behavior; authoritative multiplayer motion, AI decision-making and business actions are not introduced. Manual click-to-move/desk interactions are in Level 6. Existing automatic routes/elevator behavior remain.
3. No AI accounts are fabricated. Trusted workforce rows marked AI use the shared character style with explicit AI labels. Existing RPCs may return only real users.
4. Facial-hair variants from the older visual system remain stored but are not rendered by this shared original rig. Glasses variants map to its one glasses accessory; nonbinary uses the common body rig. The full detailed appearance scope is in README_UPGRADE_V42925.md.
5. The original quotation/PDF code is unchanged. V4.29.24 already documented a Chrome canvas-taint failure in its inherited PDF download rasterizer, reproduced on the prior baseline; this unrelated exporter issue is not fixed by V4.29.25. White PDF pages, dark viewing surround and printing/layout source remain intact.
6. Validate installed Safari and lower-powered devices with the real employee count before production acceptance. Camera layouts and short local frame samples do not establish performance for every device.
