# KeySuite V5.00.24

## KV Selection — CR MASTER parity

- Replaced the independent KV selector implementation with a KV-specific clone of the established CR MASTER selector.
- Restored CR-equivalent Enhanced mode, D1–D6 duty points, operating speed and calculated RPM, motor efficiency/phase/voltage, KPI hierarchy, main and reference charts, operating point, BEP, system curve, display settings, parallel curves, variable/after-orifice curves, PDF display settings, orifice workflow, Most Suitable ranking, Alternative Models, responsive behavior and Product-frame workflow.
- Kept KV differences limited to KV data and engineering logic.
- Preserved KV workbook model, curve, power, efficiency and NPSHr data, including workbook shut-off power at Q=0.
- Continued exposing only the 39 complete KV 1 models. Incomplete KV 2+ families remain absent from the canonical KV database and selector.
- Preserved KV Product, Assembly, Quote, pricing and export handoffs.

## Master protection

- `selector-cr/index.html` is byte-for-byte unchanged from V5.00.23.
- `selector-es/index.html` is byte-for-byte unchanged from V5.00.23.
- Quotation PDF layout version 1.08 is unchanged.

No database migration is required.
