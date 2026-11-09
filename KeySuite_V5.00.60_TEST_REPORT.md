# KeySuite V5.00.60 test report

- Baseline ZIP SHA-256 matched the supplied V5.00.59 archive: `9b872b1a65344f118643c260b086a920051ab0390584091c2c3803b93fe05ff2`.
- KV import: 19 complete KV 12 models and 18 complete KV 15 models. All six required curve arrays contain 20 numeric samples per series. Existing 216 models remain present.
- KV calculation: representative KV 12, KV 15 and KV 10 models returned finite head and shaft power after the zero flow power correction.
- CHC drawing map: all 13 supplied PNG files embedded in both Product and Selection print views, with exact pre-existing variant and size routing. Native image dimensions and annotations retained; transparent pixels composited on white.
- Visual review: CHC drawing 1 was opened and its dimensions and linework were legible on white. The Product CHC 5-5 print report was rendered to a three-page A4 PDF; Page 3 was inspected and retained its dimension table and clear drawing.
- Chrome browser check: KV selector loaded the V1.5 data and produced a model selection. Product and Selection print report handoff passed for BGF, ES, ISO, CHC C6, CHC C4, CR, KV, BFI and BSW (18 routes). Quotation item and KeyBot handoff passed; no automatic download or old PDF service request occurred.
- Static site build: 415 published files, 558 existing reference edges checked, 71 pre-existing unresolved literals retained in the build report.

Limitations: The workbook supplies no new KV 12/15 prices. Quote and Assembly prices for those models therefore require configured prices or the existing manual price path. Full Save as PDF output for every new KV model and every CHC drawing was not inspected individually; the browser print handoff and image mapping were tested. The source lists KV 15-130 with B1 1917 mm and H 2495 mm, unusually high beside KV 15-120/140; those values were retained as supplied pending source confirmation. No Supabase migration or production deployment was performed.
