# KeySuite V5.00.16 Modified Files

## Runtime and release files

- `VERSION.txt` — release version.
- `RELEASE.json` — release metadata and frozen PDF declaration.
- `manifest.json` — application version name.
- `index.html` — version references, cache keys, category Edit label, and V5.00.16 version lock.
- `sw.js` — V5.00.16 service-worker cache and version-lock entry.
- `v50016-version-lock.js` — runtime version lock for V5.00.16.
- `categories.js` — five-second countdown, early-release reset, Done/relock behavior.
- `v3944-categories.js` — font-weight 700 for all Compare View product tabs.
- `pricing.js` — included-motor rules, CR IE3 standard package handling, precise substitution errors, and shared CR material/description generation.
- `cr-product.js` — shared CR descriptions and material metadata for Product, Selection, Assembly, and Quotation routing.
- `selector-cr/index.html` — CR Selection internal default motor changed from IE2 to IE3.
- `selector-cr/product.html` — CR Product internal default motor changed from IE2 to IE3.

## Tests and documentation

- `tests/v42821-pricing-regression.js` — updated regression expectations for C4/G1 IE2 and C6/G2 IE3.
- `tests/v50016-phase3-regression.cjs` — Phase 3 pricing, material, category, selector-default, error, and version contract tests.
- `tests/v50016/browser.cjs` — local-browser Category countdown/relock and 13-tab boldness test.
- `README_FULL_BUILD_V50016.md`
- `CHANGELOG_V50016.md`
- `MODIFIED_FILES_V50016.md`
- `REGRESSION_TEST_REPORT_V50016.md`

No database migration, price data file, customer record, quotation record, quotation revision, PDF rendering module, or quotation template file was modified.
