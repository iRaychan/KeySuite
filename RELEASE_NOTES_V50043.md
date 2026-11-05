# KeySuite V5.00.43 — 261105 Bug 04

Built from the supplied V5.00.42 Full Build. No Supabase migration, seed, or Edge Function deployment is required.

Product Curve is an inline dialog over the originating Product page. KV used the universal floating Back control, which popped page history while the dialog was open. Dashboard was the previous entry or fallback, so the Product list was bypassed.

`v39445-model-return.js` now checks the existing inline Product marker before consulting history and closes the dialog through the same bridge as the header Back button. The Product page stays mounted with its brand, series, group, model state, options, and scroll position. Selection uses separate markers. Product families with a dedicated floating dialog control keep that control.

Version and cache metadata were updated in `index.html`, `kv-product-v50017.js`, `selector-kv/index.html`, `v41200-bootstrap.js`, `v50037-version-lock.js`, `sw.js`, `VERSION.txt`, and `RELEASE.json`.

## Verification

- Chrome passed the packaged navigation fixture in `tests/v50043-bug04-browser.html`. It runs the actual return handler and shared inline dialog bridge, exercising KV 4-50 (both Back controls), KV 10-90, repeated opens, CR, ES, ISO, CHC, BFI, BGF, BSW, and Selection. Product checks confirm the original DOM state survives and page history is untouched.
- `node tests/v50042-bug03-regression.cjs` passed. The test's release assertion accepts V5.00.43 so the existing fresh-model checks can run against this package.
- Browser coverage uses a local fixture with representative Product state. It does not exercise the full authenticated catalogue or load the production selector data.
