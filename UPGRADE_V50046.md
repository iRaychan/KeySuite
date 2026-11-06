# KeySuite V5.00.46 BSV V1.1 fixes and upgrade

1. Back up the installed V5.00.45 application files.
2. Extract the UPGRADE ZIP over the V5.00.45 application root, keeping relative paths. The FULL BUILD is a complete alternative based on the supplied V5.00.45 ZIP.
3. Publish through the existing frontend hosting workflow. Refresh and confirm V5.00.46.
4. In staging, open Product → B.G.Reich → BSV. Check both phases, use a customer category with an enabled currency and nonzero BSV margin, and verify quote persistence and the exported PDF with configured T and MA prices.

## Fixes and source decisions

- Removed the disabled BSV Curve button. BSV uses three horizontal action slots with the existing button styling and costing permission.
- The V1.1 numeric model rows in BSV Data B4:G7 supply catalogue kW, HP, DNM, pole count and speed for T and MA. The Price Column sheet confirms independent T and MA columns. Its zeros were not imported as prices.
- Both reported quote failures came from the V5.00.45 disputed-configuration gate. It disabled the actions and independently rejected both variants during price lookup. The gate was replaced by the confirmed specifications below. The existing BSV price lookup, category and customer pricing, and quotation validation still apply.

| Base model | Catalogue kW | T HP | MA HP | Pole | RPM | DNM |
|---|---:|---:|---:|---:|---:|---|
| BSV 32G05 | 0.37 | 0.5 | 0.5 | 2 | 2900 | G1¼ |
| BSV 65G20 | 1.5 | 2 | 2 | 2 | 2900 | G2½ |
| BSV 80G10 | 0.75 | 1 | 1 | 2 | 2900 | G3 |
| BSV 100G30 | 1.5 | 3 | 3 | 2 | 2900 | G4 |

The latest V1.1 model table takes precedence over the older example text in the workbook. The 32G05 MA example in L6 still says 1.5 HP, and the 100G30 T example in K15 still says G3. The build uses 0.5 HP and G4 from the model table. The 100G30 row supplies 3 HP for both variants under this interpretation. Its 1.5 kW is displayed as a catalogue value.

## Changed files and verification

- `bsv-catalogue.js` shares the corrected model and description across Product, Costing, Assembly and the existing quotation item handoff.
- `v50033-actions.css` adds BSV-only action spacing.
- `index.html`, `manifest.json`, `sw.js`, `v41200-bootstrap.js` and `v50037-version-lock.js` update release and cache identifiers.
- `UPGRADE_V50046.md` documents this release.

Syntax and archive checks passed. Mocked tests exercised all eight variants, matching action payloads, exact variant price routing, phase switching, costing permission, a missing-price error and one quote item per click. Quote persistence, PDF rendering and browser layout remain unverified in production.

**Supabase Deployment Required: NO**  
The fixes run in the existing frontend and use the existing Supabase APIs.

**Supabase Database Migration Required: NO**  
The existing BSV price table, category rules and quotation storage support the corrected client payloads.
