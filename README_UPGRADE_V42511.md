# KeySuite V4.25.11 Upgrade Patch

Upgrade path: **V4.25.10 → V4.25.11**

## Fix

The final customer-facing model name is now canonical across BFI and CHC. The outer Brand/PDF identity layer no longer performs a blind base-model substring replacement that could append the same phase/Enhanced suffix a second time.

Examples:

- Display `BFI 10-3T` → PDF `BFI 10-3T`
- Display `BFI 20-3E` → PDF `BFI 20-3E`
- Display `CHC 10-3T` → PDF `CHC 10-3T`
- Display `CHC 10-30E` → PDF `CHC 10-30E`

The presentation snapshot now prefers `base_model` for hydraulic/master identity and preserves `display_model`/`quotation_model` as the final customer-facing identity. Existing duplicated `TT`, `EE` or `TE` text is normalized to that final identity if encountered.

Cache/version references are updated to V4.25.11.

**No Supabase update is required.**
