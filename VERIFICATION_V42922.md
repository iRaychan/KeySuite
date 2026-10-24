# KeySuite V4.29.22 verification

- Source baseline: `KeySuite_V4.29.21_FULL_CLEAN_GitHub.zip`.
- Manufacturer reference: Fenner Drive Design & Maintenance Manual, Fenaflex physical characteristics and flange dimensions.
- Confirmed F80 nominal torque: 375 N·m; maximum speed: 3,100 rpm.
- Confirmed F80 F flange: bush 2517, 60 mm maximum bore.
- Confirmed F80 H flange: bush 2012, 50 mm maximum bore.
- Calculated 40 HP at 1,450 rpm: 196.53 N·m; IEC 200L motor shaft: 55 mm; ES 32-13 pump shaft: 24 mm.
- Expected and tested automatic result: F80, pump H/2012, motor F/2517.
- Tested that a 61 mm shaft is rejected for the F80 F flange despite the generic 2517 bush table allowing a larger value.
- JavaScript syntax and release regression suites: PASS.
- Preserved KeyHQ integration, pricing, assembly, motor-price and V4.29.21/V4.29.20 version-lock suites: PASS; historical release-identity suites are intentionally superseded by the V4.29.22 release suite.
- Archive comparison confirms incremental contents contain only V4.29.22 deployment files.

No database migration is required. Deploy the included `telegram-webhook` Edge Function for KeyBot parity.
