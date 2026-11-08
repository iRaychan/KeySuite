# KeySuite V5.00.55 Phase 3 review

Base build: `KeySuite_V5.00.54_FULL_BUILD.zip`, SHA-256 `2235732b9f3832fe2143ff3c03567e0be53326cfbf545d00e91a5c044a3d6164`.

## Bug audit and results

| Bug | Root cause | V5.00.55 fix and verification |
| --- | --- | --- |
| 001 | `selector-iso/index.html` inserted a generated schematic into an ES-style Page 3 shell. | Extracted the exact in-cell PNG from `Dimension Drawing (Png)!C3` in the ISO V1.2 workbook. The PDF centers it at its original aspect ratio and keeps the ISO dimensions and flange ratings. Generated and visually inspected the corrected ISO 80-50-250 page alongside both supplied references. |
| 002 | `coupling.js` only populated the ES shaft list. Suitability read coupling technical limits from commercial product records and omitted ISO pump-shaft torque. | Added the ISO catalogue shaft lookup, verified workbook coupling limits for each bore, and enforced the independent ISO shaft torque limit. Motor frame/shaft lookup and speed checks run as before. Auto and manual suitability use the same rules. |
| 003 | The ISO selector had two Quick Selection handlers, including a model-only handler that could acknowledge before checking pole. Product and PDF presentation could prefer cached branding labels over the live selection. | The selector acknowledges only the model/pole it actually opened. The active ISO record supplies the display and report identity. Verified the 300-250-400 record at 1,450 rpm with Ø438 mm maximum impeller and DN300/DN250 connections, the separate 50-32-200 record, and consecutive Product Curve opens. |
| 004 | The shared return control treated the inline ISO Selection panel as a modal. Moving the iframe out of the panel on close also reloaded it. | Enabled the existing floating Back control for ISO Selection. Kept the live selector mounted across page changes. Tested visibility while scrolling, return to the previous page, and Quotation → ISO Selection with duty and model retained. A direct open with no prior selection page returns to the ISO duty inputs. Quick Selection retains its existing return destination. |
| 005 | `pricing.js` appended the trim line in the shared ES description formatter. | Removed the trim line for newly generated Product and Selection descriptions. Confirmed the trimmed ES 65-26 sample and ES technical PDF still contain their engineering selection data where applicable. |
| 006 | The ISO quotation route emitted separate seal lines and used a shorter motor label in manual pricing. It dropped the structured duty fields in the priced pumpset handoff. | ISO uses the ES order and motor format for generated pumpsets. The route carries the actual motor and duty fields. The baseplate/coupling line follows the included assembly components. Verified a 60HP 2-pole IE3 complete set, a 75HP 4-pole IE4 motor-only example, and the assembly formatter. |
| 007 | The ISO bare shaft description rendered full engineering flange ratings, material abbreviations and separate seal fields. | The generated quotation uses DN connections and the selected seal in the material line. It ends with “(Bare shaft pump only)”. Verified mechanical seal and gland packing. Engineering fields retain the original flange ratings. |

The drawing asset SHA-256 is `6be5ac37512e95fab4cad7fff82d108a1ecfe0f05ce7b1a92f74c01545fca1ba`. The workbook image was extracted byte-for-byte via the Excel rich-value image relationship.

## Coupling suitability

Source fields were checked against all 17 pin-and-bush models, 15 tyre models and 10 bushes in the coupling workbook's `Coupling` sheet. The `Pump Shaft` sheet verified 56 ES shaft diameters. The `Motor Frame` sheet verified the HP-to-frame and frame-to-shaft lookups. The ISO `Dimension` sheet verified 39 model shaft diameters in columns B/O and seven SS420 shaft torque limits in columns Q/R. The existing tyre flange limits still apply in addition to the workbook bush bore limits.

| Pump | Motor | Pump / motor shaft | Local result |
| --- | --- | --- | --- |
| ES 32-13 | 75 HP, 4-pole, 250M | 24 / 65 mm | FCL 224. FCL 200 fails its 250 Nm coupling rating. |
| ISO 80-50-250 | 60 HP, 2-pole, 225M | 32 / 60 mm | FCL 180. Required torque is about 147 Nm, within the 157 Nm coupling rating and 285 Nm pump-shaft limit. |
| ISO 80-50-250 | 75 HP, 4-pole, 250M | 32 / 65 mm | No suitable model. About 369 Nm exceeds the 285 Nm pump-shaft limit. |
| ISO 300-250-400 | 75 HP, 4-pole, 250M | 65 / 65 mm | FCL 224. The pump shaft is rated for 2,388 Nm. |
| ISO 350-300-400 and ISO 350-300-500 | Any | 75 mm pump shaft | Auto sizing and suitability require an approved 75 mm shaft torque limit. The workbook has a 76 mm entry and leaves 75 mm unspecified. |

The tyre regression also checked the F/H flange assignments. The browser suite exercised pump-side and motor-side failures and speed rejection. Fixture prices in the comparison screenshots are copied from the supplied examples for visual comparison.

## Regression coverage

- Local Chrome tests covered the ISO and ES coupling paths, ISO Selection and the Quick Selection model handoff, Product Curve consecutive opens, and the ISO floating return control. The local fixture exercises the handoff without a production brand or customer account.
- Generated ISO and ES technical PDFs through the selector PDF button. Both contain three A4 pages. At 144 dpi, ISO Pages 1–2 and all three ES pages were pixel-identical to V5.00.54. ISO Page 3 changed as expected and its dimension-table text was identical. The sample single-page PDF is ISO Page 3 extracted from that output. Chrome supplied the print rendering.
- Quotation tests covered generated descriptions, motor and duty fields, units, totals, saved/reopened quotations, manual items, revision, clone and quotation PDF output.
- The existing KeyStock V1.02 database and browser suites passed on a local fixture. Supabase migrations, KeyStock source, KeyHQ source, KeyBot source, and selector curve datasets retain their V5.00.54 bytes.
- The Pages build staged 400 files, including the original ISO PNG. All 399 copied files matched their source bytes. The reference audit reported the same 71 unresolved literals as V5.00.54.

## Modified files

- Selector and presentation: `selector-iso/index.html`, `selector-iso/iso-pumpset-dimension.png`, `v40001-product-series-overhaul.js`, `v40001-selector-brand.js`, `v39445-model-return.js`.
- Coupling and quotations: `coupling.js`, `pricing.js`, `iso-v50011.js`, `app.js`, `assembly.js`, `motor.js`.
- Release and entry points: `index.html`, `manifest.json`, `RELEASE.json`, `VERSION.txt`, `sw.js`, `v41200-bootstrap.js`, `v50051-version-lock.js`.
- QA: `tests/v50055-phase3.cjs`, `tests/v50054-browser.cjs` (version assertion accepts the build under test), and this report.

## Rollback

1. Re-publish the exact archived V5.00.54 static artifact or re-run the Pages workflow from the last known V5.00.54 release.
2. Reload KeySuite and confirm that the sidebar reads V5.00.54. If a browser still serves V5.00.55, close other KeySuite tabs and reload so the V5.00.54 service worker can take over.
3. Confirm that Selection and Quotation open and that KeyStock still reads V1.02. V5.00.55 adds zero database migrations, so rollback is a static-site change. Retain the previously applied V1.02 ledger migration.

Release status: local review build. Production publishing requires approval.
