# KeySuite V4.28.68 Upgrade

Upgrade from V4.28.67 by copying this package over the current installation.

## Changes

1. **CR PDF Page 3:** Selector and Product now map CR, CRS and CRN families to the CR workbook drawings. There is no CHC fallback.
2. **macOS CR Selector:** restores the verified 340 px sidebar, 27 px title, 100% scale, Safari text sizing and zero horizontal overflow behavior.
3. **BFI/ES Selector headers:** keeps `Selector · BFI` and `Selector · ES` in the outer header instead of allowing a stale `CHC Curve` label to overwrite them.
4. **Product CR PDF on Safari:** opens the report window directly from the export click and avoids the delayed hidden-frame print warning.
5. **PDF readiness:** completed images no longer wait on a second decode pass; the 8-second generic fallback is reduced while the report's native image, font and layout readiness remains active.

No database migration or edge-function deployment is required.
