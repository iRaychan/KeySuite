# KeySuite V5.00.79 — Phase 01

From verified V5.00.78 source. Review candidate; see acceptance limits in TEST_REPORT_V50079.md.

- Secure quotation saving: recover the authenticated save path after history refresh errors; distinguish committed save acknowledgement from history availability; retain failed drafts and a stable logical quotation ID across retries. Permissions and RLS remain unchanged.
- Product curves: correct dialog-header scoping so the shared BFI runtime initializes; restore BSW frame visibility and retry initial model handoff with a finite limit.
- Brandless descriptions: remove the leading `-` placeholder through shared normalization while retaining named brands.
- Costing Audit: use source Product family/configured alias for HMS and other mapped Product labels rather than guessing CHC from an unknown selling prefix. Reuse existing currency, Brand Margin, Assembly and Individual calculations.
- BSW: synchronize phase/model identity, motor voltage and Float Switch state; add top catalogue-backed configuration controls; correct BSW heading. Do not invent missing catalogue variants or source prices.
- CR: preserve CRS/CRN material identity, stop competing legacy posts and stale presentation overrides; retain shared hydraulic calculations.
- ES: add Duplex Stainless Steel 2205 and Super Duplex Stainless Steel 2507 selections, technical profiles and independent price keys. Add Price List choices and an explicit absent-configuration save guard.
- Supply a separate unexecuted SQL configuration script for absent ES duplex entries. New entries have null prices; existing records/prices are retained. ISO's existing independent duplex configurations remain unchanged.
- BSW Price List: prevent control overlap, retain headings and contain wide tables in their scroll region.
- Display/cache metadata: V5.00.79 release manifest, version labels, script cache keys and service-worker cache.
- Add root-cause findings, test results and upgrade instructions. No deployment or live database changes.
