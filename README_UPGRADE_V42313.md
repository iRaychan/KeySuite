# KeySuite V4.23.13 Upgrade

Upgrade from V4.23.12.

## Changes

- KeyBot skips BFI motor-phase selection when the model has only one valid phase.
- Models with both 1Ph and 3Ph still ask the user to choose.
- CHC quotation frequency now renders as 50Hz instead of 50.0Hz.
- BFI quotation wording now matches the CHC compact structure:
  - B.G.Reich Horizontal Multistage Pump Model
  - c/w HP / 2Pole / IE / voltage / phase / 50Hz
  - Suction & Discharge
  - Material: SS304 / Mechanical Seal
- No database migration is required.
- Redeploy `telegram-webhook`.
