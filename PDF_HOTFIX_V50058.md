# KeySuite V5.00.58 technical PDF hotfix

## Confirmed production failure

The supplied V5.00.57 archive matches the previous full-build checksum. The live BGF selector page and shared JavaScript both returned HTTP 200. In a live Chrome reproduction using the Product Curve for BGF 350M, clicking PDF initialized the offscreen report and sent its same-origin POST to `/api/technical-pdf`. Production returned HTTP 405. The only failed local resource during the export was that endpoint. The handler raised “The technical PDF renderer is unavailable,” matching the Safari screenshot.

V5.00.57 moved technical exports onto a native Chromium service and made that service mandatory. The static host serves the JavaScript, but has no POST handler at the required route. V5.00.56 BGF used browser print, while its automatic Selection path used the vendored html2canvas and jsPDF exporter.

## Correction

V5.00.58 defaults to the bundled browser exporter and reuses the Phase 05 report templates, filename helpers and single download handoff. A static deployment makes zero requests to the renderer endpoint. A host can opt into the Phase 05 searchable renderer after its endpoint is operational. An opted-in report falls back to the browser exporter if the endpoint fails or returns invalid output.

The static PDF is image-based. It keeps the report styling, charts and tables, and embeds the original 1911 × 858 ES artwork on Page 3 for both ES and ISO. Searchable text, vector curves and embedded Arial Regular/Bold require the native renderer. The native renderer and previous Phase 05 pricing and Dashboard changes are retained.

## Corrected files

- `technical-pdf.js` chooses the configured renderer, loads the bundled browser exporter when needed, and keeps the existing filename and Item No. handoff.
- `pump-pdf-download-v50035.js` exposes its existing A4 rendering routine for reuse. The browser path fits each entire page without changing its aspect ratio, and keeps dimension art as a separate lossless image.
- `index.html` and the 13 selector documents update the shared script version. These are `selector/{index,product}.html`, `selector-g1/{index,product}.html`, `selector-cr/{index,product}.html`, `selector-bfi/{index,product}.html`, and `selector-{bgf,bsw,es,iso,kv}/index.html`.
- `sw.js`, `manifest.json`, `VERSION.txt`, `RELEASE.json`, `v41200-bootstrap.js` and `v50051-version-lock.js` publish the new version and service-worker cache.
- `tests/v50058-technical-pdf.cjs` checks downloads, filenames, numbering, endpoint behavior and browser errors.

## Verification

| Setup | Actual downloaded PDFs | Result |
| --- | ---: | --- |
| Staged static build in Chrome on macOS | 18 | Product and Selection for BGF, ES, ISO, CHC C6, CHC C4, CR, KV, BFI and BSW |
| Staged static build in Playwright WebKit on macOS | 6 | Product and Selection for BGF 350M, ES 65-26 and ISO 150-125-400 |
| Native renderer in Chrome on macOS | 6 | Same three families in Product and Selection, all HTTP 200 with searchable text and embedded Arial |
| Opted-in native renderer against a static-only server | 1 | Product BGF 350M downloaded using the browser exporter after a real HTTP 501 |

Static tests observed zero PDF endpoint requests, popups, dialogs, console errors or failed local assets during export. Double-clicks delivered one file. Product filenames retained their date and duty. Selection filenames retained sequential Item Nos. and the selected units, including ISO at 1000 US GPM @ 55 Mtr. All 31 samples reopened as three-page A4 PDFs. The 12 ES and ISO PDFs contain Page 3 artwork matching the original at full pixel dimensions, with zero visible pixel differences composited on white. WebKit coverage uses the automated browser engine on macOS. A final release smoke test in the Safari desktop app remains pending.

## Deploy after approval

1. Keep the current production artifact and its deployment identifier. Verify the ZIP checksum, then extract the complete V5.00.58 build into a clean release workspace. Use the existing publishing workflow. For GitHub Pages, run the packaged `tools/build_pages.py` from a checkout that contains all release files and publish only `_site/`. The staged build contains 402 files.
2. Leave the `technical-pdf.js` script tags as shipped on static hosting. If native hosting is provisioned later, route same-origin POST `/api/technical-pdf` to the authenticated and rate-limited Node/Playwright service per `PHASE_05_REVIEW.md`. Preflight the route and host Arial fonts before adding `data-native="true"` to the shared script tag in the app shell and selector documents for standalone access. Re-stage and test that deployment variant.
3. After publishing, reload KeySuite and confirm V5.00.58 in the sidebar. Run Product BGF 350M and Product/Selection ES and ISO in Safari. Open each downloaded PDF and check filename, model, curves and dimensions. The static default should show zero `/api/technical-pdf` requests.
4. V5.00.58 requires no Supabase migration.

## Rollback

Restore the saved production artifact using the hosting platform’s normal rollback process and reload the app to confirm the restored version. V5.00.57 restores the known PDF failure on static hosting. If PDF availability is required during rollback, publish the last working complete V5.00.56 artifact and confirm that version’s existing export behavior. Both rollbacks are web-only. Keep the existing Supabase schema and data.
