# KeySuite V5.00.32 Change Log

Source: V5.00.31 FULL BUILD  
Target: V5.00.32 FULL BUILD

## Bug 001 — PDF internal title

- Root cause: pump reports inherited the downloaded filename or browser document title, which included an item number.
- Fix: report metadata now receives a dedicated title derived from the generation date and exact pump model: `YYMMDD - Pump Model`. Downloaded filenames are unchanged.

## Bug 002 — model hyphen preservation

- Root cause: quotation description generation reconstructed some model names from normalized identifiers.
- Fix: descriptions now use the displayed/source model string verbatim, preserving hyphens, spaces and suffixes without changing database keys.

## Bug 003 — Dashboard KV and ISO

- Root cause: Quick Selection maintained an incomplete local series map.
- Fix: KV and ISO are registered under B.G.Reich for permission filtering, select/clear/save preference operations and model search. Existing inactive/incomplete model filtering remains in effect.

## Bug 004 — Customers KV

- Root cause: the Customer Brand/Series registry omitted KV.
- Fix: KV was added to the B.G.Reich hydraulic family and price-group mappings. Existing customer choices are preserved and KV is not automatically selected.

## Bug 005 — ES search and curve

- Root cause: ES routing used inconsistent family aliases between Quick Selection, Product and curve loading.
- Fix: the shared series mapping now resolves ES consistently and the existing ES data/curve renderer is reached from both search and Product. No curve points were added or fabricated.

## Bug 006 — Product action row

- Root cause: action groups allowed wrapping and Cost used a larger icon treatment.
- Fix: applicable Product rows use one compact, non-wrapping `Cost | Curve | Assembly | Quote` row. Cost is pink and text-only; its existing permission check remains authoritative.

## Bug 007 — Curve action row

- Root cause: the curve page inherited a full-width Cost card style.
- Fix: curve actions use one right-aligned compact `Cost | PDF | Assembly | Quote` row with the same permission-gated pink text-only Cost control.

## Bug 008 — quotation price audit

- Root cause: the V5.00.31 audit built an independent partial calculation and returned RM0 when Product context was incomplete.
- Fix: audit output now calls the production pricing engine, displays the selected source currency, conversion and every price stage, and reconciles against the quotation price. Missing context is reported as unavailable instead of RM0.

## Bug 009 — unified Product/Selection/System audit

- Root cause: separate Product, Selection and System audit views duplicated and diverged from pricing logic.
- Fix: one read-only audit layer now serves all three contexts. It retains the six source-cost columns, shows one calculation-label column with independent Assembly and Individual RM columns, includes quantities/extensions/full system BOM, and reports overrides or differences. Access uses the existing server-side costing permission RPC.

## Bug 010 — KeyLab RM50 round-up

- Root cause: KeyLab final price used the previous RM10 ceiling.
- Fix: only the KeyLab final selling stage now uses `Math.ceil(price / 50) * 50`; the audit snapshot stores the unrounded amount and rounding adjustment. Other category rounding and saved quotations are unchanged.

## Version and cache

- Application version, visible labels and release metadata updated to V5.00.32.
- Service-worker cache key updated so clients receive the new assets.
