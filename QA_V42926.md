# V4.29.26 master revision — validation and acceptance limits

The implementation is delivered with the following verified checks. This is not a claim that every acceptance scenario has passed on live employee accounts or physical devices.

| Area | Verified evidence |
|---|---|
| Navigation | 75 route queries from plaza/lobby/desks; simulated walking/lift traversal to all 11 leisure destinations; front and rear collision openings pass. Repeated after ramp changes. |
| Entrance | Manual front entrance/exit, rear exit and automatic door opening/closing pass. Gradual ramp movement uses shared height logic. |
| Controls/UI | Chrome and WebKit: Auto/Manual with Free, Follow and Eyes; Eyes disables third-person choices; arrow controls, upright transitions, toolbar, dialogs, resizable panels and 1440/768/390/320 layouts pass. |
| Touch | Chrome touch events: proportional joystick movement, simultaneous second-finger camera, release-to-stop and panel resize pass. |
| Camera | Blocking instance fades to 0.22; another instance stays opaque; both restore to 1; camera wall constraint passes. |
| Seats | Actual campus registers 101 chairs, 42 sofa anchors, 24 benches and 20 loungers. One of each type tested for route, zero hip-anchor error, stand and manual recovery. This is not a visual pass of every furniture placement. |
| Vehicles/lift | Mount/dismount/manual recovery pass for all six vehicles. Repeated lift trips 1→0→2→0 restore walking. Hoverboard lift trip passes. Cart footprint fits a 2.6m opening and rejects a 1.6m opening. Rider transform error is zero in driving tests; speed ratios/capacities pass. |
| Games | Two independent simulated clients share basketball input, ball, score and movement; guest position difference <0.3m. Manual swimming height/posture/deck exit pass. Real keyboard and injected touch hold/release launch a ball and Exit restores manual walking. |
| Game rules | Basketball mode counts 1/2/6/10; racket modes 1/2/4; net/out faults; both football goals; score only once; normalized movement pass. Full matches with 6/10 human players have not been tested. |
| Database | 24 local PostgreSQL/PGlite checks: enabled participant isolation, nonhost denial, cross-company invisibility, stale sequence rejection, malformed state, direct-write denial, ended-session denial, all board variants, anonymous denial and disabled users. |
| Live deployment | Master migration succeeded in KeySuite. Post-deploy read-only queries confirm RLS, read/write/execute grants, fixed function search paths, Realtime tables and migration history. Security-advisor counts unchanged. No production test accounts/messages created. |
| Messenger | Original chat.js byte-identical. Compact→expanded→compact views and invitation dispatch pass in Chrome/WebKit; adapter cleanup/stale-session/retry regression passes. |
| Quotes/business | Authoritative customer resolver tests, motor pricing, tyre coupling, CR pricing, authentication bootstrap and version lock pass. Packaging hashes verify preserved engines/selectors/assets/old migrations/Edge Functions. This does not replace end-to-end testing of every KeySuite module. |
| Lighting/avatar | Live lighting sampled at night/morning/midday/evening; night/day intensity differs appropriately. Existing refined avatar asset and appearance fields retained. |

## Known limits and incomplete acceptance

- Hosted play with separate real employee sessions, network loss/reconnect, Messenger accept/decline and 3-on-3/5-on-5 participation is **not yet acceptance-tested**. Tests use local synthetic identities/controllers. Supabase deployment does not prove live end-to-end multiplayer works.
- Games implement casual play and rally/team totals. Regulation tennis sets/serve rotation, basketball fouls/shot clocks, football offside/goalkeeper AI, automated opponent AI and automatic host migration are not implemented. When the host disappears, guests wait or exit. Offline employees are not simulated as human opponents.
- Game authority resides in the host browser; the backend enforces membership, host ownership and bounded payloads, not competitive anti-cheat simulation. Realtime latency/load with a full ten-player match has not been measured.
- Seating occupancy is maintained in each campus client. Atomic seat reservation across separate clients is not implemented. Hip alignment is numerically tested for four furniture categories; every office/meeting/café/roof seat still needs visual acceptance for back/feet alignment.
- Smoke/Beer/Both and carrying animations are implemented, but have not received a dedicated visual/interaction acceptance pass in every location. Swimming uses expanding ripples; a full splash-particle system is not implemented.
- WebKit automation on this Mac is **not** certification of installed Safari or physical iPhone/Android browsers. Check short landscape screens, all touch sports controls and real-device performance before broad rollout.
- Business code preservation plus selected regressions does not prove every quotation/BOM/selection workflow. Perform your normal signed-in business smoke test after publishing the frontend.
- Frontend hosting is not deployed. GitHub is untouched. Existing Supabase advisory findings remain unchanged; their remediation links are in the deployment receipt.

## Reproduce

Serve this project at http://127.0.0.1:8260. Install the pinned tooling in tests/v010/package.json (Playwright 1.56.1 and PGlite 0.3.14); browser scripts use installed Chrome and Playwright WebKit. Run tests/master/*.cjs plus tests/v42926/navigation.cjs, physics.cjs, touch.cjs, quotation.cjs and version-lock.cjs. Tests/master/results contains captured outputs; older tests/v010 and tests/v42926/results are historical evidence, not new master-run claims.

For live acceptance: publish the files; use two enabled employee accounts; invite/accept through the preserved Messenger; move/shoot and compare ball/scores; disconnect/reconnect the host; leave/end; verify manual walking. Then exercise larger groups, every seat location, Smoke/Beer/Both, and physical-device layouts.
