# KeyHQ V0.9 — implementation and verification

Built on the supplied **KeySuite_V4.29.25_KeyHQ_V0.8_FULL.zip**. KeySuite remains V4.29.25. The backend migration is deployed to the KeySuite Supabase project. The frontend remains an engineering preview for the user to deploy through GitHub; not all visual acceptance criteria have passed.

## Stage status

| Stage | Implemented | Verification / remaining work |
| --- | --- | --- |
| A — Restore and correct | Wheel/trackpad zoom with damping and limits; minimum camera elevation and exterior building-volume guard; ergonomic five-star chairs and executive variant; shared workstation seat, monitor direction and employee mapping; shared legacy/campus quotation panel and existing original-PDF action. | Chrome and WebKit wheel, seating-anchor and monitor-click tests pass. Offline employee monitor mapping passes in an isolated integration harness. Complex interior camera/wall intersections and crowded navigation still need manual review. |
| B — Avatar quality | Existing GLB, identities and account assignments retained. Live rotatable/zoomable preview. Twelve hair selections (including bald), modular face features, facial hair, hats, earrings, watches, clothing colours, body presets. Local and account-profile persistence. Contextual actions and a paired handshake with an available offline companion. | Chrome/WebKit persistence and preview tests pass. Twelve selections are **not 50 hairstyles**. Supplied asset has four modeled hairstyles and six original clips; additional styles and motions are original low-poly geometry and generated skeletal clips. Dedicated high-quality hair and motion assets are still required for the requested realism. General paired online social consent and group café choreography remain pending. A follow-companion action is implemented. |
| C — Leisure | Eleven activities, route planning, explicit entrance/lift transitions, occupancy limits, offline weighted choices, real employee presence separated from simulation, authenticated group invitations, Join/Decline, waiting/ready status, arrival gates, leave/end controls. | Browser domain tests and PostgreSQL consent/capacity tests pass. Group invitations persist in the database. Autonomous idle/offline ambient choices remain local to each viewer; these are not authoritative shared employee location telemetry. Dense crowd avoidance, furniture/door routing and group travel need further visual refinement. |
| D — Sports | Visible balls, hand-mounted rackets/paddles, shuttlecock, cups and dumbbells. Deterministic basketball dribble/shot/bounce/retrieval/pass, football shooting/retrieval, singles racket rallies/bounces/misses, horizontal swim fallback, gym and coffee animations. Courts wait for two arrived participants and pause when one leaves. | Chrome/WebKit tests verify equipment creation, ball motion, readiness gates and pauses. **This is functional fallback animation, not finished realistic sports gameplay.** Exact hand-contact timing, physical rim/backboard/net collision, natural retrieval, richer swimming entry/exit, forehand/backhand/serve variety, defensive football and polished synchronized group motions remain pending. No full football match is offered. |
| E — Private messaging | Existing authenticated client; private durable messages; sender identity from auth.uid(); participant-only RLS; unread counts, read receipts, retry nonce; realtime plus periodic recovery; phone overlay; sender notifications and opening correct thread; searchable employees; paged history; offline storage; no KeyBot/projector delivery path. | 32 PostgreSQL security/consent checks pass. Chrome/WebKit fixture send/receive/notification/text-safety/cleanup tests pass. Adapter cleanup, stale-session and duplicate-send tests pass. Deployed table RLS, realtime publication, RPC grants and migration registration were verified. Full live Bob/Ray messaging and websocket reconnect still require account-level testing. |

## Preservation

The release integrity manifest compares baseline ZIP members byte-for-byte against the matching V0.8 archive retained in outputs/KeyHQ_V0.8_Upgrade (639 files, 44,941,395 uncompressed bytes, matching the initially supplied ZIP inventory). The original desktop ZIP was moved or removed during this session. Nine Supabase .temp CLI/linkage metadata files are excluded from the full distributable; deployable application/configuration files are retained. The original Keylargo PNG and GLB are unchanged. Pricing, BOM, quotations storage, KeyLab, KeyBot, authentication configuration, existing migrations and employee records are not rewritten. Only the launcher integration, HQ rendering/interaction code, service-worker cache identifier and additive files change. The existing legacy office now imports the same monitor panel as the campus.

The building remains three floors plus the existing rooftop, with the approved sports facilities and campus dimensions. A smoking-corner label identifies the existing rear-garden seating area; no duplicate court is added.

Adam and Eve keep their existing local storage slots and identities. They remain local companions, distinct from authenticated employee avatars. Local companions invite only local companions; account invitations use authenticated employee IDs.

## Missing assets and functional fallback

No compatible library containing 50 hairstyles, facial morph targets, or motion-captured sports clips was present. The original rig is retained. New fallback clips are actual `AnimationClip`/quaternion tracks played through the existing mixer; props attach to existing hand bones. Ball flight is independently animated after release. They are intentionally documented as simplified and need art/animation review before claiming the requested Sims-inspired quality.

Face controls are modular primitives and preset scaling, not a full facial-morph sculpting system. Existing base face meshes are not replaced. This limits the range and quality of facial customization.

## Test evidence

- `tests/v09/browser.cjs`: Chrome and WebKit wheel direction, screen-pan preservation, seating anchors, monitor raycasting and no uncaught page errors.
- `tests/v09/features.cjs`: both browsers; appearance persistence, waiting with one racket player, starting after the second arrival, equipment/ball motion, pause after departure, phone sizing at 768 and 390 pixels.
- `tests/v09/chat-browser.cjs`: both browsers; isolated two-account harness, sending, notifications, opening a conversation, escaped message text, session cleanup and monitor-to-employee/PDF mapping while employee is offline. Fixture quotations/messages exist only in the test harness, never in production code.
- `tests/v09/database.cjs`: 32 checks against real PostgreSQL execution in PGlite, covering forged sender and immutable fields, duplicate nonce, sender/recipient visibility, outsider/cross-company/disabled/anonymous denial, read receipts, multiple-session presence, court contention, consent, arrival gates, departure pause and fresh consent after login.
- `tests/v09/adapter.cjs`: realtime cleanup, discard of stale-session data, retry idempotency and mismatched nonce rejection.
- Existing motor final-price, tyre-coupling and assembly/system pricing regression tests pass.

WebKit tests are useful Safari-engine coverage, but are not a substitute for final testing in the user's installed Safari with real accounts and their network. Screenshots are in the adjacent output folder.

## Local run

Serve this folder with a local HTTP server, then open `/keyhq/` for the companion preview. Open `/index.html` through the existing KeySuite sign-in workflow for account features. Do not use `file://` with module imports.

For reproducible tests, install the pinned dependencies in `tests/v09/package.json` and Playwright WebKit; Chrome tests use an installed Google Chrome. Serve the root at `http://127.0.0.1:8259`. Run tests from the release root with the test dependencies on `NODE_PATH` (or run through npm in `tests/v09`). Create the `outputs/KeyHQ_V0.9` screenshot directory relative to the working directory. Browser fixtures must not be mistaken for a live integration test.
