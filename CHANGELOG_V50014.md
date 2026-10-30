# KeySuite V5.00.14 Changelog

Baseline: user-approved `KeySuite_V5.00.13_FULL_BUILD.zip`.

## 001 — Category Normal View

- The left list now contains category names only.
- Categories are fixed in A–Z order.
- All currency, margin, rarity, transport and editing controls remain in the existing right panel.
- Compare View was not changed.

## 002 — Company & Pricing

- Restored CR as a selectable customer price/curve group.
- Added BGF and ISO price groups.
- Product groups are discovered from the live Pricelist/category product registry, with `General` and `KeyLab` excluded.
- Future registered Pricelist groups are included without a hard-coded UI addition.
- Series rows are A–Z within each brand and continue to use their original pricing-family identities.

## 003 — Customer Brand / Series Price Preference

- Two-column order is now B.G.Reich top-left, Keylargo top-right, TESK second-row left.
- Remaining ordinary brands sort A–Z; symbol-leading brands sort last.
- The separate TESK KeyBot Chemical Pump / Material Selection module is preserved.

## 004 — ISO Selection placement

- ISO is included in the B.G.Reich Selection tree and uses the existing ISO selector route.
- Permission and customer Price Preference gates remain active.

## 005 — ISO Product

- Added ES-style series-left/models-right navigation.
- Series are derived from the ISO pump-size identity (suction-discharge fields already present in every approved ISO model).
- Each model is a single inline Model / Curve / Assembly / Quote row.
- Curve is shown only when matching ISO performance data exists.
- Material, seal, O-ring, source pricing and bare-shaft quotation behavior are preserved.

## 006 — BGF Product

- Quote buttons now use the compact ES action-button size and are right aligned.

## 007 — Quote History

- Sorts by effective date descending (revision date for a revision; original date otherwise).
- Same-date records compare the final numeric sequence of the original quotation reference, ignoring prefix and revision suffix.
- Same original sequence sorts highest revision first.
- The shared comparator remains active for normal, searched and filtered history results.
- Remote snake_case revision fields are normalized before sorting.

## 008 — ISO responsive layout

- The outer ISO Selection host now has the same width/min-width/overflow containment as ES.
- ISO remains on the V4.28.72 ES responsive geometry inside the selector and product-curve document.
- Safari uses 100% zoom; no artificial scaling was added.
- ISO hydraulic selection, impeller, duty-point, motor and pumpset algorithms were not changed.

## Protected areas

- No database migration.
- No pricing data or customer data mutation.
- No permission model change.
- No ISO/ES hydraulic calculation change.
- Frozen quotation PDF V1.08 layout unchanged.

