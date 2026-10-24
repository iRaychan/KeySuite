# KeySuite V4.28.54 Upgrade

This release adds the B.G.Reich CR Price List under Product. It uses the CHC-style CR, CRS and CRN price/rarity layout and imports 439 unique models from `010 - CR (Pricelist) - 261001 - V1.0.xlsx`. The identical duplicate source row for `CR 95-3-2` is imported once.

Run `supabase/migrations/20261001190000_v42854_cr_pricelist.sql` before uploading the application files. The migration creates the CR product table, seeds the workbook data, adds independent CR multipliers, and installs owner-only save functions.

The BFI row is also restored in General Pricelist → Effective Product Exchange Rates. All V4.28.53 fixes remain included.
