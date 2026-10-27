# KeySuite V5.00.07 — change log

Built exclusively from the supplied V5.00.06 FULL CLEAN GitHub ZIP.

1. **BGF Product catalogue:** Added Product → B.G.Reich → BGF and model details for BGF 350M, 350E, 400 and 500. Reuses the supplied V5.00.06 model records and workbook data; missing curves, duty ratings and dimensions remain absent. Added BGF to existing role-scope choices without changing saved assignments.
2. **Pumpset duty units:** Removed the ES direct-transfer route's metric defaults. Original flow/head units and input text reach Pumpset Assembly, including six-decimal precision tested. System Assembly and hydraulic conversion constants remain unchanged.
3. **Automatic coupling:** Pumpset sizing now considers only Pump/Motor rows and follows motor quantity. ES-named baseplates no longer inflate pump counts. Managed duplicates are removed before the unchanged-context shortcut; manual coupling rows survive motor changes/removal.
4. **Explore KeyHQ:** Added an accessible expand/minimize control with a browser-local remembered preference. The default is expanded.
5. **Roofs:** FREE restores the HQ roof and all obstruction cutaways immediately. FOLLOW cutaways require the avatar to be inside the HQ, with a 150 ms hide delay and 650 ms restore delay to avoid boundary flicker. Other facility roofs remain untouched and visible.
6. **Entrances:** Added contrasting frames, access markings and signs at existing sports gates, the garden entrance and pool/café approaches; strengthened HQ door edges. Fence posts no longer occupy existing gate openings.
7. **Diving tower:** Replaced the old tower with a steel 10/20/30 m structure, six switchback stair flights, supported cantilever platforms, railings, level signs and white/blue light strips. Shared walking surfaces support manual climbing and guided access. At platform ends, choose forward/backward/twisting and a height-limited spin count, jump, splash, surface and return to manual walking via the pool edge. The 20/30 m levels are fictional KeyHQ features.
8. **Entrance pillar:** Removed only the front ground-floor column at x=-34, z=17. Its automatically generated collider is removed with it; other columns remain.

Release metadata and cache identifiers advance to V5.00.07. No new database migration, backend deployment or data reset is included.
