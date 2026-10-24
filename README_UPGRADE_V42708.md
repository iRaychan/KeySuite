# Upgrade to KeySuite V4.27.08

Apply over V4.27.07.

KeyBot Company-only Check Curve:
- A Telegram sender assigned to the Company with `curve_only` can use Check Curve without a linked KeySuite email or Role.
- New Request directly accepts Brand, Series, Model or Duty input.
- Customer, Product and Selection menus are not shown.
- Available models follow only the Company's active Brand / Series settings.
- Check Price, Assemble and Add to System are hidden and blocked.
- Pump Configuration remains available, including Material, Motor Efficiency, Mechanical Seal, Elastomer, Connection, Bare Shaft and Quantity.

ES speed routing for all KeyBot users:
- Generic `ES` shows at least one suitable 2-pole and one suitable 4-pole model when both are available.
- If only one speed is suitable, only one speed is shown.
- `ES 2P`, `ES 2Pole`, `ES 2900` and `ES 2900rpm` show only 2900 rpm models.
- `ES 4P`, `ES 4Pole`, `ES 1450` and `ES 1450rpm` show only 1450 rpm models.

Deployment:
1. Upload the V4.27.08 upgrade files to the KeySuite web host/GitHub.
2. Open PowerShell in the upgraded KeySuite folder.
3. Link the active Supabase project:

   `npx.cmd supabase link --project-ref skidqdixnnnuhvarekxp`

4. Deploy KeyBot:

   `npx.cmd supabase functions deploy telegram-webhook`

5. Refresh KeySuite after GitHub Pages finishes deploying.

No database migration or `supabase db push` is required for V4.27.08.
