# KeySuite V5.00.85

Based on the supplied V5.00.84 FULL package. Local implementation only; no GitHub publication, Supabase migration, or production records changed.

- Update 01: replaced the entire shipped BSW engineering catalogue and variant availability data with the approved 261122 V1.3 workbook. 178 unique models, 84 modified records, 8 complete curves; no added/removed model names. Identical duplicate BSW 200F1250-4 rows collapse to one model. Workbook prices are zero/unavailable; unavailable variants are rejected and unpriced selections use manual pricing. Existing saved currency prices retain normal precedence.
- Bug 001: commercial selling series takes precedence over navigation labels. One shared resolver captures commercial brand/model before routing and keeps component identity separate from hydraulic and pricing sources. Row models, descriptions, Assembly/System/Pumpset components, costing display, saved payloads and quotation print content retain that identity. Intentional brandless values do not fall back to B.G.Reich.
- Bug 002: direct Product List captures identity before its asynchronous handoff; Curve messages use captured identity. Adding a product no longer selects its brand's quotation template. Existing items, selected quantities/prices and legitimate duty differences are retained.
- Existing operating-speed logic and pricing/margin formulas are unchanged. Missing BSW curves/specifications are not invented.

See V5.00.85_TEST_REPORT.md for executed checks and the browser/native-PDF verification limits.
