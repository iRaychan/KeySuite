# KeySuite V4.29.04 Upgrade

## Change

CHC C4/C6 now prepares the selected dimension alignment and optimized PDF images during browser idle time after the result is displayed. When PDF is requested, the existing report reuses those prepared results instead of repeating the expensive work immediately before print.

## Locked scope

- CHC C4/C6 PDF content, values, page layout, branding, filenames and print behavior remain unchanged.
- The original pixel scan remains as a fallback when no prepared alignment is available.
- No hydraulic or motor calculations, selector data, pricing, actions, UI, PDF settings or other product families are changed.
- No database migration or edge-function deployment is required.

