# KeySuite V5.00.70 review build

Baseline: V5.00.69 FULL. The UPGRADE ZIP is an overlay for that exact baseline. For a site currently at V5.00.67, use the FULL package as the complete application build and review the V5.00.68 G database migration separately before enabling persisted G pricing. No database operation or deployment was performed here.

The V5.00.69 package had broken G script references and a V5.00.67 version lock. This build repairs those references, orders the B.G.Reich product list as requested, adds fixed Cost / Curve / Quote columns, and ensures the G quotation payload includes the selected phase. Release labels read the generated `release-version.js` value from `RELEASE.json`; run `python3 tools/sync-release-version.py` before a future release package.

The supplied G workbook has twelve phase variants and curve data for G32-10-2M/T only. Source prices are zero until an owner sets them. This build remains a review candidate; the live site was observed showing V5.00.67 on 16 November 2026. Authenticated price, quotation round trip, and desktop/mobile visual checks require staging access after the build is served. The existing BGF files were not edited.
