# Upgrade to KeySuite V4.27.05

Apply over V4.27.04.

BFIN independent Price List:
- Price List now contains a separate **BFIN Models · Stainless Steel 316** table below BFI.
- BFIN stores independent MYR, USD and RMB source prices and rarity for 1 Phase and 3 Phase models.
- A zero BFIN price remains unpriced and is not replaced by the corresponding BFI/SS304 price.
- KeySuite and KeyBot use the BFIN price book whenever Stainless Steel 316/BFIN is selected.

Pump data:
- BFIN PDF Page 2 shows casing, impeller and shaft as **Stainless Steel 316**.
- CHC C4, CHC C6 and BFI motors rated **0.75 HP or below** automatically use **IE1** across KeySuite, PDFs and KeyBot.

Deployment:
1. Upload the V4.27.05 upgrade files to the KeySuite web host/GitHub.
2. Open PowerShell in the upgraded KeySuite folder.
3. Link the active Supabase project:

   `supabase link --project-ref skidqdixnnnuhvarekxp`

4. Apply the BFIN Price List database migration:

   `supabase db push`

5. Deploy KeyBot:

   `supabase functions deploy telegram-webhook`

6. Refresh KeySuite after GitHub Pages finishes deploying.

Migration included:
- `supabase/migrations/20260916120000_v42705_bfin_pricing.sql`
