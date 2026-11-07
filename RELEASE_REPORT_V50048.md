# KeySuite V5.00.48 release report

## Baseline

GitHub `iRaychan/KeySuite` `main` at `082d8009c19f0962bd7ca2c84ab08086e5741f1b`
is the release source. That commit is the one deployed by Pages run 42353822685.
The attached V5.00.47 ZIP was examined as a reference and contributed no files
to this release. Across the repository, 1,289 paths were identical, 21 common
paths differed, 49 existed only on GitHub and 23 existed only in the ZIP.

Of the 392 deployed source files, 375 matched the ZIP. These 12 were absent
from the ZIP.

- `CNAME`
- `keyhq-coordinator.js`
- `keyhq/app.js`
- `keyhq/avatar/appearance.js`
- `keyhq/avatar/controller.js`
- `keyhq/avatar/prototype.js`
- `keyhq/avatar/workforce.js`
- `keyhq/legacy.html`
- `keyhq/styles.css`
- `v50019-version-lock.js`
- `v50022-version-lock.js`
- `v50023-version-lock.js`

Five deployed files differed in bytes: `keyhq-launcher.js`, `keyhq-messenger.js`,
`keyhq-social.js`, `keyhq/campus/main.js`, and `keyhq/campus/remote-state.js`.
The other differences were historical release files, tests, tools and SQL
outside the deployed runtime. `VERSION.txt` on the baseline still read
`5.00.43`; the app and release metadata identified `5.00.47`. This release
aligns the current version file, HTML, manifest, bootstrap and service worker.
The Pages workflow, staging script and ignore rules match GitHub byte for byte.

## Changes

- **001** prefixes newly transferred pump descriptions with the selected
  selling brand. The hyphen brand is omitted. Saved descriptions are restored
  without product/category reconstruction and printed without a separate brand
  line. Existing technical mappings still control the selling model.
- **002, 005** reserve a fixed place for remark indicators, keep `Item #n` on
  one line, and align model, quantity and price on the item header. The PDF
  prints the saved description and optional bold heading with one line break.
  A model-only legacy item can still print its model as plain text. The existing
  manual capacity field remains printable.
- **003** aligns the SST and discount controls in the editor. Existing
  adjustment math, discount modes and PDF totals presentation are retained.
- **004** compares the current unit price and description with the transferred
  snapshot, which travels with the quotation item. Quantity and the optional
  heading are outside the comparison. The old price-input handlers wrote an
  override and then removed its source, which brand handling could recreate
  without cost information. The editor now keeps the original source and
  records a separate, value-matched override for eligible positive prices.
  Existing permissions, margin and sealing checks still apply. Zero prices
  retain existing PDF inclusion behaviour and are blocked from new seals.
- **007, 008** add the customer filename alias and contact recipient alias.
  Filenames use the original quotation date and preserve the running number
  and revision suffix. Existing full names and contact fields are retained.
  The standard History print route and KeyHQ History download share the same
  naming logic. The latter now serializes the existing print layout and
  template as valid, renderable markup for its raster download.
- **009** the native Safari print-preview pagination remains unresolved. The
  prior Safari-specific A4 print rules were reviewed and retained. A local
  two-page A4 render was compared visually against the supplied two-page
  reference for layout, folios, logo, and totals. This does not verify the
  native Safari print dialog.

## Validation

- Chrome, local published artifact, synthetic customer and mocked secure
  quotation RPCs: multiple named brands and the hyphen case, editable
  description fidelity, quantity-neutral status, price edit/restore,
  zero-price priority, missing-price guard, valid override through save,
  reopen and seal, drag ordering, collapsed alignment at 1,300 and 890 px,
  fixed and percentage discount, recipient alias, bold heading, revision
  suffix, clone and revision persistence, and both History export paths.
- Chrome loaded the main app, nine selectors and KeyHQ from the local Pages
  artifact without page errors. The known BFI favicon 404 also exists on the
  V5.00.47 baseline. The family registry contains all 16 families. The existing
  ES direct selection and dashboard handoff both selected ES 65-26.
- The existing assembly/system pricing regression passed. The 31-check
  V5.00.47 family regression passed after substituting the current release
  expectations in the test invocation. The tracked historical test remains
  pinned to V5.00.47. The old V4.28.21 independent-rate, V4.28.58 CR package,
  KeyHQ integration/V0.5 and V5.00.32 release-pinned costing tests also fail on
  the unmodified V5.00.47 baseline. Three additional historical suites
  (V5.00.31, V5.00.34 phase 05 and V5.00.42 Bug 03) also stop on assertions
  that fail on both versions. The legacy no-customer ES costing fixture
  fails the same source-price assertion with V5.00.47 and V5.00.48 pricing
  code. The legacy V5.00.33 motor fixture fails the same complete/bare
  product lookup on both baselines. These are not counted as passes.
- The Pages build staged 394 files, of which 393 were byte-identical source
  copies. It checked 536 existing local-reference edges and excluded developer
  reports, tests and migrations. Its workflow and the custom domain config
  are unchanged.
- Production customer schema, grants and RLS were inspected read-only. A
  local PostgreSQL test verified that the new column starts null, the official
  name and contact data survive alias updates, and the same tenant-scoped
  access still applies under fixture policies. Production data and policies
  were not modified.
- Legacy quotations without a stored original snapshot start comparison from
  the saved price and text. Earlier transferred values cannot be recovered
  reliably. Existing sealed recipient text is retained. A real signed-in
  Supabase staging pass, native macOS Safari print preview, and Windows
  print-driver checks remain outstanding.

## Changed-file inventory

| Path | Change |
|---|---|
| `app.js` | Quotation editor, transfer snapshots, customer/contact aliases, and print/export |
| `index.html` | Customer field, editor layout, cache-busted entry points |
| `pricing.js` | Preserve explicit quotation prices and restored quotation snapshots during refresh |
| `v40001-multibrand.js` | Selling-brand description mapping at transfer and preservation on restore |
| `VERSION.txt`, `RELEASE.json`, `manifest.json` | Release metadata |
| `sw.js`, `v41200-bootstrap.js`, `v50048-version-lock.js` | Release bootstrap and cache identity |
| `supabase/migrations/20261107094120_v50048_quotation_customer_names.sql` | Nullable company save-name field |
| `tests/v50048-quotation.cjs` | Local Chrome quotation and PDF regression |
| `README_UPGRADE_V50048.md`, `RELEASE_REPORT_V50048.md` | Installation, verification, rollback and evidence |

Supabase deployment required **NO**. Supabase database migration required
**YES**. Apply the migration before deploying the frontend, after staging
verification and separate approval. See `README_UPGRADE_V50048.md`.
