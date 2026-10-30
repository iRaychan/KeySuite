# KeySuite V5.00.16 — Phase 3 Improvements 001–006

## 001 — Category Normal View Edit button

- The idle label is now `Edit`.
- Press-and-hold displays `5`, `4`, `3`, `2`, `1` directly on the button.
- Releasing, leaving, or cancelling before five uninterrupted seconds resets the button to `Edit` without enabling deletion.
- Successful completion displays category Delete controls and changes the button to `Done`.
- Clicking `Done` hides Delete controls and returns to the locked state.
- The separate three-second category pricing-editor unlock remains unchanged.
- Existing confirmation, dependency check, archival RPC, and history-preservation behavior remains in place.

## 002 and 003 — CR 5-36 quotation pricing error

- CR now correctly identifies IE3 as its included standard motor in both product and selection payloads.
- A standard IE3 selection uses the entered pump-package price directly and does not look up an IE2 motor.
- The Continuum acceptance data converts RMB 3,793 at 0.650 to RM 2,465.45 before the existing category formula is applied.
- The misleading missing-currency error is no longer raised for this valid standard package.

## 004 — Category Compare View bold tabs

- All 13 product-group tabs use font-weight 700 in both selected and unselected states.
- Size, spacing, order, selection appearance, and behavior are unchanged.

## 005 — CR / CRS / CRN material descriptions

- CR: `SS304 (Cast Iron Connection) / Mechanical Seal`
- CRS: `SS304 / Mechanical Seal`
- CRN: `SS316 / Mechanical Seal`
- One shared description generator is used by CR Product, Selection, Assembly, and Quotation routing.
- The model, motor, voltage, connection, pricing, and hydraulic data remain unchanged.

## 006 — Correct standard included-motor pricing

- CHC C4/G1 package prices include IE2.
- CHC C6/G2 package prices include IE3.
- CR package prices include IE3.
- Matching standard motors bypass Motor Pricelist subtraction/addition and do not require a separate motor price.
- A real motor substitution retains the existing substitution formula and requires exact included and replacement motor prices.
- Missing motor prices are never treated as zero and now identify whether the included or replacement motor price is missing, including HP/kW, pole count, and efficiency class.
- No price-list values, customer categories, unrelated pricing formulas, or PDF layout rules were changed.
