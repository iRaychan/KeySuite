# KeySuite V5.00.11 — local review candidate

Built 29 October 2026 from the existing V5.00.10 folder. This is a review candidate, not a production-ready release. Nothing was deployed and no live database records or migrations were changed. V5.00.10 files covered by its upgrade manifest still match their checksums. Synced `sources/` files were not edited.

## Implemented for review

- CHC generation-specific seal prices and CR TuC/TiC material recognition; idempotent component surcharges.
- Blank editable ES/ISO seal and O-ring tables, CHC O-ring groups and CR groups including CR 320. Explicit zero is distinct from missing. Unsupported shafts/materials request manual pricing.
- Independent ISO catalog: 39 priced models, 381 material variants, 37 performance curves covering 32 models. USD and Many defaults. Seven price-only models remain available in Product. ES pump data is unchanged; ISO uses shared motor/coupling/baseplate sizing with its own dimensions.
- Manual quotation price dialog on CHC, CR, ES, ISO, BFI and BGF routes, preserving supplied descriptions and entered prices during automatic refresh. Explicit automatic repricing is available where sufficient source identity exists; an unavailable calculation retains the manual price.
- History sorting by applicable date, original reference and numeric revision.
- Normal/Compare category currency columns, retaining existing multiple selections. ISO category permissions added to the owner configuration interface.
- KeyHQ roadlamp relocation, revised lounge seating, overhead-only camera obstruction handling, manual double-click walk with manual-input cancellation, vehicle-centred follow camera, two-player basketball and added desk details.
- Accepted temporary FreeHybrid01 asset fitted to a body skeleton with six animation clips and existing activity poses. Included asset credits must remain with redistribution.

## Database setup still required

`proposals/pricing_v50011.sql` is a review-only proposal for component prices, ISO price overrides and selected category updates. It has NOT been applied or integration-tested against the connected database. Price editors remain disabled if the new tables are absent. Components stay blank until the owner enters them; quotations use the manual-price fallback while automatic prices are unavailable. ISO requires an explicitly configured ISO category rule. No existing category rules, exchange rates or prices were seeded or overwritten.

## Known limitations and remaining acceptance work

- KV is deferred per the user's instruction; no KV source data was supplied.
- This avatar is the accepted temporary hybrid, not the approved premium Ray sculpt. The shoulder/sleeve shape is visibly broad and needs review. There are no individual finger bones, facial morphs or proper blink/expression rig. Existing appearance settings are retained, but many old face, hairstyle and accessory controls do not change this hybrid. Natural object holding and all activity contact points are not validated.
- Reclining, vehicle camera, walking obstruction visibility and office details need user visual acceptance in the full campus. Automated basketball scoring passed; live two-user synchronisation has not been tested.
- ISO unsupported shaft sizes cannot use the four approved ES coupling/seal mappings automatically. Do not extrapolate prices or dimensions. Price-only models have no performance curves.
- Selection workbook row 75 has a blank RPM cell; the importer uses its explicit 1450 RPM section heading. Other 1480 RPM rows retain their supplied RPM. The 150-125-400 / 1450 curve retains consistent repeated Q/H points and ES multiplier conventions; no conflicting duplicate points were found.
- The 100-80-160 model name is as confirmed. Its supplied dimension record specifies DN125 suction; this was retained rather than inferred from the name.
- Some complete-pumpset manual fallback records cannot be automatically repriced from a single pump source. They keep the manual value; rebuild the complete assembly when all component prices are available.
- Authenticated end-to-end category saves, existing quotation save/revision/PDF workflows and live multi-user campus behaviour still require staging acceptance. An earlier campus browser log reported a MutationObserver error without a source; the scene loaded, but its origin remains unverified.

## Validation performed

- JavaScript syntax: 38 changed/new JS or HTML files, no syntax errors.
- Pricing: component blank/zero behaviour, CR grouping, seal mappings, generation separation, no duplicated add-ons, CR variant matching, manual price preservation, unsupported elastomer rejection and ISO import checks passed.
- ISO shared motor/baseplate sizing used independent source dimensions successfully.
- Existing BGF currency conversion, full calculation, rounding and repricing regression passed.
- History: revision date, original reference and R10-before-R2 ordering passed.
- Basketball: two-player limit, scoring, ball retrieval and alternating turns passed a 120-second simulation.
- Browser: ISO selection and actual rigged avatar rendering inspected; manual dialog accepted MYR 2,450 with the complete sample description. Idle and sitting poses inspected. Screenshot is in `tests/v50011/avatar-review.png`.

## Local previews

From this folder, serve with `python3 -m http.server 8274 --bind 127.0.0.1`, then open `http://127.0.0.1:8274/review-v50011.html`.
The campus fixture uses fictional test people and no live database credentials. The main application requires the existing account connection. Do not deploy this candidate before the outstanding acceptance work and database review.
