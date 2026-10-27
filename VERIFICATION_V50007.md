# KeySuite V5.00.07 — verification report

## Source and scope

Only `/Users/iraychan/Desktop/KeySuite_V5.00.06_FULL_CLEAN_GitHub.zip` was used as the application baseline. The release builder compares every original file, refuses deletions and verifies that all `supabase/` and supplied `source/` files remain byte-identical. The current manifest records the source ZIP SHA-256 and file hashes.

## Passed local checks

| Area | Evidence and result |
|---|---|
| BGF | Chrome test opens Product → B.G.Reich → BGF, verifies all four models and the model dialog; an ES-only role scope cannot open BGF. Existing supplied data reused. |
| Unit transfer | Executes the ES selector's direct Assembly handler for all 25 flow/head combinations using a controlled selection fixture. Values `75.123456` and `100.123456` survive unchanged. Assembly normalization/display tests verify all 25 combinations. |
| Coupling | Real context resolver with controlled component pricing verifies Pump + Motor + Baseplate has one automatic coupling, total 1,825 for fixture prices 1,000 + 500 + 125 + 200; manual couplings remain separate. Covers baseplate change, managed duplicate cleanup, motor change/removal and System synchronization no-op. |
| Existing pricing | Assembly/System consolidation, tyre compatibility, final-to-final motor replacement, C4/C6 pricing, shelter surcharge and all eight manifold accessory combinations pass their existing regression suites. |
| Explore | Chrome checks first-use expanded state, minimize, reload persistence and expansion. |
| Roofs | Chrome checks FOLLOW obstruction hiding, delayed restoration after exit, immediate FREE restoration and stability while the avatar moves. |
| Entrances | HQ front/rear, football, basketball, tennis, pickleball and badminton crossing segments pass collision checks. Badminton entry uses the clear side of the existing court net. Frames/signs and tower rendering were visually inspected. |
| Tower walking | Chrome drives the existing manual movement function through all six flights, stopping on 10/20/30 m platforms. Platform edges reject unintended walking off. Guided access reaches 30 m and enables jump controls. |
| Diving | All three styles at each of the three heights complete: nine combinations, height-limited spins, splash, surfacing, pool-edge recovery and restored manual movement. |
| General navigation | Existing suite passes 75 planned routes and 11 completed activity journeys, including elevator travel and front/rear access. |
| Quotation/PDF | Existing continuation-page and sealed-quotation browser tests pass and generate PDFs. Existing five-row minimum/auto-expanding description and Notes/Messenger placement test passes. |
| Other regressions | Existing CR selector, quotation customer lookup and authentication bootstrap (logged out, valid, expired, hung request, reload) suites pass. |
| Syntax | All modified JavaScript and inline executable HTML scripts pass Node syntax checks. |
| Packaging | Original files retained; unchanged-file hashes, ZIP CRC, archive paths and version metadata verified by the release builder. |

Detailed test scripts and results are in `tests/v50007/`. The tower preview is `tests/v50007/results/tower.png`.

## Limits and deployment notes

- Tests ran locally in desktop Chrome with controlled users, selections and pricing fixtures. No production login, database writes, real customer quotations, live messaging or external integrations were exercised. Authentication and permission checks described above are local regression tests, not production authorization certification.
- No GitHub push, hosting deployment, database migration or backend deployment was performed. Deploy the ZIP using the existing GitHub structure. Existing installations retain their saved role assignments; an authorized administrator can assign the new BGF scope through the existing role UI.
- BGF source prices are still those of V5.00.06 (the workbook's missing prices remain unpriced). The pre-existing BGF 500 / source-row BGF 550 discrepancy is explicitly retained in model details. No performance curves or technical data were invented.
- Browser/device performance and touch behavior were not exhaustively tested. The tower batches repeated geometry to limit draw calls. FREE intentionally keeps the roof visible even when a floor view is selected; FOLLOW retains the existing sectional cutaway design for seeing inside HQ.
- PDF output code and styling are byte-identical to V5.00.06. The regression tests verify representative sealed and multi-page outputs, not every historical quotation template.

Unrelated functionality is preserved to the extent of the byte comparison and tests above; this is not a claim that every production workflow has been exhaustively exercised.
