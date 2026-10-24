# Upgrade to KeySuite V4.28.24

This is an upgrade patch from V4.28.23 to V4.28.24.

- C1/C2/BFI package prices retain their included standard motor. A motor upgrade or downgrade subtracts the included motor's raw Price List cost and adds the selected motor using the Motor pricing rule. Bare shaft subtracts the included motor's raw cost only.
- Motor matching is exact on kW/HP, pole and selected IE class. Missing-price feedback identifies the required replacement motor.
- CHC seal changes update the quotation price and description. For example, CHC 1–5 with SiC/SiC adds RM250.00.
- G1 and G2 retain independent stored base/effective rate objects. Calculations retain full precision; USD effective rates display to 2 decimals and RMB effective rates to 3 decimals.
- Existing saved C1 quotations re-resolve their stored pricing source instead of being incorrectly flagged red by the legacy complete-item validation.
- BFI display identity is rebuilt from the live Material and Motor Phase fields. SS316 plus 1 Phase displays BFIN with no T suffix.
- The quotation PDF header rule is restored to its original single line on Windows. No unverified macOS margin adjustment remains.
- Flow/Head inputs and their unit selectors in Quick Pump Selection have matching widths.
- The visible page/browser version and service-worker cache are locked to V4.28.24.

No database migration or Edge Function deployment is required. Upload all files in this patch to the existing KeySuite web root, replacing files with the same names.
