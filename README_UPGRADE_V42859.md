# KeySuite V4.28.59 Upgrade

Upgrade from V4.28.58 by replacing the files in this package.

## Changes

- CHC and CR Mechanical Seal Add-On editable inputs are 288px wide.
- CR Curve again shows PDF, Assembly, and Add to Quote in the shared CHC-style header.
- Product > Keylargo > Baseplate can add the selected ES Baseplate to Pumpset Assembly.
- Assembly and System retain component set pricing, sum component Transport, and apply only the highest component Fuel Charge.
- Nested Assembly BOMs are expanded once inside System pricing to prevent double-counting.
- Frozen PDF and quotation print layouts are unchanged.

No new V4.28.59 database migration is required. Installations upgrading from V4.28.57 or older must still apply the V4.28.58 CR and V4.28.57 CHC Mechanical Seal Add-On migrations included in Full Clean.
