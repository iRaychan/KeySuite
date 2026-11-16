# KeySuite V5.00.73

Use FULL as a complete application copy. Apply UPGRADE at the root of a verified V5.00.72 FULL build, replacing matching files. This release needs no database migration.

- G head, efficiency, shaft power and NPSHr use the shared BFI polynomial fitter with orders 2, 5, 3 and 3. Source curve data remains unchanged. Reduced-speed curves are affinity-law estimates.
- G and BFI Product curves calculate rated duty from the selected pump's efficiency peak when both duty fields are empty. G32-10-2M/T at 50 Hz defaults to 6 m³/h at 22 m. Complete manual duty takes precedence.
- The G engineering report uses the curve's duty and performance results, shaft power in HP, the G dimensional drawing and BFI's native Print / Save as PDF workflow and filename format.
- G Enhanced is disabled because G has no verified Enhanced operating envelope. The G report and curve page omit Grade 3B because conformity evidence was unavailable.

Safari and Chrome each passed 23 local checks covering G polynomial orders, rated and manual duty, partial input, phase switching, D6, BFI rated and manual duty, and PDF contents. Both browsers showed three print pages and the correct suggested filename. Test data was local. Production was not deployed or migrated.
