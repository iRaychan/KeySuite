# Upgrade to KeySuite V4.27.06

Apply over V4.27.05.

Manifold and Strainer:
- Strainer pricing now contains only **GI Thread, SS Thread, GI Flange and SS Flange**. Suction strainers no longer use a pressure-class selection.
- BFI defaults to Thread strainers.
- CHC defaults to Thread through DN65 (2 1/2 inch) and Flange from DN80 upward.
- The automatic rules apply in both KeySuite and KeyBot.
- Manifold Sizing and GI/SS Header tables extend through DN250, DN300, DN350, DN400, DN450, DN500, DN600 and DN800.
- Branch, Flexible and Strainer size ranges are not extended.

Price List display:
- Header has one **Material: GI / SS** selector. Only the selected Header material is displayed.
- BFI has one **Material: SS304 / SS316** selector. SS304 displays BFI; SS316 displays BFIN.
- BFI and BFIN prices and rarity values remain independently stored.

Deployment:
1. Upload the V4.27.06 upgrade files to the KeySuite web host/GitHub.
2. Open PowerShell in the upgraded KeySuite folder.
3. Link the active Supabase project:

   `npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp`

4. Apply the Manifold DN800 database migration:

   `npx.cmd supabase db push`

5. Deploy KeyBot:

   `npx.cmd supabase functions deploy telegram-webhook`

6. Refresh KeySuite after GitHub Pages finishes deploying.

Migration included:
- `supabase/migrations/20260916150000_v42706_manifold_dn800.sql`
