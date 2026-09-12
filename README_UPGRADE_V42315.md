# KeySuite V4.23.15 Upgrade

Upgrade from V4.23.14.

## Changes

- KeyPLC System BOM now includes a `1Ph / 3Ph` checkbox for the VFD input mode.
- Motor sizes up to and including 3.0HP default the checkbox ON.
- Motor sizes above 3.0HP default the checkbox OFF.
- Checked description: `VFD (1Ph In / Ph Out)`; unchecked description remains the previous `VFD` wording.
- The checkbox is manually editable and does not change KeyPLC panel pricing.
- Auto restores the phase-input checkbox to the horsepower-based default.
- No database migration is required.
- No Telegram/KeyBot function redeployment is required.
