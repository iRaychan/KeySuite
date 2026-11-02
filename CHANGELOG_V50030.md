# KeySuite V5.00.30

Baseline: V5.00.29 full build.

## Changes

- BUG 001 — BGF Quote stays in the far-right action column whether or not a real Curve action is available.
- BUG 002 — BGF Product Curve responses are handled by the shared Product Curve controller, allowing the actual BGF 350M and BGF 350E curves to replace the loading screen.
- BUG 003 — BSW Product Curve responses are handled by the shared controller. Configured M/T/MA/TA model names normalize to the base engineering model for curve lookup without duplicating curve records.
- BUG 004 — BSW Float Switch checkbox and label now share one centered horizontal row below Head; behavior and default remain unchanged.
- BUG 005 — Saved PDF filenames retain the sequential `Item 01`, `Item 02`, etc. counter; Clear Customer resets it; internal PDF model headings are cleaned independently of the saved filename.

## Deployment

- New database migration required: NO
- Supabase deployment required: NO
- CR master changed: NO
- ES master changed: NO
