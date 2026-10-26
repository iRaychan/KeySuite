# KeySuite V5.00.04 changes

Base: user-supplied `KeySuite_V5.00.03_FULL_CLEAN_GitHub.zip`.

- KS-06: Normal quotation numbering continues after the company/year high-water mark. Only numbers explicitly released by an Owner deletion enter a private audited reuse queue; older unexplained gaps are never allocated. The confirmed RC-2610-0235..0239 deletion range is seeded after current/archive checks. The Supabase save transaction uses the established company/year advisory lock, rechecks availability, preserves every existing logical quotation's number and creator, and records `quotation_number_reused` when a released number is claimed.
- KS-07: Restored the V4.28.72 Standard Selector responsive contract for Dashboard-to-CHC navigation: natural child width, 100% iframe width and removal of stale Safari zoom/transform sizing without applying scale compensation.
- KS-08: Replaced Safari's absolutely positioned quotation table-header pseudo-rule with a real header-cell border. Continuation item pages no longer receive a false closing line; the final rule immediately before totals remains unchanged.

No KeyHQ, pricing, product data, Edge Function, production hosting or production database change was performed.
