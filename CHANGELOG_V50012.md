# KeySuite V5.00.12 changelog

## Review build — 30 October 2026

- Added trimming support for ES/ISO Many pricing and included the value in price snapshots.
- Added ISO-specific USD and RMB multiplier support and an editable ISO Price List.
- Updated component-price editors for CHC, CR, ES, and ISO compact surcharge tables.
- Added an owner-only group save endpoint for CR mechanical seal add-ons and a category save endpoint supporting ES/ISO trimming.
- Applied the approved brand priority and two-column display sequence to customer brand preferences and quotation quick selection.
- Updated the active version strings, service-worker cache key, and version lock to V5.00.12.
- Added targeted regression tests for the changed pricing and display behavior.

No production deployment or V5.00.12 database migration was performed. See `BUILD_STATUS_V50012.md` for unresolved items and verification limits.
