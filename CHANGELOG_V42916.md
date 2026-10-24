# V4.29.16 Change Log

## Quotation

- Atomic conflict response is retried once with the server-provided next reference.
- Remote save responses now commit the actual database document instead of discarding update metadata.
- Each line persists both `qty` and `quantity`; opening history normalizes either form back to `qty`.
- Create/update operation and final number are included in success confirmation.
- Owner-only company-wide history; assigned users are restricted to their immutable creator email in both browser cache and database RPCs.

## KeyHQ

- Native KeySuite launcher after KeyBot with first-open lazy loading.
- Eight initial floors, user-expandable future floors, rooftop basketball/futsal courts, and WC/pantry/game rooms per floor.
- Shared current user, company role and KeyBot authorization.
- Level 3 enquiry-triggered KeyBot desk/projector animation.
- Live Telegram inbox only when connection is reported connected; deterministic demo feed otherwise.
- Sims-style idle movement and activities.
- Automatic Kuala Lumpur day/night appearance with Auto/Day/Night preview.
- Original Keylargo PNG hash retained; glow is non-destructive runtime styling.

## Unchanged

Pricing data and formulas, BOM logic, pump curves, quotation/PDF layout code, selector data and unrelated KeySuite modules were not modified.
