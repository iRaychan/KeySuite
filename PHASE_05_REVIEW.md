# KeySuite V5.00.57 Phase 05 review

Baseline is the supplied V5.00.56 full build, SHA-256 `bb07c1403aaf120a66719466aa5697007170c82a8574d4d8eb6ea00d95a87ea9`.

## Findings and changes

**001 Technical PDFs.** V5.00.56 had separate pipelines. Product used browser print. Selection used HTML canvas and jsPDF, and some family routes still depended on print. Both supplied comparison PDFs are three-page A4 jsPDF documents with zero extractable text. The visual review used Good.pdf and the existing native Product report. Its chart spacing and the larger full-width plotting areas are visible in the new ISO Selection sample. The true Safari/Quartz reference was unavailable.

All 13 technical selector documents now use one shared native Chromium print service. They retain their approved report templates, chart settings, engineering calculation paths and existing filename helpers. The browser prepares the report in an offscreen frame and downloads the result directly. The renderer produces A4 pages, searchable labels and tables, vector curves and embedded host Arial fonts. Dashboard Item No. is committed after a valid PDF is handed to the browser. A browser or OS cancellation after handoff cannot be observed by the application. The four samples show their respective Product and Selection chart settings. Selection includes duty markers and system curve when enabled. Approximate ISO pumpset weight is 808 kg in the local fixtures. Good.pdf shows 1,074 kg; this release preserves the application’s calculated values.

**002 Cold Item.** V4.27.01 and V4.27.04 define Cold Item as a suitable model without a filled source price. Dashboard could not look up ISO catalogue entries. It now checks the same effective ISO catalogue used by costing, including loaded price overrides, and continues honoring an explicit price-availability flag. Source availability spans configured catalogue variants. A customer’s category still controls which currencies can produce a selling price. The live read-only check confirmed a positive base price override for ISO 150-125-400, and ISO 125-100-500 has a positive shipped price.

**003 Seal and O-ring.** ISO raw costing read selector fields but built a source snapshot from different names and defaulted to Car/Cer and Viton. Costing Audit reprices the snapshot, which lost the upgrades. The canonical options now reach the calculation and the snapshot consistently for ES and ISO. Audit displays seal and O-ring separately in the existing structure and marks unavailable calculations explicitly. Audit and quote paths share the existing calculation and rounding policy. The live read-only review found 66 scoped rows, with 22 positive prices, 22 explicit zeros and 22 blanks. No surcharge values were introduced. The ES and ISO V1.3 Dimension sheets match all 55 ES and 39 ISO shaft keys. Column O is the model shaft size. Columns Q and R are the SS420 shaft and torque reference. The legacy ES coupling-only model 125-26G has no verified V1.3 shaft mapping.

**004 Shared artwork.** Both V5.00.56 runtime drawings already have the supplied ES Dimension.png byte hash `dee32b88b66ebd785c3bcfe95f9a841b14d5922b255b13a853ef8fc620471f70`. The same 1911 × 858 artwork is present in each new PDF. The extracted image alpha channel and white-background composited pixels match the source. ES 65-26 retains H1/H2 of 200/250 mm and DN80/DN65. ISO 150-125-400 retains 315/400 mm and DN150/DN125. Rendered Page 3 matches exactly between Product and Selection within each family.

## Verification

- Local Chrome on macOS passed four ES/ISO Product and Selection downloads. Three A4 pages per report, embedded Arial Regular and Bold, searchable text, and Page 3 visually checked. Selection exported Item 01 and 02. Product used dated names with duty and no Item number. Duplicate clicks yielded one file. A failed HTTP response produced no download and kept Item 03.
- One-click standalone Selection smoke downloads passed for CHC C6, CHC C4, CR, KV, BFI, BGF and BSW. Product routes share the same renderer. Only ES and ISO Product reports received the full three-page visual check.
- Pricing fixture passed all 11 shaft groups, both pricing modes, Silicon Carbide mapping, included standard choices, explicit zero, blank upgrades, failed lookup, separate Audit lines and ISO quotation price handoff. ISO classification tested both named examples, another ISO model, missing and zero prices, a supplied explicit flag, and ES regression.
- KeyStock V1.02 local database and Chrome workflow regressions passed receiving, inventory and cost preservation, FIFO, reservations, transfers, return, serial policy, and permissions.
- The static publishing build staged 402 files and found zero existing runtime targets excluded.
- Safari/macOS and Chrome or Edge/Windows download behavior remains to be tested on those clients.

## Renderer setup and rollback

The full ZIP includes the static site and `tools/technical-pdf-server.cjs`. Keep the renderer behind the KeySuite host’s authenticated same-origin `/api/technical-pdf` route. A static-only GitHub Pages origin needs a proxy or equivalent routing in front of it. The service binds to loopback and processes reports in isolated Chromium contexts with JavaScript and network requests disabled. Apply the host’s existing authentication and rate limits to the route.

Use Node 22 or later and Playwright `1.62.1` with Chromium. Install appropriately licensed Arial Regular and Bold on the renderer host. The tested macOS setup used its system Arial. The archive contains no font binaries. Set `KEYSUITE_PDF_ORIGIN` to the KeySuite origin, set `KEYSUITE_PDF_PORT` if the default 8765 is unavailable, and run `node tools/technical-pdf-server.cjs`. A host with installed Chrome can set `KEYSUITE_PDF_CHROMIUM_CHANNEL=chrome`. Confirm the route returns a valid PDF and verify a download on the live host before release.

For rollback, restore the complete V5.00.56 web build and refresh the app cache on clients. Remove or disable the new renderer route after the older app is live. V5.00.57 requires no Supabase migration and uses the existing V5.00.56 surcharge schema. Existing entered surcharge values remain in place.

## Source files

- Dashboard and pricing: `v40201-quick-selection.js`, `component-prices-v50011.js`, `iso-v50011.js`, `pricing.js`, `app.js`, `costing-audit-v50032.js`, `v40001-multibrand.js`.
- Technical exports: `technical-pdf.js`, `tools/technical-pdf-server.cjs`, `v40001-selector-brand.js` and the 13 Product/Selection selector documents.
- Version and assets: `index.html`, `v41200-bootstrap.js`, `v50051-version-lock.js`, `sw.js`, `manifest.json`, `VERSION.txt`, `RELEASE.json`. The existing dimension PNGs are byte-identical to the supplied artwork.
- QA: `tests/v50051-server.cjs`, `tests/v50057-pricing.cjs`, `tests/v50057-pdf-evidence.cjs`, `tests/v50057-shared-pdf.cjs`, `tests/v50057-pdf-series.cjs`.
