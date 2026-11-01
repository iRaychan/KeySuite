# KeySuite V5.00.29

Baseline: V5.00.28 full build.

## Changes

- BUG 001 — KV Page 3 now renders `B1+B2` as a single-row label matching CHC.
- BUG 002 — quotation data-sheet export selects the correct family frame. KV keeps the shared CHC filename generator and its KVC/KV/KVN model identity, duty, and item-number behaviour.
- BUG 003 — BGF 350M and 350E Page 2 now show Brass, 2 Stages, and Malaysia for Pump/Motor/Engine country of origin.
- BUG 004 — BSW defaults to IE1 throughout Selector, Product, Assembly, Quote payloads, and PDF output.
- BUG 005 — BSW Page 2 and Page 3 now use Malaysia origin, actual L/L/H pumpset dimensions, the requested eight dimension fields in two columns, and `kg` for weight. Impeller Diameter and Max Solid Passage were removed.
- BUG 006 — BSW Product actions are aligned right and read Curve / Assembly / Quote, or aligned Assembly / Quote when no engineering curve exists.
- BUG 007 — BSW Phase and Float Switch configuration now produces T, TA, M, and MA suffixes and persists the configured model through Selector, Product, Assembly, Quote, and PDF.

## Deployment

- New database migration required: NO
- Supabase deployment required: NO
- CR master changed: NO
- ES master changed: NO
