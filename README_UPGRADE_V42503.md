# KeySuite V4.25.03 Upgrade

## Included change — Variable Curve

Display Settings now includes **Variable Curve · 50 / 45 / 40 / 35 / 30 / 25 Hz**.

### CHC G1 / CHC G2 / BFI
- These families are treated as non-trimmable for this display function.
- The selected model's hydraulic model curve is used as the 50 Hz base.
- Reference curves are generated at 50, 45, 40, 35, 30 and 25 Hz using affinity-law speed scaling.
- The active selected-frequency curve remains the main curve and is not duplicated when it matches one of the fixed reference frequencies.

### End Suction (ES)
- Variable Curve follows the **currently selected impeller diameter**, not the full/max impeller curve.
- Example: if ES 65-16 is set to Ø150 mm, the graph shows Ø150 mm at 50, 45, 40, 35, 30 and 25 Hz.
- Changing the selected impeller automatically changes the base diameter used by all six frequency references.
- Existing Impeller Curves display choices remain independent; Variable Curve always follows the currently selected impeller diameter.

### Calculation / selection behavior
- Variable Curve is a display/reference feature only.
- It does not change the selected pump, selected impeller, required duty point, motor sizing, system curve calculation, after-orifice calculation or operating point calculation.
- Variable Curve is OFF by default.
- When **PDF Page 1 → Follow Selector Screen Settings** is enabled, the PDF uses the same Variable Curve setting.

## Deployment

V4.25.03 changes only browser/selector files and uses the existing display-settings table/JSON storage.

**No Supabase migration or `db push` is required for V4.25.03.**

Deploy the V4.25.03 web files to GitHub Pages and hard-refresh/reload KeySuite so the new `v=42503` cache version is loaded.
