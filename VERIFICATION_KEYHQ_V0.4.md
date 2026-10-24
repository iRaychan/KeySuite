# KeyHQ V0.4 Verification

- Baseline remains KeySuite V4.29.22; core KeySuite version and original logo asset are unchanged.
- Website production deployment: **not performed**.
- Supabase V0.4 migration: **deployed and verified** on project `skidqdixnnnuhvarekxp` as `20261023160548_keyhq_v04_presence_dynamic_desks` on 24 October 2026.
- All six existing KeyHQ people records were preserved; presence defaults were initialized without changing assignments.
- Authenticated roster and presence RPC checks passed. Anonymous execution and direct `anon`/`authenticated` table access remain denied.
- The post-deployment advisor reported no KeyHQ performance findings. Its KeyHQ security notices are expected for this RPC-only design: the table has RLS with no direct policies, while authenticated `SECURITY DEFINER` RPCs enforce company, account, and Owner checks with an empty search path.
- Static JavaScript syntax checks pass for KeyHQ, the KeyHQ launcher, and authentication integration.
- KeyHQ V0.1–V0.4 continuity/regression checks pass.
- KeySuite V4.29.22 release, tyre-coupling, and version-lock regression checks pass.
- Level 6 capacity is derived as `ceil(enabled users / 4) × 4`, with a minimum of four.
- The Owner-only assignment RPC validates the current enabled-account count, calculated capacity, enabled company membership, unique accounts, unique desks, gender values, and accent format.
- Presence updates are authenticated, self-only, company-scoped, and limited to `online` or `offline`.
- Leisure routing excludes the immediately previous destination. Required 30-minute and 10-minute durations are fixed in the client; each timer is created at arrival.
- Movement uses explicit walking/elevator phases and animated limbs. No CSS or canvas position tween is used as a substitute for walking.
- Non-Owners are blocked from Level 8; only Owner activity choices include private leisure.
- Level 7 drawing creates exactly 9 seats on each side.
- KeyHQ contains no quotation-page renderer. Authorized sealed records are handed directly to `KeySuiteQuotationStore.openHistoryPdf`, the original KeySuite PDF/print path.
- The V0.4 cache identifier is wired through the main page, launcher, embedded page, styles, script, and service worker.

## Runtime checks after an approved website deployment

1. Test one Owner and one employee account in Safari.
2. Confirm Owner assignment saves and a non-Owner cannot save assignments.
3. Confirm login travel begins outside Level 6, uses the elevator, and ends at the assigned desk.
4. Sign out one account and verify another Owner session sees the avatar travel to leisure, then starts the displayed timer on arrival.
5. Confirm consecutive leisure destinations differ and fixed timers match the activity table.
6. Click an employee PC and verify only authorized real quotation rows appear.
7. Open a sealed row and compare its PDF/print view with the same row opened from KeySuite Quotation History.
8. Confirm employee access to shared leisure and denial of Level 8; confirm Owner access to Level 8 private leisure.
9. Count 18 Level 7 seats: 9 per side.
