# V5.00.09 verification

Local testing completed in Chrome and Playwright WebKit on 28 October 2026. Tests use local fixtures; they do not modify production records.

| Change | Result | Evidence |
|---|---|---|
| 1. BGF errors | PASS | Eight rendered alert cases: customer, category, rules, currency, model price, margin, thrown lookup, failed item insertion. Model name and visible alert verified. |
| 2. BGF descriptions | PASS | Workbook read with openpyxl; all four rendered descriptions and BGF 550 identity checked. No unsupported voltage/frequency/IE text. Four actual quotation rows still carry expected prices and duty units. |
| 3. Quote styling | PASS | Shared existing classes; browser normal/hover/leave comparison and disabled-state capture. Four Quote actions work. |
| 4. Cutaway | PASS locally | Reception cutaway instances measure exactly 0.18 m with base y=0.41 (top of the actual floor finish); both logo meshes hide and restore. Collision count unchanged. Rotation/zoom scenarios across all three floors; FREE restoration. |
| 5. Entrance/floor | PASS locally | Main approach collision checks at center and ±0.7 m; zero positive-area overlaps among generated pedestrian rectangles. Browser-rendered reception/court inspected. |
| 6. Popup actions | PASS locally | Actual elevator controls verified; shared long popup at 1440/768/390 px has equal-width rows, scrolling, separate last Close and initial scrollTop=0. Invitation retry behavior passes. |
| 7. Basketball | PASS locally | Waiting-service ball exists above ground within court bounds; cleanup/restart passes. Six modes, three dunk styles, scoring, pass, steal, sprint and shooting tests pass; 3-vs-3 browser game completes. Original logo bytes unchanged. |
| 8. NPC startup | PASS locally | Bob Chan, Chinie and Ray Chan move about 1.24 seconds after initialization on fresh load and about 1.22 seconds after refresh under the test workload. No walking-speed changes. |
| 9. Sports Exit | PASS locally | Straight doorway-to-network clearance at center and ±0.7 m; actual manual route crosses the doorway and continues to basketball. |

## Regression checks

- PASS: Monitor opens quote history in ordinary and Walk Here modes, searches 1,500 authorized fixture rows and opens the original sealed PDF workflow.
- PASS: BGF shared MAX currency conversion, rounding, source snapshot/repricing, price independence from duty values and missing-cost block.
- PASS: assembly quantities/duty precision, managed-coupling cleanup and manual-coupling preservation.
- PASS: logged-out/valid/expired/hung/reload authentication bootstrap scenarios.
- PASS: quotation layout, continuation-page layout and sealed PDF duty/description preservation.
- PASS: six stair flights, three platform edges, nine dives, doors/gates, vehicle mount/dismount, capsule, smoking and FREE roof restoration.
- PASS: WebKit campus loading and responsive Explore controls at 1280/768/390 px. This is WebKit automation, not a physical Safari/iPhone acceptance test.
- PASS: all changed JavaScript files parse. 166 explicitly protected source files are byte-identical, including database/functions, source workbook, logo assets, PDF implementation, assembly, avatar movement/controls and basketball physics.

Detailed results and repeatable scripts: `tests/v50009/`. Render captures: `results/reception-cutaway.png`, `results/basketball-court.png`. Browser fixture accounts do not represent live user testing.

## Limitations / not tested

- NOT TESTED: live Supabase multi-account basketball synchronization and physical mobile devices. No production deployment is claimed.
- NOT VERIFIED: exact match to the prior approved NBA reference or the user's reception screenshot, because those images were not attached in this request. The provided project contains a general coastal-campus reference; the implementation uses the specified court colors, preserved markings and original logo.
- NOT TESTED: exhaustive visual flicker inspection on every GPU/camera position; the conflicting walkway geometry was removed and the tested renders are clean.
- No new database migration or Edge Function deployment is required for V5.00.09. Existing V5.00.08 BGF category support remains a prerequisite. Its prior deployment is recorded separately in `deliverables/SUPABASE_DEPLOYMENT_V50008.md` in the workspace.
