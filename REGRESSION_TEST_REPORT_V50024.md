# KeySuite V5.00.24 regression report

Status: PASS.

Coverage:

- CR MASTER / KV normalized DOM parity
- CR and ES byte-level master protection
- KV CR-feature/control inventory
- canonical KV data scope (39 complete KV 1 models only)
- exact workbook shut-off power at Q=0 for every exposed model
- KV standard and Enhanced browser selection
- D1–D6 editor, four-chart hierarchy, system/parallel settings and Q=0 display
- version, iframe, service-worker and release metadata
- full-build archive integrity
- V5.00.23-to-V5.00.24 upgrade overlay verification

Results:

- CR MASTER and ES MASTER hashes are unchanged from V5.00.23.
- KV normalized pre-data DOM matches CR MASTER.
- KV browser presentation assets match CR MASTER and resolve from the KV path.
- All exposed KV models retain an exact Q=0 power point.
- Standard and Enhanced selection workflows completed in a live browser with no console errors.
- Multiple duty points, parallel selection, four-chart layout and Q=0 shaft-power display were exercised.
- Full and upgrade packages passed archive integrity and post-upgrade regression checks.
