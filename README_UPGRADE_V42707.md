# Upgrade to KeySuite V4.27.07

Apply over V4.27.06.

Manifold Price List V1.2:
- Imports 66 MYR source-price rows from `010 - Manifold (Pricelist) - 260916 - V1.2`.
- Updates Branch, Flexible, Strainer, GI/SS Header and Tank Fitting prices.
- Imports the workbook Manifold Sizing matrix for DN25 through DN200.
- Retains the existing DN250 through DN800 Manifold Sizing and Header extension.
- Existing USD/RMB prices remain unchanged.
- Blank workbook MYR cells remain unpriced.

Automatic Flexible and Strainer selection:
- BFI/BFIN always use Thread.
- CHC/VMS use Thread through DN50 / 2 inches.
- CHC/VMS use Flange from DN65 / 2 1/2 inches.
- GI/SS follows the selected manifold material.
- The rules apply in both KeySuite and KeyBot.

Deployment:
1. Upload the V4.27.07 upgrade files to the KeySuite web host/GitHub.
2. Open PowerShell in the upgraded KeySuite folder.
3. Link the active Supabase project:

   `npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp`

4. Import the Manifold V1.2 prices and sizing:

   `npx.cmd supabase db push`

5. Deploy KeyBot:

   `npx.cmd supabase functions deploy telegram-webhook`

6. Refresh KeySuite after GitHub Pages finishes deploying.

Migration included:
- `supabase/migrations/20260917100000_v42707_manifold_pricelist_v12.sql`
