# V5.00.47 modified files

- `product-family-registry-v50047.js` — new shared registry
- `index.html` — registry loading, generated category list, V5.00.47 identity
- `categories.js` — Category Management consumes shared registry
- `pricing.js` — compare/pricing tabs consume shared registry; complete safe fallback rates
- `v40001-multibrand.js` — OEM mapping dropdown consumes shared registry
- `v41200-bootstrap.js`, `v50047-version-lock.js`, `manifest.json`, `RELEASE.json` — release identity
- `supabase/migrations/20261107000300_v50047_product_family_registry.sql` — expanded OEM mapping validation
- `supabase/verify_v50047.sql` — read-only verification
- `tests/v50047-product-family-regression.cjs` — regression assertions
- `ROOT_CAUSE_BUG001_V50047.md`, `TEST_REPORT_V50047.md`, `DEPLOYMENT_V50047.md` — delivery documentation
