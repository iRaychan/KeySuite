# KeySuite V4.25.10 Upgrade Patch

Upgrade path: **V4.25.09 → V4.25.10**

## Fix

PDF output now treats the selector's final model name as immutable customer-facing identity. It no longer re-applies BFI phase (`T`) or Enhanced (`E`) suffixes while rendering Page 1, Page 2, Page 3, or the PDF title fallback.

Examples:

- Display `BFI 10-3T` → PDF `BFI 10-3T`
- Display `BFI 20-3E` → PDF `BFI 20-3E`
- Display `CHC 10-3T` → PDF `CHC 10-3T`
- Display `CHC 10-30E` → PDF `CHC 10-30E`

The patch also updates cache/version references to V4.25.10.

**No Supabase update is required.**
