# KeySuite V5.00.27 Full Build

Upgrade path: **V5.00.26 → V5.00.27**

Startup hotfix: the V5.00.27 version-lock observer now performs idempotent DOM writes. This removes the MutationObserver microtask loop that could freeze authenticated startup at “Loading protected company and pricing data…”. No BUG 001–010 or BSW behavior was removed.

Engineering masters:

- BGF: `004 - BGF 261030 - V1.0.xlsx`
- BSW: `004 - BSW 261101 - V1.1.xlsx`
- KV: `004 - KV 261031 - V1.2.xlsx`

## Scope

- BUG 001: KVC PDF Page 2 uses the requested presentation-only material wording.
- BUG 002: BGF hides Enhanced while preserving Select and hydraulic logic.
- BUG 003: BGF and BSW participate in the V4.28.72 first-visible iframe sizing lifecycle.
- BUG 004: BGF Page 2 technical fields and Page 3 labels/values/drawings are model-specific Excel data.
- BUG 005: KV Product family navigation exposes every actual V1.2 family through KV 600; incomplete families show no invented models.
- BUG 006: Product KV/CR material names are SS304 (Cast Iron Connection), SS304, and SS316; KV selling prefixes map to KVC/KV/KVN.
- NEW 007: BSW category, price-list, selector, product catalogue, PDF, technical data, dimensions, and BSW 50–600 family navigation. Only five complete V1.1 hydraulic models are selectable. NPSH is not displayed or exported; PDF Page 1 uses three enlarged graphs.
- BUG 008: ISO Product family navigation groups by the required ES discharge-size labels.
- BUG 009: KV PDF Page 3 uses V1.2 model dimensions and family drawings; material-prefix changes retain the physical base model.
- BUG 010: KV Product curve includes the CR-method Impeller Configuration editor using KV full/small/mini curves and stage counts.

## Supabase

The connected **KeySuite** Supabase project was migrated successfully on 2026-11-01. The live BSW catalogue contains 178 rows across 12 workbook families (BSW 50–600).

For another environment or a fresh installation, apply in order:

1. `supabase/migrations/20261101170000_v50027_bsw_integration.sql`
2. `supabase/migrations/20261101170100_v50027_bsw_catalogue_seed.sql`

No Edge Function deployment is required. Deploy the V5.00.27 static application build after the migration.

CR MASTER and ES MASTER files are byte-for-byte unchanged from V5.00.26.
