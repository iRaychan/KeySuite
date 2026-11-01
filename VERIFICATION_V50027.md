# KeySuite V5.00.27 Verification

- JavaScript syntax: passed for all new/changed standalone scripts.
- Inline JavaScript syntax: passed for `index.html`, KV, BGF, and BSW selectors.
- HTML local asset references: passed for all changed pages.
- KV V1.2 import: 105 complete models; 27 actual family labels through KV 600; 9 complete hydraulic families; 15 supplied drawings.
- BSW V1.1 import: 178 unique catalogue models; 12 actual families (50, 65, 80, 100, 150, 200, 250, 300, 350, 400, 500, 600); 5 complete hydraulic models; supplied dimension drawing retained.
- Hydraulic core smoke calculation: passed for representative KV 1, KV 2, KV 3 and all five complete BSW curves.
- CR MASTER SHA-256: `224594e1ef5f5ecfcede14f332f82fcd60a2bce8bd9fa847ccfcf5aacf330898` (unchanged).
- ES MASTER SHA-256: `93230b96c5ba91b6bbb920d6851281183b6ad9dfd4c925206379eb7974284dbf` (unchanged).
- BSW NPSH: no workbook NPSH is exposed; on-screen NPSH card is removed and PDF chart array contains only Head, Efficiency, and Power.
- Supabase migration: passed on connected `KeySuite` project; both V5.00.27 migrations are recorded and `ks_products_bsw` contains 178 rows across 12 families (50–600), with RLS enabled.
- Startup regression: passed in a real browser using `tests/v50027/version-lock-startup-regression.html`; the timer completed, all three observer-driven label sets stabilized, and the incomplete KV family was added exactly once.
- Full application bootstrap: passed over local HTTP; the application reached the protected Sign-in boundary and remained responsive after an extended check. Newly introduced BGF/BSW selector adapter scope errors were removed. Remaining unauthenticated warnings are known database fallbacks and are not V5.00.27 startup regressions.
- Live deployment comparison: the deployed `index.html`, `auth.js`, `app.js`, `pricing.js`, and BSW script matched the original V5.00.27 build byte-for-byte. The protected startup query itself was unchanged from V5.00.26 except for local BSW rule normalization; it does not query `ks_products_bsw`.
- Supabase prerequisite audit: `ks_products_bsw` exists with 178 rows, two RLS policies, authenticated SELECT access, and BSW support in the category-currency RPC. No additional migration or Edge Function deployment is required.
- The full build and the focused startup regression page were served locally over HTTP. The focused browser test passed; static, syntax, data, hydraulic, live-deployment, and Supabase log checks also passed.
