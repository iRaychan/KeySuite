# KeySuite V5.00.28

Release date: 2026-11-01  
Upgrade baseline: V5.00.27

## Fixed

- BUG 001 — KV and BSW Product series navigation now matches the established CR navigation sizing, spacing, colours and responsive behaviour.
- BUG 002 — KV Page 2 now shows suction and discharge connections separately. Page 3 is restricted to B1, B2, B1 + B2, D1 and D2, with B1 + B2 calculated from the selected model.
- BUG 003 — BGF Page 2 now preserves its structured application, pump, drive and pumpset sections. Motor and Engine output is drive-specific. Page 3 now uses the distinct 350M and 350E dimension layouts from the supplied references.
- BUG 004 — BSW is now registered consistently in authority, multibrand, category, pricing and routing registries. A user assigned only BSW can open BSW Selector, Product and Price List without being returned to Dashboard.
- BUG 005 — BSW selector and PDF output use selected-model data, display Head/Efficiency/Power as three full-area graphs, suppress unavailable NPSH, and keep weight in kg separate from dimensional values.

## Protected scope

- CR MASTER selector file: unchanged from V5.00.27.
- ES MASTER selector file: unchanged from V5.00.27.

## Deployment

- New Supabase deployment required: **NO**
- New database migration required: **NO**
