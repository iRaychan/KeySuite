# KeySuite V4.28.54 Verification

1. Run `supabase/migrations/20261001190000_v42854_cr_pricelist.sql`.
2. Sign in as Owner and open Product → B.G.Reich → CR.
3. Confirm 439 CR models are listed with CR, CRS and CRN Price/Rarity columns.
4. Switch between RMB and MYR and spot-check `CR 2-7` (RMB 1037; MYR 791).
5. Confirm the Mechanical Seal Add-on table shows Car / Sic, Sic / Sic and TuC / Tic.
6. Save one CR model row and confirm it reloads from the database.
7. Open General Pricelist and confirm Effective Product Exchange Rates shows both CR and BFI.
8. Run `node tests/v42854-release-regression.cjs` from the Full Clean folder.
