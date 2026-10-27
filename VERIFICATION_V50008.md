# KeySuite V5.00.08 — verification

Tested locally on 28 October 2026, using the supplied V5.00.07 ZIP as the only baseline. Tests use controlled prices, employees and messages. They do not contact real participants or modify live quotations.

## Requested changes

| Change | Result | Evidence and scope |
|---|---|---|
| 1. BGF Quote | PASS | Four actual product buttons add four quantity-1 rows without alerts/confirmation. US gpm/Ft units and editable capacity/head/quantity verified. Duty edits preserve price. Unit test verifies highest converted currency, shared pricing factors, RM10 rounding, snapshot repricing and zero-cost block. |
| BGF-only upgrade | PASS locally; NOT APPLIED live | Migration executed in isolated PostgreSQL/PGlite. Owner save, non-owner/anonymous denial, invalid product/value rejection, atomic currency saving and preservation of other category data verified. |
| 2. Explore collapse | PASS | Chrome persistence/collapse/restore and centred equal 48 px heights. WebKit loads the campus and passes equal-height, same-row, on-screen layout checks at widths 1280, 768 and 390. |
| 3. Camera cutaways | PASS | Actual instance transforms measured at 0.18 m; FREE restores wall matrices and roof. Existing obstruction/doorway restoration regression passes. |
| 4. Vehicle exit | PASS | Browser simulation mounts/exits all six vehicle instances three times each. Riding flags clear, manual control returns, and subsequent walking changes position. These are controlled local cycles, not a live multi-user ride test. |
| 5. Capsule | PASS locally | Existing hoverboard deployed and returned; original parking position and instance count restored. Availability and footprint checks reviewed. Live cross-client capsule/ride synchronization remains NOT TESTED. |
| 6. Smoking | PASS | Four avatar orientations preserve the filter-nearer-than-ember relationship without rotating the avatar. Smoking leisure integration and release/Stop Activity cleanup checked. |
| 7. Invitations | PASS with fixture transport | Two checkbox rows selected; controlled second-recipient failure keeps dialog open; first success is disabled; retry submits only remaining recipient and closes on success. Real employee delivery is NOT TESTED. |
| 8. Basketball | PASS in simulation and browser fixture | All six modes complete with scores. 10/20-shot settings, all five three-point positions, 30/60/120-second settings and all three dunk styles tested. Manual movement/sprint, pass, steal, jump and charged shot tested. Browser 3 vs 3 finishes using one real participant record plus five separate AI records through the existing message interface; Exit restores walking. |
| 9. Sports entries | PASS | Both sides of football, basketball, tennis, pickleball and badminton pass collision-clearance checks. Tests end inside each gate before court equipment such as the tennis net. |
| 10. HQ side routes | PASS | Both side-door openings pass collision tests. Manual movement traverses the sports-side paved route and the garden-side shortcut. |
| 11. Monitor history | PASS | Actual canvas clicks in Campus view and Walk Here mode open Zoe's authorized history from a 1,500-quotation fixture. Search finds the intended customer/project; selection and Original PDF message identify the correct quotation. |

## Regression results

- PASS: existing 10/20/30 m diving tower, six stair flights, three platform-edge checks, nine dive/style combinations and guided ascent.
- PASS: original HQ main/rear entrances and original sports entries remain passable; removed entrance pillar remains absent.
- PASS: Assembly quantities/capacity units, existing pricing, coupling, motor pricing, CR selection, and authentication-bootstrap test suites.
- PASS: quotation-history customer lookup and fallback rules.
- PASS: sealed quotation PDF and continuation-layout regression tests; multiline description layout and Notes/Messenger link placement checks.
- PASS: all changed/new application JavaScript parses.
- PASS: byte comparison confirms existing PDF/quotation implementation (`app.js`), Assembly, KeyBot, Messenger, existing database migrations and Edge Functions are unchanged.
- NOT TESTED: actual Safari application, iPhone/iPad hardware, long-duration performance/load, live authenticated multi-user gameplay/rides, live invitation delivery, live KeyBot AI requests, live Messenger delivery, production deployment and live database migration.

WebKit results concern Playwright's WebKit 26.5 test browser, not an assertion that Safari itself was tested. Chrome was used for the broader browser checks. Browser evidence and reproducible tests are under `tests/v50008/`.

An initial sealed-PDF run encountered an avatar-loader error; the clean-cache rerun passed. Some earlier checks exposed test-fixture mistakes or an insufficient golf-cart exit clearance; those were corrected and the affected checks rerun. Logs delivered for each named test reflect the final run.

## Remaining limitations

1. The new BGF migration must be applied before saving BGF category rules. An Owner must supply real positive BGF source prices and configure the applicable category. No prices or margins are invented or seeded.
2. Basketball is a lightweight campus game. It uses the existing host's browser as authority; it is not a dedicated competitive game server. Remote playback pauses when the host is stale. Browser suspension and production network reliability require live acceptance testing.
3. Capsule effects are local; existing ride-position messages synchronize an occupied vehicle. A returned vehicle goes back to its original parking position, so the campus retains its existing vehicles without accumulating duplicates.
4. Actual production data and permissions were not changed by these tests. The included database upgrade was verified locally only.
